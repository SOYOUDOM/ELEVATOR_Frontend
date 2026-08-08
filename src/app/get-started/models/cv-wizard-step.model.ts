import type { Type } from '@angular/core';

/**
 * The seven floors of the CV builder.
 *
 * Adding a floor means: add the id here, add one entry to
 * `CV_WIZARD_STEPS`, write the component. Routing, the stepper, the
 * progress maths and the placeholder all read from that one entry —
 * nothing else in the feature hard-codes the list.
 */
export type CvStepId = 'start' | 'basic-info' | 'experience' | 'education' | 'skills' | 'design' | 'finish';

/** Lazy component loader, matching Angular's `loadComponent` shape. */
export type CvStepLoader = () => Promise<Type<unknown>>;

export interface CvWizardStep {
    /** Stable key. Also the localStorage progress key and the stepper id. */
    readonly id: CvStepId;

    /** URL segment under `/app/get-started`. */
    readonly path: string;

    /** Short caption on the stepper track. Two words maximum. */
    readonly label: string;

    /** Question at the top of the step body. */
    readonly title: string;

    /** One line under the title. */
    readonly subtitle: string;

    /** Full icon class, e.g. `'pi pi-user'`. Used by the placeholder. */
    readonly icon: string;

    /**
     * Whether the user may leave without entering anything. Every data step
     * is optional by product decision — only `start` needs a choice.
     */
    readonly optional: boolean;

    /** The shell renders the marketing hero above steps that ask for it. */
    readonly showsHero: boolean;

    /**
     * The real step component. Left undefined while a step is still on the
     * roadmap — the router falls back to the placeholder, so the whole track
     * is navigable from day one.
     */
    readonly loadComponent?: CvStepLoader;
}
