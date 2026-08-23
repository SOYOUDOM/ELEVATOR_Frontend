import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { API_BASE_URL } from '@shared/service-proxies/service-proxies';

import type { CvDocument } from '../models/cv-document.model';
import { emptyCvDocument } from '../models/cv-document.model';
import { AUTOSAVE_DEBOUNCE_MS, CvEditorStore } from './cv-editor.store';

/**
 * Autosave behaviour: the parts that are easy to get subtly wrong and
 * impossible to notice until someone loses a paragraph.
 */
describe('CvEditorStore autosave', () => {
    let store: CvEditorStore;
    let http: HttpTestingController;

    function seed(): CvDocument {
        const cv = emptyCvDocument('cv_1', 'My CV');
        cv.content.personal.fullName = 'Sok Dara';
        return cv;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: '' },
                CvEditorStore,
            ],
        });
        store = TestBed.inject(CvEditorStore);
        http = TestBed.inject(HttpTestingController);
        store.adopt(seed());
    });

    afterEach(() => http.verify());

    it('updates locally before anything reaches the network', () => {
        store.editContent((content) => ({
            ...content,
            personal: { ...content.personal, jobTitle: 'Support Engineer' },
        }));

        expect(store.content()?.personal.jobTitle).toBe('Support Engineer');
        expect(store.saveState()).toBe('dirty');
        http.expectNone('/api/cvs/cv_1');
    });

    it('sends one request for a burst of keystrokes, not one per keystroke', fakeAsync(() => {
        for (const value of ['S', 'So', 'Sок', 'Sokha']) {
            store.editContent((content) => ({
                ...content,
                personal: { ...content.personal, fullName: value },
            }));
            tick(100);
        }

        tick(AUTOSAVE_DEBOUNCE_MS);

        const request = http.expectOne('/api/cvs/cv_1');
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body.content.personal.fullName).toBe('Sokha');
        request.flush({ ...seed(), updatedAt: '2026-08-23T10:00:00Z' });

        expect(store.saveState()).toBe('saved');
    }));

    it('patches only the branches that changed', fakeAsync(() => {
        store.updateDesign({ accentColor: '#ff0000' });
        tick(AUTOSAVE_DEBOUNCE_MS);

        const request = http.expectOne('/api/cvs/cv_1');
        expect(request.request.body.design.accentColor).toBe('#ff0000');
        expect(request.request.body.content).toBeUndefined();
        request.flush(seed());
    }));

    it('keeps what the user typed while a save was in flight', fakeAsync(() => {
        store.editContent((content) => ({ ...content, summary: 'first' }));
        tick(AUTOSAVE_DEBOUNCE_MS);
        const request = http.expectOne('/api/cvs/cv_1');

        // The user carries on typing before the server answers.
        store.editContent((content) => ({ ...content, summary: 'first and second' }));

        // The response carries the SERVER's older copy. It must not win.
        const stale = seed();
        stale.content.summary = 'first';
        request.flush(stale);

        expect(store.content()?.summary).toBe('first and second');

        tick(AUTOSAVE_DEBOUNCE_MS);
        http.expectOne('/api/cvs/cv_1').flush(seed());
    }));

    it('never discards local work when the save fails, and retries the same patch', fakeAsync(() => {
        store.editContent((content) => ({ ...content, summary: 'worth keeping' }));
        tick(AUTOSAVE_DEBOUNCE_MS);

        http.expectOne('/api/cvs/cv_1').flush(
            { code: 'INTERNAL_SERVER_ERROR', message: 'We could not save that change.' },
            { status: 500, statusText: 'Server Error' }
        );

        expect(store.saveState()).toBe('error');
        expect(store.saveError()?.message).toContain('could not save');
        expect(store.content()?.summary).toBe('worth keeping');

        store.retrySave();
        tick(AUTOSAVE_DEBOUNCE_MS);

        const retry = http.expectOne('/api/cvs/cv_1');
        expect(retry.request.body.content.summary).toBe('worth keeping');
        retry.flush(seed());
        expect(store.saveState()).toBe('saved');
    }));

    it('surfaces server-side field errors instead of swallowing them', fakeAsync(() => {
        store.editContent((content) => ({
            ...content,
            personal: { ...content.personal, email: 'not-an-email' },
        }));
        tick(AUTOSAVE_DEBOUNCE_MS);

        http.expectOne('/api/cvs/cv_1').flush(
            {
                code: 'CV_VALIDATION_FAILED',
                message: 'Some fields need attention.',
                fieldErrors: { 'content.personal.email': ['Enter a valid email address.'] },
            },
            { status: 400, statusText: 'Bad Request' }
        );

        expect(store.saveError()?.fieldErrors?.['content.personal.email']?.[0]).toContain('valid email');
    }));

    it('never writes the profile as a side effect of autosave', fakeAsync(() => {
        store.editContent((content) => ({ ...content, summary: 'typing' }));
        tick(AUTOSAVE_DEBOUNCE_MS);

        http.expectOne('/api/cvs/cv_1').flush(seed());
        http.expectNone('/api/professional-profile');
    }));

    it('writes the profile only when explicitly asked', () => {
        store.saveToProfile();

        const request = http.expectOne('/api/professional-profile');
        expect(request.request.method).toBe('PUT');
        request.flush({ id: 'profile_1', content: store.content(), updatedAt: '2026-08-23T10:00:00Z' });
        expect(store.profileSaveState()).toBe('saved');
    });

    it('keeps every word when the template changes', fakeAsync(() => {
        store.editContent((content) => ({
            ...content,
            summary: 'Four years keeping payment systems upright.',
            experience: [
                {
                    id: 'exp_1',
                    jobTitle: 'Application Support Engineer',
                    company: 'Wing Bank',
                    location: 'Phnom Penh',
                    dates: { start: { year: 2023, month: 3 }, end: null, isPresent: true },
                    bullets: ['Cut median ticket resolution from 9h to 5h.'],
                },
            ],
        }));
        const before = structuredClone(store.content());

        store.setTemplate('classic');

        expect(store.content()).toEqual(before);
        expect(store.design()?.templateId).toBe('classic');

        tick(AUTOSAVE_DEBOUNCE_MS);
        http.expectOne('/api/cvs/cv_1').flush(seed());
    }));
});
