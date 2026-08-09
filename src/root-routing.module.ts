import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
    { path: '', redirectTo: '/app/about', pathMatch: 'full' },
    {
        path: 'account',
        loadChildren: () => import('account/account.module').then((m) => m.AccountModule), // Lazy load account module
        data: { preload: true },
    },
    {
        path: 'app',
        loadChildren: () => import('app/app.module').then((m) => m.AppModule), // Lazy load account module
        data: { preload: true },
    },
    {
        // The CV builder is a full-screen tool and mounts at the ROOT, outside
        // /app — it must not inherit the AdminLTE dashboard chrome.
        path: 'create',
        loadChildren: () => import('app/create-cv/create-cv.routes').then((m) => m.CREATE_CV_ROUTES),
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: [],
})
export class RootRoutingModule {}
