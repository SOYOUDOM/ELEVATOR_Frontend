import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';

import type { CreateCvStep } from '../../config/create-cv-steps.config';
import type { CvDraft, CvStepId } from '../../models/cv-draft.model';

export type StepRailState = 'complete' | 'active' | 'upcoming';

/** One rail row, resolved once per change rather than in the template. */
export interface StepRailRow {
    id: CvStepId;
    num: string;
    label: string;
    icon: string;
    state: StepRailState;
    status: string;
}

/**
 * The vertical floor rail beside the form.
 *
 * Purely presentational — it takes the registry and the draft, and emits an
 * id. It injects nothing, so it can be dropped beside any floor's form
 * without that floor knowing how status is computed.
 *
 * Status wording is deliberately plain ("Completed" / "In Progress" /
 * "Upcoming") rather than a bare tick: on a form this long the user needs to
 * know what is left, not just what is done.
 */
@Component({
    selector: 'app-step-rail',
    standalone: true,
    templateUrl: './step-rail.component.html',
    styleUrl: './step-rail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-rail' },
})
export class StepRailComponent {
    readonly steps = input.required<readonly CreateCvStep[]>();
    readonly draft = input.required<CvDraft>();
    readonly activeId = input<CvStepId | null>(null);

    readonly selected = output<CvStepId>();

    protected readonly rows = computed<StepRailRow[]>(() => {
        const active = this.activeId();
        const draft = this.draft();
        const all = this.steps();
        const activeIndex = all.findIndex((s) => s.id === active);

        return all.map((step, i) => {
            const state: StepRailState =
                step.id === active ? 'active' : step.isComplete(draft) || i < activeIndex ? 'complete' : 'upcoming';

            return {
                id: step.id,
                num: i < 9 ? `0${i + 1}` : String(i + 1),
                label: step.label,
                icon: step.icon,
                state,
                status: state === 'active' ? 'In Progress' : state === 'complete' ? 'Completed' : 'Upcoming',
            };
        });
    });

    protected onSelect(id: CvStepId): void {
        this.selected.emit(id);
    }
}
