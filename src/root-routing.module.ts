import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
    { path: '', redirectTo: '/app/about', pathMatch: 'full' },
    {
        path: 'account',
        loadChildren: () => import('account/account.module').then((m) => m.AccountModule), // Lazy load account module
        // `transition` names an effect that replaces the default horizontal
        // slide — see @shared/router/elevator-view-transitions. Declared on the
        // whole account area, so login AND register both get the doors; a child
        // route can override it by declaring its own.
        data: { preload: true, transition: 'doors' },
    },
    {
        path: 'app',
        loadChildren: () => import('app/app.module').then((m) => m.AppModule), // Lazy load account module
        data: { preload: true },
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: [],
})
export class RootRoutingModule {}
