import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { RevealDirective } from '@shared/directives/reveal.directive';

import { WizardStepFrameComponent } from '../../components/wizard-step-frame/wizard-step-frame.component';
import { START_PATHS } from '../../config/start-paths.config';
import { findStepById } from '../../config/wizard-steps.config';
import type { StartPath } from '../../models/start-path.model';
import { CvDraftStore } from '../../services/cv-draft.store';
import { CvWizardService } from '../../services/cv-wizard.service';

/**
 * STEP 01 — how do you want to start?
 *
 * The three cards are the step's only CTA, so the frame renders no footer nav.
 * Choosing a door does two things and nothing else: record the choice on the
 * draft, then hand off to whatever step that door declares. Neither the target
 * nor the copy lives here — both come from `START_PATHS`, so adding a fourth
 * door is a config entry.
 */
@Component({
    selector: 'app-choose-path',
    standalone: true,
    imports: [WizardStepFrameComponent, RevealDirective],
    templateUrl: './choose-path.component.html',
    styleUrl: './choose-path.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoosePathComponent {
    protected readonly wizard = inject(CvWizardService);
    protected readonly store = inject(CvDraftStore);

    protected readonly paths = START_PATHS;
    protected readonly step = this.wizard.activeStep;

    /** Latches the card being entered so the hand-off cannot be double-fired. */
    protected readonly busyPath = signal<string | null>(null);

    protected choose(path: StartPath): void {
        if (this.busyPath()) {
            return;
        }
        this.busyPath.set(path.id);

        this.store.choosePath(path.id);
        this.store.markCompleted('start');

        const target = findStepById(path.nextStepId);
        const navigation = target ? this.wizard.goTo(target.id) : this.wizard.next();

        navigation.finally(() => this.busyPath.set(null));
    }
}
