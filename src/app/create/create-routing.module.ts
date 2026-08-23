import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CreateComponent } from './create.component';

/**
 * `/app/create` with no id renders the "no CV open" state and points back at
 * Get Started, rather than silently creating a document nobody asked for.
 */
const routes: Routes = [
    { path: '', component: CreateComponent, pathMatch: 'full' },
    { path: ':cvId', component: CreateComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CreateRoutingModule {}
