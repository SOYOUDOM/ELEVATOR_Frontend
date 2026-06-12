import { Component, ChangeDetectionStrategy, Renderer2, OnInit, ElementRef } from '@angular/core';
import { LayoutStoreService } from '@shared/layout/layout-store.service';
import { SidebarLogoComponent } from './sidebar-logo.component';
import { SidebarUserPanelComponent } from './sidebar-user-panel.component';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { Menu, MenuModule } from 'primeng/menu';
import { RippleModule } from 'primeng/ripple';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'sidebar',
    templateUrl: './sidebar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [AvatarModule, BadgeModule, MenuModule, RippleModule, CommonModule],
})
export class SidebarComponent implements OnInit {
    sidebarExpanded: boolean = false;
    items: MenuItem[] | undefined;

    constructor(
        private renderer: Renderer2,
        private _layoutStore: LayoutStoreService,
        private el: ElementRef
    ) {}

    ngOnInit(): void {
        this.items = [
            {
                separator: true,
            },
            {
                label: 'Documents',
                items: [
                    {
                        label: 'New',
                        icon: 'pi pi-plus',
                        shortcut: '⌘+N',
                    },
                    {
                        label: 'Search',
                        icon: 'pi pi-search',
                        shortcut: '⌘+S',
                    },
                ],
            },
            {
                label: 'Profile',
                items: [
                    {
                        label: 'Settings',
                        icon: 'pi pi-cog',
                        shortcut: '⌘+O',
                    },
                    {
                        label: 'Messages',
                        icon: 'pi pi-inbox',
                        badge: '2',
                    },
                    {
                        label: 'Logout',
                        icon: 'pi pi-sign-out',
                        shortcut: '⌘+Q',
                        linkClass: '!text-red-500 dark:!text-red-400',
                    },
                ],
            },
            {
                separator: true,
            },
        ];
        this._layoutStore.sidebarExpanded.subscribe((value) => {
            this.sidebarExpanded = value;
            this.toggleSidebar();
        });
    }

    toggleSidebar(): void {
        if (this.sidebarExpanded) {
            this.hideSidebar();
        } else {
            this.showSidebar();
        }
    }

    showSidebar(): void {
        this.renderer.removeClass(document.body, 'sidebar-collapse');
        this.renderer.removeClass(this.el.nativeElement, 'invisible');
        this.renderer.addClass(document.body, 'sidebar-open');
    }

    hideSidebar(): void {
        this.renderer.removeClass(document.body, 'sidebar-open');
        this.renderer.addClass(document.body, 'sidebar-collapse');
        this.renderer.addClass(this.el.nativeElement, 'invisible');
    }
}
