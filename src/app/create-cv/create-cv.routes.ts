import type { Routes } from '@angular/router';

import { CREATE_CV_STEPS } from './config/create-cv-steps.config';
import { CreateCvShellComponent } from './shell/create-cv-shell.component';

/** Each registry floor becomes a route. Adding a floor needs no edit here. */
const floorLoaders: Record<string, () => Promise<unknown>> = {
    identity: () => import('./pages/identity/identity.page').then((m) => m.IdentityPage),
    experience: () => import('./pages/experience/experience.page').then((m) => m.ExperiencePage),
    education: () => import('./pages/education/education.page').then((m) => m.EducationPage),
    skills: () => import('./pages/skills/skills.page').then((m) => m.SkillsPage),
    boost: () => import('./pages/boost/boost.page').then((m) => m.BoostPage),
};

/**
 * The builder lives at /create, mounted at the ROOT — deliberately outside
 * `/app`, which is the AdminLTE shell. A full-screen creative tool inside a
 * dashboard chrome is the wrong frame for the work.
 *
 * No providers here: `CvDraftStore` is `providedIn: 'root'` (the save chip,
 * the floors and the editor all need one instance), and a root service cannot
 * read route-level providers — so `CV_DRAFT_STORAGE` defaults itself in root
 * instead. See cv-draft-storage.ts.
 */
export const CREATE_CV_ROUTES: Routes = [
    {
        path: '',
        component: CreateCvShellComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./pages/launch/launch.page').then((m) => m.LaunchPage),
            },
            ...CREATE_CV_STEPS.map((step) => ({
                path: step.path,
                loadComponent: floorLoaders[step.id] as () => Promise<never>,
                data: { stepId: step.id },
            })),
            {
                path: 'editor',
                loadComponent: () => import('./pages/editor/editor.page').then((m) => m.EditorPage),
            },
            { path: '**', redirectTo: '' },
        ],
    },
];
