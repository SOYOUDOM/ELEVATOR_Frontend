import { Component, EventEmitter, Input, Output } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvAlertTone = 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral';
export type ElvAlertSkin = 'soft' | 'outline' | 'solid' | 'glass';
export type ElvAlertSize = 'small' | 'medium' | 'large';
export type ElvAlertCorner = 'notch' | 'round' | 'sharp';

/** Default primeicon per tone — overridden by [icon], suppressed by [icon]="'none'". */
const TONE_ICONS: Record<ElvAlertTone, string> = {
    info: 'pi-info-circle',
    success: 'pi-check-circle',
    warning: 'pi-exclamation-triangle',
    danger: 'pi-times-circle',
    accent: 'pi-bolt',
    neutral: 'pi-comment',
};

@Component({
    selector: 'app-elv-alert',
    standalone: true,
    imports: [],
    templateUrl: './elv-alert.component.html',
    styleUrl: './elv-alert.component.scss',
})
export class ElvAlertComponent {
    @Input() tone: ElvAlertTone = 'info';
    @Input() skin: ElvAlertSkin = 'soft';
    @Input() size: ElvAlertSize = 'medium';
    @Input() corner: ElvAlertCorner = 'notch';

    /* Content. `icon` is a primeicons name — 'pi-bolt' (NOT 'pi pi-bolt').
       Pass 'none' to render no icon at all. */
    @Input() icon = '';
    @Input() title = '';
    @Input() text = '';

    /** Accent edge bar down the leading side. */
    @Input() bar = false;
    /** Renders a close button and hides the alert on activation. */
    @Input() dismissible = false;
    @Input() closeAriaLabel = 'Dismiss';

    @Input() accentColor = '';
    @Input() customClass = '';

    /** Fires when the alert is dismissed. */
    @Output() closed = new EventEmitter<void>();

    /** Toggle externally to re-show a dismissed alert. */
    @Input() visible = true;
    @Output() visibleChange = new EventEmitter<boolean>();

    get resolvedIcon(): string {
        if (this.icon === 'none') {
            return '';
        }
        return this.icon || TONE_ICONS[this.tone];
    }

    /** Errors and warnings interrupt; everything else is polite. */
    get role(): string {
        return this.tone === 'danger' || this.tone === 'warning' ? 'alert' : 'status';
    }

    get classes(): string {
        return [
            'elv-alert',
            `elv-alert--${this.tone}`,
            `elv-alert--${this.skin}`,
            `elv-alert--${this.size}`,
            `elv-alert--${this.corner}`,
            this.bar ? 'elv-alert--bar' : '',
            this.dismissible ? 'elv-alert--dismissible' : '',
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }

    dismiss(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.closed.emit();
    }
}

// ── Usage ─────────────────────────────────────────────────────────
//
// Tones (info | success | warning | danger | accent | neutral):
// <app-elv-alert tone="info"    title="Heads up" text="Your export is queued." />
// <app-elv-alert tone="success" title="Saved"    text="The user was created." />
// <app-elv-alert tone="warning" title="Careful"  text="This tenant is inactive." />
// <app-elv-alert tone="danger"  title="Failed"   text="Could not reach the server." />
//
// Skins (soft | outline | solid | glass):
// <app-elv-alert tone="danger" skin="outline" title="Failed" />
// <app-elv-alert tone="accent" skin="solid"   title="New release" />
// <app-elv-alert tone="info"   skin="glass"   title="Translucent" />
//
// Sizes (small | medium | large) · Corners (notch | round | sharp):
// <app-elv-alert tone="info" size="small" corner="round" title="Compact" />
//
// Accent edge bar:
// <app-elv-alert tone="warning" [bar]="true" title="Quota almost reached" />
//
// Custom / no icon:
// <app-elv-alert tone="accent" icon="pi-sparkles" title="AI rewrite is live" />
// <app-elv-alert tone="neutral" icon="none" text="Plain message, no glyph." />
//
// Dismissible (two-way `visible`, plus a `closed` event):
// <app-elv-alert tone="success" [dismissible]="true" title="Done" (closed)="onClosed()" />
// <app-elv-alert tone="info" [dismissible]="true" [(visible)]="showTip" title="Tip" />
//
// Body + actions projection:
// <app-elv-alert tone="danger" title="3 records failed to import">
//   <ul><li>Row 12 — missing email</li><li>Row 40 — duplicate</li></ul>
//   <div alert-actions>
//     <app-elv-button variant="danger" size="small" title="Retry" (clicked)="retry()" />
//     <app-elv-button variant="ghost"  size="small" title="Download log" />
//   </div>
// </app-elv-alert>
//
// Per-instance accent override:
// <app-elv-alert tone="accent" accentColor="#ff5b8a" title="Pink accent" />
