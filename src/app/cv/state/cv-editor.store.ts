import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, concatMap, debounceTime, map } from 'rxjs/operators';

import { CvApiService } from '../api/cv-api.service';
import { ProfessionalProfileApiService } from '../api/professional-profile-api.service';
import { type ApiErrorDto, type UpdateCvRequest } from '../api/cv-api.contracts';
import { toApiError } from '../api/api-error';
import type { CvContent, CvRecord, CvSectionId } from '../models/cv-content.model';
import type { CvDesign, CvOptions, CvSectionStyle } from '../models/cv-design.model';
import type { CvDocument } from '../models/cv-document.model';
import {
    CV_SECTIONS,
    type CvListSection,
    isListSection,
    sectionCompletion,
    sectionSpec,
} from '../schema/cv-section-schema';
import { applyTemplate } from '../templates/cv-templates';
import { buildTimelineLayout } from './cv-timeline';

/** Long enough that a sentence is one request, short enough to feel automatic. */
export const AUTOSAVE_DEBOUNCE_MS = 800;

export type CvLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type CvSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * ELEVATOR — the CV being edited.
 *
 * Local first, always. A keystroke updates this store synchronously, the
 * preview re-renders from it, and only then does a debounced PATCH go out. The
 * network is never in the typing path.
 *
 * ORDERING AND STALE RESPONSES — two rules, both load-bearing:
 *
 *   1. Saves are serialized with concatMap, not raced with switchMap. A
 *      cancelled PATCH may still have been applied on the server, so cancelling
 *      one would mean losing track of what the server holds.
 *
 *   2. A save RESPONSE never overwrites local content. The user has almost
 *      certainly typed something during the round trip, and echoing the
 *      server's older copy back into the editor would delete it in front of
 *      them. Only server-owned metadata (updatedAt) is taken.
 *
 * FAILURE — the queued patch is put back in front of the queue and the local
 * document is left exactly as it is. Nothing the user typed is ever discarded
 * because a request failed.
 *
 * Provided by the Create route, so closing the editor disposes the state and
 * the autosave pipeline with it.
 */
@Injectable()
export class CvEditorStore {
    private readonly api = inject(CvApiService);
    private readonly profileApi = inject(ProfessionalProfileApiService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly _document = signal<CvDocument | null>(null);
    private readonly _status = signal<CvLoadStatus>('idle');
    private readonly _loadError = signal<ApiErrorDto | null>(null);
    private readonly _saveState = signal<CvSaveState>('idle');
    private readonly _saveError = signal<ApiErrorDto | null>(null);
    private readonly _savedAt = signal<Date | null>(null);
    private readonly _profileSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

    readonly document = this._document.asReadonly();
    readonly status = this._status.asReadonly();
    readonly loadError = this._loadError.asReadonly();
    readonly saveState = this._saveState.asReadonly();
    readonly saveError = this._saveError.asReadonly();
    readonly savedAt = this._savedAt.asReadonly();
    readonly profileSaveState = this._profileSaveState.asReadonly();

    readonly content = computed<CvContent | null>(() => this._document()?.content ?? null);
    readonly design = computed<CvDesign | null>(() => this._document()?.design ?? null);
    readonly options = computed<CvOptions | null>(() => this._document()?.options ?? null);

    /** Recomputed once per content change — never per bar, per row, or per tick. */
    readonly timeline = computed(() => {
        const content = this.content();
        return content ? buildTimelineLayout(content) : null;
    });

    readonly completion = computed<Record<CvSectionId, number>>(() => {
        const content = this.content();
        const result = {} as Record<CvSectionId, number>;
        for (const spec of CV_SECTIONS) {
            result[spec.id] = content ? sectionCompletion(spec, content) : 0;
        }
        return result;
    });

    readonly overallCompletion = computed(() => {
        const values = Object.values(this.completion());
        if (values.length === 0) {
            return 0;
        }
        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    });

    private readonly pending = new Subject<void>();
    /** Everything edited but not yet accepted by the server. */
    private queued: UpdateCvRequest = {};

    constructor() {
        this.pending
            .pipe(
                debounceTime(AUTOSAVE_DEBOUNCE_MS),
                concatMap(() => this.flush()),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    // ── loading ───────────────────────────────────────────────────────
    load(id: string): void {
        this._status.set('loading');
        this._loadError.set(null);

        this.api
            .get(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (cv) => {
                    this._document.set(cv);
                    this.queued = {};
                    this._saveState.set('idle');
                    this._saveError.set(null);
                    this._status.set('ready');
                },
                error: (error) => {
                    this._loadError.set(toApiError(error));
                    this._status.set('error');
                },
            });
    }

    /** Seeds the store from a CV the caller already has — skips a redundant GET. */
    adopt(cv: CvDocument): void {
        this._document.set(cv);
        this.queued = {};
        this._saveState.set('idle');
        this._saveError.set(null);
        this._status.set('ready');
    }

    // ── content edits ─────────────────────────────────────────────────
    /**
     * The single entry point for every content change. `mutate` returns a NEW
     * content object; the changed top-level branches become the PATCH body, so
     * editing one bullet sends `experience`, not the whole CV.
     */
    editContent(mutate: (content: CvContent) => CvContent): void {
        const current = this._document();
        if (!current) {
            return;
        }

        const next = mutate(current.content);
        const delta = contentDelta(current.content, next);
        if (Object.keys(delta).length === 0) {
            return;
        }

        this._document.set({ ...current, content: next });
        this.queue({ content: { ...(this.queued.content ?? {}), ...delta } });
    }

    setFieldValue(sectionId: CvSectionId, recordId: string | null, apply: (record: any) => any): void {
        const spec = sectionSpec(sectionId);

        if (!isListSection(spec)) {
            this.editContent((content) => spec.write(content, apply(spec.read(content))));
            return;
        }

        this.editContent((content) => {
            const records = spec.read(content);
            const index = records.findIndex((record: CvRecord) => record.id === recordId);
            if (index < 0) {
                return content;
            }
            const next = [...records];
            next[index] = apply(records[index]);
            return spec.write(content, next);
        });
    }

    /** Appends an empty record and returns its id so the caller can select it. */
    addRecord(sectionId: CvSectionId): string | null {
        const spec = sectionSpec(sectionId);
        if (!isListSection(spec)) {
            return null;
        }
        const listSpec = spec as CvListSection<CvRecord>;
        const record = listSpec.create();
        this.editContent((content) => listSpec.write(content, [...listSpec.read(content), record]));
        return record.id;
    }

    removeRecord(sectionId: CvSectionId, recordId: string): void {
        const spec = sectionSpec(sectionId);
        if (!isListSection(spec)) {
            return;
        }
        const listSpec = spec as CvListSection<CvRecord>;
        this.editContent((content) =>
            listSpec.write(
                content,
                listSpec.read(content).filter((record) => record.id !== recordId)
            )
        );
    }

    /** `delta` is -1 (up) or +1 (down). Out-of-range moves are no-ops. */
    moveRecord(sectionId: CvSectionId, recordId: string, delta: number): void {
        const spec = sectionSpec(sectionId);
        if (!isListSection(spec)) {
            return;
        }
        const listSpec = spec as CvListSection<CvRecord>;
        this.editContent((content) => {
            const records = [...listSpec.read(content)];
            const from = records.findIndex((record) => record.id === recordId);
            const to = from + delta;
            if (from < 0 || to < 0 || to >= records.length) {
                return content;
            }
            const [moved] = records.splice(from, 1);
            records.splice(to, 0, moved);
            return listSpec.write(content, records);
        });
    }

    // ── document metadata / presentation ──────────────────────────────
    setName(name: string): void {
        const current = this._document();
        if (!current || current.name === name) {
            return;
        }
        this._document.set({ ...current, name });
        this.queue({ name });
    }

    setTargetRole(targetRole: string): void {
        const current = this._document();
        if (!current || (current.targetRole ?? '') === targetRole) {
            return;
        }
        this._document.set({ ...current, targetRole });
        this.queue({ targetRole });
    }

    updateDesign(patch: Partial<CvDesign>): void {
        const current = this._document();
        if (!current) {
            return;
        }
        const design = { ...current.design, ...patch };
        this._document.set({ ...current, design });
        this.queue({ design: { ...(this.queued.design ?? {}), ...patch } });
    }

    /**
     * Template switch. Goes through applyTemplate so the design can never be
     * left in a state the new template cannot render — and touches nothing
     * under `content`, which is why no CV loses a word here.
     */
    setTemplate(templateId: string): void {
        const current = this._document();
        if (!current || current.design.templateId === templateId) {
            return;
        }
        const design = applyTemplate(current.design, templateId);
        this._document.set({ ...current, design });
        this.queue({ design: { ...(this.queued.design ?? {}), ...design } });
    }

    /**
     * Typography for one section. Undefined values in `patch` CLEAR the
     * override rather than being ignored, which is what "reset to document"
     * needs; a style left with no keys is dropped entirely so the saved
     * document does not accumulate empty objects.
     */
    updateSectionStyle(sectionId: CvSectionId, patch: CvSectionStyle): void {
        const current = this._document();
        if (!current) {
            return;
        }

        const merged: CvSectionStyle = { ...(current.design.sectionStyles[sectionId] ?? {}), ...patch };
        for (const key of Object.keys(merged) as (keyof CvSectionStyle)[]) {
            if (merged[key] === undefined) {
                delete merged[key];
            }
        }

        const sectionStyles = { ...current.design.sectionStyles };
        if (Object.keys(merged).length === 0) {
            delete sectionStyles[sectionId];
        } else {
            sectionStyles[sectionId] = merged;
        }

        this.updateDesign({ sectionStyles });
    }

    /** Drops every override for a section, sending it back to the document's typography. */
    resetSectionStyle(sectionId: CvSectionId): void {
        const current = this._document();
        if (!current || !current.design.sectionStyles[sectionId]) {
            return;
        }
        const sectionStyles = { ...current.design.sectionStyles };
        delete sectionStyles[sectionId];
        this.updateDesign({ sectionStyles });
    }

    updateOptions(patch: Partial<CvOptions>): void {
        const current = this._document();
        if (!current) {
            return;
        }
        const options = { ...current.options, ...patch };
        this._document.set({ ...current, options });
        this.queue({ options: { ...(this.queued.options ?? {}), ...patch } });
    }

    // ── saving ────────────────────────────────────────────────────────
    /** Re-runs the queued patch after a failure. Same pipeline, no special case. */
    retrySave(): void {
        if (this._saveState() === 'error') {
            this._saveState.set('dirty');
            this.pending.next();
        }
    }

    /** Skips the debounce — for "save before you leave" moments. */
    saveNow(): Observable<void> {
        return this.flush();
    }

    /**
     * Explicit, user-initiated write to the reusable profile. Autosave never
     * calls this: overwriting a person's master profile is a decision, not a
     * side effect of typing.
     */
    saveToProfile(): void {
        const content = this.content();
        if (!content) {
            return;
        }
        this._profileSaveState.set('saving');
        this.profileApi
            .save(content)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this._profileSaveState.set('saved'),
                error: () => this._profileSaveState.set('error'),
            });
    }

    private queue(patch: UpdateCvRequest): void {
        this.queued = { ...this.queued, ...patch };
        this._saveState.set('dirty');
        this._saveError.set(null);
        this.pending.next();
    }

    private flush(): Observable<void> {
        const current = this._document();
        const inFlight = this.queued;

        if (!current || Object.keys(inFlight).length === 0) {
            return EMPTY;
        }

        this.queued = {};
        this._saveState.set('saving');

        return this.api.update(current.id, inFlight).pipe(
            map((saved) => {
                // Metadata only — see the class comment. The user has been
                // typing while this was in flight.
                const live = this._document();
                if (live && live.id === saved.id) {
                    this._document.set({ ...live, updatedAt: saved.updatedAt });
                }
                this._savedAt.set(new Date());
                this._saveError.set(null);
                this._saveState.set(Object.keys(this.queued).length > 0 ? 'dirty' : 'saved');
            }),
            catchError((error) => {
                // Newer edits win over the ones that failed, then the whole lot
                // goes out again on the next attempt.
                this.queued = mergePatch(inFlight, this.queued);
                this._saveError.set(toApiError(error));
                this._saveState.set('error');
                return EMPTY;
            })
        );
    }
}

/** Top-level branches that actually changed. Reference equality is enough — every write is immutable. */
function contentDelta(previous: CvContent, next: CvContent): Partial<CvContent> {
    const delta: Partial<CvContent> = {};
    for (const key of Object.keys(next) as (keyof CvContent)[]) {
        if (previous[key] !== next[key]) {
            (delta as Record<string, unknown>)[key] = next[key];
        }
    }
    return delta;
}

/**
 * Re-queues a failed patch under anything newer. Branches are merged rather
 * than replaced, and absent branches are left absent — an `undefined` key would
 * still count towards "is there anything to save".
 */
function mergePatch(older: UpdateCvRequest, newer: UpdateCvRequest): UpdateCvRequest {
    const merged: UpdateCvRequest = { ...older, ...newer };
    if (older.content || newer.content) {
        merged.content = { ...older.content, ...newer.content };
    }
    if (older.design || newer.design) {
        merged.design = { ...older.design, ...newer.design };
    }
    if (older.options || newer.options) {
        merged.options = { ...older.options, ...newer.options };
    }
    return merged;
}
