import { HttpResponse, http } from 'msw';

import type {
    CreateCvFromProfileRequest,
    CreateCvRequest,
    CvDto,
    CvListItemDto,
    UpdateCvRequest,
} from '@app/cv/api/cv-api.contracts';
import { CV_ERROR_CODES } from '@app/cv/api/cv-api.contracts';
import { cvContentFromProfile } from '@app/cv/models/professional-profile.model';
import { summarizeCv } from '@app/cv/models/cv-document.model';

import { blankCv } from '../data/cv.fixture';
import { mockDb } from '../db';
import { mockScenario } from '../scenarios';
import { MOCK_LATENCY, mockId, notFound, nowIso, pause, serverError, validationError } from '../utils';

/**
 * CV documents. Behaviour only — every string the user sees comes from a
 * fixture, and every response type is imported from the app's own contract, so
 * a drift between the two is a compile error rather than a runtime surprise.
 */
export const cvHandlers = [
    http.get('*/api/cvs', async () => {
        await pause(MOCK_LATENCY.read);
        const items: CvListItemDto[] = mockDb.cvs.map(summarizeCv);
        return HttpResponse.json(items);
    }),

    http.post('*/api/cvs', async ({ request }) => {
        const body = (await request.json()) as CreateCvRequest;
        await pause(MOCK_LATENCY.write);

        const cv = blankCv(mockId('cv'), body.name?.trim() || 'Untitled CV');
        cv.source = body.source ?? 'scratch';
        cv.targetRole = body.targetRole ?? null;

        if (body.source === 'import') {
            const record = body.importId ? mockDb.findImport(body.importId) : undefined;
            if (!record || record.status !== 'completed' || !record.result) {
                return notFound(CV_ERROR_CODES.importFailed, 'That import is not ready, or no longer exists.');
            }
            cv.content = structuredClone(record.result.content);
        }

        if (body.source === 'profile') {
            const profile = mockDb.getProfile();
            if (!profile) {
                return notFound(CV_ERROR_CODES.profileNotFound, 'You have not saved any information yet.');
            }
            cv.content = cvContentFromProfile(profile);
        }

        mockDb.insertCv(cv);
        return HttpResponse.json(cv, { status: 201 });
    }),

    /**
     * Create from the saved profile. The clone happens HERE, server-side, which
     * is the guarantee the client cannot undermine: the new CV shares no object
     * with the profile, so editing it can never rewrite the master copy.
     */
    http.post('*/api/cvs/from-profile', async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as CreateCvFromProfileRequest;
        await pause(MOCK_LATENCY.write);

        const profile = mockDb.getProfile();
        if (!profile) {
            return notFound(CV_ERROR_CODES.profileNotFound, 'You have not saved any information yet.');
        }

        const cv = blankCv(mockId('cv'), body.name?.trim() || 'CV from my information');
        cv.source = 'profile';
        cv.targetRole = body.targetRole ?? null;
        cv.content = cvContentFromProfile(profile);

        mockDb.insertCv(cv);
        return HttpResponse.json(cv, { status: 201 });
    }),

    http.post('*/api/cvs/:cvId/duplicate', async ({ params }) => {
        await pause(MOCK_LATENCY.write);
        const source = mockDb.findCv(String(params['cvId']));
        if (!source) {
            return notFound(CV_ERROR_CODES.notFound, 'That CV no longer exists.');
        }

        // Unlike from-profile, a duplicate keeps design and options too.
        const copy: CvDto = {
            ...structuredClone(source),
            id: mockId('cv'),
            name: `${source.name} (copy)`,
            source: 'duplicate',
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };
        mockDb.insertCv(copy);
        return HttpResponse.json(copy, { status: 201 });
    }),

    http.get('*/api/cvs/:cvId', async ({ params }) => {
        await pause(MOCK_LATENCY.read);
        const cv = mockDb.findCv(String(params['cvId']));
        if (!cv) {
            return notFound(CV_ERROR_CODES.notFound, 'That CV no longer exists.');
        }
        return HttpResponse.json(cv);
    }),

    http.patch('*/api/cvs/:cvId', async ({ params, request }) => {
        const patch = (await request.json()) as UpdateCvRequest;
        await pause(mockScenario.cvSave === 'slow' ? MOCK_LATENCY.slowWrite : MOCK_LATENCY.write);

        const cv = mockDb.findCv(String(params['cvId']));
        if (!cv) {
            return notFound(CV_ERROR_CODES.notFound, 'That CV no longer exists.');
        }

        if (mockScenario.cvSave === 'server-error') {
            return serverError('We could not save that change.');
        }

        const fieldErrors = validate(patch, mockScenario.cvSave === 'validation-error');
        if (fieldErrors) {
            return validationError('Some fields need attention before this can be saved.', fieldErrors);
        }

        // PATCH semantics: branches the client did not send are left alone, so
        // two quick edits to different sections cannot clobber each other.
        const next: CvDto = {
            ...cv,
            name: patch.name ?? cv.name,
            targetRole: patch.targetRole !== undefined ? patch.targetRole : cv.targetRole,
            content: { ...cv.content, ...(patch.content ?? {}) },
            design: { ...cv.design, ...(patch.design ?? {}) },
            options: { ...cv.options, ...(patch.options ?? {}) },
            updatedAt: nowIso(),
        };

        mockDb.replaceCv(next);
        return HttpResponse.json(next);
    }),

    http.delete('*/api/cvs/:cvId', async ({ params }) => {
        await pause(MOCK_LATENCY.write);
        const removed = mockDb.deleteCv(String(params['cvId']));
        if (!removed) {
            return notFound(CV_ERROR_CODES.notFound, 'That CV no longer exists.');
        }
        return new HttpResponse(null, { status: 204 });
    }),
];

/**
 * Server-side validation, mocked honestly: the email rule is real and fires on
 * genuinely bad input, and the scenario switch forces the same shape so the
 * failure path can be exercised on demand. Browser validation is a convenience,
 * never the authority — the frontend has to handle this response either way.
 */
function validate(patch: UpdateCvRequest, force: boolean): Record<string, string[]> | null {
    const errors: Record<string, string[]> = {};
    const email = patch.content?.personal?.email;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors['content.personal.email'] = ['Enter a valid email address.'];
    }
    if (patch.name !== undefined && patch.name.trim().length === 0) {
        errors['name'] = ['A CV needs a name.'];
    }
    if (force && Object.keys(errors).length === 0) {
        errors['content.personal.fullName'] = ['The server rejected this value (forced validation scenario).'];
    }

    return Object.keys(errors).length > 0 ? errors : null;
}
