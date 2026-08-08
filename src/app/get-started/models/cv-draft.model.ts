import type { CvStepId } from './cv-wizard-step.model';
import type { StartPathId } from './start-path.model';

/**
 * The whole CV as the wizard holds it in progress.
 *
 * Two rules that keep the next update cheap:
 *
 *   • Every field is optional by product decision. That is expressed as
 *     empty strings and empty arrays rather than `?`, so a step never has
 *     to null-check before binding to a form control.
 *
 *   • One section key per wizard step. `CvDraftStore.patchSection` is typed
 *     off this map, so a step can only write its own slice.
 */

export interface CvBasicInfoDraft {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedIn: string;
    /** Data URL. Null when the user wants no photo — an explicit choice. */
    photoDataUrl: string | null;
    summary: string;
}

export interface CvExperienceEntry {
    id: string;
    role: string;
    company: string;
    location: string;
    /** Free text ("Mar 2021"), not a Date — CVs are written, not scheduled. */
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
}

export interface CvEducationEntry {
    id: string;
    qualification: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    notes: string;
}

export interface CvSkillsDraft {
    skills: string[];
    languages: string[];
    certifications: string[];
    interests: string[];
}

export interface CvDesignDraft {
    templateId: string | null;
    accentColor: string | null;
}

/** How the user got in, plus whatever the entry produced. */
export interface CvSourceDraft {
    path: StartPathId | null;
    /** Name of the CV they uploaded, when they took the import path. */
    importedFileName: string | null;
    /** Template they picked on the way in, when they took that path. */
    seedTemplateId: string | null;
}

/** Which steps the user finished and which they waved past. */
export interface CvProgressDraft {
    completed: CvStepId[];
    skipped: CvStepId[];
}

export interface CvDraft {
    /** Bumped whenever the shape changes; older payloads are discarded. */
    schemaVersion: number;
    source: CvSourceDraft;
    basicInfo: CvBasicInfoDraft;
    experience: CvExperienceEntry[];
    education: CvEducationEntry[];
    skills: CvSkillsDraft;
    design: CvDesignDraft;
    progress: CvProgressDraft;
    updatedAt: string;
}

/** Keys a step is allowed to patch. Excludes bookkeeping fields. */
export type CvDraftSection = 'source' | 'basicInfo' | 'skills' | 'design';

export const CV_DRAFT_SCHEMA_VERSION = 1;

/** A blank draft. The single definition of "empty" for the whole feature. */
export function createEmptyCvDraft(): CvDraft {
    return {
        schemaVersion: CV_DRAFT_SCHEMA_VERSION,
        source: { path: null, importedFileName: null, seedTemplateId: null },
        basicInfo: {
            fullName: '',
            headline: '',
            email: '',
            phone: '',
            location: '',
            website: '',
            linkedIn: '',
            photoDataUrl: null,
            summary: '',
        },
        experience: [],
        education: [],
        skills: { skills: [], languages: [], certifications: [], interests: [] },
        design: { templateId: null, accentColor: null },
        progress: { completed: [], skipped: [] },
        updatedAt: new Date().toISOString(),
    };
}

/** True when the user has typed nothing anywhere — drives "resume?" prompts. */
export function isCvDraftEmpty(draft: CvDraft): boolean {
    const basic = draft.basicInfo;
    const hasBasic =
        !!basic.fullName ||
        !!basic.headline ||
        !!basic.email ||
        !!basic.phone ||
        !!basic.location ||
        !!basic.website ||
        !!basic.linkedIn ||
        !!basic.summary ||
        !!basic.photoDataUrl;

    const skills = draft.skills;
    const hasSkills =
        skills.skills.length > 0 ||
        skills.languages.length > 0 ||
        skills.certifications.length > 0 ||
        skills.interests.length > 0;

    return !hasBasic && !hasSkills && draft.experience.length === 0 && draft.education.length === 0;
}
