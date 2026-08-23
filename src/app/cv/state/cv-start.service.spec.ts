import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { API_BASE_URL } from '@shared/service-proxies/service-proxies';

import { emptyCvDocument } from '../models/cv-document.model';
import { CvStartService } from './cv-start.service';

/**
 * The three doors. All of them must end at the workspace with a real CV id.
 */
describe('CvStartService', () => {
    let service: CvStartService;
    let http: HttpTestingController;
    let navigate: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: '' },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } },
            ],
        });
        service = TestBed.inject(CvStartService);
        http = TestBed.inject(HttpTestingController);
        navigate = TestBed.inject(Router).navigate as jasmine.Spy;
    });

    afterEach(() => http.verify());

    it('treats a 404 profile as "nothing saved yet", not as an error', () => {
        service.loadProfile();

        http.expectOne('/api/professional-profile').flush(
            { code: 'PROFILE_NOT_FOUND', message: 'You have not saved any information yet.' },
            { status: 404, statusText: 'Not Found' }
        );

        expect(service.profileState()).toBe('missing');
        expect(service.hasProfile()).toBeFalse();
    });

    it('reports a real failure as an error rather than as a missing profile', () => {
        service.loadProfile();

        http.expectOne('/api/professional-profile').flush(
            { code: 'INTERNAL_SERVER_ERROR', message: 'nope' },
            { status: 500, statusText: 'Server Error' }
        );

        expect(service.profileState()).toBe('error');
    });

    it('creates an empty draft and opens it', () => {
        service.startFromScratch();

        const request = http.expectOne('/api/cvs');
        expect(request.request.method).toBe('POST');
        expect(request.request.body.source).toBe('scratch');
        request.flush(emptyCvDocument('cv_new'));

        expect(navigate).toHaveBeenCalledWith(['/app/create', 'cv_new']);
    });

    it('asks the SERVER to clone the profile — the browser never does it', () => {
        service.startFromProfile();

        const request = http.expectOne('/api/cvs/from-profile');
        expect(request.request.method).toBe('POST');
        request.flush(emptyCvDocument('cv_from_profile'));

        expect(navigate).toHaveBeenCalledWith(['/app/create', 'cv_from_profile']);
    });

    it('rejects an unsupported file before it costs an upload', () => {
        service.startImport(new File(['x'], 'resume.txt', { type: 'text/plain' }));

        expect(service.error()?.code).toBe('CV_IMPORT_UNSUPPORTED_FORMAT');
        http.expectNone('/api/cv-imports');
    });

    it('uploads real multipart form data, polls, then creates the CV', fakeAsync(() => {
        service.startImport(new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' }));

        const upload = http.expectOne('/api/cv-imports');
        expect(upload.request.method).toBe('POST');
        expect(upload.request.body instanceof FormData).toBeTrue();
        expect((upload.request.body as FormData).get('file')).toBeInstanceOf(File);
        upload.flush({
            id: 'imp_1',
            status: 'processing',
            stage: 'reading-document',
            progress: 5,
            fileName: 'resume.pdf',
        });

        // First poll: still working.
        tick(0);
        http.expectOne('/api/cv-imports/imp_1').flush({
            id: 'imp_1',
            status: 'processing',
            stage: 'extracting-experience',
            progress: 52,
            fileName: 'resume.pdf',
        });
        expect(service.importProgress()?.stageLabel).toBe('Extracting work experience');

        // Second poll: done.
        tick(900);
        http.expectOne('/api/cv-imports/imp_1').flush({
            id: 'imp_1',
            status: 'completed',
            stage: 'done',
            progress: 100,
            fileName: 'resume.pdf',
            result: { content: emptyCvDocument('x').content, extractedSections: ['personal'], confidence: 0.8 },
        });

        const create = http.expectOne('/api/cvs');
        expect(create.request.body).toEqual(jasmine.objectContaining({ source: 'import', importId: 'imp_1' }));
        create.flush(emptyCvDocument('cv_imported'));

        expect(navigate).toHaveBeenCalledWith(['/app/create', 'cv_imported']);
    }));

    it('stops polling the moment the import is cancelled', fakeAsync(() => {
        service.startImport(new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' }));
        http.expectOne('/api/cv-imports').flush({
            id: 'imp_2',
            status: 'processing',
            stage: 'reading-document',
            progress: 5,
            fileName: 'resume.pdf',
        });

        tick(0);
        http.expectOne('/api/cv-imports/imp_2').flush({
            id: 'imp_2',
            status: 'processing',
            stage: 'normalizing',
            progress: 90,
            fileName: 'resume.pdf',
        });

        service.cancelImport();
        tick(5000);

        http.expectNone('/api/cv-imports/imp_2');
        expect(service.importProgress()).toBeNull();
    }));

    it('surfaces a failed extraction instead of opening an empty CV', fakeAsync(() => {
        service.startImport(new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' }));
        http.expectOne('/api/cv-imports').flush({
            id: 'imp_3',
            status: 'processing',
            stage: 'reading-document',
            progress: 5,
            fileName: 'scan.pdf',
        });

        tick(0);
        http.expectOne('/api/cv-imports/imp_3').flush({
            id: 'imp_3',
            status: 'failed',
            stage: 'done',
            progress: 100,
            fileName: 'scan.pdf',
            error: { code: 'CV_IMPORT_FAILED', message: 'We could not read that document.' },
        });

        expect(service.error()?.code).toBe('CV_IMPORT_FAILED');
        expect(navigate).not.toHaveBeenCalled();
        http.expectNone('/api/cvs');
    }));
});
