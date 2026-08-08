import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

import { GetStartedRoutingModule } from './get-started-routing.module';
import { GetStartedComponent } from './get-started.component';

/**
 * Lazy entry point for the CV wizard.
 *
 * Thin on purpose: the shell and every step are standalone, the wizard's
 * providers live on the route (see GetStartedRoutingModule), and the step list
 * lives in config/wizard-steps.config.ts. This module exists only because the
 * app's feature areas are still loaded as NgModules.
 */
@NgModule({
    imports: [SharedModule, GetStartedRoutingModule, GetStartedComponent],
})
export class GetStartedModule {}
