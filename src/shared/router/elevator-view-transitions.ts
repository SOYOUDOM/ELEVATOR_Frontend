import { DOCUMENT } from '@angular/common';
import { inject, type Provider } from '@angular/core';
import { withInMemoryScrolling, withViewTransitions, type ActivatedRouteSnapshot } from '@angular/router';

/**
 * ELEVATOR — horizontal route choreography.
 *
 * The whole effect is the browser's View Transitions API: Angular snapshots the
 * old page, swaps the DOM, snapshots the new one, and hands both to CSS as
 * `::view-transition-old(root)` / `::view-transition-new(root)`. All this file
 * does is tell CSS which WAY the lift is travelling — the keyframes live in
 * `src/styles/_view-transitions.scss`.
 *
 * Direction comes from `data: { step: N }` on the route. Deeper step ⇒ forward
 * (old slides out left, new enters from the right); shallower ⇒ back. Browser
 * Back therefore reverses on its own, with no history bookkeeping of our own.
 *
 * The flag is a plain attribute on <html> rather than a signal because the only
 * consumer is the stylesheet, and the pseudo-elements it targets do not exist in
 * the Angular view tree at all — nothing to bind to.
 */

/** Attribute written on <html> for the duration of a transition. */
export const NAV_DIRECTION_ATTR = 'data-nav';

/**
 * Deepest `data.step` in a snapshot chain.
 *
 * `from` / `to` are ROOT snapshots, so the step we care about is several
 * `firstChild` hops down. Taking the last defined numeric value (rather than the
 * first) means a parent may declare a default that a child overrides, and it
 * shrugs off `paramsInheritanceStrategy` copying a parent's `data` downward.
 */
function deepestStep(snapshot: ActivatedRouteSnapshot | null | undefined): number | null {
    let step: number | null = null;
    let node: ActivatedRouteSnapshot | null = snapshot ?? null;

    while (node) {
        const raw: unknown = node.data?.['step'];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            step = raw;
        }
        node = node.firstChild;
    }

    return step;
}

/**
 * Router features for the page-to-page slide.
 *
 * MUST land in the ROOT injector. `get-started` and `create/*` are lazy, and a
 * `CREATE_VIEW_TRANSITION` provided inside a lazy child injector is invisible to
 * the Router, which resolves it once at bootstrap.
 *
 * `ɵproviders` is a private-prefixed API. It is the only way to feed a router
 * feature into an app that still boots its router through
 * `RouterModule.forRoot()` instead of `provideRouter()` — re-check it on every
 * major Angular upgrade. These providers SUPPLEMENT `forRoot`; they do not
 * replace it. Order matters: spread them AFTER `importProvidersFrom(...)` so the
 * later `ROUTER_SCROLLER` binding is the one the injector keeps.
 */
export function provideElevatorViewTransitions(): Provider[] {
    return [
        ...withViewTransitions({
            // The boot choreography (doors + routeIn) owns the first paint.
            skipInitialTransition: true,

            onViewTransitionCreated: ({ transition, from, to }) => {
                // Runs inside an injection context — see ViewTransitionsFeatureOptions.
                const root = inject(DOCUMENT).documentElement;

                const fromStep = deepestStep(from);
                const toStep = deepestStep(to);
                const goingBack = fromStep !== null && toStep !== null && toStep < fromStep;

                root.setAttribute(NAV_DIRECTION_ATTR, goingBack ? 'back' : 'fwd');

                const clear = () => root.removeAttribute(NAV_DIRECTION_ATTR);
                // `.then(clear, clear)`, NOT `.finally()`: a skipped transition
                // rejects `finished`, and `finally` re-throws what it catches —
                // which surfaces as an unhandled rejection in the console.
                transition.finished.then(clear, clear);
            },
        }).ɵproviders,

        // Snapshot the incoming page at the top; otherwise the new snapshot
        // inherits the outgoing page's scroll offset and enters mid-document.
        ...withInMemoryScrolling({ scrollPositionRestoration: 'top' }).ɵproviders,
    ];
}
