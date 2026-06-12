import { Component, HostListener, Inject, Injector, OnInit, Renderer2,OnDestroy, inject } from '@angular/core';
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
import { Subscription, filter } from 'rxjs';

@Component({
    templateUrl: './app.component.html',
    standalone: true,
    imports: [HeaderComponent, SidebarComponent, RouterOutlet, FooterComponent, LandingComponent, CommonModule],
})
export class AppComponent extends AppComponentBase implements OnInit {
    sidebarExpanded: boolean = false;
    private static readonly BOOT_MS = 2400;
  private static readonly SESSION_FLAG = 'elevator-booted';
    /** boot overlay stays in the DOM only while the doors animate */
  booting = false;
 
  /** bumping this re-creates .route-shell → CSS routeIn replays */
  routeKey = 1;
  private document = inject(DOCUMENT);

   private routerSub?: Subscription;
  private bootTimer?: ReturnType<typeof setTimeout>;
    constructor(
        injector: Injector,
        private _layoutStore: LayoutStoreService,
            private renderer: Renderer2,
    private router: Router,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.renderer.addClass(document.body, 'sidebar-mini');

        if (!environment.useMocks && this.appSession.application) {
            SignalRAspNetCoreHelper.initSignalR();
        }

        abp.event.on('abp.notifications.received', (userNotification) => {
            abp.notifications.showUiNotifyForUserNotification(userNotification);

            // Desktop notification
            Push.create('AbpZeroTemplate', {
                body: userNotification.notification.data.message,
                icon: abp.appPath + 'assets/app-logo-small.png',
                timeout: 6000,
                onClick: function () {
                    window.focus();
                    this.close();
                },
            });
        });

        this._layoutStore.sidebarExpanded.subscribe((value) => {
            this.sidebarExpanded = value;
        });


        this.startBoot();
        // Replay the quick rise+deblur on every route change.
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.replayRoute());
    }

    toggleSidebar(): void {
        this._layoutStore.setSidebarExpanded(!this.sidebarExpanded);
        console.log(this.sidebarExpanded);
    }
    // ngOnInit(): void {
    // this._layoutStore.sidebarExpanded.subscribe(v => this.sidebarExpanded = v);
    // }

    // toggleSidebar(): void {
    // this._layoutStore.sidebarExpanded.next(!this.sidebarExpanded);
    // }

    @HostListener('window:resize')
    onResize(): void {
        if (window.innerWidth >= 575 && this.sidebarExpanded) {
            this._layoutStore.setSidebarExpanded(false);
        }
    }

      ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.bootTimer) clearTimeout(this.bootTimer);
  }
  private startBoot(): void {
    const html = this.document.documentElement;
 
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 
    const alreadyBooted =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(AppComponent.SESSION_FLAG) === '1';
 
    if (reduceMotion || alreadyBooted) {
      // Skip the doors; keep the short power-on for remounts.
      this.renderer.setAttribute(html, 'data-boot', 'done');
      return;
    }
 
    this.booting = true;
    this.renderer.setAttribute(html, 'data-boot', 'run');
 
    this.bootTimer = setTimeout(() => {
      this.renderer.setAttribute(html, 'data-boot', 'done');
      this.booting = false; // *ngIf removes the overlay from the DOM
      try {
        sessionStorage.setItem(AppComponent.SESSION_FLAG, '1');
      } catch {
        /* private mode — fine, intro just replays next visit */
      }
    }, AppComponent.BOOT_MS);
  }
 
  /** Destroy + re-create .route-shell so its CSS animation runs again. */
  private replayRoute(): void {
    this.routeKey = 0;
    // next macrotask → Angular removes the node, then re-adds it
    setTimeout(() => (this.routeKey = Date.now()));
  }
}
