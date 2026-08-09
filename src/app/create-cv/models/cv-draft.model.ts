/**
 * The CV as the builder holds it in progress.
 *
 * Two rules keep the next change cheap:
 *
 *   • Every field is optional by product decision. That is expressed as empty
 *     strings and empty arrays rather than `?`, so a screen can bind a control
 *     without null-checking and the persisted shape never drifts.
 *
 *   • One top-level key per wizard step. `CvDraftStore.patch` is typed off this
 *     map, so a screen can only write its own slice.
 */

export type CvStepId = 'identity' | 'experience' | 'education' | 'skills' | 'boost';

export type CvStartPath = 'import' | 'scratch';

/** Where a value came from. Import marks low-confidence fields for review. */
export type CvFieldConfidence = 'high' | 'low';

// ── Identity ──────────────────────────────────────────────────────────
export interface CvLink {
    id: string;
    label: string;
    url: string;
}

export interface CvIdentity {
    fullName: string;
    /** Seeds every downstream AI call — the one emphasised field on step 1. */
    targetJobTitle: string;
    email: string;
    phone: string;
    location: string;
    links: CvLink[];
    summary: string;
    /** Data URL. Null is an explicit "no photo", not "not answered". */
    photoDataUrl: string | null;
    /** The pre-transform original, kept so before/after stays comparable. */
    photoOriginalDataUrl: string | null;
    /** Hard-capped per draft — see CV_PHOTO_TRANSFORM_LIMIT. */
    photoTransformsUsed: number;
}

// ── Experience ────────────────────────────────────────────────────────
export interface CvBullet {
    id: string;
    text: string;
}

export interface CvExperience {
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: CvBullet[];
    /** The plain-language prompt used to generate bullets, kept for re-runs. */
    plainLanguage: string;
}

// ── Education ─────────────────────────────────────────────────────────
export interface CvEducation {
    id: string;
    institution: string;
    qualification: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface CvCertification {
    id: string;
    name: string;
    issuer: string;
    year: string;
    description: string;
}

// ── Skills ────────────────────────────────────────────────────────────
export type CvSkillGroup = 'technical' | 'tools' | 'soft';

export interface CvSkill {
    id: string;
    name: string;
    group: CvSkillGroup;
}

export interface CvLanguage {
    id: string;
    name: string;
    level: string;
}

// ── Boost (all optional sections) ─────────────────────────────────────
export type CvBoostSectionId = 'projects' | 'awards' | 'volunteer' | 'references' | 'interests';

export interface CvProject {
    id: string;
    name: string;
    url: string;
    description: string;
}

export interface CvAward {
    id: string;
    name: string;
    issuer: string;
    year: string;
}

export interface CvVolunteer {
    id: string;
    organisation: string;
    role: string;
    description: string;
}

export interface CvReference {
    id: string;
    name: string;
    relationship: string;
    contact: string;
}

export interface CvBoost {
    /** Which optional sections the user switched on. */
    enabled: CvBoostSectionId[];
    projects: CvProject[];
    awards: CvAward[];
    volunteer: CvVolunteer[];
    references: CvReference[];
    interests: string[];
}

// ── Meta ──────────────────────────────────────────────────────────────
export interface CvMeta {
    startPath: CvStartPath | null;
    templateId: string;
    /** Field paths the importer was unsure about, e.g. `identity.email`. */
    uncertainFields: string[];
    importedFileName: string | null;
    /** Set once the ad gate has been satisfied. */
    exportUnlocked: boolean;
}

export interface CvDraft {
    /** Bumped when the shape changes; older payloads are discarded on read. */
    schemaVersion: number;
    id: string;
    meta: CvMeta;
    identity: CvIdentity;
    experience: CvExperience[];
    education: CvEducation[];
    certifications: CvCertification[];
    skills: CvSkill[];
    languages: CvLanguage[];
    boost: CvBoost;
    createdAt: string;
    updatedAt: string;
}

/** Keys a screen may patch. Excludes bookkeeping the store owns. */
export type CvDraftSection = Exclude<keyof CvDraft, 'schemaVersion' | 'id' | 'createdAt' | 'updatedAt'>;

export const CV_DRAFT_SCHEMA_VERSION = 1;

/** Free photo transforms per draft. */
export const CV_PHOTO_TRANSFORM_LIMIT = 3;

export function createEmptyCvDraft(id: string): CvDraft {
    const now = new Date().toISOString();
    return {
        schemaVersion: CV_DRAFT_SCHEMA_VERSION,
        id,
        meta: {
            startPath: null,
            templateId: 'shaft',
            uncertainFields: [],
            importedFileName: null,
            exportUnlocked: false,
        },
        identity: {
            fullName: '',
            targetJobTitle: '',
            email: '',
            phone: '',
            location: '',
            links: [],
            summary: '',
            photoDataUrl: null,
            photoOriginalDataUrl: null,
            photoTransformsUsed: 0,
        },
        experience: [],
        education: [],
        certifications: [],
        skills: [],
        languages: [],
        boost: {
            enabled: [],
            projects: [],
            awards: [],
            volunteer: [],
            references: [],
            interests: [],
        },
        createdAt: now,
        updatedAt: now,
    };
}

/** True when the user has entered nothing worth resuming. */
export function isCvDraftEmpty(draft: CvDraft): boolean {
    const id = draft.identity;
    const hasIdentity =
        !!id.fullName ||
        !!id.targetJobTitle ||
        !!id.email ||
        !!id.phone ||
        !!id.location ||
        !!id.summary ||
        !!id.photoDataUrl ||
        id.links.length > 0;

    return (
        !hasIdentity &&
        draft.experience.length === 0 &&
        draft.education.length === 0 &&
        draft.certifications.length === 0 &&
        draft.skills.length === 0 &&
        draft.languages.length === 0
    );
}

/** Short unique id. crypto.randomUUID where available, else a timestamp key. */
export function cvId(prefix = 'cv'): string {
    const rand =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
