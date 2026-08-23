import { type CvDesign, defaultCvDesign } from '../models/cv-design.model';

/**
 * ELEVATOR — CV templates.
 *
 * DECISION: templates are FRONTEND assets, not backend records, so there is no
 * `GET /api/cv-templates` endpoint and none is mocked. A template here is a
 * name, a set of capabilities and a stylesheet that reads the `--cv-*`
 * variables CvPreviewComponent emits — shipping one is a frontend release, and
 * inventing a CRUD API for a constant would be an API to maintain for nothing.
 * Revisit only if templates ever become user- or admin-authored; the shape
 * below is deliberately the shape such an endpoint would return.
 *
 * Because a template only ever consumes design variables, switching one CANNOT
 * touch content. That is the mechanism behind "template changes preserve
 * everything", not a rule anybody has to remember.
 */
export interface CvTemplateCapabilities {
    photo: boolean;
    columns: (1 | 2)[];
    customizableColors: boolean;
    customizableFonts: boolean;
}

export interface CvTemplate {
    id: string;
    name: string;
    description: string;
    capabilities: CvTemplateCapabilities;
    /** Applied when the user switches to this template — presentation only. */
    defaults: Partial<CvDesign>;
}

export const CV_TEMPLATES: readonly CvTemplate[] = [
    {
        id: 'modern',
        name: 'Modern Professional',
        description: 'Accent rules, generous spacing, photo on the right. The safe default.',
        capabilities: { photo: true, columns: [1, 2], customizableColors: true, customizableFonts: true },
        defaults: { accentColor: '#1f4fd8', fontFamily: 'Inter', headerAlign: 'left', showPhoto: true, columns: 1 },
    },
    {
        id: 'classic',
        name: 'Classic Serif',
        description: 'Centred masthead, serif body, hairline dividers. Reads like a letter.',
        capabilities: { photo: false, columns: [1], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#1a1a1a',
            fontFamily: 'Georgia',
            headerAlign: 'center',
            showPhoto: false,
            columns: 1,
            lineHeight: 1.45,
        },
    },
    {
        id: 'compact',
        name: 'Compact Two-Column',
        description: 'Sidebar for skills and contact, main column for history. Fits a long career on one page.',
        capabilities: { photo: true, columns: [2], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#0f766e',
            fontFamily: 'Space Grotesk',
            headerAlign: 'left',
            columns: 2,
            marginMm: 12,
            sectionGapMm: 5,
        },
    },
    {
        id: 'executive',
        name: 'Executive',
        description: 'Tinted sidebar on the left, roomy main column. Senior and unhurried.',
        capabilities: { photo: true, columns: [2], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#1e3a5f',
            fontFamily: 'Calibri',
            headerAlign: 'left',
            showPhoto: true,
            columns: 2,
            marginMm: 14,
            sectionGapMm: 6,
        },
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'No rules, no colour blocks, a lot of air. Lets the writing carry it.',
        capabilities: { photo: false, columns: [1], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#2b2b2b',
            fontFamily: 'Inter',
            headerAlign: 'left',
            showPhoto: false,
            columns: 1,
            marginMm: 22,
            sectionGapMm: 10,
            lineHeight: 1.5,
        },
    },
    {
        id: 'academic',
        name: 'Academic',
        description: 'Dense serif, ruled section heads, room for publications. Built for long records.',
        capabilities: { photo: false, columns: [1], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#3f3f3f',
            fontFamily: 'Times New Roman',
            headerAlign: 'center',
            showPhoto: false,
            columns: 1,
            marginMm: 18,
            sectionGapMm: 5,
            lineHeight: 1.3,
            fontScale: 0.95,
        },
    },
    {
        id: 'banner',
        name: 'Banner',
        description: 'Full-width accent masthead with the name reversed out. Confident, still ATS-plain.',
        capabilities: { photo: true, columns: [1, 2], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#b3261e',
            fontFamily: 'Jost',
            headerAlign: 'left',
            showPhoto: true,
            columns: 1,
            marginMm: 14,
            sectionGapMm: 7,
        },
    },
] as const;

export const DEFAULT_TEMPLATE_ID = CV_TEMPLATES[0].id;

export function findTemplate(id: string): CvTemplate {
    return CV_TEMPLATES.find((template) => template.id === id) ?? CV_TEMPLATES[0];
}

/**
 * Switch template. Returns a new design — never touches content, and never
 * leaves the design in a state the new template cannot render (a one-column
 * template with `columns: 2`, a photo on a template that has nowhere to put it).
 */
export function applyTemplate(design: CvDesign, templateId: string): CvDesign {
    const template = findTemplate(templateId);
    const next: CvDesign = { ...design, ...template.defaults, templateId: template.id };

    if (!template.capabilities.photo) {
        next.showPhoto = false;
    }
    if (!template.capabilities.columns.includes(next.columns)) {
        next.columns = template.capabilities.columns[0];
    }
    if (!template.capabilities.customizableColors) {
        const fallback = defaultCvDesign(template.id);
        next.accentColor = template.defaults.accentColor ?? fallback.accentColor;
        next.textColor = fallback.textColor;
        next.pageColor = fallback.pageColor;
    }
    return next;
}
