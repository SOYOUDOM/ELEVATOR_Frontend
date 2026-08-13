import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvDraftStore } from '../cv-draft.store';
import { EducationEntry } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

/** FLOOR 04 · education. */
@Component({
    selector: 'app-create-education',
    standalone: true,
    templateUrl: './education.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvButtonComponent, ElvProgressComponent],
})
export class EducationComponent {
    readonly store = inject(CvDraftStore);
    readonly canContinue = computed(() => this.store.done()['education']);
    readonly count = computed(() => this.store.education().length);

    add(): void {
        this.store.addEducation();
    }
    remove(i: number): void {
        this.store.removeEducation(i);
    }
    patch(i: number, key: keyof EducationEntry, value: ElvValue): void {
        this.store.setEducation(i, key, value == null ? '' : String(value));
    }
    title(entry: EducationEntry): string {
        if (!entry.degree) {
            return '';
        }
        return entry.school ? `${entry.degree} — ${entry.school}` : entry.degree;
    }
}
