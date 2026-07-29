import { Component, ChangeDetectionStrategy, Renderer2, OnInit, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutStoreService } from '@shared/layout/layout-store.service';
import { ElvCircuitDirective } from '@shared/directives/elv-circuit.directive';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

interface SidebarItem {
    label: string;
    icon: string;
    /** id of a landing-page section to smooth-scroll to */
    target?: string;
    /** a real route to navigate to instead (e.g. login) */
    route?: string;
}

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'sidebar',
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [ElvCircuitDirective,ElvButtonComponent],
})
export class SidebarComponent implements OnInit {
    sidebarExpanded: boolean = false;
    brandLetters = 'LEVATOR'.split('');
    activeLabel = 'Home';

    /** AccountModule is mounted outside the app shell — always link absolutely. */
    readonly loginRoute = '/account/login';

    navItems: SidebarItem[] = [
        { label: 'Home', icon: 'fa-thin fa-house', target: 'home' },
        { label: 'Get Started', icon: 'fa-thin fa-table-cells', target: 'features' },
        { label: 'Templates', icon: 'fa-thin fa-table-cells', target: 'features' },
        { label: 'About', icon: 'fa-thin fa-circle-info', target: 'how' },
        { label: 'Login', icon: 'fa-thin fa-arrow-left-to-bracket', route: this.loginRoute },
    ];
    constructor(
        private renderer: Renderer2,
        private _layoutStore: LayoutStoreService,
        private el: ElementRef,
        private router: Router
    ) {}

    ngOnInit(): void {
        this._layoutStore.sidebarExpanded.subscribe((value) => {
            this.sidebarExpanded = value;
            this.toggleSidebar();
        });
    }

    toggleSidebar(): void {
        if (this.sidebarExpanded) {
            this.showSidebar();
        } else {
            this.hideSidebar();
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

    closeSidebar(): void {
        this._layoutStore.setSidebarExpanded(false);
    }

    /** Close the drawer, then either route (login) or smooth-scroll to a landing section. */
    go(item: SidebarItem): void {
        this.activeLabel = item.label;
        this.closeSidebar();

        if (item.route) {
            this.router.navigateByUrl(item.route);
            return;
        }

        if (item.target) {
            // let the drawer start closing first, then scroll
            setTimeout(() => {
                document.getElementById(item.target!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 0);
        }
    }

    /** Bottom “Sign in” CTA — same behaviour as the Login row in the nav list. */
    goLogin(): void {
        this.go({ label: 'Login', icon: '', route: this.loginRoute });
    }
}
