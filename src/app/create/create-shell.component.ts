import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

import { CreateUiStore } from './create-ui.store';
import { CvApiService } from './cv-api.service';
import { CvDraftStore } from './cv-draft.store';
import { FLOORS, SCORED_FLOORS, floorAt, floorIndex } from './floors';
import { CvSheetComponent } from './preview/cv-sheet.component';

/** Dock width in px, matched by --elv-dock-w in _create.scss. */
const DOCK_W = 400;
const PAGE_W = 794;

/**
 * ELEVATOR — the create flow's shell.
 *
 * Owns the shaft on the left, the routed floor in the middle and the live A4
 * preview on the right, and provides the two stores every floor injects.
 *
 * The dock column stays in the grid template on EVERY floor. Floors that do
 * not want a preview widen the stage across it instead of collapsing the
 * column — otherwise the shell's width jumps mid-navigation and the whole
 * page lurches sideways under the view transition.
 */
@Component({
    selector: 'app-create-shell',
    standalone: true,
    templateUrl: './create-shell.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, RouterLink, ElvButtonComponent, CvSheetComponent],
    providers: [CvDraftStore, CreateUiStore, CvApiService],
    host: { class: 'elv-create' },
})
export class CreateShellComponent implements OnDestroy {
    readonly store = inject(CvDraftStore);
    readonly ui = inject(CreateUiStore);

    readonly floors = FLOORS;
    readonly current = signal('lobby');

    readonly currentIndex = computed(() => Math.max(0, floorIndex(this.current())));
    readonly done = this.store.done;

    readonly percent = computed(() => {
        const done = this.done();
        return Math.round((SCORED_FLOORS.filter((f) => done[f.id]).length / SCORED_FLOORS.length) * 100);
    });

    /** Preview is hidden on review (which shows the sheet full size) and the lobby. */
    readonly dockVisible = computed(() => this.ui.dock() && this.current() !== 'review' && this.current() !== 'lobby');
    /** Deterministic — never measured, so nothing resizes after the snapshot. */
    readonly dockScale = (DOCK_W - 2) / PAGE_W;

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly sub: Subscription;

    constructor() {
        this.current.set(this.readFloorId());

        this.sub = this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(() => this.current.set(this.readFloorId()));

        // The grid template is driven from the body so the shell's own width
        // rule can key off it without an extra wrapper element.
        effect(() => {
            this.document.body.setAttribute('data-elv-dock', this.ui.dock() ? 'on' : 'off');
        });
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
        this.document.body.removeAttribute('data-elv-dock');
    }

    go(id: string): void {
        this.router.navigate(['/app/create', id]);
    }

    private readFloorId(): string {
        const seg = this.router.url.split('?')[0].split('/').filter(Boolean).pop() ?? 'lobby';
        return floorAt(seg) ? seg : 'lobby';
    }
}
