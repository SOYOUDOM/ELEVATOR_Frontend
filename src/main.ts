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

/* The default `moment-timezone` entry point ships every zone transition the
   IANA database has ever recorded — 726 kB of JSON, ~825 kB in the bundle,
   eagerly on every page load. The app's only use of it is one call,
   `moment.tz.setDefault(...)` in app-initializer.ts, plus date formatting.
   The 1970–2030 build carries the same zone NAMES with the transitions
   trimmed to that window, which covers every date this product can display
   (résumé history and the current clock) at a fifth of the weight. */
import 'moment-timezone/builds/moment-timezone-with-data-1970-2030';
import { provideClientHydration, BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { AbpHttpConfigurationService, AbpHttpInterceptor } from 'abp-ng2-module';
import { ElevatorHttpConfigurationService } from '@shared/auth/elevator-http-configuration.service';
import { AppInitializer } from './app-initializer';
import { API_BASE_URL } from '@shared/service-proxies/service-proxies';
import { AppConsts } from '@shared/AppConsts';
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
                provide: API_BASE_URL,
                useFactory: () => (environment.useMocks ? '' : AppConsts.remoteServiceBaseUrl),
            },
            {
                provide: LOCALE_ID,
                useFactory: getCurrentLanguage,
            },
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
            // Async only. provideAnimations() was registered as well; being
            // later in the array, provideAnimationsAsync() already won the
            // token, so the eager one contributed nothing but a second
            // animation engine pulled into the initial bundle.
            provideAnimationsAsync(),

            provideElvField({
                defaults: { density: 'default', corner: 'soft', labelMode: 'stacked' },
            }),
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
