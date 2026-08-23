import type { CvContent, CvSectionId } from '../models/cv-content.model';
import type { CvDesign, CvOptions } from '../models/cv-design.model';
import type { CvDocument, CvSource, CvSummary } from '../models/cv-document.model';
import type { ProfessionalProfile } from '../models/professional-profile.model';

/**
 * ELEVATOR — the CV API contract.
 *
 * ONE definition of every request and response, imported by the Angular API
 * services AND by the MSW handlers. That shared import is the whole point: a
 * handler that drifts from what the app expects stops compiling, so the mock
 * can never quietly diverge from the contract the backend will have to honour.
 *
 * Where a DTO would be a character-for-character copy of the domain model, it
 * is an alias instead of a hand-written twin plus a mapper that does nothing.
 * The CV and the profile are already the normalized shape — they are stored and
 * transported as-is. Mappers exist further down only where the wire genuinely
 * differs (imports, ATS, AI).
 */

// ── CV ────────────────────────────────────────────────────────────────
export type CvDto = CvDocument;
export type CvListItemDto = CvSummary;

export interface CreateCvRequest {
    source: CvSource;
    name?: string;
    targetRole?: string | null;
    /** Required when `source === 'import'` — the completed import to draw content from. */
    importId?: string;
}

/**
 * Autosave payload. Partial by design: the editor sends the branches it
 * touched, never the whole document, so two fast edits to different sections
 * cannot clobber each other on the server.
 */
export interface UpdateCvRequest {
    name?: string;
    targetRole?: string | null;
    content?: Partial<CvContent>;
    design?: Partial<CvDesign>;
    options?: Partial<CvOptions>;
}

// ── Professional profile ──────────────────────────────────────────────
export type ProfessionalProfileDto = ProfessionalProfile;

export interface SaveProfessionalProfileRequest {
    content: CvContent;
}

/** `POST /api/cvs/from-profile`. No body fields today; kept as a type for the shape to grow into. */
export interface CreateCvFromProfileRequest {
    name?: string;
    targetRole?: string | null;
}

// ── Import ────────────────────────────────────────────────────────────
export type CvImportStatus = 'processing' | 'completed' | 'failed';

/** Coarse progress labels. The UI shows them verbatim, so they read as English. */
export type CvImportStage =
    | 'reading-document'
    | 'extracting-personal'
    | 'extracting-experience'
    | 'extracting-education'
    | 'extracting-skills'
    | 'normalizing'
    | 'done';

export interface CvImportDto {
    id: string;
    status: CvImportStatus;
    stage: CvImportStage;
    /** 0-100. */
    progress: number;
    fileName: string;
    /** Present only when `status === 'completed'`. */
    result?: CvImportResultDto;
    /** Present only when `status === 'failed'`. */
    error?: ApiErrorDto;
}

export interface CvImportResultDto {
    content: CvContent;
    /** Sections the extractor actually found something for — drives the review step. */
    extractedSections: CvSectionId[];
    /** Extractor confidence, 0-1. Surfaced so the review step can be honest. */
    confidence: number;
}

// ── ATS ───────────────────────────────────────────────────────────────
export type AtsSeverity = 'critical' | 'warning' | 'info';

export interface AtsIssueDto {
    id: string;
    severity: AtsSeverity;
    message: string;
    /** Where to send the user when they act on it. */
    sectionId?: CvSectionId;
}

export interface AtsSuggestionDto {
    id: string;
    message: string;
}

export interface AtsResultDto {
    score: number;
    checksPassed: number;
    checksTotal: number;
    issues: AtsIssueDto[];
    suggestions: AtsSuggestionDto[];
    checkedAt: string;
}

export interface AtsCheckRequest {
    /** Optional job ad to score against. Absent = generic parse-ability check. */
    jobDescription?: string;
}

// ── AI ────────────────────────────────────────────────────────────────
export type CvAiTone = 'concise' | 'impactful' | 'formal';

export interface CvAiRequest {
    cvId: string;
    sectionId: CvSectionId;
    recordId?: string;
    fieldId?: string;
    currentContent: string;
    instruction?: string;
    tone?: CvAiTone;
}

export interface CvAiResponseDto {
    /** Candidate rewrites, best first. The user picks; nothing is auto-applied. */
    variants: string[];
    model: string;
    generatedAt: string;
}

// ── Errors ────────────────────────────────────────────────────────────
/**
 * The single error envelope for every endpoint in this feature. MSW returns
 * exactly this shape so the failure paths the UI is built against are the ones
 * the backend will have to produce.
 */
export interface ApiErrorDto {
    code: string;
    message: string;
    /** Server-side validation, keyed by dotted field path (`content.personal.email`). */
    fieldErrors?: Record<string, string[]>;
    traceId?: string;
}

export const CV_ERROR_CODES = {
    validation: 'CV_VALIDATION_FAILED',
    notFound: 'CV_NOT_FOUND',
    profileNotFound: 'PROFILE_NOT_FOUND',
    importFailed: 'CV_IMPORT_FAILED',
    importUnsupported: 'CV_IMPORT_UNSUPPORTED_FORMAT',
    importTooLarge: 'CV_IMPORT_FILE_TOO_LARGE',
    atsFailed: 'ATS_CHECK_FAILED',
    aiFailed: 'CV_AI_FAILED',
    serverError: 'INTERNAL_SERVER_ERROR',
} as const;
