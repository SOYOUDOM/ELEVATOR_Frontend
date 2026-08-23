import type { CvDateRange } from '../models/cv-date';
import { emptyDateRange } from '../models/cv-content.model';
import type {
    CvAdditionalEntry,
    CvCertification,
    CvContent,
    CvEducation,
    CvExperience,
    CvLanguage,
    CvPersonalInfo,
    CvProject,
    CvRecord,
    CvSectionId,
    CvSkillGroup,
} from '../models/cv-content.model';
import type { TimelineCategoryId } from '../models/cv-timeline.model';
import { newCvId } from '../models/cv-id';
import { type CvFieldSpec, type CvTextFieldSpec, fieldIsFilled } from './cv-field.types';

/**
 * ELEVATOR — the CV section registry.
 *
 * The single description of what a CV is made of. Adding a section means
 * adding one entry here; the builder list, its form, the preview's edit
 * targets, the completion ring and (if it is dated) the Career Timeline all
 * pick it up without another line of code.
 *
 * `read`/`write` pairs keep the registry honest about immutability: a write
 * returns a NEW content object, so the editor store can swap state atomically
 * and OnPush components see a changed reference.
 */

interface CvSectionBase {
    id: CvSectionId;
    label: string;
    /** PrimeIcon name without the `pi ` prefix. */
    icon: string;
    /** One line under the section title in the builder. */
    hint: string;
}

export interface CvSingletonSection<TRecord> extends CvSectionBase {
    kind: 'single';
    fields: CvFieldSpec<TRecord>[];
    read(content: CvContent): TRecord;
    write(content: CvContent, next: TRecord): CvContent;
}

export interface CvListSection<TRecord extends CvRecord> extends CvSectionBase {
    kind: 'list';
    fields: CvFieldSpec<TRecord>[];
    /** Button label: "Add Role", "Add Project". */
    addLabel: string;
    read(content: CvContent): TRecord[];
    write(content: CvContent, next: TRecord[]): CvContent;
    create(): TRecord;
    /** Row title in the builder and the timeline bar's label. */
    titleOf(record: TRecord): string;
    subtitleOf(record: TRecord): string;
    /** Present only for dated sections — this is what puts a row on the timeline. */
    timeline?: {
        category: TimelineCategoryId;
        label: string;
        icon: string;
        rangeOf(record: TRecord): CvDateRange;
        withRange(record: TRecord, range: CvDateRange): TRecord;
    };
}

export type CvSectionSpec = CvSingletonSection<any> | CvListSection<any>;

/** Shorthand for the most common field: a plain single-line text input. */
const text = <T>(spec: Omit<CvTextFieldSpec<T>, 'control'>): CvTextFieldSpec<T> => ({
    control: 'text',
    ...spec,
});

// ── personal ──────────────────────────────────────────────────────────
const personalSection: CvSingletonSection<CvPersonalInfo> = {
    id: 'personal',
    kind: 'single',
    label: 'Personal Info',
    icon: 'pi-user',
    hint: 'Who you are and how to reach you.',
    read: (content) => content.personal,
    write: (content, next) => ({ ...content, personal: next }),
    fields: [
        text<CvPersonalInfo>({
            id: 'fullName',
            label: 'Full Name',
            span: 'full',
            required: true,
            placeholder: 'Your name as a recruiter should read it',
            read: (r) => r.fullName,
            write: (r, v) => ({ ...r, fullName: v }),
        }),
        text<CvPersonalInfo>({
            id: 'jobTitle',
            label: 'Job Title',
            span: 'full',
            required: true,
            placeholder: 'The role you are applying for',
            read: (r) => r.jobTitle,
            write: (r, v) => ({ ...r, jobTitle: v }),
        }),
        {
            control: 'email',
            id: 'email',
            label: 'Email',
            span: 'half',
            required: true,
            icon: 'pi-envelope',
            read: (r) => r.email,
            write: (r, v) => ({ ...r, email: v }),
        },
        {
            control: 'tel',
            id: 'phone',
            label: 'Phone',
            span: 'half',
            icon: 'pi-phone',
            read: (r) => r.phone,
            write: (r, v) => ({ ...r, phone: v }),
        },
        text<CvPersonalInfo>({
            id: 'location',
            label: 'Location',
            span: 'half',
            icon: 'pi-map-marker',
            placeholder: 'City, Country',
            read: (r) => r.location,
            write: (r, v) => ({ ...r, location: v }),
        }),
        {
            control: 'url',
            id: 'website',
            label: 'Website',
            span: 'half',
            icon: 'pi-globe',
            placeholder: 'portfolio, GitHub or LinkedIn',
            read: (r) => r.website,
            write: (r, v) => ({ ...r, website: v }),
        },
        {
            control: 'photo',
            id: 'photo',
            label: 'Photo',
            span: 'full',
            hint: 'Optional. Only appears on templates that have somewhere to put it, and only while Design › Show photo is on.',
            read: (r) => r.photoUrl,
            write: (r, v) => ({ ...r, photoUrl: v }),
        },
    ],
};

// ── summary ───────────────────────────────────────────────────────────
interface SummaryRecord {
    summary: string;
}

const summarySection: CvSingletonSection<SummaryRecord> = {
    id: 'summary',
    kind: 'single',
    label: 'Summary',
    icon: 'pi-align-left',
    hint: 'Three or four lines a recruiter reads first.',
    read: (content) => ({ summary: content.summary }),
    write: (content, next) => ({ ...content, summary: next.summary }),
    fields: [
        {
            control: 'textarea',
            id: 'summary',
            label: 'Professional Summary',
            span: 'full',
            rows: 6,
            maxLength: 900,
            required: true,
            placeholder: 'What you do, how long you have done it, and what you are good at.',
            read: (r) => r.summary,
            write: (r, v) => ({ ...r, summary: v }),
        },
    ],
};

// ── experience ────────────────────────────────────────────────────────
const experienceSection: CvListSection<CvExperience> = {
    id: 'experience',
    kind: 'list',
    label: 'Work Experience',
    icon: 'pi-briefcase',
    hint: 'Roles, newest first.',
    addLabel: 'Add Role',
    read: (content) => content.experience,
    write: (content, next) => ({ ...content, experience: next }),
    create: () => ({
        id: newCvId('exp'),
        jobTitle: '',
        company: '',
        location: '',
        dates: emptyDateRange(),
        bullets: [''],
    }),
    titleOf: (r) => r.jobTitle || 'Untitled role',
    subtitleOf: (r) => r.company,
    timeline: {
        category: 'experience',
        label: 'Work Experience',
        icon: 'pi-briefcase',
        rangeOf: (r) => r.dates,
        withRange: (r, dates) => ({ ...r, dates }),
    },
    fields: [
        text<CvExperience>({
            id: 'jobTitle',
            label: 'Job Title',
            span: 'half',
            required: true,
            read: (r) => r.jobTitle,
            write: (r, v) => ({ ...r, jobTitle: v }),
        }),
        text<CvExperience>({
            id: 'company',
            label: 'Company',
            span: 'half',
            required: true,
            read: (r) => r.company,
            write: (r, v) => ({ ...r, company: v }),
        }),
        text<CvExperience>({
            id: 'location',
            label: 'Location',
            span: 'half',
            read: (r) => r.location,
            write: (r, v) => ({ ...r, location: v }),
        }),
        {
            control: 'month-range',
            id: 'dates',
            label: 'Dates',
            span: 'full',
            required: true,
            allowPresent: true,
            allowEnd: true,
            read: (r) => r.dates,
            write: (r, v) => ({ ...r, dates: v }),
        },
        {
            control: 'string-list',
            id: 'bullets',
            label: 'What you did',
            span: 'full',
            itemNoun: 'bullet',
            hint: 'One outcome per line. Numbers beat adjectives.',
            read: (r) => r.bullets,
            write: (r, v) => ({ ...r, bullets: v }),
        },
    ],
};

// ── education ─────────────────────────────────────────────────────────
const educationSection: CvListSection<CvEducation> = {
    id: 'education',
    kind: 'list',
    label: 'Education',
    icon: 'pi-graduation-cap',
    hint: 'Degrees, courses and anything with a certificate.',
    addLabel: 'Add Education',
    read: (content) => content.education,
    write: (content, next) => ({ ...content, education: next }),
    create: () => ({
        id: newCvId('edu'),
        degree: '',
        institution: '',
        location: '',
        dates: emptyDateRange(),
        note: '',
    }),
    titleOf: (r) => r.degree || 'Untitled qualification',
    subtitleOf: (r) => r.institution,
    timeline: {
        category: 'education',
        label: 'Education',
        icon: 'pi-graduation-cap',
        rangeOf: (r) => r.dates,
        withRange: (r, dates) => ({ ...r, dates }),
    },
    fields: [
        text<CvEducation>({
            id: 'degree',
            label: 'Qualification',
            span: 'half',
            required: true,
            read: (r) => r.degree,
            write: (r, v) => ({ ...r, degree: v }),
        }),
        text<CvEducation>({
            id: 'institution',
            label: 'Institution',
            span: 'half',
            required: true,
            read: (r) => r.institution,
            write: (r, v) => ({ ...r, institution: v }),
        }),
        text<CvEducation>({
            id: 'location',
            label: 'Location',
            span: 'half',
            read: (r) => r.location,
            write: (r, v) => ({ ...r, location: v }),
        }),
        {
            control: 'month-range',
            id: 'dates',
            label: 'Dates',
            span: 'full',
            allowPresent: true,
            allowEnd: true,
            read: (r) => r.dates,
            write: (r, v) => ({ ...r, dates: v }),
        },
        {
            control: 'textarea',
            id: 'note',
            label: 'Note',
            span: 'full',
            rows: 3,
            placeholder: 'Grade, thesis, or anything worth a line.',
            read: (r) => r.note,
            write: (r, v) => ({ ...r, note: v }),
        },
    ],
};

// ── skills ────────────────────────────────────────────────────────────
const skillsSection: CvListSection<CvSkillGroup> = {
    id: 'skills',
    kind: 'list',
    label: 'Skills',
    icon: 'pi-bolt',
    hint: 'Grouped, so a scanner and a human both find them.',
    addLabel: 'Add Group',
    read: (content) => content.skills,
    write: (content, next) => ({ ...content, skills: next }),
    create: () => ({ id: newCvId('skl'), name: '', skills: [] }),
    titleOf: (r) => r.name || 'Untitled group',
    subtitleOf: (r) => `${r.skills.length} skill${r.skills.length === 1 ? '' : 's'}`,
    fields: [
        text<CvSkillGroup>({
            id: 'name',
            label: 'Group',
            span: 'full',
            required: true,
            placeholder: 'Languages, Tooling, Domain…',
            read: (r) => r.name,
            write: (r, v) => ({ ...r, name: v }),
        }),
        {
            control: 'string-list',
            id: 'skills',
            label: 'Skills',
            span: 'full',
            itemNoun: 'skill',
            required: true,
            read: (r) => r.skills,
            write: (r, v) => ({ ...r, skills: v }),
        },
    ],
};

// ── projects ──────────────────────────────────────────────────────────
const projectsSection: CvListSection<CvProject> = {
    id: 'projects',
    kind: 'list',
    label: 'Projects',
    icon: 'pi-sitemap',
    hint: 'Things you built that are worth a look.',
    addLabel: 'Add Project',
    read: (content) => content.projects,
    write: (content, next) => ({ ...content, projects: next }),
    create: () => ({
        id: newCvId('prj'),
        name: '',
        role: '',
        link: '',
        dates: emptyDateRange(),
        description: '',
    }),
    titleOf: (r) => r.name || 'Untitled project',
    subtitleOf: (r) => r.role,
    timeline: {
        category: 'projects',
        label: 'Projects',
        icon: 'pi-sitemap',
        rangeOf: (r) => r.dates,
        withRange: (r, dates) => ({ ...r, dates }),
    },
    fields: [
        text<CvProject>({
            id: 'name',
            label: 'Project',
            span: 'half',
            required: true,
            read: (r) => r.name,
            write: (r, v) => ({ ...r, name: v }),
        }),
        text<CvProject>({
            id: 'role',
            label: 'Your role',
            span: 'half',
            read: (r) => r.role,
            write: (r, v) => ({ ...r, role: v }),
        }),
        {
            control: 'url',
            id: 'link',
            label: 'Link',
            span: 'full',
            icon: 'pi-link',
            read: (r) => r.link,
            write: (r, v) => ({ ...r, link: v }),
        },
        {
            control: 'month-range',
            id: 'dates',
            label: 'Dates',
            span: 'full',
            allowPresent: true,
            allowEnd: true,
            read: (r) => r.dates,
            write: (r, v) => ({ ...r, dates: v }),
        },
        {
            control: 'textarea',
            id: 'description',
            label: 'Description',
            span: 'full',
            rows: 4,
            read: (r) => r.description,
            write: (r, v) => ({ ...r, description: v }),
        },
    ],
};

// ── certifications ────────────────────────────────────────────────────
const certificationsSection: CvListSection<CvCertification> = {
    id: 'certifications',
    kind: 'list',
    label: 'Certifications',
    icon: 'pi-verified',
    hint: 'Anything with an issuer and a date.',
    addLabel: 'Add Certification',
    read: (content) => content.certifications,
    write: (content, next) => ({ ...content, certifications: next }),
    create: () => ({ id: newCvId('crt'), name: '', issuer: '', dates: emptyDateRange(), credentialId: '' }),
    titleOf: (r) => r.name || 'Untitled certification',
    subtitleOf: (r) => r.issuer,
    fields: [
        text<CvCertification>({
            id: 'name',
            label: 'Certification',
            span: 'half',
            required: true,
            read: (r) => r.name,
            write: (r, v) => ({ ...r, name: v }),
        }),
        text<CvCertification>({
            id: 'issuer',
            label: 'Issuer',
            span: 'half',
            read: (r) => r.issuer,
            write: (r, v) => ({ ...r, issuer: v }),
        }),
        {
            control: 'month-range',
            id: 'dates',
            label: 'Issued',
            span: 'half',
            allowPresent: false,
            allowEnd: false,
            read: (r) => r.dates,
            write: (r, v) => ({ ...r, dates: v }),
        },
        text<CvCertification>({
            id: 'credentialId',
            label: 'Credential ID',
            span: 'half',
            read: (r) => r.credentialId,
            write: (r, v) => ({ ...r, credentialId: v }),
        }),
    ],
};

// ── languages ─────────────────────────────────────────────────────────
const languagesSection: CvListSection<CvLanguage> = {
    id: 'languages',
    kind: 'list',
    label: 'Languages',
    icon: 'pi-comments',
    hint: 'Language and the level you would defend in an interview.',
    addLabel: 'Add Language',
    read: (content) => content.languages,
    write: (content, next) => ({ ...content, languages: next }),
    create: () => ({ id: newCvId('lng'), name: '', level: '' }),
    titleOf: (r) => r.name || 'Untitled language',
    subtitleOf: (r) => r.level,
    fields: [
        text<CvLanguage>({
            id: 'name',
            label: 'Language',
            span: 'half',
            required: true,
            read: (r) => r.name,
            write: (r, v) => ({ ...r, name: v }),
        }),
        text<CvLanguage>({
            id: 'level',
            label: 'Level',
            span: 'half',
            placeholder: 'Native, Fluent, B2…',
            read: (r) => r.level,
            write: (r, v) => ({ ...r, level: v }),
        }),
    ],
};

// ── additional ────────────────────────────────────────────────────────
const additionalSection: CvListSection<CvAdditionalEntry> = {
    id: 'additional',
    kind: 'list',
    label: 'Additional',
    icon: 'pi-ellipsis-h',
    hint: 'Awards, volunteering, publications — anything left over.',
    addLabel: 'Add Entry',
    read: (content) => content.additional,
    write: (content, next) => ({ ...content, additional: next }),
    create: () => ({ id: newCvId('add'), label: '', value: '' }),
    titleOf: (r) => r.label || 'Untitled entry',
    subtitleOf: (r) => r.value,
    fields: [
        text<CvAdditionalEntry>({
            id: 'label',
            label: 'Label',
            span: 'half',
            required: true,
            read: (r) => r.label,
            write: (r, v) => ({ ...r, label: v }),
        }),
        text<CvAdditionalEntry>({
            id: 'value',
            label: 'Detail',
            span: 'half',
            read: (r) => r.value,
            write: (r, v) => ({ ...r, value: v }),
        }),
    ],
};

export const CV_SECTIONS: readonly CvSectionSpec[] = [
    personalSection,
    summarySection,
    experienceSection,
    educationSection,
    skillsSection,
    projectsSection,
    certificationsSection,
    languagesSection,
    additionalSection,
] as const;

const BY_ID = new Map<CvSectionId, CvSectionSpec>(CV_SECTIONS.map((section) => [section.id, section]));

export function sectionSpec(id: CvSectionId): CvSectionSpec {
    const spec = BY_ID.get(id);
    if (!spec) {
        throw new Error(`Unknown CV section: ${id}`);
    }
    return spec;
}

export function isListSection(spec: CvSectionSpec): spec is CvListSection<CvRecord> {
    return spec.kind === 'list';
}

/** Records a section holds — one synthetic record for singletons, so callers stop branching. */
export function sectionRecords(spec: CvSectionSpec, content: CvContent): unknown[] {
    return isListSection(spec) ? spec.read(content) : [spec.read(content)];
}

/** 0-100. Required fields only: an empty optional field is not "incomplete". */
export function sectionCompletion(spec: CvSectionSpec, content: CvContent): number {
    const required = spec.fields.filter((field) => field.required);
    if (required.length === 0) {
        return isListSection(spec) ? (spec.read(content).length > 0 ? 100 : 0) : 100;
    }

    const records = sectionRecords(spec, content);
    if (records.length === 0) {
        return 0;
    }

    let filled = 0;
    for (const record of records) {
        for (const field of required) {
            if (fieldIsFilled(field, record)) {
                filled++;
            }
        }
    }
    return Math.round((filled / (records.length * required.length)) * 100);
}
