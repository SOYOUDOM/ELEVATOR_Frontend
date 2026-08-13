import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

import { FLOORS, floorIndex } from '../floors';

/**
 * ELEVATOR — the frame every floor sits in.
 *
 * Header block plus the rail out, so ten components do not each restate the
 * same eyebrow / title / lede / back / next markup. The floor supplies only
 * its own body through <ng-content>.
 *
 * `canContinue` gates NEXT. Optional floors pass nothing and stay open —
 * blocking someone on a section they were told is optional is how wizards
 * get abandoned.
 */
@Component({
    selector: 'app-floor-frame',
    standalone: true,
    templateUrl: './floor-frame.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent],
})
export class FloorFrameComponent {
    readonly floorId = input.required<string>();
    readonly canContinue = input(true);
    /** The lobby owns its own exits. */
    readonly showRail = input(true);

    readonly index = computed(() => floorIndex(this.floorId()));
    readonly floor = computed(() => FLOORS[this.index()]);
    readonly prev = computed(() => FLOORS[this.index() - 1]);
    readonly next = computed(() => FLOORS[this.index() + 1]);

    readonly eyebrow = computed(() => {
        const f = this.floor();
        return `${f.num === 'G' ? 'GROUND FLOOR' : 'FLOOR ' + f.num}  ·  ${f.eyebrow}`;
    });

    readonly hint = computed(() => {
        const next = this.next();
        if (!next) {
            return 'Top floor · doors open';
        }
        return this.canContinue() ? `Next floor · ${next.nav}` : 'Finish this floor to continue';
    });

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly router = inject(Router);

    go(id: string): void {
        this.router.navigate(['/app/create', id]);
    }
}
