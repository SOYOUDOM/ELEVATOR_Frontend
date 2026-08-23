import { Injectable, computed, signal } from '@angular/core';

import { type CvEditTarget, sameTarget, targetWithin } from '../models/cv-selection.model';

/**
 * ELEVATOR — ONE selection, three consumers.
 *
 * The builder, the preview and the Career Timeline do not talk to each other.
 * They all read this, and they all write to this. That is why clicking
 * "Wing Bank" in the document lights the right timeline bar and opens the right
 * form with no coordination code between the three panels.
 *
 * `focusToken` deserves a word: a focus request is an EVENT, but signals model
 * state. Re-selecting the same field would be a no-op if the target alone were
 * the signal, so the token increments on every request and the form effect
 * reacts to the token rather than to the target.
 *
 * Provided by the Create route, not root: a selection belongs to one editing
 * session and should die with it.
 */
export interface CvFocusRequest {
    target: CvEditTarget;
    token: number;
}

@Injectable()
export class CvSelectionStore {
    private readonly _target = signal<CvEditTarget | null>(null);
    private readonly _hovered = signal<CvEditTarget | null>(null);
    private readonly _focus = signal<CvFocusRequest | null>(null);
    private token = 0;

    readonly target = this._target.asReadonly();
    readonly hovered = this._hovered.asReadonly();
    readonly focusRequest = this._focus.asReadonly();

    /** The section that owns the current selection — what the builder opens. */
    readonly sectionId = computed(() => this._target()?.sectionId ?? null);
    readonly recordId = computed(() => this._target()?.recordId ?? null);

    /**
     * @param focus  true (default) also asks the form to scroll the input into
     *               view and focus it. Pass false for a selection the user did
     *               not initiate, such as one restored from a route.
     */
    select(target: CvEditTarget, focus = true): void {
        this._target.set(target);
        if (focus) {
            this._focus.set({ target, token: ++this.token });
        }
    }

    /** Selects a section without pointing at a record — the rail's behaviour. */
    selectSection(sectionId: CvEditTarget['sectionId'], focus = false): void {
        this.select({ sectionId }, focus);
    }

    clear(): void {
        this._target.set(null);
    }

    setHovered(target: CvEditTarget | null): void {
        this._hovered.set(target);
    }

    isSelected(target: CvEditTarget): boolean {
        return sameTarget(this._target(), target);
    }

    /** True when the selection sits anywhere inside `scope` (a section, or a record). */
    isWithin(scope: CvEditTarget): boolean {
        return targetWithin(this._target(), scope);
    }

    isHoveredWithin(scope: CvEditTarget): boolean {
        return targetWithin(this._hovered(), scope);
    }
}
