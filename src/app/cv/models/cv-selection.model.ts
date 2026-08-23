import type { CvSectionId } from './cv-content.model';

/**
 * ELEVATOR — what is currently being edited.
 *
 * The ONE identity shared by the builder, the preview and the timeline. It is
 * a model coordinate, never a DOM coordinate: no innerText matching, no
 * "find the element whose text is 'Wing Bank'". A preview node declares which
 * target it stands for and the rest of the workspace resolves from there.
 */
export interface CvEditTarget {
    sectionId: CvSectionId;
    /** Absent for singleton sections (personal, summary). */
    recordId?: string;
    /** Field key from the section schema. Absent means "the record as a whole". */
    fieldId?: string;
}

export function sameTarget(a: CvEditTarget | null, b: CvEditTarget | null): boolean {
    if (!a || !b) {
        return a === b;
    }
    return (
        a.sectionId === b.sectionId &&
        (a.recordId ?? null) === (b.recordId ?? null) &&
        (a.fieldId ?? null) === (b.fieldId ?? null)
    );
}

/** True when `target` is inside `scope` — used for "is this record highlighted". */
export function targetWithin(target: CvEditTarget | null, scope: CvEditTarget): boolean {
    if (!target || target.sectionId !== scope.sectionId) {
        return false;
    }
    if (scope.recordId !== undefined && target.recordId !== scope.recordId) {
        return false;
    }
    if (scope.fieldId !== undefined && target.fieldId !== scope.fieldId) {
        return false;
    }
    return true;
}

export function targetKey(target: CvEditTarget): string {
    return [target.sectionId, target.recordId ?? '', target.fieldId ?? ''].join('/');
}
