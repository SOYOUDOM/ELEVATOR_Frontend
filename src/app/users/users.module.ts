import { NgModule, inject } from '@angular/core';
import { LegacyThemeService } from '@shared/services/legacy-theme.service';
import { SharedModule } from '@shared/shared.module';
import { CreateUserDialogComponent } from './create-user/create-user-dialog.component';
import { EditUserDialogComponent } from './edit-user/edit-user-dialog.component';
import { ResetPasswordDialogComponent } from './reset-password/reset-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        UsersRoutingModule,
        CommonModule,
        UsersComponent,
        ResetPasswordDialogComponent,
        EditUserDialogComponent,
        CreateUserDialogComponent,
        ChangePasswordComponent,
    ],
})
export class UsersModule {
    /**
     * These screens are still Bootstrap/AdminLTE markup, so they pull that
     * stylesheet in as the lazy chunk loads. Every other route never pays for
     * it — see LegacyThemeService.
     */
    constructor() {
        void inject(LegacyThemeService).ensureAdminLte();
    }
}
