import { HttpResponse, delay as mswDelay } from 'msw';

import type { ApiErrorDto } from '@app/cv/api/cv-api.contracts';
import { mockScenario } from './scenarios';

/**
 * Shared plumbing for the CV handlers: latency, the error envelope, and id
 * generation. Handlers below stay about BEHAVIOUR; none of them re-implements
 * "what does a 400 look like".
 */

/** Base latencies in ms, scaled by `mockScenario.latency`. */
export const MOCK_LATENCY = {
    read: 220,
    write: 320,
    slowWrite: 2200,
    upload: 700,
    ai: 1400,
    ats: 900,
} as const;

export async function pause(ms: number): Promise<void> {
    const scaled = Math.round(ms * mockScenario.latency);
    if (scaled > 0) {
        await mswDelay(scaled);
    }
}

export function apiError(status: number, error: ApiErrorDto): HttpResponse<ApiErrorDto> {
    return HttpResponse.json(withTrace(error), { status });
}

export function notFound(code: string, message: string): HttpResponse<ApiErrorDto> {
    return apiError(404, { code, message });
}

export function validationError(message: string, fieldErrors: Record<string, string[]>): HttpResponse<ApiErrorDto> {
    return apiError(400, { code: 'CV_VALIDATION_FAILED', message, fieldErrors });
}

export function serverError(message = 'The server could not complete that request.'): HttpResponse<ApiErrorDto> {
    return apiError(500, { code: 'INTERNAL_SERVER_ERROR', message });
}

export function mockId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
    return new Date().toISOString();
}

function withTrace(error: ApiErrorDto): ApiErrorDto {
    return { traceId: mockId('trace'), ...error };
}
