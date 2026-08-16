import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRouteGuard } from '@shared/auth/auth-route-guard';
import { AppComponent } from './app.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '',
                component: AppComponent,
                children: [
                    {
                        path: 'home',
                        loadChildren: () => import('./home/home.module').then((m) => m.HomeModule),
                        canActivate: [AppRouteGuard],
                    },
                    {
                        path: 'get-started',
                        loadChildren: () =>
                            import('./get-started/get-started.module').then((m) => m.GetStartedModule),
                        canActivate: [AppRouteGuard],
                        // `step` drives the direction of the view transition —
                        // see @shared/router/elevator-view-transitions.
                        data: { step: 1 },
                    },
                    {
                        // The create flow. One route, two stages: the counter
                        // fills the document in and the press revises it, and
                        // both are the same component because they are the
                        // same document. The ten floors it replaces are gone —
                        // a wizard whose steps were URLs could not show you
                        // the page while you filled it in.
                        path: 'create',
                        canActivate: [AppRouteGuard],
                        data: { step: 1 },
                        loadComponent: () =>
                            import('./create/builder/cv-builder.component').then(
                                (m) => m.CvBuilderComponent,
                            ),
                    },
                    {
                        path: 'users',
                        loadChildren: () => import('./users/users.module').then((m) => m.UsersModule),
                        data: { permission: 'Pages.Users' },
                        canActivate: [AppRouteGuard],
                    },
                    {
                        path: 'roles',
                        loadChildren: () => import('./roles/roles.module').then((m) => m.RolesModule),
                        data: { permission: 'Pages.Roles' },
                        canActivate: [AppRouteGuard],
                    },
                    {
                        path: 'tenants',
                        loadChildren: () => import('./tenants/tenants.module').then((m) => m.TenantsModule),
                        data: { permission: 'Pages.Tenants' },
                        canActivate: [AppRouteGuard],
                    },
                    {
                        path: 'update-password',
                        loadChildren: () => import('./users/users.module').then((m) => m.UsersModule),
                        canActivate: [AppRouteGuard],
                    },
                ],
            },
        ]),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}
