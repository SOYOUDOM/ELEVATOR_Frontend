import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { appModuleAnimation } from '@shared/animations/routerTransition';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { ElvStepperComponent, type ElvStepperSelection } from '@shared/components/elv-stepper';

import {
    GET_STARTED_BENEFITS,
    GET_STARTED_HERO,
    GET_STARTED_HIGHLIGHTS,
    GET_STARTED_PANEL,
} from './config/get-started-content.config';
import type { CvStepId } from './models/cv-wizard-step.model';
import { CvWizardService } from './services/cv-wizard.service';

import { FooterComponent } from '../layout/footer.component';

/**
 * GET STARTED — the shell around the CV wizard.
 *
 * The shell owns the page furniture and nothing else: the hero, the steps
 * panel, the stepper track, the benefits strip and the footer. The floor the
 * user is standing on renders into the outlet.
 *
 * It holds no state. `CvWizardService` derives the active step from the URL
 * and `CvDraftStore` holds the answers, both provided at the wizard route, so
 * the shell reads signals and never has to be told anything.
 *
 * The hero is registry-driven: it renders only for steps whose entry sets
 * `showsHero`. That keeps the marketing framing on the landing floor and gets
 * it out of the way once the user is actually filling in a CV.
 *
 * The hero artwork is intentionally empty — see `GET_STARTED_HERO.image` and
 * `--gs-hero-image` in the stylesheet for the two places to drop one in.
 */
@Component({
    selector: 'app-get-started',
    standalone: true,
    templateUrl: './get-started.component.html',
    styleUrl: './get-started.component.scss',
    animations: [appModuleAnimation()],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, ElvStepperComponent, RevealDirective, FooterComponent],
})
export class GetStartedComponent {
    protected readonly wizard = inject(CvWizardService);

    // Static page copy, lifted out of the template so wording changes never
    // touch markup.
    protected readonly hero = GET_STARTED_HERO;
    protected readonly highlights = GET_STARTED_HIGHLIGHTS;
    protected readonly panel = GET_STARTED_PANEL;
    protected readonly benefits = GET_STARTED_BENEFITS;

    protected onStepSelected(selection: ElvStepperSelection): void {
        this.wizard.goTo(selection.id as CvStepId);
    }
}
