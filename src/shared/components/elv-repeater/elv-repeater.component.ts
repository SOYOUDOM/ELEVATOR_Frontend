import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    contentChild,
    input,
    model,
    numberAttribute,
    output,
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';

import { ElvButtonComponent } from '../elv-button/elv-button.component';
import { ElvCardComponent } from '../elv-card/elv-card.component';
import { ElvEmptyStateComponent } from '../elv-empty-state/elv-empty-state.component';
import { ElvRepeaterItemDirective } from './elv-repeater-item.directive';

/** Emitted whenever a row is removed, so the caller can undo or confirm. */
export interface ElvRepeaterRemoval<T> {
    item: T;
    index: number;
}

/**
 * ELEVATOR — the repeater.
 *
 * A generic add / remove / reorder host. It owns the list mechanics; the
 * caller owns what a row looks like, projected through `*elvRepeaterItem`.
 * Experience, education, certifications, projects, links and references are
 * all the same component with a different template.
 *
 * ```html
 * <elv-repeater
 *   [(items)]="roles"
 *   [factory]="newRole"
 *   addLabel="ADD ROLE"
 *   emptyTitle="NO EXPERIENCE YET?"
 *   [cardTitle]="titleFor">
 *   <ng-template elvRepeaterItem let-role let-i="index">
 *     …fields bound to role…
 *   </ng-template>
 * </elv-repeater>
 * ```
 *
 * Design notes:
 *
 *   • `items` is a `model`, so `[(items)]` two-way binds and a parent signal
 *     stays the single source of truth. Every mutation replaces the array
 *     rather than splicing in place — required for signal identity to change.
 *
 *   • Reorder is up/down buttons, not drag. They work with a keyboard, a
 *     screen reader and a touch screen on the first try; drag is an
 *     enhancement that can be layered on later without changing this API.
 *
 *   • Removal is emitted as well as applied, so a caller that wants a confirm
 *     dialog can listen and undo — the repeater never assumes it is allowed
 *     to be destructive silently.
 */
@Component({
    selector: 'elv-repeater',
    standalone: true,
    imports: [NgTemplateOutlet, ElvCardComponent, ElvButtonComponent, ElvEmptyStateComponent],
    templateUrl: './elv-repeater.component.html',
    styleUrl: './elv-repeater.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-repeater' },
})
export class ElvRepeaterComponent<T> {
    /** The list. Two-way bindable: `[(items)]="roles"`. */
    readonly items = model<T[]>([]);

    /** Builds a blank row. Without it the ADD button is not rendered. */
    readonly factory = input<(() => T) | null>(null);

    /** Per-row heading. Falls back to "`itemNoun` 01". */
    readonly cardTitle = input<((item: T, index: number) => string) | null>(null);

    readonly itemNoun = input('Entry');

    // ── Copy ──────────────────────────────────────────────────────────
    readonly addLabel = input('Add');
    readonly emptyIcon = input('pi-inbox');
    readonly emptyTitle = input('Nothing here yet');
    readonly emptyText = input('');
    readonly emptyActionLabel = input('');

    // ── Behaviour ─────────────────────────────────────────────────────
    readonly reorderable = input(true, { transform: booleanAttribute });
    readonly removable = input(true, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });

    /** 0 means unlimited. */
    readonly max = input(0, { transform: numberAttribute });

    readonly added = output<T>();
    readonly removed = output<ElvRepeaterRemoval<T>>();
    readonly moved = output<{ from: number; to: number }>();
    /** Fired by the empty state's action button — e.g. the student branch CTA. */
    readonly emptyAction = output<void>();

    protected readonly row = contentChild(ElvRepeaterItemDirective<T>);

    protected readonly count = computed(() => this.items().length);
    protected readonly isEmpty = computed(() => this.count() === 0);
    protected readonly canAdd = computed(
        () => !!this.factory() && !this.disabled() && (this.max() === 0 || this.count() < this.max())
    );

    protected titleFor(item: T, index: number): string {
        const fn = this.cardTitle();
        const custom = fn?.(item, index)?.trim();
        return custom || `${this.itemNoun()} ${String(index + 1).padStart(2, '0')}`;
    }

    protected add(): void {
        const make = this.factory();
        if (!make || !this.canAdd()) {
            return;
        }
        const item = make();
        this.items.update((list) => [...list, item]);
        this.added.emit(item);
    }

    protected remove(index: number): void {
        const list = this.items();
        const item = list[index];
        if (item === undefined || this.disabled()) {
            return;
        }
        this.items.set(list.filter((_, i) => i !== index));
        this.removed.emit({ item, index });
    }

    /** `delta` is -1 for up, +1 for down. Out-of-range moves are no-ops. */
    protected move(index: number, delta: number): void {
        const list = this.items();
        const to = index + delta;
        if (this.disabled() || to < 0 || to >= list.length) {
            return;
        }
        const next = [...list];
        [next[index], next[to]] = [next[to], next[index]];
        this.items.set(next);
        this.moved.emit({ from: index, to });
    }
}
