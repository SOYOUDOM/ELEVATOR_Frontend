import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

import type { ElvStepperItem } from '@shared/components/elv-stepper';

import {
    CREATE_CV_EDITOR_ROUTE,
    CREATE_CV_STEPS,
    findStepById,
    findStepByPath,
    stepRoute,
    type CreateCvStep,
} from '../config/create-cv-steps.config';
import type { CvStepId } from '../models/cv-draft.model';
import { CvDraftStore } from './cv-draft.store';

/**
 * Where the user is in the climb.
 *
 * Split from `CvDraftStore` on purpose: this knows the order of the floors,
 * the store knows what has been typed. Neither changes when the other does.
 *
 * The active floor is derived from the URL rather than held in a signal
 * something has to remember to set, so the browser back button, a bookmark
 * and a hard refresh are all correct for free — and the rail can never
 * disagree with the page it is sitting beside.
 */
@Injectable({ providedIn: 'root' })
export class CreateCvWizardService {
    readonly steps = CREATE_CV_STEPS;

    /** Null on /create (launch) and /create/editor — both sit off the rail. */
    readonly activeStep = computed<CreateCvStep | null>(() => findStepByPath(lastSegment(this.url())));

    readonly activeId = computed<CvStepId | null>(() => this.activeStep()?.id ?? null);

    readonly activeIndex = computed(() => {
        const id = this.activeId();
        return id ? CREATE_CV_STEPS.findIndex((s) => s.id === id) : -1;
    });

    readonly isFirst = computed(() => this.activeIndex() === 0);
    readonly isLast = computed(() => this.activeIndex() === CREATE_CV_STEPS.length - 1);

    readonly nextStep = computed<CreateCvStep | null>(() => CREATE_CV_STEPS[this.activeIndex() + 1] ?? null);
    readonly previousStep = computed<CreateCvStep | null>(() =>
        this.activeIndex() > 0 ? CREATE_CV_STEPS[this.activeIndex() - 1] : null
    );

    /** True on the wizard floors only — the shell shows the rail for these. */
    readonly onWizardFloor = computed(() => this.activeStep() !== null);

    /**
     * The elevator rail.
     *
     * `incomplete` is the spec's "mark, don't lock": a floor the user has not
     * filled is drawn as a hollow ring but stays fully clickable. The current
     * floor is never marked incomplete — you are standing on it.
     */
    readonly stepperItems = computed<ElvStepperItem[]>(() => {
        const draft = this.store.draft();
        const activeId = this.activeId();

        return CREATE_CV_STEPS.map((step) => ({
            id: step.id,
            label: step.label,
            ariaLabel: `${step.label} — ${step.title}`,
            incomplete: step.id !== activeId && !step.isComplete(draft),
        }));
    });

    private readonly router = inject(Router);
    private readonly store = inject(CvDraftStore);

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );

    goTo(id: CvStepId): Promise<boolean> {
        const step = findStepById(id);
        return step ? this.router.navigateByUrl(stepRoute(step)) : Promise.resolve(false);
    }

    /** Advances a floor, or opens the editor from the last one. */
    next(): Promise<boolean> {
        const step = this.nextStep();
        return step ? this.goTo(step.id) : this.openEditor();
    }

    previous(): Promise<boolean> {
        const step = this.previousStep();
        return step ? this.goTo(step.id) : this.router.navigateByUrl(CREATE_CV_BASE_SAFE);
    }

    openEditor(): Promise<boolean> {
        return this.router.navigateByUrl(CREATE_CV_EDITOR_ROUTE);
    }
}

const CREATE_CV_BASE_SAFE = '/create';

function lastSegment(url: string): string {
    const path = url.split(/[?#]/, 1)[0];
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
}
