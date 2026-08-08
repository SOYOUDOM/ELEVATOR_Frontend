import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

import { CV_WIZARD_FIRST_STEP, CV_WIZARD_STEPS, findStepById } from './config/wizard-steps.config';
import { GetStartedComponent } from './get-started.component';
import { CV_DRAFT_STORAGE, provideCvDraftStorage } from './services/cv-draft-storage';
import { CvDraftStore } from './services/cv-draft.store';
import { CvWizardService } from './services/cv-wizard.service';

/** Any registry step without a component yet falls back to the placeholder. */
const loadPlaceholder = () =>
    import('./steps/step-placeholder/step-placeholder.component').then((m) => m.StepPlaceholderComponent);

/**
 * One child route per registry entry, generated rather than written out.
 *
 * The consequence worth having: a new step never needs a route. Add it to
 * `CV_WIZARD_STEPS` and it is routable, in the stepper, and counted in the
 * progress maths on the same commit.
 */
const stepRoutes: Routes = CV_WIZARD_STEPS.map((step) => ({
    path: step.path,
    loadComponent: step.loadComponent ?? loadPlaceholder,
    data: { stepId: step.id },
}));

/**
 * The store and the wizard service are provided HERE, on the parent route,
 * not on the shell component. Route-level providers give the whole wizard one
 * injector: every step shares the same draft, and the instance is torn down
 * when the user navigates out of `/app/get-started` — no leaking of a
 * half-finished CV into the next feature they open.
 */
const routes: Routes = [
    {
        path: '',
        component: GetStartedComponent,
        providers: [{ provide: CV_DRAFT_STORAGE, useFactory: provideCvDraftStorage }, CvDraftStore, CvWizardService],
        children: [
            ...stepRoutes,
            {
                path: '',
                pathMatch: 'full',
                redirectTo: findStepById(CV_WIZARD_FIRST_STEP)?.path ?? '',
            },
            // Anything unrecognised lands on the first floor rather than a blank stage.
            {
                path: '**',
                redirectTo: findStepById(CV_WIZARD_FIRST_STEP)?.path ?? '',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class GetStartedRoutingModule {}
