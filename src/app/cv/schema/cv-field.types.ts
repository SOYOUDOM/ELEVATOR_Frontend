import type { CvDateRange } from '../models/cv-date';

/**
 * ELEVATOR — a field, described rather than hand-written.
 *
 * Nine sections × a form each would be nine near-identical templates, and the
 * ninth would drift from the first inside a month. Instead every section
 * declares its fields here, and ONE form component renders any of them.
 *
 * The pay-off is bigger than the saved markup: the same declaration also gives
 * the preview its click-to-edit field ids, the builder its completion state,
 * and the timeline its date ranges. One description, four consumers, no chance
 * of them disagreeing.
 */

export type CvTextControl = 'text' | 'email' | 'tel' | 'url' | 'textarea';
export type CvFieldControl = CvTextControl | 'month-range' | 'string-list' | 'photo';

export interface CvFieldBase<TRecord> {
    /** Also the `fieldId` in a CvEditTarget. Unique within its section. */
    id: string;
    label: string;
    /** Half-width fields pair up on one row on a wide panel. */
    span: 'full' | 'half';
    placeholder?: string;
    hint?: string;
    /** Counts toward the section's completion ring. */
    required?: boolean;
    /** PrimeIcon name without the `pi ` prefix. */
    icon?: string;
}

export interface CvTextFieldSpec<TRecord> extends CvFieldBase<TRecord> {
    control: CvTextControl;
    rows?: number;
    maxLength?: number;
    read(record: TRecord): string;
    write(record: TRecord, value: string): TRecord;
}

export interface CvRangeFieldSpec<TRecord> extends CvFieldBase<TRecord> {
    control: 'month-range';
    /** Certifications get a start date and no "still going" checkbox. */
    allowPresent: boolean;
    allowEnd: boolean;
    read(record: TRecord): CvDateRange;
    write(record: TRecord, value: CvDateRange): TRecord;
}

export interface CvListFieldSpec<TRecord> extends CvFieldBase<TRecord> {
    control: 'string-list';
    /** Singular noun for the add button: "bullet", "skill". */
    itemNoun: string;
    read(record: TRecord): string[];
    write(record: TRecord, value: string[]): TRecord;
}

export interface CvPhotoFieldSpec<TRecord> extends CvFieldBase<TRecord> {
    control: 'photo';
    /** Data URI, or null when the user has not added one. */
    read(record: TRecord): string | null;
    write(record: TRecord, value: string | null): TRecord;
}

export type CvFieldSpec<TRecord> =
    | CvTextFieldSpec<TRecord>
    | CvRangeFieldSpec<TRecord>
    | CvListFieldSpec<TRecord>
    | CvPhotoFieldSpec<TRecord>;

/** True when the user has actually put something in this field. */
export function fieldIsFilled<T>(field: CvFieldSpec<T>, record: T): boolean {
    switch (field.control) {
        case 'month-range': {
            const range = field.read(record);
            return !!range.start;
        }
        case 'string-list':
            return field.read(record).some((entry) => entry.trim().length > 0);
        case 'photo':
            return !!field.read(record);
        default:
            return field.read(record).trim().length > 0;
    }
}
