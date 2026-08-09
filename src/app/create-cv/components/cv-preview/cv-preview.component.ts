import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, numberAttribute } from '@angular/core';

import type { CvDraft } from '../../models/cv-draft.model';

/**
 * The A4 paper preview.
 *
 * Deliberately a light-on-white document inside the dark builder: this is
 * what the recruiter receives, and previewing it in the app's dark theme
 * would misrepresent the artefact.
 *
 * It renders real headings, real text and real lists — nothing important is
 * trapped in an image or a pseudo-element — so `window.print()` produces a
 * parse-first PDF rather than a picture of one.
 */
@Component({
    selector: 'app-cv-preview',
    standalone: true,
    templateUrl: './cv-preview.component.html',
    styleUrl: './cv-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-paper-host' },
})
export class CvPreviewComponent {
    readonly draft = input.required<CvDraft>();
    readonly zoom = input(1, { transform: numberAttribute });

    protected dateRange(start: string, end: string, current: boolean): string {
        const to = current ? 'Present' : end;
        return [start, to].filter(Boolean).join(' — ');
    }
}
