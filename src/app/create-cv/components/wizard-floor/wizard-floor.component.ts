import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, inject, input } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { HeroTitleComponent } from '@shared/components/hero-title/hero-title.component';

import { CreateCvWizardService } from '../../services/create-cv-wizard.service';

/**
 * The chrome every wizard floor renders inside.
 *
 * It exists for a structural reason: with `ViewEncapsulation.None` a page
 * that hand-rolled this heading and nav would define global selectors that
 * collide with the next page that does the same. Defining it once, here, is
 * the only way five screens stay consistent and non-conflicting.
 *
 * Navigation is read from `CreateCvWizardService` rather than passed in, so a
 * floor never has to know its own position — reordering the registry is
 * enough.
 */
@Component({
    selector: 'app-wizard-floor',
    standalone: true,
    imports: [HeroTitleComponent, ElvButtonComponent],
    templateUrl: './wizard-floor.component.html',
    styleUrl: './wizard-floor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-floor' },
})
export class WizardFloorComponent {
    /** Continue is disabled while a required field is missing. */
    readonly continueDisabled = input(false, { transform: booleanAttribute });
    readonly continueLabel = input('Continue');
    /** Quiet line above the nav row. */
    readonly footnote = input('');
    /** Widens the content column for two-pane floors. */
    readonly wide = input(false, { transform: booleanAttribute });

    protected readonly wizard = inject(CreateCvWizardService);
}
