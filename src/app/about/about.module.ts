import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { AboutRoutingModule } from './about-routing.module';
import { AboutComponent } from './about.component';
import { RevealDirective } from '@shared/directives/reveal.directive';


@NgModule({
    imports: [SharedModule, AboutRoutingModule, AboutComponent, RevealDirective],
})
export class AboutModule {}
