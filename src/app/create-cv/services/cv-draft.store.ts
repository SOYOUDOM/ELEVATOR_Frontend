import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

import {
    CV_PHOTO_TRANSFORM_LIMIT,
    type CvDraft,
    type CvDraftSection,
    cvId,
    createEmptyCvDraft,
    isCvDraftEmpty,
} from '../models/cv-draft.model';
import { CV_DRAFT_STORAGE } from './cv-draft-storage';

export type CvSaveState = 'idle' | 'saving' | 'saved' | 'error';

const DRAFT_ID_KEY = 'elevator.cv-draft-id';
const AUTOSAVE_DEBOUNCE_MS = 400;

/**
 * The draft, and the only thing allowed to mutate it.
 *
 * `providedIn: 'root'` because the editor, the wizard steps and the header
 * save-chip all read the same draft, and they do not share a route subtree.
 *
 * ── Why autosave is not optional ──────────────────────────────────────
 * There is no login. A refresh with an unsaved draft is total, unrecoverable
 * loss of everything the user typed — the top failure mode of the whole
 * feature. So persistence is an `effect`, not a method someone has to
 * remember to call: any write to the state signal schedules a save.
 *
 * The debounce is on the WRITE, not on the state. State updates land
 * instantly (so the UI and `completeness` are never stale); only the trip to
 * IndexedDB is coalesced, which keeps typing from queueing a write per
 * keystroke.
 *
 * `saveState` is exposed for the header chip, and it tells the truth: 'saved'
 * is only set after the IndexedDB transaction actually completes, and a
 * failure surfaces as 'error' rather than being swallowed.
 */
@Injectable({ providedIn: 'root' })
export class CvDraftStore {
    // ── Reads ─────────────────────────────────────────────────────────
    readonly draft = computed<CvDraft>(() => this.state());

    readonly meta = computed(() => this.state().meta);
    readonly identity = computed(() => this.state().identity);
    readonly experience = computed(() => this.state().experience);
    readonly education = computed(() => this.state().education);
    readonly certifications = computed(() => this.state().certifications);
    readonly skills = computed(() => this.state().skills);
    readonly languages = computed(() => this.state().languages);
    readonly boost = computed(() => this.state().boost);

    readonly isEmpty = computed(() => isCvDraftEmpty(this.state()));

    /** Header chip: SAVING… / SAVED hh:mm / SAVE FAILED. */
    readonly saveState = computed<CvSaveState>(() => this.saveStateSignal());
    readonly lastSavedAt = computed(() => this.lastSavedAtSignal());

    readonly photoTransformsLeft = computed(() =>
        Math.max(0, CV_PHOTO_TRANSFORM_LIMIT - this.state().identity.photoTransformsUsed)
    );

    /**
     * SIGNAL STRENGTH — the only progress feedback before the editor.
     *
     * Four weighted checks straight from the spec. Deliberately about CV
     * quality, not about steps visited: a user who skipped a step but wrote a
     * strong summary is further along than one who walked every screen and
     * typed nothing.
     */
    readonly completeness = computed(() => {
        const d = this.state();

        const contactComplete = !!d.identity.fullName && !!d.identity.email && !!d.identity.targetJobTitle;
        const summaryPresent = d.identity.summary.trim().length >= 40;
        const strongExperience = d.experience.some((e) => e.bullets.filter((b) => b.text.trim()).length >= 2);
        const enoughSkills = d.skills.length >= 3;

        const checks = [
            { done: contactComplete, weight: 30 },
            { done: summaryPresent, weight: 25 },
            { done: strongExperience, weight: 30 },
            { done: enoughSkills, weight: 15 },
        ];

        return checks.reduce((total, c) => total + (c.done ? c.weight : 0), 0);
    });

    /** Which of the four checks are still outstanding, for the meter's label. */
    readonly completenessGaps = computed(() => {
        const d = this.state();
        const gaps: string[] = [];

        if (!d.identity.fullName || !d.identity.email || !d.identity.targetJobTitle) {
            gaps.push('Contact + target job');
        }
        if (d.identity.summary.trim().length < 40) {
            gaps.push('Summary');
        }
        if (!d.experience.some((e) => e.bullets.filter((b) => b.text.trim()).length >= 2)) {
            gaps.push('A role with 2+ bullets');
        }
        if (d.skills.length < 3) {
            gaps.push('3+ skills');
        }
        return gaps;
    });

    /**
     * Resolves once the stored draft has been read back. Kicked off in the
     * constructor so no screen has to remember to start it.
     */
    readonly hydration: Promise<CvDraft | null>;

    // ── Internals ─────────────────────────────────────────────────────
    private readonly storage = inject(CV_DRAFT_STORAGE);
    private readonly destroyRef = inject(DestroyRef);

    private readonly state = signal<CvDraft>(createEmptyCvDraft(readOrCreateDraftId()));
    private readonly saveStateSignal = signal<CvSaveState>('idle');
    private readonly lastSavedAtSignal = signal<Date | null>(null);

    /**
     * Gates autosave until the stored draft has been read back.
     *
     * A signal, not a boolean, so the save effect re-runs the moment it flips
     * — otherwise the effect would have already returned early and the first
     * real edit would be the only thing that ever triggered a write.
     */
    private readonly ready = signal(false);

    private timer: ReturnType<typeof setTimeout> | null = null;
    /** Guards against an out-of-order write finishing after a newer one. */
    private writeSeq = 0;

    constructor() {
        // Hydration starts in the CONSTRUCTOR, not from a page.
        //
        // This store is root-provided and reachable from every screen, so if
        // hydration were a page's job then landing directly on /create/skills
        // would start from a blank draft — and the autosave below would then
        // overwrite the user's saved work with that blank. With no login to
        // fall back on, that is unrecoverable. Reading first is the only safe
        // order.
        this.hydration = this.init();

        effect(() => {
            const draft = this.state();
            if (!this.ready()) {
                return;
            }
            this.scheduleSave(draft);
        });

        this.destroyRef.onDestroy(() => this.clearTimer());
    }

    // ── Lifecycle ─────────────────────────────────────────────────────
    /**
     * Resolves with the restored draft, or null when there was nothing worth
     * resuming. Await it to decide whether to offer RESUME / START FRESH —
     * the store never navigates or opens dialogs itself.
     */
    hydrate(): Promise<CvDraft | null> {
        return this.hydration;
    }

    /** Throws the current draft away and starts a new one with a fresh id. */
    async startFresh(): Promise<void> {
        const oldId = this.state().id;
        await this.storage.delete(oldId);

        const id = cvId();
        writeDraftId(id);
        this.replace(createEmptyCvDraft(id));
        this.saveStateSignal.set('idle');
        this.lastSavedAtSignal.set(null);
    }

    // ── Writes ────────────────────────────────────────────────────────
    /**
     * Merge a partial into one section.
     *
     * Typed so `patch('identity', …)` only accepts fields that exist on
     * `CvDraft['identity']`, and arrays are replaced wholesale rather than
     * merged — which is what callers always mean for a list.
     */
    patch<K extends CvDraftSection>(
        section: K,
        value: CvDraft[K] extends unknown[] ? CvDraft[K] : Partial<CvDraft[K]>
    ): void {
        this.commit((draft) => ({
            ...draft,
            [section]: Array.isArray(draft[section]) ? value : { ...draft[section], ...(value as object) },
        }));
    }

    /** Replaces the whole draft. Saves like any other write. */
    replace(draft: CvDraft): void {
        this.state.set(draft);
    }

    /** Merges an imported payload over the current draft. */
    applyImport(partial: Partial<CvDraft>, uncertainFields: string[], fileName: string | null): void {
        this.commit((draft) => ({
            ...draft,
            ...partial,
            meta: {
                ...draft.meta,
                ...partial.meta,
                startPath: 'import',
                uncertainFields,
                importedFileName: fileName,
            },
            identity: { ...draft.identity, ...partial.identity },
            boost: { ...draft.boost, ...partial.boost },
        }));
    }

    setStartPath(startPath: 'import' | 'scratch'): void {
        this.patch('meta', { startPath });
    }

    setTemplate(templateId: string): void {
        this.patch('meta', { templateId });
    }

    unlockExport(): void {
        this.patch('meta', { exportUnlocked: true });
    }

    /** True when the transform was allowed; false when the cap is spent. */
    consumePhotoTransform(): boolean {
        if (this.photoTransformsLeft() <= 0) {
            return false;
        }
        this.patch('identity', { photoTransformsUsed: this.state().identity.photoTransformsUsed + 1 });
        return true;
    }

    /** True once a field path was flagged low-confidence by the importer. */
    isUncertain(path: string): boolean {
        return this.state().meta.uncertainFields.includes(path);
    }

    /** Editing a flagged field is the user confirming it — clear the flag. */
    clearUncertain(path: string): void {
        if (!this.isUncertain(path)) {
            return;
        }
        this.patch('meta', {
            uncertainFields: this.state().meta.uncertainFields.filter((p) => p !== path),
        });
    }

    private commit(update: (draft: CvDraft) => CvDraft): void {
        this.state.update((draft) => ({ ...update(draft), updatedAt: new Date().toISOString() }));
    }

    private async init(): Promise<CvDraft | null> {
        let restored: CvDraft | null = null;
        try {
            const stored = await this.storage.read(this.state().id);
            if (stored) {
                this.state.set(stored);
                restored = isCvDraftEmpty(stored) ? null : stored;
            }
        } catch {
            // Unreadable storage is not a reason to block the builder; the
            // user simply starts clean and the save chip will report failures.
        }
        // Released whether or not anything was found — the early return here
        // was the bug that left autosave permanently switched off.
        this.ready.set(true);
        return restored;
    }

    // ── Autosave ──────────────────────────────────────────────────────
    private scheduleSave(draft: CvDraft): void {
        this.clearTimer();
        this.saveStateSignal.set('saving');
        this.timer = setTimeout(() => void this.flush(draft), AUTOSAVE_DEBOUNCE_MS);
    }

    private async flush(draft: CvDraft): Promise<void> {
        const seq = ++this.writeSeq;
        try {
            await this.storage.write(draft);
            // A newer save started while this one was in flight — its result
            // is the one that should decide the chip.
            if (seq !== this.writeSeq) {
                return;
            }
            this.lastSavedAtSignal.set(new Date());
            this.saveStateSignal.set('saved');
        } catch {
            if (seq === this.writeSeq) {
                this.saveStateSignal.set('error');
            }
        }
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

// ── Draft id, kept in localStorage ────────────────────────────────────
// Only the id lives here; the draft itself is far too big for localStorage.
function readOrCreateDraftId(): string {
    try {
        const existing = localStorage.getItem(DRAFT_ID_KEY);
        if (existing) {
            return existing;
        }
    } catch {
        // Private mode — fall through to an in-memory id for this session.
    }
    const id = cvId();
    writeDraftId(id);
    return id;
}

function writeDraftId(id: string): void {
    try {
        localStorage.setItem(DRAFT_ID_KEY, id);
    } catch {
        // Nothing to do; the draft simply will not survive a reload.
    }
}
