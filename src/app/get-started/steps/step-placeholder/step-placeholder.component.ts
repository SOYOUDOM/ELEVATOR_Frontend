import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { WizardStepFrameComponent } from '../../components/wizard-step-frame/wizard-step-frame.component';
import { CvWizardService } from '../../services/cv-wizard.service';

/**
 * The stand-in for any registry step that has no component yet.
 *
 * One component covers all of them: everything it shows — icon, title,
 * subtitle, whether Skip is offered — is read from the active step's registry
 * entry. That keeps the whole seven-floor track navigable and testable from
 * day one, and retiring it for a real screen is a one-line edit to that
 * entry's `loadComponent`.
 */
@Component({
    selector: 'app-step-placeholder',
    standalone: true,
    imports: [WizardStepFrameComponent],
    templateUrl: './step-placeholder.component.html',
    styleUrl: './step-placeholder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPlaceholderComponent {
    protected readonly wizard = inject(CvWizardService);

    protected readonly step = this.wizard.activeStep;

    protected readonly continueLabel = computed(() => (this.wizard.isLast() ? 'Finish' : 'Continue'));

    protected readonly footnote = computed(() =>
        this.step().optional
            ? 'Everything on this floor is optional — you can move on without filling anything in.'
            : ''
    );
}
