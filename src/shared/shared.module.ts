import { CommonModule } from '@angular/common';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AppSessionService } from './session/app-session.service';
import { AppUrlService } from './nav/app-url.service';
import { AppAuthService } from './auth/app-auth.service';
import { AppRouteGuard } from './auth/auth-route-guard';
import { LocalizePipe } from '@shared/pipes/localize.pipe';

import { AbpPaginationControlsComponent } from './components/pagination/abp-pagination-controls.component';
import { AbpValidationSummaryComponent } from './components/validation/abp-validation.summary.component';
import { AbpModalHeaderComponent } from './components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from './components/modal/abp-modal-footer.component';
import { LayoutStoreService } from './layout/layout-store.service';

import { BusyDirective } from './directives/busy.directive';
import { EqualValidator } from './directives/equal-validator.directive';

import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { TabsModule } from 'ngx-bootstrap/tabs';
/* PrimeNG's TableModule / PaginatorModule used to be imported and re-exported
   here. SharedModule.forRoot() is in the root injector (main.ts), so anything
   it imports lands in the INITIAL bundle — and p-table alone is most of an
   825 kB eager chunk that the marketing pages, the login screen and the CV
   builder never touch. The only three templates using them (users, roles,
   tenants) are lazy modules, so they import the two modules themselves.
   AutoCompleteModule and ProgressBarModule were imported here and used by
   nothing at all. */

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        NgxPaginationModule,
        FormsModule,
        ModalModule,
        BsDropdownModule,
        CollapseModule,
        TabsModule,
        AbpPaginationControlsComponent,
        AbpValidationSummaryComponent,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        BusyDirective,
        EqualValidator,
    ],
    exports: [
        AbpPaginationControlsComponent,
        AbpValidationSummaryComponent,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        BusyDirective,
        EqualValidator,
        FormsModule,
        NgxPaginationModule,
        ModalModule,
        BsDropdownModule,
        CollapseModule,
        TabsModule,
    ],
})
export class SharedModule {
    static forRoot(): ModuleWithProviders<SharedModule> {
        return {
            ngModule: SharedModule,
            providers: [AppSessionService, AppUrlService, AppAuthService, AppRouteGuard, LayoutStoreService],
        };
    }
}
