import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';

import { CvDraftStore } from '../cv-draft.store';
import { ProjectEntry } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

/**
 * FLOOR 06 · projects.
 *
 * Optional, so NEXT never waits on it — and the most persuasive floor in the
 * building early in a career, where it does the work experience cannot.
 */
@Component({
    selector: 'app-create-projects',
    standalone: true,
    templateUrl: './projects.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvButtonComponent],
})
export class ProjectsComponent {
    readonly store = inject(CvDraftStore);
    readonly count = computed(() => this.store.projects().length);

    add(): void {
        this.store.addProject();
    }
    remove(i: number): void {
        this.store.removeProject(i);
    }
    patch(i: number, key: keyof ProjectEntry, value: ElvValue): void {
        this.store.setProject(i, key, value == null ? '' : String(value));
    }
}
