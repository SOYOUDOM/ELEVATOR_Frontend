import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChildren,
    effect,
    inject,
    input,
    model,
    numberAttribute,
    output,
    untracked,
} from '@angular/core';

import { ELV_ACCORDION_DEFAULTS, ELV_ACCORDION_PRESETS } from './elv-accordion.config';
import { ElvAccordionPanelComponent } from './elv-accordion-panel.component';
import type {
    ElvAccordionCorner,
    ElvAccordionDensity,
    ElvAccordionHeadingLevel,
    ElvAccordionPreset,
    ElvAccordionPresetDef,
    ElvAccordionSkin,
} from './elv-accordion.types';

/**
 * ELEVATOR — the accordion container.
 *
 * Owns exactly two things: which panels are open, and where keyboard focus
 * goes. Everything visual belongs to the panel, because a projected
 * <elv-accordion-panel> carries the CONSUMER's _ngcontent attribute, not this
 * component's — container-scoped styles cannot reach it. So the container
 * styles only itself (gap, overflow-anchor) and hands the resolved axes down
 * through DI for each panel to re-emit on its own host.
 *
 * Panels are collected with `descendants: false`. That is what keeps a nested
 * accordion's panels out of this container's keyboard ring and out of its
 * single-open bookkeeping.
 *
 * ⚠ SPECIFICITY — :host is (0,1,0); a bare `elv-accordion` selector is (0,0,1)
 * and loses to everything declared here. To override from a parent, use
 * `.parent elv-accordion` (0,1,1), an inline style, or retune the upstream
 * --p-elevator-* token.
 */
@Component({
    selector: 'elv-accordion',
    standalone: true,
    templateUrl: './elv-accordion.component.html',
    styleUrl: './elv-accordion.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-skin]': 'skin()',
        '[attr.data-density]': 'density()',
        '[attr.data-corner]': 'corner()',
    },
})
export class ElvAccordionComponent {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_ACCORDION_DEFAULTS);
    private readonly presetMap = inject(ELV_ACCORDION_PRESETS);

    // ── preset ────────────────────────────────────────────────────────
    readonly preset = input<ElvAccordionPreset | null>(null);

    /** Empty object when no preset, so every `p().x` read below is safe. */
    private readonly p = computed<ElvAccordionPresetDef>(() => {
        const key = this.preset();
        return (key && this.presetMap[key]) || {};
    });

    // ── value ─────────────────────────────────────────────────────────
    /**
     * Open panel id(s). A string (or null) in single mode, a string[] in
     * multiple mode. Two-way bindable: [(value)]="openSection".
     *
     * This is the single source of truth for every panel that has a
     * container. A panel's own [(expanded)] mirrors it rather than competing
     * with it — see ElvAccordionPanelComponent.
     */
    readonly value = model<string | string[] | null>(null);

    // ── behaviour (null ⇒ inherit preset, then the DI default) ────────
    // Two type args are required whenever a transform is present — the
    // single-arg form resolves to the without-transform overloads.
    readonly multipleIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'multiple' });
    readonly collapsibleIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'collapsible' });
    readonly hideIconsIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'hideIcons' });
    /** Disables every panel underneath, without touching their own inputs. */
    readonly disabled = input(false, { transform: booleanAttribute });

    readonly multiple = computed(() => this.multipleIn() ?? this.p().multiple ?? this.cfg.multiple);
    readonly collapsible = computed(() => this.collapsibleIn() ?? this.p().collapsible ?? this.cfg.collapsible);
    readonly hideIcons = computed(() => this.hideIconsIn() ?? this.p().hideIcons ?? this.cfg.hideIcons);

    // ── visual (null ⇒ inherit preset, then the DI default) ───────────
    readonly skinIn = input<ElvAccordionSkin | null>(null, { alias: 'skin' });
    readonly densityIn = input<ElvAccordionDensity | null>(null, { alias: 'density' });
    readonly cornerIn = input<ElvAccordionCorner | null>(null, { alias: 'corner' });
    readonly headingLevelIn = input<ElvAccordionHeadingLevel | null, unknown>(null, {
        transform: headingLevel,
        alias: 'headingLevel',
    });
    /** Per-accordion accent override. Any CSS colour. */
    readonly accent = input<string | null>(null);

    readonly skin = computed(() => this.skinIn() ?? this.p().skin ?? this.cfg.skin);
    readonly density = computed(() => this.densityIn() ?? this.p().density ?? this.cfg.density);
    readonly corner = computed(() => this.cornerIn() ?? this.p().corner ?? this.cfg.corner);
    readonly headingLevel = computed(() => this.headingLevelIn() ?? this.p().headingLevel ?? this.cfg.headingLevel);

    // ── outputs ───────────────────────────────────────────────────────
    readonly opened = output<string>();
    readonly closed = output<string>();

    // ── content ───────────────────────────────────────────────────────
    /**
     * `descendants: false` is load-bearing, not a micro-optimisation: with it
     * on, a nested accordion's panels stay in the nested container's ring.
     * Without it they join this one's, and both keyboard navigation and
     * single-open mode break.
     */
    readonly panels = contentChildren(ElvAccordionPanelComponent, { descendants: false });

    // ── derived state ─────────────────────────────────────────────────
    /** Normalises the string | string[] | null union to one lookup shape. */
    readonly openSet = computed(() => {
        const v = this.value();
        if (v == null) {
            return new Set<string>();
        }
        return new Set(Array.isArray(v) ? v : [v]);
    });

    readonly openCount = computed(() => this.openSet().size);

    readonly hostClass = computed(() =>
        ['elv-accordion', this.disabled() ? 'is-disabled' : '', this.openCount() ? 'has-open' : '']
            .filter(Boolean)
            .join(' ')
    );

    /** Seeded on the effect's first run so initial state is not an "event". */
    private prevOpen: Set<string> | null = null;

    // ── construction ──────────────────────────────────────────────────
    constructor() {
        // Diffing the open set — rather than emitting from toggle() — means a
        // programmatic `value.set(...)` reports itself too, so (opened) is a
        // fact about state rather than a fact about clicks.
        effect(() => {
            const now = this.openSet();
            const prev = this.prevOpen;
            this.prevOpen = new Set(now);
            if (prev === null) {
                return;
            }
            untracked(() => {
                for (const id of now) {
                    if (!prev.has(id)) {
                        this.opened.emit(id);
                    }
                }
                for (const id of prev) {
                    if (!now.has(id)) {
                        this.closed.emit(id);
                    }
                }
            });
        });
    }

    // ── panel-facing API ──────────────────────────────────────────────
    isPanelOpen(id: string): boolean {
        return this.openSet().has(id);
    }

    /** Index in the keyboard ring; -1 for a panel that is not ours. */
    indexOf(panel: ElvAccordionPanelComponent): number {
        return this.panels().indexOf(panel);
    }

    count(): number {
        return this.panels().length;
    }

    /**
     * The one place open state changes. `collapsible` is honoured in single
     * mode only — that is where "the last open panel" is a meaningful idea;
     * in multiple mode every panel closes independently.
     */
    toggle(id: string): void {
        const isOpen = untracked(() => this.openSet()).has(id);

        if (untracked(() => this.multiple())) {
            const next = new Set(untracked(() => this.openSet()));
            if (isOpen) {
                next.delete(id);
            } else {
                next.add(id);
            }
            this.value.set([...next]);
            return;
        }

        if (isOpen) {
            if (!untracked(() => this.collapsible())) {
                return;
            }
            this.value.set(null);
        } else {
            this.value.set(id);
        }
    }

    /** Called by a panel that mounted with [expanded]="true" and no value set. */
    openInitial(id: string): void {
        if (untracked(() => this.openSet()).has(id)) {
            return;
        }
        if (untracked(() => this.multiple())) {
            this.value.set([...untracked(() => this.openSet()), id]);
        } else if (untracked(() => this.value()) == null) {
            this.value.set(id);
        }
    }

    openAll(): void {
        if (!untracked(() => this.multiple())) {
            return;
        }
        this.value.set(untracked(() => this.panels()).map((pn) => pn.panelId()));
    }

    closeAll(): void {
        this.value.set(untracked(() => this.multiple()) ? [] : null);
    }

    /**
     * WAI-ARIA accordion navigation. Bound on the header BUTTON, never on the
     * host — that is what keeps arrow keys inside body content (a textarea, a
     * nested accordion, a listbox) from being hijacked into moving between
     * headers.
     */
    handleHeaderKeydown(ev: KeyboardEvent, panel: ElvAccordionPanelComponent): void {
        const list = this.panels();
        const from = list.indexOf(panel);
        if (from < 0 || list.length === 0) {
            return;
        }

        let to: number;
        switch (ev.key) {
            case 'ArrowDown':
                to = (from + 1) % list.length;
                break;
            case 'ArrowUp':
                to = (from - 1 + list.length) % list.length;
                break;
            case 'Home':
                to = 0;
                break;
            case 'End':
                to = list.length - 1;
                break;
            default:
                // Enter and Space are left to the native button, which already
                // fires click for both. Handling them here would double-toggle.
                return;
        }

        // preventDefault stops Home/End scrolling the page; stopPropagation
        // keeps an outer accordion from acting on the same key.
        ev.preventDefault();
        ev.stopPropagation();
        list[to]?.focusHeader();
    }
}

// ── helpers ───────────────────────────────────────────────────────────
/** Distinguishes "not written" (null) from an explicit `[x]="false"`. */
function nullBool(v: unknown): boolean | null {
    return v === null || v === undefined ? null : booleanAttribute(v);
}

function headingLevel(v: unknown): ElvAccordionHeadingLevel | null {
    if (v == null || v === '') {
        return null;
    }
    const n = numberAttribute(v);
    if (!Number.isFinite(n)) {
        return null;
    }
    return Math.min(6, Math.max(1, Math.round(n))) as ElvAccordionHeadingLevel;
}
