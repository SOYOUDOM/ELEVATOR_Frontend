import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { CvDraft, CvSkillGroup } from '../models/cv-draft.model';

// ── Wire contracts ────────────────────────────────────────────────────
// Kept in one place so swapping MSW for the real backend is a base-URL
// change, not an archaeology exercise across seven screens.

export interface CvImportResult {
    /** Only the sections the extractor could fill. Nulls are never invented. */
    draft: Partial<CvDraft>;
    /** Dotted paths the extractor was unsure about, e.g. `identity.email`. */
    uncertainFields: string[];
    fieldsRecovered: number;
    fieldsNeedingAttention: number;
}

export interface CvSkillSuggestion {
    name: string;
    group: CvSkillGroup;
}

export interface CvAtsCategory {
    label: string;
    score: number;
}

export interface CvAtsResult {
    score: number;
    categories: CvAtsCategory[];
    missingKeywords: string[];
    notes: string[];
}

export interface CvTemplate {
    id: string;
    name: string;
    accent: string;
    description: string;
}

export type CvSummaryMode = 'generate' | 'rewrite' | 'shorten' | 'grammar';
export type CvBulletMode = 'rewrite' | 'metric' | 'verb';

/** Base path for every create-cv call. MSW intercepts these in dev. */
export const CV_API_BASE = '/api/cv';

/**
 * Every AI / import / scoring call the builder makes.
 *
 * All methods return Observables of plain values (not envelopes) so a caller
 * can hand one straight to `elv-ai-action`'s `task` input:
 *
 * ```ts
 * [task]="() => ai.summary('generate', draft())"
 * ```
 *
 * While `environment.useMocks` is on, these are served by the MSW handlers in
 * `src/mocks/handlers.ts`. Nothing here knows that — the day a real backend
 * appears, only `CV_API_BASE` moves.
 */
@Injectable({ providedIn: 'root' })
export class CvAiService {
    private readonly http = inject(HttpClient);

    /** Parses an uploaded CV into draft fields. */
    importCv(file: File): Observable<CvImportResult> {
        const body = new FormData();
        body.append('file', file, file.name);
        return this.http.post<CvImportResult>(`${CV_API_BASE}/import`, body);
    }

    /** Writes or reworks the professional summary. */
    summary(mode: CvSummaryMode, draft: CvDraft): Observable<string> {
        return this.http
            .post<{ text: string }>(`${CV_API_BASE}/ai/summary`, {
                mode,
                targetJobTitle: draft.identity.targetJobTitle,
                currentSummary: draft.identity.summary,
                experience: draft.experience.map((e) => ({ role: e.role, company: e.company })),
            })
            .pipe(map((r) => r.text));
    }

    /** Turns a plain-language description of a job into CV bullets. */
    generateBullets(plainLanguage: string, role: string, targetJobTitle: string): Observable<string[]> {
        return this.http
            .post<{ bullets: string[] }>(`${CV_API_BASE}/ai/bullets`, { plainLanguage, role, targetJobTitle })
            .pipe(map((r) => r.bullets));
    }

    /** Reworks one bullet. */
    rewriteBullet(mode: CvBulletMode, text: string, targetJobTitle: string): Observable<string> {
        return this.http
            .post<{ text: string }>(`${CV_API_BASE}/ai/bullet`, { mode, text, targetJobTitle })
            .pipe(map((r) => r.text));
    }

    /** Reads the draft's experience bullets and proposes skills. */
    scanSkills(draft: CvDraft): Observable<CvSkillSuggestion[]> {
        return this.http
            .post<{ skills: CvSkillSuggestion[] }>(`${CV_API_BASE}/ai/skills-scan`, {
                targetJobTitle: draft.identity.targetJobTitle,
                bullets: draft.experience.flatMap((e) => e.bullets.map((b) => b.text)).filter(Boolean),
            })
            .pipe(map((r) => r.skills));
    }

    /** Which optional sections are worth adding for this target job. */
    suggestBoostSections(targetJobTitle: string): Observable<string[]> {
        return this.http
            .post<{ sections: string[] }>(`${CV_API_BASE}/ai/boost-suggestions`, { targetJobTitle })
            .pipe(map((r) => r.sections));
    }

    /** Studio-headshot transform. Returns a data URL. */
    transformPhoto(dataUrl: string): Observable<string> {
        return this.http
            .post<{ dataUrl: string }>(`${CV_API_BASE}/photo/transform`, { dataUrl })
            .pipe(map((r) => r.dataUrl));
    }

    atsScan(draft: CvDraft): Observable<CvAtsResult> {
        return this.http.post<CvAtsResult>(`${CV_API_BASE}/ats/scan`, { draft });
    }

    coverLetter(draft: CvDraft): Observable<string> {
        return this.http
            .post<{ text: string }>(`${CV_API_BASE}/ai/cover-letter`, {
                targetJobTitle: draft.identity.targetJobTitle,
                fullName: draft.identity.fullName,
                summary: draft.identity.summary,
            })
            .pipe(map((r) => r.text));
    }

    templates(): Observable<CvTemplate[]> {
        return this.http.get<{ templates: CvTemplate[] }>(`${CV_API_BASE}/templates`).pipe(map((r) => r.templates));
    }
}
