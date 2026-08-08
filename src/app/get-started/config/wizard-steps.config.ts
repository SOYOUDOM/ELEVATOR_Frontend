import type { CvStepId, CvWizardStep } from '../models/cv-wizard-step.model';

/**
 * THE REGISTRY — the seven floors, in order.
 *
 * This array is the only place the wizard's shape is written down. Routes,
 * the stepper track, the progress percentage, the next/previous buttons and
 * the placeholder screen are all derived from it.
 *
 * ── Adding a step ─────────────────────────────────────────────────────────
 *   1. add its id to `CvStepId`
 *   2. add an entry here, in the position it should appear
 *   3. (later) write the component and point `loadComponent` at it
 * Nothing else needs to change.
 *
 * ── Shipping a step ───────────────────────────────────────────────────────
 * A step with no `loadComponent` routes to `StepPlaceholderComponent`, so the
 * whole track is walkable before every screen exists. Replacing the
 * placeholder is a one-line edit to that entry.
 */
export const CV_WIZARD_STEPS: readonly CvWizardStep[] = [
    {
        id: 'start',
        path: 'start',
        label: 'Get started',
        title: 'How would you like to start?',
        subtitle: 'Choose the best way to create your professional CV',
        icon: 'pi pi-flag',
        optional: false,
        showsHero: true,
        loadComponent: () => import('../steps/choose-path/choose-path.component').then((m) => m.ChoosePathComponent),
    },
    {
        id: 'basic-info',
        path: 'basic-info',
        label: 'Basic info',
        title: 'Who are you?',
        subtitle: 'Your name, how to reach you, and a line about what you do',
        icon: 'pi pi-user',
        optional: true,
        showsHero: false,
    },
    {
        id: 'experience',
        path: 'experience',
        label: 'Experience',
        title: 'Where have you worked?',
        subtitle: 'Add a role at a time — half-remembered bullet points are enough',
        icon: 'pi pi-briefcase',
        optional: true,
        showsHero: false,
    },
    {
        id: 'education',
        path: 'education',
        label: 'Education',
        title: 'What have you studied?',
        subtitle: 'Degrees, diplomas, bootcamps, or nothing at all',
        icon: 'pi pi-book',
        optional: true,
        showsHero: false,
    },
    {
        id: 'skills',
        path: 'skills',
        label: 'Skills',
        title: 'What are you good at?',
        subtitle: 'Skills, languages and anything else worth putting on the page',
        icon: 'pi pi-star',
        optional: true,
        showsHero: false,
    },
    {
        id: 'design',
        path: 'design',
        label: 'Design',
        title: 'How should it look?',
        subtitle: 'Pick a template and an accent — you can change both later',
        icon: 'pi pi-palette',
        optional: true,
        showsHero: false,
    },
    {
        id: 'finish',
        path: 'finish',
        label: 'Finish',
        title: 'Ready to download',
        subtitle: 'Review everything, then take the PDF',
        icon: 'pi pi-check-circle',
        optional: true,
        showsHero: false,
    },
] as const;

/** Base URL the wizard lives at. Steps resolve as `${BASE}/${step.path}`. */
export const CV_WIZARD_BASE_ROUTE = '/app/get-started';

/** The step the wizard opens on. */
export const CV_WIZARD_FIRST_STEP: CvStepId = CV_WIZARD_STEPS[0].id;

const BY_ID = new Map<CvStepId, CvWizardStep>(CV_WIZARD_STEPS.map((step) => [step.id, step]));
const BY_PATH = new Map<string, CvWizardStep>(CV_WIZARD_STEPS.map((step) => [step.path, step]));

export function findStepById(id: string | null | undefined): CvWizardStep | null {
    return id ? (BY_ID.get(id as CvStepId) ?? null) : null;
}

export function findStepByPath(path: string | null | undefined): CvWizardStep | null {
    return path ? (BY_PATH.get(path) ?? null) : null;
}

export function stepIndex(id: CvStepId): number {
    return CV_WIZARD_STEPS.findIndex((step) => step.id === id);
}

/** Absolute router path for a step, e.g. `/app/get-started/skills`. */
export function stepRoute(step: CvWizardStep): string {
    return `${CV_WIZARD_BASE_ROUTE}/${step.path}`;
}
