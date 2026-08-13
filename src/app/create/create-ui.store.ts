import { Injectable, signal } from '@angular/core';

/**
 * ELEVATOR — view state for the create flow.
 *
 * Deliberately separate from CvDraftStore: none of this belongs on the CV,
 * and mixing it in would mean a preview toggle dirties the draft. Provided at
 * the shell, so it lives exactly as long as the wizard does.
 */
@Injectable()
export class CreateUiStore {
    /** Live preview docked beside the form. */
    readonly dock = signal(true);
    /** Dim everything a recruiter's eye skips on the first pass. */
    readonly sixSecond = signal(false);
    /** Which panel the review floor is showing. */
    readonly reviewTab = signal<'check' | 'ats' | 'job' | 'export'>('check');

    toggleDock(): void {
        this.dock.update((v) => !v);
    }
    toggleSixSecond(): void {
        this.sixSecond.update((v) => !v);
    }
}
