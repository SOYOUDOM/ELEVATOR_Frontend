import { Component, Input } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvSkeletonShape = 'line' | 'text' | 'block' | 'circle' | 'chip' | 'avatar-text';
export type ElvSkeletonCorner = 'notch' | 'round' | 'pill' | 'sharp';
export type ElvSkeletonAnim = 'shimmer' | 'pulse' | 'none';

@Component({
    selector: 'app-elv-skeleton',
    standalone: true,
    imports: [],
    templateUrl: './elv-skeleton.component.html',
    styleUrl: './elv-skeleton.component.scss',
})
export class ElvSkeletonComponent {
    @Input() shape: ElvSkeletonShape = 'line';
    @Input() corner: ElvSkeletonCorner = 'sharp';
    @Input() animation: ElvSkeletonAnim = 'shimmer';

    /** Number of bars for 'text' — the last one is shortened automatically. */
    @Input() lines = 3;
    /** Repeats the whole placeholder, e.g. one per pending table row. */
    @Input() count = 1;

    /** Any CSS length. Defaults come from the shape when left empty. */
    @Input() width = '';
    @Input() height = '';

    /** Announced while the placeholder is on screen. */
    @Input() ariaLabel = 'Loading';
    @Input() customClass = '';

    get lineItems(): number[] {
        return Array.from({ length: Math.max(1, this.lines) });
    }

    get items(): number[] {
        return Array.from({ length: Math.max(1, this.count) });
    }

    get classes(): string {
        return [
            'elv-skeleton',
            `elv-skeleton--${this.shape}`,
            `elv-skeleton--${this.corner}`,
            `elv-skeleton--anim-${this.animation}`,
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }
}

// ── Usage ─────────────────────────────────────────────────────────
//
// Shapes (line | text | block | circle | chip | avatar-text):
// <app-elv-skeleton shape="line" />                       <!-- one bar -->
// <app-elv-skeleton shape="text" [lines]="4" />           <!-- paragraph, last line short -->
// <app-elv-skeleton shape="block" height="180px" />       <!-- card / image placeholder -->
// <app-elv-skeleton shape="circle" width="2.5rem" />      <!-- avatar placeholder -->
// <app-elv-skeleton shape="chip" />                       <!-- badge placeholder -->
// <app-elv-skeleton shape="avatar-text" />                <!-- avatar + two lines -->
//
// Repeat for lists and tables:
// <app-elv-skeleton shape="avatar-text" [count]="6" />
//
// Explicit dimensions (any CSS length):
// <app-elv-skeleton shape="line" width="60%" height="14px" />
//
// Corners (notch | round | pill | sharp) · Animation (shimmer | pulse | none):
// <app-elv-skeleton shape="block" corner="notch" height="140px" />
// <app-elv-skeleton shape="text" animation="pulse" />
// <app-elv-skeleton shape="text" animation="none" />
//
// Animation is dropped automatically under `prefers-reduced-motion`.
//
// Typical swap-in:
// @if (loading) {
//   <app-elv-skeleton shape="avatar-text" [count]="5" ariaLabel="Loading users" />
// } @else {
//   <app-users-table [users]="users" />
// }
