import { Component, Input } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvProgressShape = 'bar' | 'ring';
export type ElvProgressTone = 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export type ElvProgressSize = 'small' | 'medium' | 'large';
export type ElvProgressCorner = 'notch' | 'round' | 'pill' | 'sharp';

/** Ring geometry — a 100×100 viewBox keeps the SVG resolution-independent. */
const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

@Component({
    selector: 'app-elv-progress',
    standalone: true,
    imports: [],
    templateUrl: './elv-progress.component.html',
    styleUrl: './elv-progress.component.scss',
})
export class ElvProgressComponent {
    @Input() shape: ElvProgressShape = 'bar';
    @Input() tone: ElvProgressTone = 'accent';
    @Input() size: ElvProgressSize = 'medium';
    @Input() corner: ElvProgressCorner = 'pill';

    /** Current progress, expressed against [max]. Clamped for display. */
    @Input() value = 0;
    @Input() max = 100;

    /** Unknown duration — animates instead of tracking [value]. */
    @Input() indeterminate = false;

    @Input() label = '';
    /** Renders the percentage (bar: beside the label · ring: in the middle). */
    @Input() showValue = false;
    /** Overrides the rendered percentage with your own copy, e.g. '3 of 12'. */
    @Input() valueText = '';

    @Input() striped = false;
    @Input() glow = true;

    @Input() accentColor = '';
    @Input() ariaLabel = '';
    @Input() customClass = '';

    readonly ringRadius = RING_RADIUS;
    readonly ringCircumference = RING_CIRCUMFERENCE;

    /** 0–100, clamped and guarded against a zero/negative [max]. */
    get percent(): number {
        if (this.max <= 0) {
            return 0;
        }
        return Math.min(100, Math.max(0, (this.value / this.max) * 100));
    }

    get displayValue(): string {
        return this.valueText || `${Math.round(this.percent)}%`;
    }

    /** Length of the drawn arc; the indeterminate ring uses a fixed sweep. */
    get ringDashOffset(): number {
        const shown = this.indeterminate ? 25 : this.percent;
        return RING_CIRCUMFERENCE * (1 - shown / 100);
    }

    get hasHeader(): boolean {
        return !!this.label || this.showValue;
    }

    get classes(): string {
        return [
            'elv-progress',
            `elv-progress--${this.shape}`,
            `elv-progress--${this.tone}`,
            `elv-progress--${this.size}`,
            `elv-progress--${this.corner}`,
            this.indeterminate ? 'elv-progress--indeterminate' : '',
            this.striped ? 'elv-progress--striped' : '',
            this.glow ? 'elv-progress--glow' : '',
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }

    get resolvedAriaLabel(): string | null {
        return this.ariaLabel || this.label || null;
    }
}

// ── Usage ─────────────────────────────────────────────────────────
// Required: nothing — an empty bar is valid.
// <app-elv-progress [value]="64" />
//
// Shapes (bar | ring):
// <app-elv-progress shape="bar"  [value]="64" />
// <app-elv-progress shape="ring" [value]="64" [showValue]="true" />
//
// Tones (accent | info | success | warning | danger | neutral):
// <app-elv-progress [value]="92" tone="success" />
// <app-elv-progress [value]="12" tone="danger" />
//
// Sizes (small | medium | large) · Corners (notch | round | pill | sharp):
// <app-elv-progress [value]="40" size="large" corner="notch" />
//
// Label + percentage header:
// <app-elv-progress label="ATS SCORE" [value]="78" [showValue]="true" />
//
// Custom readout instead of a percentage:
// <app-elv-progress label="UPLOADED" [value]="3" [max]="12" [showValue]="true" valueText="3 of 12" />
//
// Unknown duration:
// <app-elv-progress [indeterminate]="true" label="IMPORTING" />
// <app-elv-progress shape="ring" [indeterminate]="true" />
//
// Striped fill · glow off:
// <app-elv-progress [value]="55" [striped]="true" />
// <app-elv-progress [value]="55" [glow]="false" />
//
// Per-instance accent override:
// <app-elv-progress [value]="70" accentColor="#ff5b8a" />
//
// Compose freely:
// <app-elv-progress shape="ring" size="large" tone="warning" [value]="88"
//                   [showValue]="true" label="QUOTA" />
