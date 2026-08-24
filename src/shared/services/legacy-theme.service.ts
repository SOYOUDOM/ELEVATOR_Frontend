import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * ELEVATOR — AdminLTE, on demand.
 *
 * AdminLTE is 1.4 MB of CSS: on its own it was 88% of the application's entire
 * stylesheet, downloaded, parsed and applied on every page load. Almost nothing
 * uses it. Home, About, Get Started, the Create workspace and the redesigned
 * account pages are all pure ELEVATOR; only the legacy admin CRUD screens
 * (users, roles, tenants) still render Bootstrap/AdminLTE markup — tables,
 * `.btn`, `.form-control`, `.card-body`.
 *
 * So it is no longer a global stylesheet. It is copied to assets and injected
 * the first time one of those areas is entered, which takes it off the critical
 * path for every other route without changing how those screens look.
 *
 * Loaded as a plain asset rather than an Angular style bundle deliberately:
 * `outputHashing` would give a non-injected bundle an unpredictable filename,
 * and this has to be referenced by a stable URL at runtime.
 */
@Injectable({ providedIn: 'root' })
export class LegacyThemeService {
    private readonly document = inject(DOCUMENT);
    private pending?: Promise<void>;

    /** Idempotent: the second and later callers share the first one's promise. */
    ensureAdminLte(): Promise<void> {
        if (this.pending) {
            return this.pending;
        }

        this.pending = new Promise<void>((resolve) => {
            const href = 'assets/vendor/adminlte.min.css';
            if (this.document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }

            const link = this.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            // Resolve either way: a missing stylesheet must not wedge a route.
            link.addEventListener('load', () => resolve(), { once: true });
            link.addEventListener('error', () => resolve(), { once: true });
            this.document.head.appendChild(link);
        });

        return this.pending;
    }
}
