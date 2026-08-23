import type { CvSectionId } from './cv-content.model';
import { DEFAULT_CV_FONT } from './cv-fonts';

/**
 * ELEVATOR — the CV's DESIGN.
 *
 * NON-NEGOTIABLE SEPARATION: nothing here reads an ELEVATOR theme token, and
 * nothing in the ELEVATOR UI reads a value from here. The application chrome is
 * dark, gold-accented and ours; the document is white, serif, blue — or
 * whatever the user says it is. Two palettes that never meet.
 *
 * Every value below is emitted as a `--cv-*` custom property on the document
 * root by CvPreviewComponent, so a template is a stylesheet that consumes these
 * variables and nothing more. That is what makes template switching lossless:
 * content is untouched, only the consumer of these variables changes.
 */

export type CvHeaderAlign = 'left' | 'center';
export type CvDateStylePref = 'short' | 'long' | 'numeric';

export interface CvDesign {
    templateId: string;
    /** Accent used by the document itself — headings, rules, links. */
    accentColor: string;
    textColor: string;
    pageColor: string;
    /**
     * A CSS family NAME — 'Georgia', 'Inter', or anything the user picked off
     * their own machine. Documents written before this was widened still hold
     * 'sans' / 'serif' / 'mono' / 'grotesk'; resolveFontStack() maps those, so
     * nothing needs migrating. See models/cv-fonts.ts.
     */
    fontFamily: string;
    /** Multiplier on the template's base size. 0.85 – 1.25. */
    fontScale: number;
    lineHeight: number;
    /** Page margin in millimetres — a print unit, because this is a document. */
    marginMm: number;
    /** Vertical gap between sections, in millimetres. */
    sectionGapMm: number;
    columns: 1 | 2;
    showPhoto: boolean;
    headerAlign: CvHeaderAlign;
    /** Full order of every section. Sections absent from the array fall back to natural order. */
    sectionOrder: CvSectionId[];
    /** Sections the user switched off. They keep their content. */
    hiddenSections: CvSectionId[];
}

export interface CvOptions {
    dateStyle: CvDateStylePref;
    presentLabel: string;
    showContactIcons: boolean;
    showSectionRules: boolean;
    /** Show "References available on request" style closing line. */
    showFooterNote: boolean;
    footerNote: string;
}

export const CV_DESIGN_LIMITS = {
    fontScale: { min: 0.85, max: 1.25, step: 0.05 },
    lineHeight: { min: 1.15, max: 1.75, step: 0.05 },
    marginMm: { min: 8, max: 28, step: 1 },
    sectionGapMm: { min: 3, max: 14, step: 1 },
} as const;

export function defaultCvDesign(templateId = 'modern'): CvDesign {
    return {
        templateId,
        accentColor: '#1f4fd8',
        textColor: '#11161f',
        pageColor: '#ffffff',
        fontFamily: DEFAULT_CV_FONT,
        fontScale: 1,
        lineHeight: 1.4,
        marginMm: 16,
        sectionGapMm: 7,
        columns: 1,
        showPhoto: true,
        headerAlign: 'left',
        sectionOrder: [
            'personal',
            'summary',
            'experience',
            'projects',
            'education',
            'skills',
            'certifications',
            'languages',
            'additional',
        ],
        hiddenSections: [],
    };
}

export function defaultCvOptions(): CvOptions {
    return {
        dateStyle: 'short',
        presentLabel: 'Present',
        showContactIcons: true,
        showSectionRules: true,
        showFooterNote: false,
        footerNote: 'References available on request.',
    };
}
