import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import {
    enableProdMode,
    provideExperimentalZonelessChangeDetection,
    APP_INITIALIZER,
    LOCALE_ID,
    importProvidersFrom,
    isDevMode,
} from '@angular/core';
import { environment } from './environments/environment';
import { getCurrentLanguage } from './root.module';

import 'moment-timezone';
import { provideClientHydration, BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { AbpHttpConfigurationService, AbpHttpInterceptor } from 'abp-ng2-module';
import { ElevatorHttpConfigurationService } from '@shared/auth/elevator-http-configuration.service';
import { AppInitializer } from './app-initializer';
import { API_BASE_URL } from '@shared/service-proxies/service-proxies';
import { AppConsts } from '@shared/AppConsts';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SharedModule } from '@shared/shared.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ServiceProxyModule } from '@shared/service-proxies/service-proxy.module';
import { RootRoutingModule } from './root-routing.module';
import { RootComponent } from './root.component';
import { providePrimeNG } from 'primeng/config';
import { provideUiInput } from '@shared/components/ui-input';

import { ElevatorPreset } from './app/theme/my-preset';
import { CommonModule } from '@angular/common';
import { provideElvField } from '@shared/components/elv-field';
import { provideElevatorViewTransitions } from '@shared/router/elevator-view-transitions';
import { ThemeService } from './app/theme/theme.service';

if (environment.production) {
    enableProdMode();
}

const bootstrap = () => {
    return bootstrapApplication(RootComponent, {
        providers: [
            importProvidersFrom(
                BrowserModule,
                SharedModule.forRoot(),
                ModalModule.forRoot(),
                BsDropdownModule.forRoot(),
                CollapseModule.forRoot(),
                TabsModule.forRoot(),
                ServiceProxyModule,
                RootRoutingModule
            ),
            provideExperimentalZonelessChangeDetection(),
            environment.useMocks ? [] : [provideClientHydration()],
            { provide: HTTP_INTERCEPTORS, useClass: AbpHttpInterceptor, multi: true },
            // Same behaviour as ABP's default everywhere, except that a form
            // can claim a failure and render it inline instead of as a modal.
            ElevatorHttpConfigurationService,
            { provide: AbpHttpConfigurationService, useExisting: ElevatorHttpConfigurationService },
            {
                provide: APP_INITIALIZER,
                useFactory: (appInitializer: AppInitializer) => appInitializer.init(),
                deps: [AppInitializer],
                multi: true,
            },
            {
                /* Before the first paint, so a returning user never watches
                   the default palette flash past the one they chose. */
                provide: APP_INITIALIZER,
                useFactory: (theme: ThemeService) => () => theme.init(),
                deps: [ThemeService],
                multi: true,
            },
            {
                provide: API_BASE_URL,
                useFactory: () => (environment.useMocks ? '' : AppConsts.remoteServiceBaseUrl),
            },
            {
                provide: LOCALE_ID,
                useFactory: getCurrentLanguage,
            },
            provideAnimations(),
            provideHttpClient(withInterceptorsFromDi()),
            providePrimeNG({
                theme: {
                    preset: ElevatorPreset,
                    options: {
                        darkModeSelector: '.app-dark', // see dark mode below
                        cssLayer: {
                            // see CSS override below
                            name: 'primeng',
                            order: 'theme, base, primeng',
                        },
                    },
                },
            }),
            provideAnimationsAsync(),

            provideElvField({
                defaults: { density: 'default', corner: 'soft', labelMode: 'stacked' },
            }),

            // Horizontal page slide + top-anchored scroll on every navigation.
            // MUST stay after importProvidersFrom(RootRoutingModule) above: these
            // supplement RouterModule.forRoot(), and the later ROUTER_SCROLLER
            // binding is the one that wins.
            ...provideElevatorViewTransitions(),
        ],
    });
};

/* "Hot Module Replacement" is enabled as described on
 * https://medium.com/@beeman/tutorial-enable-hrm-in-angular-cli-apps-1b0d13b80130#.sa87zkloh
 */
async function enableMocking() {
    if (!environment.useMocks) return;
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
}
enableMocking().then(() => bootstrap()); // ONLY one bootstrap call — no stray bootstrap() below
