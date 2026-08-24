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
 *
 * PERFORMANCE: every instance used to build its own IntersectionObserver — 50+
 * of them across the marketing pages, each a separate Blink observer holding
 * its target. They all used identical options, so they are now ONE shared
 * observer with a registry, and a `revealOnce` element unobserves itself the
 * moment it fires instead of being watched for the life of the page.
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

    /**
     * How much of the element must be visible before firing.
     *
     * Kept at 0 by default: the previous implementation declared 0.18 but built
     * its observer with `{ threshold: 0 }`, so 0 is what every page in the app
     * has actually been tuned against. Set it per-instance to opt in.
     */
    @Input() revealThreshold = 0;

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

        watch(node, this);
    }

    ngOnDestroy(): void {
        unwatch(this.el.nativeElement);
    }
}

/* ── shared observers ──────────────────────────────────────────
   One observer per distinct threshold, not one per element. The
   registry maps a node to the directive watching it, so the
   callback can read `revealOnce` without closing over anything.
   ─────────────────────────────────────────────────────────── */

const observers = new Map<number, IntersectionObserver>();
const watched = new WeakMap<Element, RevealDirective>();

function observerFor(threshold: number): IntersectionObserver {
    let observer = observers.get(threshold);
    if (!observer) {
        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const directive = watched.get(entry.target);
                    if (!directive) {
                        continue;
                    }
                    if (entry.isIntersecting) {
                        entry.target.classList.add('seen');
                        // Nothing left to watch for — stop paying for it.
                        if (directive.revealOnce) {
                            unwatch(entry.target);
                        }
                    } else if (!directive.revealOnce) {
                        entry.target.classList.remove('seen');
                    }
                }
            },
            { threshold }
        );
        observers.set(threshold, observer);
    }
    return observer;
}

function watch(node: Element, directive: RevealDirective): void {
    watched.set(node, directive);
    observerFor(directive.revealThreshold).observe(node);
}

function unwatch(node: Element): void {
    const directive = watched.get(node);
    if (!directive) {
        return;
    }
    watched.delete(node);
    observers.get(directive.revealThreshold)?.unobserve(node);
}
