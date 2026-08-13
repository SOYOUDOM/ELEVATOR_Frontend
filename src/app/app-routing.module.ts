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
                        // The create flow. `step` drives the direction of the
                        // view transition, `transition` names an effect that
                        // replaces the slide — see @shared/router/elevator-view-transitions.
                        path: 'create',
                        canActivate: [AppRouteGuard],
                        loadComponent: () =>
                            import('./create/create-shell.component').then((m) => m.CreateShellComponent),
                        children: [
                            { path: '', pathMatch: 'full', redirectTo: 'lobby' },
                            {
                                path: 'lobby',
                                data: { step: 0, transition: 'lobby' },
                                loadComponent: () =>
                                    import('./create/floors/lobby.component').then((m) => m.LobbyComponent),
                            },
                            {
                                path: 'basic-info',
                                data: { step: 1 },
                                loadComponent: () =>
                                    import('./create/floors/basic-info.component').then((m) => m.BasicInfoComponent),
                            },
                            {
                                path: 'portrait',
                                data: { step: 2 },
                                loadComponent: () =>
                                    import('./create/floors/portrait.component').then((m) => m.PortraitComponent),
                            },
                            {
                                path: 'experience',
                                data: { step: 3 },
                                loadComponent: () =>
                                    import('./create/floors/experience.component').then((m) => m.ExperienceComponent),
                            },
                            {
                                path: 'education',
                                data: { step: 4 },
                                loadComponent: () =>
                                    import('./create/floors/education.component').then((m) => m.EducationComponent),
                            },
                            {
                                path: 'skills',
                                data: { step: 5 },
                                loadComponent: () =>
                                    import('./create/floors/skills.component').then((m) => m.SkillsComponent),
                            },
                            {
                                path: 'projects',
                                data: { step: 6 },
                                loadComponent: () =>
                                    import('./create/floors/projects.component').then((m) => m.ProjectsComponent),
                            },
                            {
                                path: 'summary',
                                data: { step: 7 },
                                loadComponent: () =>
                                    import('./create/floors/summary.component').then((m) => m.SummaryComponent),
                            },
                            {
                                path: 'template',
                                data: { step: 8 },
                                loadComponent: () =>
                                    import('./create/floors/template.component').then((m) => m.TemplateComponent),
                            },
                            {
                                path: 'review',
                                data: { step: 9, transition: 'doors' },
                                loadComponent: () =>
                                    import('./create/floors/review.component').then((m) => m.ReviewComponent),
                            },
                        ],
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
