import { NgModule, inject } from '@angular/core';
import { LegacyThemeService } from '@shared/services/legacy-theme.service';
import { SharedModule } from '@shared/shared.module';
import { TenantsRoutingModule } from './tenants-routing.module';
import { CreateTenantDialogComponent } from './create-tenant/create-tenant-dialog.component';
import { EditTenantDialogComponent } from './edit-tenant/edit-tenant-dialog.component';
import { TenantsComponent } from './tenants.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        TenantsRoutingModule,
        CommonModule,
        CreateTenantDialogComponent,
        EditTenantDialogComponent,
        TenantsComponent,
    ],
})
export class TenantsModule {
    /**
     * These screens are still Bootstrap/AdminLTE markup, so they pull that
     * stylesheet in as the lazy chunk loads. Every other route never pays for
     * it — see LegacyThemeService.
     */
    constructor() {
        void inject(LegacyThemeService).ensureAdminLte();
    }
}
