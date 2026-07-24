import { Component, HostListener, Injector, OnInit, Renderer2, inject } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { SignalRAspNetCoreHelper } from '@shared/helpers/SignalRAspNetCoreHelper';
import { LayoutStoreService } from '@shared/layout/layout-store.service';
import { HeaderComponent } from './layout/header.component';
import { SidebarComponent } from './layout/sidebar.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './layout/footer.component';
import { LandingComponent } from './layout/landing/landing.component';
import { CommonModule, DOCUMENT } from '@angular/common';
import { environment } from 'environments/environment';
import { FxSettingsService } from '@shared/services/fx-settings.service';
import { FxGrainComponent } from '@shared/components/fx-grain/fx-grain.component';
import { Subscription, filter } from 'rxjs';

@Component({
    templateUrl: './app.component.html',
    standalone: true,
    imports: [
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    LandingComponent,
    CommonModule,
    RouterOutlet
],
})
export class AppComponent extends AppComponentBase implements OnInit {
    sidebarExpanded = false;
    booting         = false;
    routeKey        = 1;

    readonly fx = inject(FxSettingsService);

    private static readonly BOOT_MS      = 2400;
    private static readonly SESSION_FLAG = 'elevator-booted';
    private readonly document   = inject(DOCUMENT);
    private routerSub?: Subscription;
    private bootTimer?: ReturnType<typeof setTimeout>;
    private _glowRaf?: number;

    constructor(
        injector: Injector,
        private _layoutStore: LayoutStoreService,
        private renderer: Renderer2,
        private router: Router,
    ) {
        super(injector);
    }

    ngOnInit(): void {
      this.fx.setGlow(true);    // force on

        this.renderer.addClass(document.body, 'sidebar-mini');

        if (!environment.useMocks && this.appSession.application) {
            SignalRAspNetCoreHelper.initSignalR();
        }

        abp.event.on('abp.notifications.received', (userNotification) => {
            abp.notifications.showUiNotifyForUserNotification(userNotification);
            Push.create('AbpZeroTemplate', {
                body: userNotification.notification.data.message,
                icon: abp.appPath + 'assets/app-logo-small.png',
                timeout: 6000,
                onClick: function () { window.focus(); this.close(); },
            });
        });

        this._layoutStore.sidebarExpanded.subscribe(v => (this.sidebarExpanded = v));

        this.startBoot();

        this.routerSub = this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(() => this.replayRoute());
    }

    // ── Mouse-reactive glow ───────────────────────────────────

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent): void {
        if (!this.fx.glowEnabled() || this._glowRaf !== undefined) return;
        this._glowRaf = requestAnimationFrame(() => {
            this.document.documentElement.style.setProperty('--cx', `${e.clientX}px`);
            this.document.documentElement.style.setProperty('--cy', `${e.clientY}px`);
            this._glowRaf = undefined;
        });
    }

    @HostListener('document:mouseleave')
    onMouseLeave(): void {
        this.document.documentElement.style.setProperty('--cy', '-300px');
    }

    // ── Sidebar ───────────────────────────────────────────────

    toggleSidebar(): void {
        this._layoutStore.setSidebarExpanded(!this.sidebarExpanded);
    }

    @HostListener('window:resize')
    onResize(): void {
        if (window.innerWidth >= 575 && this.sidebarExpanded) {
            this._layoutStore.setSidebarExpanded(false);
        }
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
        if (this.bootTimer)  clearTimeout(this.bootTimer);
        if (this._glowRaf !== undefined) cancelAnimationFrame(this._glowRaf);
    }

    private startBoot(): void {
        const html = this.document.documentElement;
        const reduceMotion  = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const alreadyBooted = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AppComponent.SESSION_FLAG) === '1';

        if (reduceMotion || alreadyBooted) {
            this.renderer.setAttribute(html, 'data-boot', 'done');
            return;
        }

        this.booting = true;
        this.renderer.setAttribute(html, 'data-boot', 'run');

        this.bootTimer = setTimeout(() => {
            this.renderer.setAttribute(html, 'data-boot', 'done');
            this.booting = false;
            try { sessionStorage.setItem(AppComponent.SESSION_FLAG, '1'); } catch {}
        }, AppComponent.BOOT_MS);
    }

    private replayRoute(): void {
        this.routeKey = 0;
        setTimeout(() => (this.routeKey = Date.now()));
    }
}
