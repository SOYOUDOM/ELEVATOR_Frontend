import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ELEVATOR — scroll-reveal directive.
 * Angular port of the React <Reveal fx="…"> wrapper.
 *
 * Pairs with _reveals.scss (the .rv / .rv-<fx> effect library).
 * The directive adds `rv rv-<fx>` immediately and flips `.seen`
 * on when the element scrolls into view (and off when it leaves,
 * so effects replay — set [revealOnce]="true" to fire once).
 *
 * Usage:
 *   <div elvReveal="scan"></div>
 *   <div elvReveal="flip" [revealDelay]="i * 0.12"></div>
 *   <div elvReveal="doors" [revealOnce]="true"></div>
 *
 * Effects: rise (default) | left | right | pop | flip | doors |
 *          iris | scan | wipe | zoom | glitch | drop
 *
 * Hidden states live behind prefers-reduced-motion in the SCSS,
 * so reduced-motion users always see content — no JS branch needed.
 */
export type RevealFx =
    | 'rise'
    | 'left'
    | 'right'
    | 'pop'
    | 'flip'
    | 'doors'
    | 'iris'
    | 'scan'
    | 'wipe'
    | 'zoom'
    | 'glitch'
    | 'drop';

@Directive({
    selector: '[elvReveal]',
    standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
    /** Effect name; empty string falls back to "rise". */
    @Input('elvReveal') fx: RevealFx | '' = 'rise';

    /** Transition delay in SECONDS (matches the React API). */
    @Input() revealDelay = 0;

    /** Rise distance in px (rise effect only). */
    @Input() revealY = 26;

    /** Fire once and stay visible (default: replay on re-entry). */
    @Input() revealOnce = true;

    /** How much of the element must be visible before firing. */
    @Input() revealThreshold = 0.18;

    private io?: IntersectionObserver;
    private readonly platformId = inject(PLATFORM_ID);

    constructor(
        private el: ElementRef<HTMLElement>,
        private renderer: Renderer2
    ) {}

    ngOnInit(): void {
        const node = this.el.nativeElement;
        const effect = this.fx || 'rise';

        this.renderer.addClass(node, 'rv');
        this.renderer.addClass(node, `rv-${effect}`);
        node.style.setProperty('--rvd', `${this.revealDelay}s`);
        node.style.setProperty('--rvy', `${this.revealY}px`);

        if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
            // SSR / ancient browser: never leave content hidden.
            this.renderer.addClass(node, 'seen');
            return;
        }

        this.io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        node.classList.add('seen');
                    } else if (!this.revealOnce) {
                        node.classList.remove('seen');
                    }
                });
            },
            { threshold: 0 }
        );

        this.io.observe(node);
    }

    ngOnDestroy(): void {
        this.io?.disconnect();
    }
}
