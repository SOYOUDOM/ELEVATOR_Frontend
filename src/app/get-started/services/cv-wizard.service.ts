import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

import type { ElvStepperItem } from '@shared/components/elv-stepper';

import { CV_WIZARD_STEPS, findStepById, findStepByPath, stepIndex, stepRoute } from '../config/wizard-steps.config';
import type { CvStepId, CvWizardStep } from '../models/cv-wizard-step.model';
import { CvDraftStore } from './cv-draft.store';

/**
 * Everything about *where the user is* in the wizard.
 *
 * The split from `CvDraftStore` is deliberate: this service knows the order of
 * the floors and how to move between them, the store knows what has been typed.
 * Neither has to change when the other does.
 *
 * The active step is derived from the URL rather than held in a signal that
 * something has to remember to set. That means the browser back button, a
 * bookmark and a hard refresh are all correct for free, and no component can
 * put the stepper out of sync with the page it is sitting on.
 *
 * Provided at the wizard route, alongside the store.
 */
@Injectable()
export class CvWizardService {
    /** All floors, in order. Lets a template iterate without importing config. */
    readonly steps = CV_WIZARD_STEPS;

    /** Falls back to the first step when the URL points at nothing we know. */
    readonly activeStep = computed<CvWizardStep>(() => findStepByPath(lastSegment(this.url())) ?? CV_WIZARD_STEPS[0]);

    readonly activeId = computed<CvStepId>(() => this.activeStep().id);
    readonly activeIndex = computed(() => stepIndex(this.activeId()));

    readonly isFirst = computed(() => this.activeIndex() === 0);
    readonly isLast = computed(() => this.activeIndex() === CV_WIZARD_STEPS.length - 1);

    readonly nextStep = computed<CvWizardStep | null>(() => CV_WIZARD_STEPS[this.activeIndex() + 1] ?? null);
    readonly previousStep = computed<CvWizardStep | null>(() => CV_WIZARD_STEPS[this.activeIndex() - 1] ?? null);

    /** The shell shows the marketing hero only where the registry asks for it. */
    readonly showsHero = computed(() => this.activeStep().showsHero);

    /** 0–100 across the whole track. Step one reads 0, the last reads 100. */
    readonly progressPercent = computed(() => {
        const total = CV_WIZARD_STEPS.length - 1;
        return total <= 0 ? 100 : Math.round((this.activeIndex() / total) * 100);
    });

    /**
     * Track for `<elv-stepper>`. A step is reachable once the user has been
     * past it — the stepper enforces that via `reach`, so nothing here needs
     * to mark items disabled.
     */
    readonly stepperItems = computed<ElvStepperItem[]>(() =>
        CV_WIZARD_STEPS.map((step) => ({
            id: step.id,
            label: step.label,
            ariaLabel: `${step.label} — ${step.title}`,
        }))
    );

    // ── Internals ─────────────────────────────────────────────────────
    private readonly router = inject(Router);
    private readonly store = inject(CvDraftStore);

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );

    // ── Navigation ────────────────────────────────────────────────────
    goTo(id: CvStepId): Promise<boolean> {
        const step = findStepById(id);
        return step ? this.router.navigateByUrl(stepRoute(step)) : Promise.resolve(false);
    }

    /** Records the current step as finished and moves on. */
    next(): Promise<boolean> {
        this.store.markCompleted(this.activeId());
        const step = this.nextStep();
        return step ? this.goTo(step.id) : Promise.resolve(false);
    }

    /** Records the current step as deliberately passed over and moves on. */
    skip(): Promise<boolean> {
        this.store.markSkipped(this.activeId());
        const step = this.nextStep();
        return step ? this.goTo(step.id) : Promise.resolve(false);
    }

    /** Goes back a floor without recording anything — leaving is not a choice. */
    previous(): Promise<boolean> {
        const step = this.previousStep();
        return step ? this.goTo(step.id) : Promise.resolve(false);
    }
}

/** Last path segment of a URL, with query string and fragment stripped. */
function lastSegment(url: string): string {
    const path = url.split(/[?#]/, 1)[0];
    const segments = path.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? '';
}
