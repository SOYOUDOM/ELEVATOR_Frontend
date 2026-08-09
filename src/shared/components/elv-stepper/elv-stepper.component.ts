import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    afterNextRender,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    output,
    untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type {
    ElvStepperConnector,
    ElvStepperItem,
    ElvStepperOrientation,
    ElvStepperReach,
    ElvStepperSelection,
    ElvStepperSize,
    ElvStepperState,
    ElvStepperVariant,
} from './elv-stepper.types';

/** One item plus everything the template needs, computed once per change. */
interface ResolvedStep {
    item: ElvStepperItem;
    index: number;
    state: ElvStepperState;
    marker: string;
    icon: string | null;
    selectable: boolean;
    incomplete: boolean;
}

/**
 * ELEVATOR — the stepper.
 *
 * A track of numbered markers joined by rules, with the caption under each
 * marker. Purely presentational: it derives every state from `items` +
 * `activeId` and emits a selection; it owns no navigation and no domain type.
 *
 * Three details worth knowing:
 *
 *   • The connectors are real list items, not pseudo-elements. That lets the
 *     rules flex to fill whatever space is left over, so the markers stay
 *     evenly distributed at any width and any number of steps — a `::after`
 *     approach has to hard-code a width and breaks at 7+ items.
 *
 *   • Below the app's `mobile` breakpoint the track scrolls sideways instead
 *     of cramming seven captions into 390px. `keepActiveInView()` scrolls the
 *     active marker back to centre whenever it changes, so the scroll never
 *     hides the thing the user cares about.
 *
 *   • Everything is signal inputs and `computed`, so this is safe under the
 *     app's zoneless bootstrap without a single `markForCheck`.
 *
 * ```html
 * <elv-stepper
 *   [items]="steps"
 *   [activeId]="current()"
 *   [clickable]="true"
 *   reach="visited"
 *   (stepSelected)="go($event.id)" />
 * ```
 */
@Component({
    selector: 'elv-stepper',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './elv-stepper.component.html',
    styleUrl: './elv-stepper.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[attr.data-orientation]': 'orientation()',
        '[attr.data-size]': 'size()',
        '[attr.data-connector]': 'connector()',
        '[attr.data-variant]': 'variant()',
    },
})
export class ElvStepperComponent {
    // ── Content ───────────────────────────────────────────────────────
    readonly items = input.required<readonly ElvStepperItem[]>();

    /** Id of the step the user is on. Anything before it reads as done. */
    readonly activeId = input<string | null>(null);

    // ── Appearance ────────────────────────────────────────────────────
    /**
     * `elevator` swaps the neutral track for the ELEVATOR shaft: floors, a
     * riding car, mint for the current floor and cyan for completed ones.
     */
    readonly variant = input<ElvStepperVariant>('default');

    readonly orientation = input<ElvStepperOrientation>('horizontal');
    readonly size = input<ElvStepperSize>('medium');
    readonly connector = input<ElvStepperConnector>('dashed');

    /** Swap the marker for a tick once a step is behind the active one. */
    readonly completedIcon = input<string>('pi pi-check');

    readonly showLabels = input(true, { transform: booleanAttribute });

    /** Renders a "STEP 2 OF 7" line above the track. Off by default. */
    readonly showCounter = input(false, { transform: booleanAttribute });

    // ── Behaviour ─────────────────────────────────────────────────────
    readonly clickable = input(false, { transform: booleanAttribute });
    readonly reach = input<ElvStepperReach>('visited');

    readonly ariaLabel = input<string>('Progress');

    readonly stepSelected = output<ElvStepperSelection>();

    // ── Derived state ─────────────────────────────────────────────────
    /** Position of the active step, or 0 when `activeId` matches nothing. */
    readonly activeIndex = computed(() => {
        const id = this.activeId();
        const found = this.items().findIndex((item) => item.id === id);
        return found === -1 ? 0 : found;
    });

    readonly steps = computed<ResolvedStep[]>(() => {
        const active = this.activeIndex();
        const reach = this.reach();
        const clickable = this.clickable();
        const doneIcon = this.completedIcon();
        const elevator = this.variant() === 'elevator';

        return this.items().map((item, index) => {
            const state = this.stateFor(item, index, active);
            const isDone = state === 'done';

            return {
                item,
                index,
                state,
                // The elevator shaft numbers its floors 01, 02, … — a bare
                // "1" would read as a list item rather than a floor.
                marker: String(item.marker ?? (elevator ? pad2(index + 1) : index + 1)),
                icon: item.icon ?? (isDone && doneIcon ? doneIcon : null),
                selectable: clickable && !item.disabled && (reach === 'all' || index <= active),
                incomplete: item.incomplete === true,
            };
        });
    });

    readonly counterLabel = computed(() => `Step ${this.activeIndex() + 1} of ${this.items().length}`);

    /** 0–100. Exposed so a host can drive a bar off the same source. */
    readonly percent = computed(() => {
        const total = this.items().length;
        if (total <= 1) {
            return total === 1 ? 100 : 0;
        }
        return Math.round((this.activeIndex() / (total - 1)) * 100);
    });

    // ── DI ────────────────────────────────────────────────────────────
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    constructor() {
        // Track the active marker into view on every change, including the
        // first paint. `untracked` keeps the DOM read out of the dependency
        // graph — only activeIndex should retrigger this.
        afterNextRender(() => {
            this.keepActiveInView();
            this.parkCar();
        });
        effect(() => {
            this.activeIndex();
            this.variant();
            untracked(() => {
                this.keepActiveInView();
                this.parkCar();
            });
        });
    }

    protected onSelect(step: ResolvedStep): void {
        if (!step.selectable) {
            return;
        }
        this.stepSelected.emit({ id: step.item.id, index: step.index, item: step.item });
    }

    private stateFor(item: ElvStepperItem, index: number, active: number): ElvStepperState {
        if (item.disabled) {
            return 'disabled';
        }
        if (index < active) {
            return 'done';
        }
        return index === active ? 'active' : 'upcoming';
    }

    /**
     * Only does anything while the track actually overflows — i.e. on narrow
     * screens. `scrollIntoView` would scroll the whole page otherwise, which is
     * why this sets `scrollLeft` on the track directly.
     */
    private keepActiveInView(): void {
        const track = this.host.nativeElement.querySelector<HTMLElement>('.elv-stepper__track');
        const marker = track?.querySelector<HTMLElement>('.elv-stepper__step[data-state="active"]');

        if (!track || !marker || track.scrollWidth <= track.clientWidth) {
            return;
        }

        const target = marker.offsetLeft - (track.clientWidth - marker.offsetWidth) / 2;

        track.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    /**
     * Moves the elevator car to the active floor.
     *
     * Measured rather than calculated from an index: the floors are laid out
     * by flex `gap`, so their pitch depends on label wrapping and the size
     * axis. Reading the marker's real offset is correct at any of them.
     *
     * The position is published as a custom property and the stylesheet moves
     * the car with the standalone `translate` property — never `transform`,
     * which would collide with the fill-mode trap on a centred element.
     */
    private parkCar(): void {
        if (this.variant() !== 'elevator') {
            return;
        }

        const root = this.host.nativeElement;
        const track = root.querySelector<HTMLElement>('.elv-stepper__track');
        const marker = track?.querySelector<HTMLElement>(
            '.elv-stepper__step[data-state="active"] .elv-stepper__marker'
        );

        if (!track || !marker) {
            return;
        }

        // offsetTop is relative to the nearest positioned ancestor; the track
        // is that ancestor in the elevator variant, so this needs no walking.
        const y = marker.offsetTop + marker.offsetHeight / 2;
        const x = marker.offsetLeft + marker.offsetWidth / 2;

        root.style.setProperty('--elv-stepper-car-y', `${Math.round(y)}px`);
        root.style.setProperty('--elv-stepper-car-x', `${Math.round(x)}px`);
    }
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function reducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/* ============================================================================
   ElvStepper — usage reference
   <elv-stepper> · selector: elv-stepper
   ============================================================================

   ── MINIMAL ───────────────────────────────────────────────────────────────
   <elv-stepper [items]="steps" [activeId]="'basic-info'" />

   steps: ElvStepperItem[] = [
     { id: 'start',      label: 'Get started' },
     { id: 'basic-info', label: 'Basic info'  },
     { id: 'finish',     label: 'Finish'      },
   ];

   ── NAVIGABLE ─────────────────────────────────────────────────────────────
   reach="visited" (default) lets the user click back to steps they have
   already passed. reach="all" opens the whole track.

   <elv-stepper [items]="steps" [activeId]="active()"
                [clickable]="true" reach="visited"
                (stepSelected)="router.navigate([$event.item.id])" />

   ── APPEARANCE ────────────────────────────────────────────────────────────
   orientation   horizontal | vertical          (default horizontal)
   size          small | medium | large         (default medium)
   connector     dashed | solid | none          (default dashed)
   showLabels    boolean                        (default true)
   showCounter   boolean — "STEP 2 OF 7" line   (default false)
   completedIcon full icon class, '' to keep the number on done steps

   <elv-stepper [items]="steps" [activeId]="active()"
                orientation="vertical" size="small" connector="solid" />

   <elv-stepper [items]="steps" [activeId]="active()"
                [showLabels]="false" completedIcon="" />

   ── CUSTOM MARKERS ────────────────────────────────────────────────────────
   `marker` replaces the 1-based index; `icon` replaces the marker entirely.

   { id: 'lobby', label: 'Lobby',  marker: 'G'  }
   { id: 'roof',  label: 'Roof',   icon: 'pi pi-flag' }
   { id: 'vault', label: 'Vault',  disabled: true }

   ── THEMING ───────────────────────────────────────────────────────────────
   Every colour comes from --p-elevator-*. Override per instance with the
   component's own custom properties:

   <elv-stepper style="--elv-stepper-dot: 44px; --elv-stepper-gap: 20px"
                [items]="steps" [activeId]="active()" />

   --elv-stepper-dot     marker diameter
   --elv-stepper-gap     space between marker and label
   --elv-stepper-accent  active/done colour
   --elv-stepper-line    connector colour

   ── OUTPUT ────────────────────────────────────────────────────────────────
   (stepSelected)  ElvStepperSelection { id, index, item }
   ============================================================================ */
