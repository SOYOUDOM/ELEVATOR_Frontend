import type { CvDraft, CvStepId } from '../models/cv-draft.model';

export interface CreateCvStep {
    readonly id: CvStepId;
    /** URL segment under /create. */
    readonly path: string;
    /** Floor caption on the elevator rail. */
    readonly label: string;
    readonly title: string;
    readonly subtitle: string;
    readonly icon: string;
    /** Step 5 is explicitly skippable end-to-end. */
    readonly skippable: boolean;
    /** Has the user put anything real on this floor? Drives the hollow ring. */
    readonly isComplete: (draft: CvDraft) => boolean;
}

/**
 * THE REGISTRY — the five floors of the builder.
 *
 * The only place the wizard's shape is written down. The elevator rail, the
 * routes, the next/back buttons and the incomplete-floor markers are all
 * derived from it, so adding or reordering a floor is one edit here plus the
 * component.
 *
 * `/create` (launch) and `/create/editor` are deliberately NOT in this list:
 * they sit outside the numbered climb, and the rail should not pretend
 * otherwise.
 */
export const CREATE_CV_STEPS: readonly CreateCvStep[] = [
    {
        id: 'identity',
        path: 'identity',
        label: 'Identity',
        title: 'Who are you?',
        subtitle: 'Your photo, your name, and the job you are aiming at',
        icon: 'pi pi-user',
        skippable: false,
        isComplete: (d) => !!d.identity.fullName && !!d.identity.targetJobTitle,
    },
    {
        id: 'experience',
        path: 'experience',
        label: 'Experience',
        title: 'Where have you worked?',
        subtitle: 'One role at a time — plain language is enough to start',
        icon: 'pi pi-briefcase',
        skippable: true,
        isComplete: (d) => d.experience.some((e) => e.bullets.some((b) => b.text.trim())),
    },
    {
        id: 'education',
        path: 'education',
        label: 'Education',
        title: 'What have you studied?',
        subtitle: 'Degrees, diplomas, bootcamps and certifications',
        icon: 'pi pi-book',
        skippable: true,
        isComplete: (d) => d.education.length > 0 || d.certifications.length > 0,
    },
    {
        id: 'skills',
        path: 'skills',
        label: 'Skills',
        title: 'What are you good at?',
        subtitle: 'Scan your experience, or add them yourself',
        icon: 'pi pi-bolt',
        skippable: true,
        isComplete: (d) => d.skills.length >= 3,
    },
    {
        id: 'boost',
        path: 'boost',
        label: 'Boost',
        title: 'Anything else worth showing?',
        subtitle: 'Optional sections that make a thin CV look full',
        icon: 'pi pi-star',
        skippable: true,
        isComplete: (d) => d.boost.enabled.length > 0,
    },
] as const;

export const CREATE_CV_BASE = '/create';
export const CREATE_CV_EDITOR_ROUTE = `${CREATE_CV_BASE}/editor`;

const BY_ID = new Map<CvStepId, CreateCvStep>(CREATE_CV_STEPS.map((s) => [s.id, s]));
const BY_PATH = new Map<string, CreateCvStep>(CREATE_CV_STEPS.map((s) => [s.path, s]));

export function findStepById(id: string | null | undefined): CreateCvStep | null {
    return id ? (BY_ID.get(id as CvStepId) ?? null) : null;
}

export function findStepByPath(path: string | null | undefined): CreateCvStep | null {
    return path ? (BY_PATH.get(path) ?? null) : null;
}

export function stepRoute(step: CreateCvStep): string {
    return `${CREATE_CV_BASE}/${step.path}`;
}
