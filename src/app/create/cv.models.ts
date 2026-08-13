/**
 * ELEVATOR — the CV draft, and nothing else.
 *
 * One flat shape shared by the store, the ten floors, the sheet renderer and
 * every mocked endpoint. Adding a field here is the only place a new piece of
 * the CV has to be declared; the completion meter, the shaft ticks and the
 * machine read-back all derive from it.
 */

export interface BasicInfo {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    nationality: string;
    website: string;
    linkedin: string;
    github: string;
}

export interface ExperienceEntry {
    title: string;
    company: string;
    location: string;
    period: string;
    bullets: string[];
}

export interface EducationEntry {
    degree: string;
    school: string;
    period: string;
    note: string;
}

export interface ProjectEntry {
    name: string;
    role: string;
    link: string;
    period: string;
    desc: string;
}

export type SkillGroup = 'technical' | 'tools' | 'languages' | 'soft';
export type SkillSet = Record<SkillGroup, string[]>;

/** The four edits the photo service is allowed to make. Never the face. */
export interface PhotoOps {
    bg: boolean;
    light: boolean;
    crop: boolean;
    colour: boolean;
}

export interface PhotoState {
    /** Original, as uploaded. Stays local until a render is requested. */
    src: string;
    /** What the service returned. Empty until the first successful render. */
    renderedSrc: string;
    ops: PhotoOps;
    renders: number;
    include: boolean;
}

export type SummaryTone = 'concise' | 'confident' | 'warm';
export type TemplateId = 'monolith' | 'shaft' | 'ledger' | 'beacon';

/**
 * Where the CV is being sent. Photo conventions are regional and getting this
 * wrong is not cosmetic — several markets discard a CV that carries a photo.
 */
export type RegionCode = 'KH' | 'SG' | 'DE' | 'US' | 'UK' | 'AU';

export interface RegionInfo {
    code: RegionCode;
    name: string;
    /** Whether a photo is conventional. Drives the default, never a hard rule. */
    photo: boolean;
    note: string;
}

export const REGIONS: readonly RegionInfo[] = [
    { code: 'KH', name: 'Cambodia', photo: true, note: 'A photo is expected here.' },
    { code: 'SG', name: 'Singapore', photo: true, note: 'A photo is common and accepted.' },
    { code: 'DE', name: 'Germany / EU', photo: true, note: 'A photo is conventional in continental Europe.' },
    {
        code: 'US',
        name: 'United States',
        photo: false,
        note: 'Most US employers discard CVs with photos — anti-discrimination policy.',
    },
    { code: 'UK', name: 'United Kingdom', photo: false, note: 'UK employers expect no photo.' },
    { code: 'AU', name: 'Australia', photo: false, note: 'Australian employers expect no photo.' },
];

export const regionOf = (code: RegionCode): RegionInfo => REGIONS.find((r) => r.code === code) ?? REGIONS[0];

export interface TemplateChoice {
    id: TemplateId;
    accent: string;
    region: RegionCode;
}

export interface CvDraft {
    /** How the visitor entered the flow. `null` until they pick a door. */
    source: 'import' | 'scratch' | null;
    /**
     * Dotted paths the parser filled but was not confident about. The field
     * renders a CHECK THIS badge until the visitor touches it — a rough parse
     * turns typing into auditing, so we flag rather than fill silently.
     */
    guessed: string[];
    basic: BasicInfo;
    photo: PhotoState;
    experience: ExperienceEntry[];
    education: EducationEntry[];
    projects: ProjectEntry[];
    skills: SkillSet;
    summary: { text: string; tone: SummaryTone };
    template: TemplateChoice;
}

export const emptyBasicInfo = (): BasicInfo => ({
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    nationality: '',
    website: '',
    linkedin: '',
    github: '',
});

export const emptyDraft = (): CvDraft => ({
    source: null,
    guessed: [],
    basic: emptyBasicInfo(),
    photo: {
        src: '',
        renderedSrc: '',
        ops: { bg: true, light: true, crop: true, colour: false },
        renders: 0,
        include: true,
    },
    experience: [],
    education: [],
    projects: [],
    skills: { technical: [], tools: [], languages: [], soft: [] },
    summary: { text: '', tone: 'confident' },
    template: { id: 'monolith', accent: '#ffd35b', region: 'KH' },
});

export const emptyExperience = (): ExperienceEntry => ({
    title: '',
    company: '',
    location: '',
    period: '',
    bullets: [''],
});
export const emptyEducation = (): EducationEntry => ({ degree: '', school: '', period: '', note: '' });
export const emptyProject = (): ProjectEntry => ({ name: '', role: '', link: '', period: '', desc: '' });

/** Keys the visitor cannot skip. Drives every "can I continue" check. */
export const REQUIRED_BASIC: readonly (keyof BasicInfo)[] = ['fullName', 'jobTitle', 'email', 'phone', 'location'];

/* ── API payloads ─────────────────────────────────────────────
   Everything below crosses the wire. Kept here so the services,
   the components and the MSW handlers share one definition. */

export interface ParseResult {
    draft: CvDraft;
    guessed: string[];
}

export interface RewriteResult {
    text: string;
}

export interface SkillSuggestion {
    skill: string;
    group: SkillGroup;
    /** The phrase in their own writing that implied it. */
    seenIn: string;
}

export type FindingLevel = 'ok' | 'warn' | 'bad';

export interface Finding {
    level: FindingLevel;
    text: string;
}

export interface TailorResult {
    score: number;
    wanted: string[];
    matched: string[];
    missing: string[];
}

export interface PhotoRenderResult {
    url: string;
    renders: number;
    /** USD. Qwen-Image-Edit is about two cents a render. */
    cost: number;
}

export interface ExportResult {
    format: string;
    url: string;
    /** Pages the renderer produced — the sheet is fixed A4, so this can be >1. */
    pages: number;
}
