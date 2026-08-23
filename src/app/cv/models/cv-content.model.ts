import type { CvDateRange } from './cv-date';

/**
 * ELEVATOR — the CV's CONTENT.
 *
 * This is the half of a CV that belongs to the person: what they did, where,
 * and when. It is deliberately free of anything about how it looks (that is
 * CvDesign) and anything about the editor (that lives in the UI stores).
 *
 * Keeping those three apart is what makes "change the template" a safe
 * operation — presentation can be replaced wholesale and this object is never
 * touched.
 *
 * Every record carries a stable `id`. Selection, the timeline, click-to-edit
 * and Angular's track expressions all key off it, so ids are generated once at
 * creation and never derived from content.
 */

/** The sections a CV can hold. The union is the closed vocabulary of the app. */
export type CvSectionId =
    | 'personal'
    | 'summary'
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'certifications'
    | 'languages'
    | 'additional';

export const CV_SECTION_IDS: readonly CvSectionId[] = [
    'personal',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'additional',
] as const;

export interface CvRecord {
    id: string;
}

export interface CvPersonalInfo {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    /** Data URI or remote URL. Rendered only when the design asks for a photo. */
    photoUrl: string | null;
}

export interface CvExperience extends CvRecord {
    jobTitle: string;
    company: string;
    location: string;
    dates: CvDateRange;
    bullets: string[];
}

export interface CvEducation extends CvRecord {
    degree: string;
    institution: string;
    location: string;
    dates: CvDateRange;
    note: string;
}

export interface CvSkillGroup extends CvRecord {
    name: string;
    skills: string[];
}

export interface CvProject extends CvRecord {
    name: string;
    role: string;
    link: string;
    dates: CvDateRange;
    description: string;
}

export interface CvCertification extends CvRecord {
    name: string;
    issuer: string;
    /** Certifications are a point in time, not a range — hence `start` only. */
    dates: CvDateRange;
    credentialId: string;
}

export interface CvLanguage extends CvRecord {
    name: string;
    level: string;
}

export interface CvAdditionalEntry extends CvRecord {
    label: string;
    value: string;
}

export interface CvContent {
    personal: CvPersonalInfo;
    summary: string;
    experience: CvExperience[];
    education: CvEducation[];
    skills: CvSkillGroup[];
    projects: CvProject[];
    certifications: CvCertification[];
    languages: CvLanguage[];
    additional: CvAdditionalEntry[];
}

/** The list-shaped sections. `personal` and `summary` are singletons. */
export type CvListSectionId = Exclude<CvSectionId, 'personal' | 'summary'>;

export function emptyDateRange(): CvDateRange {
    return { start: null, end: null, isPresent: false };
}

export function emptyPersonalInfo(): CvPersonalInfo {
    return {
        fullName: '',
        jobTitle: '',
        email: '',
        phone: '',
        location: '',
        website: '',
        photoUrl: null,
    };
}

export function emptyCvContent(): CvContent {
    return {
        personal: emptyPersonalInfo(),
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        additional: [],
    };
}

/**
 * Structural clone of content. Used wherever a CV is created FROM something
 * else (a saved profile, another CV) — the new document must share no object
 * identity with its source, or editing one would silently edit the other.
 */
export function cloneCvContent(content: CvContent): CvContent {
    return structuredClone(content);
}
