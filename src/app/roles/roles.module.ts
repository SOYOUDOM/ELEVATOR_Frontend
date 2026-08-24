import { NgModule, inject } from '@angular/core';
import { LegacyThemeService } from '@shared/services/legacy-theme.service';
import { SharedModule } from '@shared/shared.module';
import { RolesRoutingModule } from './roles-routing.module';
import { RolesComponent } from './roles.component';
import { CreateRoleDialogComponent } from './create-role/create-role-dialog.component';
import { EditRoleDialogComponent } from './edit-role/edit-role-dialog.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        RolesRoutingModule,
        CommonModule,
        RolesComponent,
        CreateRoleDialogComponent,
        EditRoleDialogComponent,
    ],
})
export class RolesModule {
    /**
     * These screens are still Bootstrap/AdminLTE markup, so they pull that
     * stylesheet in as the lazy chunk loads. Every other route never pays for
     * it — see LegacyThemeService.
     */
    constructor() {
        void inject(LegacyThemeService).ensureAdminLte();
    }
}
