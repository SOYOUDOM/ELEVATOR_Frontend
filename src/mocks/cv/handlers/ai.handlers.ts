import { HttpResponse, http } from 'msw';

import type { CvAiRequest, CvAiResponseDto } from '@app/cv/api/cv-api.contracts';

import { mockScenario } from '../scenarios';
import { MOCK_LATENCY, nowIso, pause, serverError } from '../utils';

/**
 * AI writing endpoints.
 *
 * These return TEMPLATED text and say so: `model: 'mock-writer'`. Nothing here
 * pretends to be a language model, because a fake that looked real would be
 * shipped by accident. What IS real is the contract — the request the app
 * sends, the variants-plus-metadata shape it gets back, and the fact that the
 * browser never sees a provider key.
 */
export const aiHandlers = [
    http.post('*/api/cv-ai/write', async ({ request }) => {
        const body = (await request.json()) as CvAiRequest;
        await pause(MOCK_LATENCY.ai);
        if (mockScenario.ai === 'error') {
            return serverError('The writing service is not responding.');
        }
        return HttpResponse.json(respond(body, 'write'));
    }),

    http.post('*/api/cv-ai/improve', async ({ request }) => {
        const body = (await request.json()) as CvAiRequest;
        await pause(MOCK_LATENCY.ai);
        if (mockScenario.ai === 'error') {
            return serverError('The writing service is not responding.');
        }
        return HttpResponse.json(respond(body, 'improve'));
    }),
];

function respond(body: CvAiRequest, mode: 'write' | 'improve'): CvAiResponseDto {
    const subject = body.currentContent.trim();
    const seed = subject || `your ${body.sectionId} section`;

    const variants =
        mode === 'write'
            ? [
                  `[mock-writer] A draft for ${seed}, written in the tone "${body.tone ?? 'concise'}".`,
                  `[mock-writer] A second, shorter take on ${seed}.`,
                  `[mock-writer] A third take that leads with an outcome instead of a duty.`,
              ]
            : [
                  `[mock-writer] Tightened: ${clip(seed)}`,
                  `[mock-writer] Rewritten to lead with the result: ${clip(seed)}`,
              ];

    return { variants, model: 'mock-writer', generatedAt: nowIso() };
}

function clip(value: string): string {
    return value.length > 140 ? `${value.slice(0, 137)}…` : value;
}
