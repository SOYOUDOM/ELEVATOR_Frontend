import { Component, ChangeDetectionStrategy, Injector } from '@angular/core';
import { HeaderLeftNavbarComponent } from './header-left-navbar.component';
import { HeaderLanguageMenuComponent } from './header-language-menu.component';
import { HeaderUserMenuComponent } from './header-user-menu.component';
import { RouterLink } from '@angular/router';
import { AppComponentBase } from '@shared/app-component-base';
import { SharedModule } from "../../shared/shared.module";
import {SidebarMenuComponent} from "./sidebar-menu.component";
import { MenuItem } from '@shared/layout/menu-item';
import { CommonModule } from '@angular/common';


@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterLink, HeaderLeftNavbarComponent, SharedModule, CommonModule],
})
export class HeaderComponent extends AppComponentBase {
    menuItems: MenuItem[] = [];
    constructor(injector: Injector, public sideBarMenu: SidebarMenuComponent) {
        super(injector);
        this.menuItems = sideBarMenu.getMenuItems();
    }
}
