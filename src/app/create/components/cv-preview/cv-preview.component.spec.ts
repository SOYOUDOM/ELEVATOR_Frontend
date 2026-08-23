import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { emptyCvContent } from '@app/cv/models/cv-content.model';
import type { CvContent } from '@app/cv/models/cv-content.model';
import { defaultCvDesign, defaultCvOptions } from '@app/cv/models/cv-design.model';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';

import { CvPreviewComponent } from './cv-preview.component';

/**
 * Click-to-edit, end to end through the document. The assertions are all about
 * MODEL identity: the test would still pass if every string on the CV changed,
 * and would fail the moment a node stopped declaring which record it is.
 */
describe('CvPreviewComponent click-to-edit', () => {
    let fixture: ComponentFixture<CvPreviewComponent>;
    let selection: CvSelectionStore;

    function content(): CvContent {
        return {
            ...emptyCvContent(),
            summary: 'Four years keeping payment systems upright.',
            personal: {
                fullName: 'Sok Dara',
                jobTitle: 'Application Support Engineer',
                email: 'dara@example.com',
                phone: '',
                location: '',
                website: '',
                photoUrl: null,
            },
            experience: [
                {
                    id: 'exp_wing',
                    jobTitle: 'Application Support Engineer',
                    company: 'Wing Bank',
                    location: '',
                    dates: { start: { year: 2023, month: 3 }, end: null, isPresent: true },
                    bullets: ['Cut median ticket resolution from 9h to 5h.'],
                },
                {
                    id: 'exp_smart',
                    jobTitle: 'IT Support Analyst',
                    company: 'Smart Axiata',
                    location: '',
                    dates: { start: { year: 2021, month: 7 }, end: { year: 2022, month: 4 }, isPresent: false },
                    bullets: [],
                },
            ],
        };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CvPreviewComponent],
            providers: [CvSelectionStore],
        }).compileComponents();

        fixture = TestBed.createComponent(CvPreviewComponent);
        selection = TestBed.inject(CvSelectionStore);
        fixture.componentRef.setInput('content', content());
        fixture.componentRef.setInput('design', defaultCvDesign());
        fixture.componentRef.setInput('options', defaultCvOptions());
        fixture.detectChanges();
    });

    function node(section: string, field: string, record?: string): HTMLElement {
        const selector = record
            ? `[data-cv-section="${section}"][data-cv-record="${record}"][data-cv-field="${field}"]`
            : `[data-cv-section="${section}"][data-cv-field="${field}"]`;
        const found = fixture.debugElement.query(By.css(selector));
        expect(found).withContext(`no editable node for ${selector}`).toBeTruthy();
        return found.nativeElement as HTMLElement;
    }

    it('selects the name field when the name is clicked', () => {
        node('personal', 'fullName').click();

        expect(selection.target()).toEqual({ sectionId: 'personal', recordId: undefined, fieldId: 'fullName' });
        expect(selection.focusRequest()?.target.fieldId).toBe('fullName');
    });

    it('selects the right record when two roles share a job title', () => {
        node('experience', 'company', 'exp_smart').click();

        expect(selection.target()).toEqual({
            sectionId: 'experience',
            recordId: 'exp_smart',
            fieldId: 'company',
        });
    });

    it('selects the dates of the record whose dates were clicked', () => {
        node('experience', 'dates', 'exp_wing').click();

        expect(selection.recordId()).toBe('exp_wing');
        expect(selection.target()?.fieldId).toBe('dates');
    });

    it('marks the containing record active without selecting the record itself', () => {
        node('experience', 'jobTitle', 'exp_wing').click();
        fixture.detectChanges();

        const wrapper = fixture.debugElement.query(By.css('.cv-entry[data-cv-record="exp_wing"]'))
            .nativeElement as HTMLElement;

        expect(wrapper.classList).toContain('is-active');
        expect(selection.isWithin({ sectionId: 'experience', recordId: 'exp_wing' })).toBeTrue();
    });

    it('activates on Enter and Space, not only on a mouse', () => {
        const summary = node('summary', 'summary');

        summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(selection.target()?.sectionId).toBe('summary');

        selection.clear();
        summary.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(selection.target()?.sectionId).toBe('summary');
    });

    it('exposes every editable node as a real, labelled, focusable control', () => {
        const name = node('personal', 'fullName');

        expect(name.getAttribute('role')).toBe('button');
        expect(name.getAttribute('tabindex')).toBe('0');
        expect(name.getAttribute('aria-label')).toBe('Edit full name');
    });

    it('strips every editor affordance when it is not interactive', () => {
        fixture.componentRef.setInput('interactive', false);
        fixture.detectChanges();

        const name = node('personal', 'fullName');
        expect(name.getAttribute('role')).toBeNull();
        expect(name.getAttribute('tabindex')).toBeNull();
        expect(name.classList).not.toContain('cv-editable--live');

        name.click();
        expect(selection.target()).toBeNull();
    });

    it('renders sections in the design order and drops hidden ones', () => {
        fixture.componentRef.setInput('design', {
            ...defaultCvDesign(),
            hiddenSections: ['summary'],
            sectionOrder: ['personal', 'experience', 'summary'],
        });
        fixture.detectChanges();

        const sections = fixture.debugElement
            .queryAll(By.css('.cv-section'))
            .map((element) => (element.nativeElement as HTMLElement).dataset['section']);

        expect(sections).toEqual(['experience']);
    });
});
