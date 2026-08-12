import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { GetStartedRoutingModule } from './get-started-routing.module';
import { GetStartedComponent } from './get-started.component';

@NgModule({
    imports: [SharedModule, GetStartedRoutingModule, GetStartedComponent],
})
export class GetStartedModule {}
