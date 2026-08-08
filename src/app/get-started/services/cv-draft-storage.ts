import { InjectionToken } from '@angular/core';

import { CV_DRAFT_SCHEMA_VERSION, type CvDraft } from '../models/cv-draft.model';

/**
 * Where an in-progress draft is kept between page loads.
 *
 * The store depends on this interface, never on `localStorage` directly, so
 * swapping to a backend later ("save my draft to my account") is a provider
 * change in the routing module — no store or component touches it.
 */
export interface CvDraftStorage {
    read(): CvDraft | null;
    write(draft: CvDraft): void;
    clear(): void;
}

export const CV_DRAFT_STORAGE = new InjectionToken<CvDraftStorage>('CV_DRAFT_STORAGE');

export const CV_DRAFT_STORAGE_KEY = 'elevator.cv-draft.v1';

/**
 * Default implementation.
 *
 * Every access is wrapped: private-mode Safari throws on `setItem`, and a
 * half-written or stale-schema payload must never take the wizard down. On any
 * doubt it reports "no draft" and the user starts clean.
 */
export class LocalCvDraftStorage implements CvDraftStorage {
    constructor(private readonly key: string = CV_DRAFT_STORAGE_KEY) {}

    read(): CvDraft | null {
        const raw = this.safeGet();
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<CvDraft>;
            return parsed?.schemaVersion === CV_DRAFT_SCHEMA_VERSION ? (parsed as CvDraft) : null;
        } catch {
            return null;
        }
    }

    write(draft: CvDraft): void {
        try {
            localStorage.setItem(this.key, JSON.stringify(draft));
        } catch {
            // Quota or private mode. The draft still lives in memory.
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(this.key);
        } catch {
            // Nothing to do — the caller only asked for a best effort.
        }
    }

    private safeGet(): string | null {
        try {
            return localStorage.getItem(this.key);
        } catch {
            return null;
        }
    }
}

/** In-memory stand-in for tests and for any non-browser render target. */
export class MemoryCvDraftStorage implements CvDraftStorage {
    private draft: CvDraft | null = null;

    read(): CvDraft | null {
        return this.draft;
    }

    write(draft: CvDraft): void {
        this.draft = draft;
    }

    clear(): void {
        this.draft = null;
    }
}

/** Picks the browser implementation when there is a browser to pick it for. */
export function provideCvDraftStorage(): CvDraftStorage {
    return typeof localStorage === 'undefined' ? new MemoryCvDraftStorage() : new LocalCvDraftStorage();
}
