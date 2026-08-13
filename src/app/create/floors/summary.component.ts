import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { SummaryTone } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

/**
 * FLOOR 07 · summary.
 *
 * The safest place to let a model write, because every clause traces back to
 * a floor already filled. Nothing is introduced that is not already on the CV.
 */
@Component({
    selector: 'app-create-summary',
    standalone: true,
    templateUrl: './summary.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvButtonComponent, ElvProgressComponent],
})
export class SummaryComponent {
    readonly store = inject(CvDraftStore);

    readonly busy = signal(false);
    readonly tones: { id: SummaryTone; label: string }[] = [
        { id: 'concise', label: 'Concise' },
        { id: 'confident', label: 'Confident' },
        { id: 'warm', label: 'Warm' },
    ];

    readonly length = computed(() => this.store.summary().text.trim().length);
    readonly note = computed(() => {
        const n = this.length();
        if (n < 40) {
            return 'Aim for 240 – 400';
        }
        return n > 400 ? 'Trim it back' : 'Good length';
    });

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    setText(value: ElvValue): void {
        this.store.setSummary(value == null ? '' : String(value));
    }

    setTone(tone: SummaryTone): void {
        this.store.setTone(tone);
        if (this.length()) {
            this.draft();
        }
    }

    draft(): void {
        this.busy.set(true);
        this.api.draftSummary(this.store.draft(), this.store.summary().tone).subscribe({
            next: (res) => {
                this.store.setSummary(res.text);
                this.busy.set(false);
            },
            error: () => this.busy.set(false),
        });
    }

    clear(): void {
        this.store.setSummary('');
    }
}
