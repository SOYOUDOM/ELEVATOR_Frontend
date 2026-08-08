import { Injectable, computed, effect, inject, signal } from '@angular/core';

import {
    type CvDraft,
    type CvDraftSection,
    type CvEducationEntry,
    type CvExperienceEntry,
    createEmptyCvDraft,
    isCvDraftEmpty,
} from '../models/cv-draft.model';
import type { CvStepId } from '../models/cv-wizard-step.model';
import type { StartPathId } from '../models/start-path.model';
import { CV_DRAFT_STORAGE } from './cv-draft-storage';

/**
 * The draft the user is building, and the only thing allowed to mutate it.
 *
 * Steps never talk to each other; each one reads its slice off this store and
 * writes back through a typed patch. That is what lets a step be rewritten,
 * reordered or removed without touching any other step.
 *
 * Persistence is an `effect`: any write to the state signal is mirrored to the
 * injected storage. Nothing has to remember to call save.
 *
 * Provided at the wizard route (see get-started-routing.module.ts), so one
 * instance spans every step and is torn down when the user leaves.
 *
 * Note on member order: every public read below is a `computed`, whose body is
 * lazy. That is what lets them be declared above the private fields they read
 * — a field initialised eagerly (`state.asReadonly()`) could not be.
 */
@Injectable()
export class CvDraftStore {
    // ── Reads ─────────────────────────────────────────────────────────
    readonly draft = computed<CvDraft>(() => this.state());

    readonly source = computed(() => this.state().source);
    readonly basicInfo = computed(() => this.state().basicInfo);
    readonly experience = computed(() => this.state().experience);
    readonly education = computed(() => this.state().education);
    readonly skills = computed(() => this.state().skills);
    readonly design = computed(() => this.state().design);

    /** Which door the user came in by, or null if they have not chosen. */
    readonly path = computed(() => this.state().source.path);

    readonly completedSteps = computed(() => new Set(this.state().progress.completed));
    readonly skippedSteps = computed(() => new Set(this.state().progress.skipped));

    /** Nothing typed anywhere — used to decide whether to offer a resume. */
    readonly isEmpty = computed(() => isCvDraftEmpty(this.state()));

    // ── Internals ─────────────────────────────────────────────────────
    private readonly storage = inject(CV_DRAFT_STORAGE);

    private readonly state = signal<CvDraft>(this.storage.read() ?? createEmptyCvDraft());

    constructor() {
        effect(() => this.storage.write(this.state()));
    }

    // ── Writes ────────────────────────────────────────────────────────
    /**
     * Merge a partial into one section. Typed so `patchSection('skills', …)`
     * only accepts fields that exist on `CvDraft['skills']`.
     */
    patchSection<K extends CvDraftSection>(section: K, patch: Partial<CvDraft[K]>): void {
        this.commit((draft) => ({
            ...draft,
            [section]: { ...draft[section], ...patch },
        }));
    }

    choosePath(path: StartPathId): void {
        this.patchSection('source', { path });
    }

    setImportedFile(fileName: string | null): void {
        this.patchSection('source', { importedFileName: fileName });
    }

    // ── Repeatable sections ───────────────────────────────────────────
    setExperience(entries: CvExperienceEntry[]): void {
        this.commit((draft) => ({ ...draft, experience: entries }));
    }

    setEducation(entries: CvEducationEntry[]): void {
        this.commit((draft) => ({ ...draft, education: entries }));
    }

    // ── Progress ──────────────────────────────────────────────────────
    /** Marks a step finished. Completing a step un-skips it. */
    markCompleted(stepId: CvStepId): void {
        this.commit((draft) => ({
            ...draft,
            progress: {
                completed: unique([...draft.progress.completed, stepId]),
                skipped: draft.progress.skipped.filter((id) => id !== stepId),
            },
        }));
    }

    /** Marks a step deliberately passed over. Skipping a step un-completes it. */
    markSkipped(stepId: CvStepId): void {
        this.commit((draft) => ({
            ...draft,
            progress: {
                completed: draft.progress.completed.filter((id) => id !== stepId),
                skipped: unique([...draft.progress.skipped, stepId]),
            },
        }));
    }

    /** Wipes the draft and the stored copy. */
    reset(): void {
        this.state.set(createEmptyCvDraft());
        this.storage.clear();
    }

    /**
     * Single write path. Stamps `updatedAt` so the persisted payload always
     * carries a truthful timestamp, whatever the caller did.
     */
    private commit(update: (draft: CvDraft) => CvDraft): void {
        this.state.update((draft) => ({ ...update(draft), updatedAt: new Date().toISOString() }));
    }
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}
