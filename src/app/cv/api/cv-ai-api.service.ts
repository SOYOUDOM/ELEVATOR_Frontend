import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CvAiRequest, CvAiResponseDto } from './cv-api.contracts';
import { CvApiRoutes } from './cv-api.routes';

/**
 * ELEVATOR — AI writing help.
 *
 * The browser never talks to a model provider and never holds a provider key.
 * It asks our own backend, which owns the credential and the prompt. Today MSW
 * stands in for that backend; the request the app makes is already the real one.
 *
 * Nothing here auto-applies its output. The service returns candidate variants
 * and the user chooses — an AI suggestion is a suggestion until a human accepts it.
 */
@Injectable({ providedIn: 'root' })
export class CvAiApiService {
    private readonly http = inject(HttpClient);
    private readonly routes = inject(CvApiRoutes);

    /** Draft new content for an empty or thin field. */
    write(request: CvAiRequest): Observable<CvAiResponseDto> {
        return this.http.post<CvAiResponseDto>(this.routes.aiWrite(), request);
    }

    /** Rewrite content the user already has. */
    improve(request: CvAiRequest): Observable<CvAiResponseDto> {
        return this.http.post<CvAiResponseDto>(this.routes.aiImprove(), request);
    }
}
