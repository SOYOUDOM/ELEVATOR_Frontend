import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvAtsApiService } from '@app/cv/api/cv-ats-api.service';
import type { AtsIssueDto, AtsResultDto } from '@app/cv/api/cv-api.contracts';
import { toApiError } from '@app/cv/api/api-error';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';

/**
 * ELEVATOR — ATS score.
 *
 * The score comes from the server, so the number on screen is the number the
 * backend computed — no browser-side approximation wearing the same badge.
 * Nothing is shown until a check has actually run: an idle panel says "not
 * checked yet" rather than displaying a flattering placeholder.
 *
 * Every issue is a link into the document. Telling someone their summary is
 * thin without taking them to it is half a feature.
 */
@Component({
    selector: 'app-cv-ats-panel',
    standalone: true,
    templateUrl: './cv-ats-panel.component.html',
    styleUrl: './cv-ats-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvProgressComponent, ElvAlertComponent],
    host: { class: 'ats' },
})
export class CvAtsPanelComponent {
    private readonly api = inject(CvAtsApiService);
    private readonly editor = inject(CvEditorStore);
    private readonly selection = inject(CvSelectionStore);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly result = signal<AtsResultDto | null>(null);

    readonly verdict = computed(() => {
        const score = this.result()?.score ?? 0;
        if (score >= 90) {
            return { label: 'Excellent', note: 'Your CV is highly ATS-friendly.' };
        }
        if (score >= 70) {
            return { label: 'Good', note: 'A few fixes would put this in the top band.' };
        }
        return { label: 'Needs work', note: 'Work through the issues below before you apply.' };
    });

    run(): void {
        const cv = this.editor.document();
        if (!cv) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);

        this.api
            .check(cv.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.result.set(result);
                    this.loading.set(false);
                },
                error: (failure) => {
                    this.error.set(toApiError(failure).message);
                    this.loading.set(false);
                },
            });
    }

    goToIssue(issue: AtsIssueDto): void {
        if (issue.sectionId) {
            this.selection.selectSection(issue.sectionId);
        }
    }
}
