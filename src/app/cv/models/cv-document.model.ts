import { type CvContent, emptyCvContent } from './cv-content.model';
import { type CvDesign, type CvOptions, defaultCvDesign, defaultCvOptions } from './cv-design.model';

/**
 * ELEVATOR — a CV DOCUMENT.
 *
 * One CV, made for one application. It owns a snapshot of the person's
 * content plus the presentation choices for this particular document. It is
 * NOT the reusable professional profile (see ProfessionalProfile) — a document
 * is expendable, the profile is not.
 */

/** Where this document came from. Recorded so the UI can offer the right follow-up. */
export type CvSource = 'scratch' | 'profile' | 'import' | 'duplicate';

export interface CvDocument {
    id: string;
    name: string;
    targetRole: string | null;
    source: CvSource;
    content: CvContent;
    design: CvDesign;
    options: CvOptions;
    /** ISO 8601. Server-owned — the client never writes these. */
    createdAt: string;
    updatedAt: string;
}

/** What the CV list endpoint returns: enough to render a row, nothing more. */
export interface CvSummary {
    id: string;
    name: string;
    targetRole: string | null;
    templateId: string;
    createdAt: string;
    updatedAt: string;
}

export function emptyCvDocument(id: string, name = 'Untitled CV'): CvDocument {
    const now = new Date().toISOString();
    return {
        id,
        name,
        targetRole: null,
        source: 'scratch',
        content: emptyCvContent(),
        design: defaultCvDesign(),
        options: defaultCvOptions(),
        createdAt: now,
        updatedAt: now,
    };
}

export function summarizeCv(cv: CvDocument): CvSummary {
    return {
        id: cv.id,
        name: cv.name,
        targetRole: cv.targetRole,
        templateId: cv.design.templateId,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt,
    };
}
