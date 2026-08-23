import { HttpErrorResponse } from '@angular/common/http';
import { type ApiErrorDto, CV_ERROR_CODES } from './cv-api.contracts';

/**
 * ELEVATOR — one way to read a failure.
 *
 * Angular hands back an HttpErrorResponse whose `error` is whatever the server
 * sent. Every CV endpoint sends ApiErrorDto, but a proxy timeout or an offline
 * browser sends nothing at all, so this normalizes both into the same object.
 * UI code then only ever renders an ApiErrorDto and never branches on transport.
 */
export function toApiError(error: unknown): ApiErrorDto {
    if (isApiErrorDto(error)) {
        return error;
    }

    if (error instanceof HttpErrorResponse) {
        if (isApiErrorDto(error.error)) {
            return error.error;
        }
        if (error.status === 0) {
            return {
                code: 'NETWORK_UNAVAILABLE',
                message: 'We could not reach the server. Your work is safe on this device.',
            };
        }
        return {
            code: `HTTP_${error.status}`,
            message: error.message || 'The request failed.',
        };
    }

    return {
        code: CV_ERROR_CODES.serverError,
        message: error instanceof Error ? error.message : 'Something went wrong.',
    };
}

export function isApiErrorDto(value: unknown): value is ApiErrorDto {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as ApiErrorDto).code === 'string' &&
        typeof (value as ApiErrorDto).message === 'string'
    );
}

/** Field-level messages for one dotted path, e.g. `content.personal.email`. */
export function fieldErrorsFor(error: ApiErrorDto | null, path: string): string[] {
    return error?.fieldErrors?.[path] ?? [];
}

export function isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
}
