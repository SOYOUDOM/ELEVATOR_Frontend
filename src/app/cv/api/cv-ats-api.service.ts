import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AtsCheckRequest, AtsResultDto } from './cv-api.contracts';
import { CvApiRoutes } from './cv-api.routes';

/**
 * ELEVATOR — ATS scoring.
 *
 * Server-side on purpose: the score has to match what the backend will compute
 * for the same document, and a browser-side approximation would be a different
 * number wearing the same badge. Until that endpoint exists, MSW answers it.
 */
@Injectable({ providedIn: 'root' })
export class CvAtsApiService {
    private readonly http = inject(HttpClient);
    private readonly routes = inject(CvApiRoutes);

    check(cvId: string, request: AtsCheckRequest = {}): Observable<AtsResultDto> {
        return this.http.post<AtsResultDto>(this.routes.cvAtsCheck(cvId), request);
    }
}
