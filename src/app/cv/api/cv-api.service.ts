import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
    CreateCvFromProfileRequest,
    CreateCvRequest,
    CvDto,
    CvListItemDto,
    UpdateCvRequest,
} from './cv-api.contracts';
import { CvApiRoutes } from './cv-api.routes';

/**
 * ELEVATOR — CV documents over HTTP.
 *
 * Deliberately thin and mock-blind. There is no `if (environment.useMocks)`
 * anywhere in this file, and there is no second implementation of it: MSW sits
 * below HttpClient and answers the identical request the real backend will.
 */
@Injectable({ providedIn: 'root' })
export class CvApiService {
    private readonly http = inject(HttpClient);
    private readonly routes = inject(CvApiRoutes);

    list(): Observable<CvListItemDto[]> {
        return this.http.get<CvListItemDto[]>(this.routes.cvs());
    }

    get(id: string): Observable<CvDto> {
        return this.http.get<CvDto>(this.routes.cv(id));
    }

    create(request: CreateCvRequest): Observable<CvDto> {
        return this.http.post<CvDto>(this.routes.cvs(), request);
    }

    /**
     * Server-side clone of the saved profile into a brand-new document. Doing
     * the clone here rather than in the browser is what guarantees the CV can
     * never end up holding a live reference to the profile.
     */
    createFromProfile(request: CreateCvFromProfileRequest = {}): Observable<CvDto> {
        return this.http.post<CvDto>(this.routes.cvFromProfile(), request);
    }

    /** Copies content AND design AND settings — unlike createFromProfile. */
    duplicate(id: string): Observable<CvDto> {
        return this.http.post<CvDto>(this.routes.cvDuplicate(id), {});
    }

    update(id: string, request: UpdateCvRequest): Observable<CvDto> {
        return this.http.patch<CvDto>(this.routes.cv(id), request);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(this.routes.cv(id));
    }
}
