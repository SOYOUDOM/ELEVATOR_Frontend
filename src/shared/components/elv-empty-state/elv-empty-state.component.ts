import { Component, EventEmitter, Input, Output } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvEmptySkin = 'panel' | 'outline' | 'dashed' | 'ghost' | 'glass';
export type ElvEmptySize = 'sm' | 'md' | 'lg';
export type ElvEmptyCorner = 'notch' | 'round' | 'sharp';
export type ElvEmptyFrame = 'none' | 'circle' | 'round' | 'square';

/* ── Presets (variant) ────────────────────────────────────────── */
export type ElvEmptyVariant =
    | 'empty' // nothing here yet (default)
    | 'search' // a filter/query returned nothing
    | 'error' // the load failed
    | 'offline' // no connection
    | 'locked'; // no permission

interface PresetDef {
    icon?: string;
    skin?: ElvEmptySkin;
    frame?: ElvEmptyFrame;
    tone?: 'accent' | 'danger' | 'neutral';
}

const PRESETS: Record<ElvEmptyVariant, PresetDef> = {
    empty: { icon: 'pi-inbox', skin: 'dashed', frame: 'circle', tone: 'neutral' },
    search: { icon: 'pi-search', skin: 'dashed', frame: 'circle', tone: 'neutral' },
    error: { icon: 'pi-exclamation-triangle', skin: 'panel', frame: 'circle', tone: 'danger' },
    offline: { icon: 'pi-wifi', skin: 'panel', frame: 'circle', tone: 'neutral' },
    locked: { icon: 'pi-lock', skin: 'panel', frame: 'circle', tone: 'accent' },
};

@Component({
    selector: 'app-elv-empty-state',
    standalone: true,
    imports: [],
    templateUrl: './elv-empty-state.component.html',
    styleUrl: './elv-empty-state.component.scss',
})
export class ElvEmptyStateComponent {
    /** Preset that pre-sets icon + skin + frame + tone for a common case. */
    @Input() variant: ElvEmptyVariant = 'empty';

    /* Composable axes — any of these overrides the preset. */
    @Input() skin?: ElvEmptySkin;
    @Input() frame?: ElvEmptyFrame;
    @Input() size: ElvEmptySize = 'md';
    @Input() corner: ElvEmptyCorner = 'notch';

    /* Content. `icon` is a primeicons name — 'pi-inbox' (NOT 'pi pi-inbox').
       Pass 'none' to render no icon at all. */
    @Input() icon = '';
    @Input() eyebrow = '';
    @Input() title = '';
    @Input() text = '';

    @Input() ticks = false;
    @Input() glow = false;

    @Input() accentColor = '';
    @Input() customClass = '';

    /** Optional single action — for anything richer, project [empty-actions]. */
    @Input() actionTitle = '';
    @Output() action = new EventEmitter<Event>();

    get rSkin(): ElvEmptySkin {
        return this.skin ?? this.preset.skin ?? 'dashed';
    }
    get rFrame(): ElvEmptyFrame {
        return this.frame ?? this.preset.frame ?? 'circle';
    }
    get rTone(): string {
        return this.preset.tone ?? 'neutral';
    }

    get resolvedIcon(): string {
        if (this.icon === 'none') {
            return '';
        }
        return this.icon || this.preset.icon || '';
    }

    get classes(): string {
        return [
            'elv-empty',
            `elv-empty--${this.rSkin}`,
            `elv-empty--${this.size}`,
            `elv-empty--${this.corner}`,
            `elv-empty--frame-${this.rFrame}`,
            `elv-empty--tone-${this.rTone}`,
            this.ticks ? 'elv-empty--ticks' : '',
            this.glow ? 'elv-empty--glow' : '',
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }

    private get preset(): PresetDef {
        return PRESETS[this.variant] ?? {};
    }

    onAction(e: Event): void {
        this.action.emit(e);
    }
}

// ── Usage ─────────────────────────────────────────────────────────
//
// Presets (empty | search | error | offline | locked) — each sets icon + skin + tone:
// <app-elv-empty-state variant="empty"   title="No users yet" text="Invite your first teammate." />
// <app-elv-empty-state variant="search"  title="No matches"   text="Try a different keyword." />
// <app-elv-empty-state variant="error"   title="Couldn't load roles" text="Something went wrong." />
// <app-elv-empty-state variant="offline" title="You're offline" />
// <app-elv-empty-state variant="locked"  title="No access"     text="Ask an admin for permission." />
//
// Skins (panel | outline | dashed | ghost | glass) · Sizes (sm | md | lg):
// <app-elv-empty-state skin="ghost" size="sm" title="Nothing here" />
//
// Corners (notch | round | sharp) · Icon frame (none | circle | round | square):
// <app-elv-empty-state corner="round" frame="square" title="Empty" />
//
// Custom / no icon · eyebrow label:
// <app-elv-empty-state icon="pi-file-import" eyebrow="STEP 1" title="Upload a CV" />
// <app-elv-empty-state icon="none" title="Nothing to show" />
//
// Built-in single action:
// <app-elv-empty-state variant="empty" title="No tenants"
//                      actionTitle="Create tenant" (action)="createTenant()" />
//
// Richer actions / body via projection:
// <app-elv-empty-state variant="search" title="No results">
//   <p>Filters applied: role, status</p>                <!-- default slot -->
//   <div empty-actions>
//     <app-elv-button variant="ghost"   title="Clear filters" (clicked)="clear()" />
//     <app-elv-button variant="primary" title="New search" icon="pi-search" />
//   </div>
// </app-elv-empty-state>
//
// Decoration + theming:
// <app-elv-empty-state variant="empty" [ticks]="true" [glow]="true" accentColor="#5bd1ff"
//                      title="Drop a file to begin" />
