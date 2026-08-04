import { Component, OnInit, OnDestroy, ViewEncapsulation, Injector, Renderer2 } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { AccountHeaderComponent } from './layout/account-header.component';
import { TenantChangeComponent } from './tenant/tenant-change.component';
import { RouterOutlet } from '@angular/router';
import { AccountLanguagesComponent } from './layout/account-languages.component';
import { AccountFooterComponent } from './layout/account-footer.component';
import { HeaderComponent } from '../app/layout/header.component';
import { HeaderLeftNavbarComponent } from "@app/layout/header-left-navbar.component";
import { RevealDirective } from "@shared/directives/reveal.directive";
import { ElvFieldComponent} from '@shared/components/elv-field'
@Component({
    templateUrl: './account.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    host: {
        style: 'display:block; height:100dvh',
    },
    imports: [
    AccountHeaderComponent,
    TenantChangeComponent,
    RouterOutlet,
    AccountLanguagesComponent,
    AccountFooterComponent,
    HeaderComponent,
    RevealDirective,
    ElvFieldComponent
],
})
export class AccountComponent extends AppComponentBase implements OnInit, OnDestroy {
    constructor(
        injector: Injector,
        private renderer: Renderer2
    ) {
        super(injector);
    }

    showTenantChange(): boolean {
        return abp.multiTenancy.isEnabled;
    }

    ngOnInit(): void {
        // this.renderer.addClass(document.body, 'login-page');
    }

    ngOnDestroy(): void {
        // AdminLTE's `login-page` forces a light body background; drop it on the
        // way out so the dark app/landing background isn't left washed-out.
        // this.renderer.removeClass(document.body, 'login-page');
    }
}
