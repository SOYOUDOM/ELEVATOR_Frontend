import type { StartPath } from '../models/start-path.model';

/**
 * The three doors on step one.
 *
 * `nextStepId` is the only routing knowledge here. When the import flow grows
 * its own upload screen, that screen becomes a registry entry and this value
 * changes to point at it — the card markup does not move.
 */
export const START_PATHS: readonly StartPath[] = [
    {
        id: 'scratch',
        icon: 'pi pi-plus',
        title: 'Start from scratch',
        text: "Answer a few simple questions and we'll guide you step by step.",
        cta: 'Start now',
        badge: 'Recommended',
        nextStepId: 'basic-info',
    },
    {
        id: 'import',
        icon: 'pi pi-cloud-upload',
        title: 'Import existing CV',
        text: "Upload your current CV and we'll improve and restructure it.",
        cta: 'Import CV',
        nextStepId: 'basic-info',
    },
    {
        id: 'template',
        icon: 'pi pi-th-large',
        title: 'Use a template',
        text: 'Choose a professional template and customize it your way.',
        cta: 'Browse templates',
        nextStepId: 'design',
    },
] as const;
