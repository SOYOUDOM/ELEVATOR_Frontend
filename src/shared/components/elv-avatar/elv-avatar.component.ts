import { Component, EventEmitter, Input, Output } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvAvatarShape = 'circle' | 'round' | 'notch' | 'square';
export type ElvAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ElvAvatarStatus = 'none' | 'online' | 'idle' | 'busy' | 'offline';

/** Hues used by [autoColor] — spread far enough apart to stay distinguishable. */
const AUTO_HUES = [8, 42, 96, 152, 190, 218, 262, 310];

@Component({
    selector: 'app-elv-avatar',
    standalone: true,
    imports: [],
    templateUrl: './elv-avatar.component.html',
    styleUrl: './elv-avatar.component.scss',
})
export class ElvAvatarComponent {
    /* Content — first match wins: image → initials from name → icon. */
    @Input() image = '';
    @Input() name = '';
    /** Overrides the initials derived from [name]. */
    @Input() initials = '';
    /** Fallback primeicon when there is no image and no name — 'pi-user'. */
    @Input() icon = 'pi-user';

    @Input() shape: ElvAvatarShape = 'circle';
    @Input() size: ElvAvatarSize = 'md';
    @Input() status: ElvAvatarStatus = 'none';

    /** Hairline accent ring around the avatar. */
    @Input() ring = false;
    @Input() glow = false;
    /** Derives a stable per-name hue instead of using the accent. */
    @Input() autoColor = false;

    @Input() interactive = false;
    @Input() ariaLabel = '';
    @Input() accentColor = '';
    @Input() customClass = '';

    /** Fires on click / Enter / Space when [interactive]="true". */
    @Output() clicked = new EventEmitter<Event>();

    /** Broken or missing image sources fall back to initials. */
    private imageFailed = false;

    get showImage(): boolean {
        return !!this.image && !this.imageFailed;
    }

    /** Up to two letters: first + last word of the name. */
    get resolvedInitials(): string {
        if (this.initials) {
            return this.initials.slice(0, 2).toUpperCase();
        }

        const words = this.name.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
            return '';
        }
        const first = words[0].charAt(0);
        const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
        return (first + last).toUpperCase();
    }

    get showIcon(): boolean {
        return !this.showImage && !this.resolvedInitials && !!this.icon;
    }

    /** Stable across reloads — same name always lands on the same hue. */
    get autoAccent(): string | null {
        if (!this.autoColor || !this.name) {
            return null;
        }
        let hash = 0;
        for (let i = 0; i < this.name.length; i++) {
            // modulo keeps the running hash bounded (and positive) without bit twiddling
            hash = (hash * 31 + this.name.charCodeAt(i)) % 100000;
        }
        return `hsl(${AUTO_HUES[hash % AUTO_HUES.length]} 85% 65%)`;
    }

    get resolvedAccent(): string | null {
        return this.accentColor || this.autoAccent;
    }

    get resolvedAriaLabel(): string | null {
        return this.ariaLabel || this.name || null;
    }

    /** An unlabelled avatar is decoration, so it gets no role at all. */
    get hostRole(): string | null {
        if (this.interactive) {
            return 'button';
        }
        return this.resolvedAriaLabel ? 'img' : null;
    }

    get classes(): string {
        return [
            'elv-avatar',
            `elv-avatar--${this.shape}`,
            `elv-avatar--${this.size}`,
            this.ring ? 'elv-avatar--ring' : '',
            this.glow ? 'elv-avatar--glow' : '',
            this.interactive ? 'elv-avatar--interactive' : '',
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }

    onImageError(): void {
        this.imageFailed = true;
    }

    onActivate(e: Event): void {
        if (this.interactive) {
            this.clicked.emit(e);
        }
    }

    onKeydown(e: KeyboardEvent): void {
        if (this.interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            this.clicked.emit(e);
        }
    }
}

// ── Usage ─────────────────────────────────────────────────────────
//
// Content falls back image → initials → icon:
// <app-elv-avatar image="/assets/img/user.png" name="Ada Lovelace" />
// <app-elv-avatar name="Ada Lovelace" />          <!-- renders "AL" -->
// <app-elv-avatar />                              <!-- renders the pi-user glyph -->
// <app-elv-avatar name="Ada Lovelace" initials="ADA" />
// <app-elv-avatar icon="pi-building" />
//
// A broken [image] URL falls back to the initials on its own — no extra wiring.
//
// Shapes (circle | round | notch | square) · Sizes (xs | sm | md | lg | xl):
// <app-elv-avatar name="Ada Lovelace" shape="notch" size="lg" />
//
// Presence dot (online | idle | busy | offline):
// <app-elv-avatar name="Ada Lovelace" status="online" />
// <app-elv-avatar name="Ada Lovelace" status="busy" size="sm" />
//
// Accent ring / glow:
// <app-elv-avatar name="Ada Lovelace" [ring]="true" />
// <app-elv-avatar name="Ada Lovelace" [ring]="true" [glow]="true" size="xl" />
//
// Stable per-name colour (handy for user lists):
// <app-elv-avatar *ngFor="let u of users" [name]="u.fullName" [autoColor]="true" />
//
// Clickable (role=button, Enter/Space, focus ring):
// <app-elv-avatar name="Ada Lovelace" [interactive]="true"
//                 ariaLabel="Open profile" (clicked)="openProfile()" />
//
// Per-instance accent override (wins over autoColor):
// <app-elv-avatar name="Ada Lovelace" accentColor="#ff5b8a" [ring]="true" />
