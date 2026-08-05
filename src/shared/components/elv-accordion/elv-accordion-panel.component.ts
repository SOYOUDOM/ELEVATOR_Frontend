import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    Directive,
    effect,
    ElementRef,
    forwardRef,
    inject,
    Injector,
    input,
    model,
    numberAttribute,
    OnDestroy,
    output,
    signal,
    TemplateRef,
    untracked,
    viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { ELV_ACCORDION_DEFAULTS } from './elv-accordion.config';
import { ElvAccordionComponent } from './elv-accordion.component';
import type {
    ElvAccordionCorner,
    ElvAccordionDensity,
    ElvAccordionHeadingLevel,
    ElvAccordionSkin,
} from './elv-accordion.types';

let seq = 0;

/**
 * Optional body template.
 *
 * `[lazy]` can only be honest when the body is a TEMPLATE. Angular instantiates
 * projected content eagerly — nodes written between the panel's tags are created
 * with the CONSUMER's view, whether or not an <ng-content> slot is currently
 * rendered — so gating <ng-content> behind an @if defers attachment, not
 * construction, and buys nothing. A template defers both.
 *
 *   <elv-accordion-panel panelId="preview" [lazy]="true">
 *     <ng-template elvPanelBody><heavy-chart /></ng-template>
 *   </elv-accordion-panel>
 */
@Directive({ selector: '[elvPanelBody]', standalone: true })
export class ElvPanelBodyDirective {
    readonly tpl = inject(TemplateRef);
}

/**
 * ELEVATOR — one accordion panel.
 *
 * Renders a header row and a body, and reports itself to whichever container
 * it finds above it. Works standalone: with no container, its own
 * [(expanded)] model is the source of truth.
 *
 * The height animation is grid-template-rows 0fr → 1fr, the same technique
 * elv-field uses for .fld__assist. It animates to INTRINSIC height, so there
 * is no magic max-height to outgrow and no JS measurement. `min-height: 0` on
 * the clip is mandatory — without it the row never collapses.
 *
 * ⚠ SPECIFICITY — :host is (0,1,0); a bare `elv-accordion-panel` selector is
 * (0,0,1) and loses to everything declared here. To override from a parent,
 * use `.parent elv-accordion-panel` (0,1,1), an inline style, or retune the
 * upstream --p-elevator-* token.
 */
@Component({
    selector: 'elv-accordion-panel',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './elv-accordion-panel.component.html',
    styleUrl: './elv-accordion-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-skin]': 'skin()',
        '[attr.data-density]': 'density()',
        '[attr.data-corner]': 'corner()',
        '[style.--elv-accent]': 'accent()',
    },
})
export class ElvAccordionPanelComponent implements OnDestroy {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_ACCORDION_DEFAULTS);
    private readonly injector = inject(Injector);

    /**
     * The nearest accordion ABOVE this panel.
     *
     * `skipSelf` walks past this element's own injector, and the element
     * injector tree follows the logical DOM — so a panel inside a nested
     * accordion finds the NESTED container, never the outer one. `optional`
     * is what keeps a bare <elv-accordion-panel> usable on its own.
     *
     * forwardRef because the container imports this class for its
     * contentChildren query, making the two modules mutually dependent.
     */
    readonly accordion = inject<ElvAccordionComponent | null>(
        forwardRef(() => ElvAccordionComponent),
        { optional: true, skipSelf: true }
    );

    // ── identity (stable ids for the aria-controls / labelledby pair) ─
    private readonly uid = `elv-acc-${++seq}`;
    readonly headerId = `${this.uid}-header`;
    readonly bodyId = `${this.uid}-body`;

    // ── content ───────────────────────────────────────────────────────
    /** Stable key used in the container's `value`. */
    readonly panelId = input.required<string>();
    readonly header = input('');
    readonly subtitle = input('');
    /** Leading PrimeIcon name WITHOUT the `pi ` prefix, e.g. 'pi-user'. */
    readonly icon = input('');
    readonly badge = input<string | number>('');

    // ── behaviour ─────────────────────────────────────────────────────
    readonly disabledIn = input(false, { transform: booleanAttribute, alias: 'disabled' });
    /**
     * Two-way open state for the standalone case, and a live mirror of the
     * container's decision when there is one. The container always wins:
     * inside one, writing this input seeds the initial state only.
     */
    readonly expanded = model(false);
    /** Defer first mount until first open. Requires <ng-template elvPanelBody>. */
    readonly lazy = input(false, { transform: booleanAttribute });

    // ── visual (null ⇒ inherit the container, then the DI default) ────
    readonly skinIn = input<ElvAccordionSkin | null>(null, { alias: 'skin' });
    readonly densityIn = input<ElvAccordionDensity | null>(null, { alias: 'density' });
    readonly cornerIn = input<ElvAccordionCorner | null>(null, { alias: 'corner' });
    // Two type args are required whenever a transform is present.
    readonly headingLevelIn = input<ElvAccordionHeadingLevel | null, unknown>(null, {
        transform: headingLevelOf,
        alias: 'headingLevel',
    });
    readonly hideIconIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'hideIcon' });
    /**
     * Per-panel accent override. Any CSS colour.
     *
     * Bound as an INLINE style rather than inherited: the panel's own :host
     * block re-declares --elv-accent, which would otherwise shadow a value
     * cascading down from the container.
     */
    readonly accentIn = input<string | null>(null, { alias: 'accent' });

    readonly skin = computed(() => this.skinIn() ?? this.accordion?.skin() ?? this.cfg.skin);
    readonly density = computed(() => this.densityIn() ?? this.accordion?.density() ?? this.cfg.density);
    readonly corner = computed(() => this.cornerIn() ?? this.accordion?.corner() ?? this.cfg.corner);
    readonly headingLevel = computed(
        () => this.headingLevelIn() ?? this.accordion?.headingLevel() ?? this.cfg.headingLevel
    );
    readonly hideIcon = computed(() => this.hideIconIn() ?? this.accordion?.hideIcons() ?? this.cfg.hideIcons);
    readonly accent = computed(() => this.accentIn() ?? this.accordion?.accent() ?? null);

    // ── outputs ───────────────────────────────────────────────────────
    readonly opened = output<string>();
    readonly closed = output<string>();

    // ── view / content refs ───────────────────────────────────────────
    private readonly headerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
    private readonly bodyRef = viewChild<ElementRef<HTMLElement>>('body');
    readonly bodyTpl = contentChild(ElvPanelBodyDirective);

    // ── internal state ────────────────────────────────────────────────
    /** Latched by lazy: false until the first open, true forever after. */
    private readonly everOpened = signal(false);
    /**
     * Drops `overflow: hidden` once the open transition has finished, so a
     * focus ring, tooltip or dropdown inside the body is not sheared off.
     * Restored the instant a collapse starts, or the row cannot clip.
     */
    private readonly unclipped = signal(false);
    private unclipTimer: ReturnType<typeof setTimeout> | null = null;
    /**
     * Keyboard focus on the header, as a host class.
     *
     * Not `:host(:focus-within)` — that would also fire for an <elv-field>
     * inside the body, lighting the header's ring for a focus that is not on
     * it. Not `:host(:has(.acc__trigger:focus-visible))` either: Angular's
     * emulated-encapsulation rewriter does not reliably scope selectors nested
     * inside :has(). Asking the element itself is exact and cheap.
     */
    private readonly headerFocused = signal(false);

    // ── derived state ─────────────────────────────────────────────────
    /**
     * The container is authoritative when there is one. That keeps
     * single-open mode from fighting a stale per-panel flag; `expanded` is
     * mirrored back below so [(expanded)] still reads true.
     */
    readonly isOpen = computed(() => (this.accordion ? this.accordion.isPanelOpen(this.panelId()) : this.expanded()));

    readonly isDisabled = computed(() => this.disabledIn() || (this.accordion?.disabled() ?? false));

    readonly index = computed(() => this.accordion?.indexOf(this) ?? 0);
    readonly isFirst = computed(() => this.index() === 0);
    readonly isLast = computed(() => {
        const acc = this.accordion;
        return acc ? this.index() === acc.count() - 1 : true;
    });

    /** Lazy panels stay empty until first open; everything else mounts at once. */
    readonly shouldRenderBody = computed(() => !this.lazy() || this.everOpened());

    readonly showIcon = computed(() => !!this.icon() && !this.hideIcon());
    readonly badgeText = computed(() => {
        const b = this.badge();
        return b === '' || b === null || b === undefined ? '' : String(b);
    });

    readonly isUnclipped = this.unclipped.asReadonly();

    readonly hostClass = computed(() =>
        [
            'elv-accordion-panel',
            this.isOpen() ? 'is-open' : 'is-closed',
            this.isDisabled() ? 'is-disabled' : '',
            this.headerFocused() ? 'is-focus' : '',
            this.isFirst() ? 'is-first' : '',
            this.isLast() ? 'is-last' : '',
            this.accordion ? 'is-grouped' : 'is-solo',
        ]
            .filter(Boolean)
            .join(' ')
    );

    // ── construction ──────────────────────────────────────────────────
    constructor() {
        // Mirror the resolved state back into the model so [(expanded)] is
        // truthful inside a container without ever becoming a second source
        // of truth — this only ever follows isOpen().
        effect(() => {
            const open = this.isOpen();
            untracked(() => {
                if (this.expanded() !== open) {
                    this.expanded.set(open);
                }
                if (open) {
                    this.everOpened.set(true);
                }
            });
        });

        // Clipping policy. Opening: wait for the height transition to finish,
        // then drop overflow so focus rings escape. Closing: restore it in the
        // same change-detection pass that removes .is-open, so the collapse is
        // clipped from its first frame.
        effect(() => {
            const open = this.isOpen();
            untracked(() => {
                this.clearUnclipTimer();
                if (!open) {
                    this.unclipped.set(false);
                    return;
                }
                // Fallback for the cases where transitionend never arrives:
                // a panel that renders already open, or a display:none
                // ancestor. Cheap, and cancelled by the real event.
                this.unclipTimer = setTimeout(() => this.unclipped.set(true), 420);
            });
        });

        // A panel written as [expanded]="true" should open the container it is
        // in. afterNextRender is not an injection context, so the injector is
        // passed explicitly (NG0203 otherwise).
        afterNextRender(
            () => {
                if (this.accordion && untracked(() => this.expanded()) && !untracked(() => this.isOpen())) {
                    this.accordion.openInitial(untracked(() => this.panelId()));
                }
            },
            { injector: this.injector }
        );
    }

    ngOnDestroy(): void {
        this.clearUnclipTimer();
    }

    // ── DOM handlers ──────────────────────────────────────────────────
    /**
     * The WHOLE row is the hit target, not just the label. The real control is
     * the <button>; this handler catches the padding, the chevron and the
     * subtitle, which are outside it. A click that started on the button
     * bubbles here exactly once, so there is no double toggle — and that is
     * also how Enter and Space arrive, via the button's native click.
     */
    handleRowClick(ev: MouseEvent): void {
        const target = ev.target as HTMLElement | null;
        // Actions stop their own propagation, but a projected control that
        // forgets to should still never toggle the panel.
        if (target?.closest('.acc__actions')) {
            return;
        }
        if (target?.closest('a, input, select, textarea, [contenteditable]')) {
            return;
        }
        if (target?.closest('button') && !target.closest('.acc__trigger')) {
            return;
        }
        this.toggle();
    }

    handleKeydown(ev: KeyboardEvent): void {
        this.accordion?.handleHeaderKeydown(ev, this);
    }

    /** :focus-visible only — a pointer press must not leave a ring behind. */
    handleHeaderFocus(ev: FocusEvent): void {
        const el = ev.target as HTMLElement | null;
        this.headerFocused.set(!!el?.matches(':focus-visible'));
    }

    handleHeaderBlur(): void {
        this.headerFocused.set(false);
    }

    /**
     * Filters hard, because transitionend fires for EVERY animated property
     * and bubbles from every descendant — the chevron's transform and, worse,
     * a nested accordion's own grid-template-rows would otherwise drop this
     * panel's clipping at the wrong moment.
     */
    handleTransitionEnd(ev: TransitionEvent): void {
        if (ev.propertyName !== 'grid-template-rows') {
            return;
        }
        if (ev.target !== this.bodyRef()?.nativeElement) {
            return;
        }
        this.clearUnclipTimer();
        this.unclipped.set(this.isOpen());
    }

    // ── public API ────────────────────────────────────────────────────
    toggle(): void {
        if (this.isDisabled()) {
            return;
        }
        const acc = this.accordion;
        const id = untracked(() => this.panelId());
        const wasOpen = untracked(() => this.isOpen());

        if (acc) {
            acc.toggle(id);
        } else {
            this.expanded.set(!wasOpen);
        }

        // Read through again rather than assuming: `collapsible: false` can
        // refuse the close, and emitting a (closed) that did not happen is
        // worse than emitting nothing.
        const nowOpen = untracked(() => this.isOpen());
        if (nowOpen === wasOpen) {
            return;
        }
        if (nowOpen) {
            this.opened.emit(id);
        } else {
            this.closed.emit(id);
        }
    }

    open(): void {
        if (!untracked(() => this.isOpen())) {
            this.toggle();
        }
    }

    close(): void {
        if (untracked(() => this.isOpen())) {
            this.toggle();
        }
    }

    focusHeader(): void {
        this.headerRef()?.nativeElement.focus();
    }

    private clearUnclipTimer(): void {
        if (this.unclipTimer !== null) {
            clearTimeout(this.unclipTimer);
            this.unclipTimer = null;
        }
    }
}

// ── helpers ───────────────────────────────────────────────────────────
/** Distinguishes "not written" (null) from an explicit `[x]="false"`. */
function nullBool(v: unknown): boolean | null {
    return v === null || v === undefined ? null : booleanAttribute(v);
}

function headingLevelOf(v: unknown): ElvAccordionHeadingLevel | null {
    if (v == null || v === '') {
        return null;
    }
    const n = numberAttribute(v);
    if (!Number.isFinite(n)) {
        return null;
    }
    return Math.min(6, Math.max(1, Math.round(n))) as ElvAccordionHeadingLevel;
}
