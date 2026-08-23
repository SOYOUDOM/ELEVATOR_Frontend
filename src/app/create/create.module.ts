import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

import { CreateRoutingModule } from './create-routing.module';
import { CreateComponent } from './create.component';

@NgModule({
    imports: [SharedModule, CreateRoutingModule, CreateComponent],
})
export class CreateModule {}
