import { API_BASE_URL } from '@shared/service-proxies/service-proxies';
import { Inject, Injectable, Optional } from '@angular/core';

/**
 * ELEVATOR — every CV endpoint URL, in one place.
 *
 * The base comes from the app's existing API_BASE_URL token, which main.ts
 * already resolves to '' under mocks and to AppConsts.remoteServiceBaseUrl
 * otherwise. That is the entire MSW→backend switch: these paths do not change,
 * only what answers them does.
 *
 * These are plain REST resources rather than ABP's /api/services/app/X/Y RPC
 * shape. The generated NSwag proxies keep that convention for the existing
 * app services; nothing in this feature has a generated proxy to reuse, and a
 * resource-shaped API is what the CV endpoints are documented as in
 * docs/api/cv-builder-api.md. AbpHttpInterceptor still attaches the auth,
 * tenant and culture headers to these calls, because it is registered globally.
 */
@Injectable({ providedIn: 'root' })
export class CvApiRoutes {
    private readonly base: string;

    constructor(@Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.base = (baseUrl ?? '').replace(/\/+$/, '');
    }

    readonly cvs = () => `${this.base}/api/cvs`;
    readonly cv = (id: string) => `${this.base}/api/cvs/${encodeURIComponent(id)}`;
    readonly cvFromProfile = () => `${this.base}/api/cvs/from-profile`;
    readonly cvDuplicate = (id: string) => `${this.base}/api/cvs/${encodeURIComponent(id)}/duplicate`;
    readonly cvAtsCheck = (id: string) => `${this.base}/api/cvs/${encodeURIComponent(id)}/ats-check`;

    readonly professionalProfile = () => `${this.base}/api/professional-profile`;

    readonly cvImports = () => `${this.base}/api/cv-imports`;
    readonly cvImport = (id: string) => `${this.base}/api/cv-imports/${encodeURIComponent(id)}`;

    readonly aiWrite = () => `${this.base}/api/cv-ai/write`;
    readonly aiImprove = () => `${this.base}/api/cv-ai/improve`;
}
