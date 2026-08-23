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
        defaults: { accentColor: '#1f4fd8', fontFamily: 'sans', headerAlign: 'left', showPhoto: true, columns: 1 },
    },
    {
        id: 'classic',
        name: 'Classic Serif',
        description: 'Centred masthead, serif body, hairline dividers. Reads like a letter.',
        capabilities: { photo: false, columns: [1], customizableColors: true, customizableFonts: true },
        defaults: {
            accentColor: '#1a1a1a',
            fontFamily: 'serif',
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
            fontFamily: 'grotesk',
            headerAlign: 'left',
            columns: 2,
            marginMm: 12,
            sectionGapMm: 5,
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
