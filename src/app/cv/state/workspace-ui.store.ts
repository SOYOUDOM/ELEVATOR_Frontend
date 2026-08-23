import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import type { CvSectionId } from '../models/cv-content.model';

/**
 * ELEVATOR — EDITOR UI STATE.
 *
 * Panel widths, zoom levels, which tab is open. None of it is part of a CV, and
 * none of it is ever sent to the server: UpdateCvRequest has no field it could
 * fit in, by design. Keeping it in its own store is what stops `timelineZoom`
 * from ending up in a backend DTO.
 *
 * Persistence follows the app's existing preference pattern (FxSettingsService):
 * signals plus localStorage under an `elv-` key, every access guarded because
 * private mode throws on read.
 */
export type RailItemId = 'build' | 'template' | 'design' | 'ai' | 'ats' | 'settings';
export type InspectorTab = 'template' | 'design' | 'options';

const STORAGE_KEY = 'elv-cv-workspace';

interface PersistedWorkspace {
    leftWidth: number;
    rightWidth: number;
    timelineHeight: number;
    previewZoom: number;
    timelineZoom: number;
    timelineOpen: boolean;
}

export const WORKSPACE_LIMITS = {
    leftWidth: { min: 280, max: 560, initial: 400 },
    rightWidth: { min: 260, max: 520, initial: 340 },
    timelineHeight: { min: 150, max: 460, initial: 250 },
    previewZoom: { min: 50, max: 175, initial: 100, step: 10 },
    timelineZoom: { min: 60, max: 400, initial: 100, step: 20 },
} as const;

@Injectable()
export class WorkspaceUiStore {
    readonly rail = signal<RailItemId>('build');
    readonly inspectorTab = signal<InspectorTab>('template');
    readonly openSection = signal<CvSectionId>('personal');

    readonly leftWidth = signal<number>(WORKSPACE_LIMITS.leftWidth.initial);
    readonly rightWidth = signal<number>(WORKSPACE_LIMITS.rightWidth.initial);
    readonly timelineHeight = signal<number>(WORKSPACE_LIMITS.timelineHeight.initial);
    readonly timelineOpen = signal(true);

    /** Display scale only. Never reaches the document, the PDF or the print box. */
    readonly previewZoom = signal<number>(WORKSPACE_LIMITS.previewZoom.initial);
    readonly timelineZoom = signal<number>(WORKSPACE_LIMITS.timelineZoom.initial);

    /** Mobile/tablet: which of the three panes is on screen. */
    readonly mobilePane = signal<'builder' | 'preview' | 'inspector'>('preview');

    private saveTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        this.restore();
        // A half-written preference is worse than a stale one: flush whatever
        // the debounce is still holding when the workspace closes.
        inject(DestroyRef).onDestroy(() => this.flush());
    }

    setRail(id: RailItemId): void {
        this.rail.set(id);
        if (id === 'template' || id === 'design') {
            this.inspectorTab.set(id === 'template' ? 'template' : 'design');
        }
        if (id === 'settings') {
            this.inspectorTab.set('options');
        }
    }

    setLeftWidth(px: number): void {
        this.leftWidth.set(clamp(px, WORKSPACE_LIMITS.leftWidth));
        this.persist();
    }

    setRightWidth(px: number): void {
        this.rightWidth.set(clamp(px, WORKSPACE_LIMITS.rightWidth));
        this.persist();
    }

    setTimelineHeight(px: number): void {
        this.timelineHeight.set(clamp(px, WORKSPACE_LIMITS.timelineHeight));
        this.persist();
    }

    toggleTimeline(): void {
        this.timelineOpen.update((open) => !open);
        this.persist();
    }

    zoomPreview(delta: number): void {
        this.previewZoom.update((zoom) => clamp(zoom + delta, WORKSPACE_LIMITS.previewZoom));
        this.persist();
    }

    setPreviewZoom(value: number): void {
        this.previewZoom.set(clamp(value, WORKSPACE_LIMITS.previewZoom));
        this.persist();
    }

    zoomTimeline(delta: number): void {
        this.timelineZoom.update((zoom) => clamp(zoom + delta, WORKSPACE_LIMITS.timelineZoom));
        this.persist();
    }

    fitTimeline(): void {
        this.timelineZoom.set(WORKSPACE_LIMITS.timelineZoom.initial as number);
        this.persist();
    }

    /**
     * Coalesced. A resize drag calls this on every pointermove, and
     * localStorage.setItem is synchronous — writing a JSON blob per frame is a
     * main-thread stall in the middle of the one gesture that has to stay
     * smooth. Nothing here needs to survive the next 250ms.
     */
    private persist(): void {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.flush(), 250);
    }

    private flush(): void {
        clearTimeout(this.saveTimer);
        this.saveTimer = undefined;

        const snapshot: PersistedWorkspace = {
            leftWidth: this.leftWidth(),
            rightWidth: this.rightWidth(),
            timelineHeight: this.timelineHeight(),
            previewZoom: this.previewZoom(),
            timelineZoom: this.timelineZoom(),
            timelineOpen: this.timelineOpen(),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
            /* private mode — the workspace just starts at its defaults next time */
        }
    }

    private restore(): void {
        let raw: string | null = null;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch {
            return;
        }
        if (!raw) {
            return;
        }
        try {
            const saved = JSON.parse(raw) as Partial<PersistedWorkspace>;
            if (typeof saved.leftWidth === 'number') {
                this.leftWidth.set(clamp(saved.leftWidth, WORKSPACE_LIMITS.leftWidth));
            }
            if (typeof saved.rightWidth === 'number') {
                this.rightWidth.set(clamp(saved.rightWidth, WORKSPACE_LIMITS.rightWidth));
            }
            if (typeof saved.timelineHeight === 'number') {
                this.timelineHeight.set(clamp(saved.timelineHeight, WORKSPACE_LIMITS.timelineHeight));
            }
            if (typeof saved.previewZoom === 'number') {
                this.previewZoom.set(clamp(saved.previewZoom, WORKSPACE_LIMITS.previewZoom));
            }
            if (typeof saved.timelineZoom === 'number') {
                this.timelineZoom.set(clamp(saved.timelineZoom, WORKSPACE_LIMITS.timelineZoom));
            }
            if (typeof saved.timelineOpen === 'boolean') {
                this.timelineOpen.set(saved.timelineOpen);
            }
        } catch {
            /* corrupt entry — defaults are a fine answer */
        }
    }
}

function clamp(value: number, range: { min: number; max: number }): number {
    return Math.min(range.max, Math.max(range.min, Math.round(value)));
}
