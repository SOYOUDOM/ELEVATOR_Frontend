import { HttpResponse, http } from 'msw';

import type { ProfessionalProfileDto, SaveProfessionalProfileRequest } from '@app/cv/api/cv-api.contracts';
import { CV_ERROR_CODES } from '@app/cv/api/cv-api.contracts';

import { mockDb } from '../db';
import { mockScenario } from '../scenarios';
import { MOCK_LATENCY, notFound, nowIso, pause, serverError } from '../utils';

/**
 * The reusable professional profile.
 *
 * MISSING PROFILE = 404, always. Never a 200 with a null body — one contract,
 * so the frontend has exactly one code path for "nothing saved yet".
 */
export const profileHandlers = [
    http.get('*/api/professional-profile', async () => {
        await pause(MOCK_LATENCY.read);

        if (mockScenario.profile === 'error') {
            return serverError('We could not load your saved information.');
        }

        const profile = mockScenario.profile === 'missing' ? null : mockDb.getProfile();
        if (!profile) {
            return notFound(CV_ERROR_CODES.profileNotFound, 'You have not saved any information yet.');
        }

        return HttpResponse.json(profile satisfies ProfessionalProfileDto);
    }),

    http.put('*/api/professional-profile', async ({ request }) => {
        const body = (await request.json()) as SaveProfessionalProfileRequest;
        await pause(MOCK_LATENCY.write);

        if (mockScenario.profile === 'error') {
            return serverError('We could not save your information.');
        }

        const existing = mockDb.getProfile();
        const saved = mockDb.setProfile({
            id: existing?.id ?? 'profile_1',
            content: structuredClone(body.content),
            updatedAt: nowIso(),
        });

        // A save always produces a profile, so a later GET must find one even
        // if the scenario started as 'missing'.
        if (mockScenario.profile === 'missing') {
            mockScenario.profile = 'existing';
        }

        return HttpResponse.json(saved);
    }),
];
