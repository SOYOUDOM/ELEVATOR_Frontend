import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import type { CvContent } from '../models/cv-content.model';
import type { ProfessionalProfileDto, SaveProfessionalProfileRequest } from './cv-api.contracts';
import { CvApiRoutes } from './cv-api.routes';
import { isNotFound } from './api-error';

/**
 * ELEVATOR — the reusable professional profile.
 *
 * MISSING-PROFILE CONTRACT: exactly one representation, `404` with
 * `code: PROFILE_NOT_FOUND`. Never a 200 carrying `null`. Callers that treat
 * "no profile yet" as a normal state use getOrNull(), which is the only place
 * in the app allowed to swallow that 404.
 */
@Injectable({ providedIn: 'root' })
export class ProfessionalProfileApiService {
    private readonly http = inject(HttpClient);
    private readonly routes = inject(CvApiRoutes);

    get(): Observable<ProfessionalProfileDto> {
        return this.http.get<ProfessionalProfileDto>(this.routes.professionalProfile());
    }

    /** null = the user has not saved a profile yet. Any other failure still throws. */
    getOrNull(): Observable<ProfessionalProfileDto | null> {
        return this.get().pipe(
            map((profile) => profile as ProfessionalProfileDto | null),
            catchError((error) => (isNotFound(error) ? of(null) : throwError(() => error)))
        );
    }

    /**
     * Explicit, user-initiated write. Autosave must never call this — a CV is a
     * snapshot, and updating the master copy is a separate decision the user
     * makes with a separate button.
     */
    save(content: CvContent): Observable<ProfessionalProfileDto> {
        const request: SaveProfessionalProfileRequest = { content };
        return this.http.put<ProfessionalProfileDto>(this.routes.professionalProfile(), request);
    }
}
