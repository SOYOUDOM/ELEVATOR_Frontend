import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import {LandingComponent } from '../layout/landing/landing.component';



@NgModule({
    imports: [SharedModule, HomeRoutingModule, HomeComponent],
})
export class HomeModule {}
