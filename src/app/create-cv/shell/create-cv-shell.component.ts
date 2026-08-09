import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';
import { ElvStepperComponent, type ElvStepperSelection } from '@shared/components/elv-stepper';
import { FxGrainComponent } from '@shared/components/fx-grain/fx-grain.component';

import type { CvStepId } from '../models/cv-draft.model';
import { CreateCvWizardService } from '../services/create-cv-wizard.service';
import { CvDraftStore } from '../services/cv-draft.store';

/**
 * The Create CV shell — a blank, full-screen layout that lives OUTSIDE the
 * AdminLTE app shell.
 *
 * Three things it owns and nothing else does:
 *
 *   • The save chip. There is no login, so the user's only assurance their
 *     work still exists is this chip. It reads straight off the store's
 *     `saveState`, including the failure case.
 *
 *   • The elevator rail. Rendered only on the five wizard floors — the launch
 *     page and the editor sit off the climb and would be lying if they showed
 *     a position on it.
 *
 *   • SIGNAL STRENGTH. There is no CV preview until the editor, so this meter
 *     is the user's only progress feedback for five screens. It is bound to
 *     `completeness`, which is derived from the draft, so it moves as they
 *     type rather than only when they change page.
 *
 * Known trap honoured: the content wrapper is `.elv-content`, never
 * `content-wrapper` — AdminLTE hooks that class name with a margin-left and
 * would shove this page sideways.
 */
@Component({
    selector: 'app-create-cv-shell',
    standalone: true,
    imports: [
        RouterOutlet,
        DatePipe,
        ElvStepperComponent,
        ElvProgressComponent,
        ElvChipComponent,
        ElvButtonComponent,
        FxGrainComponent,
    ],
    templateUrl: './create-cv-shell.component.html',
    styleUrl: './create-cv-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-create' },
})
export class CreateCvShellComponent {
    protected readonly store = inject(CvDraftStore);
    protected readonly wizard = inject(CreateCvWizardService);

    protected readonly railOpen = signal(false);

    protected readonly saveChip = computed(() => {
        switch (this.store.saveState()) {
            case 'saving':
                return { title: 'Saving…', tone: 'info' as const, icon: 'pi pi-sync' };
            case 'saved':
                return { title: 'Saved', tone: 'success' as const, icon: 'pi pi-check' };
            case 'error':
                return { title: 'Save failed', tone: 'danger' as const, icon: 'pi pi-exclamation-triangle' };
            default:
                return { title: 'Draft', tone: 'neutral' as const, icon: 'pi pi-file' };
        }
    });

    /** Meter caption — names the next thing worth doing, not just a number. */
    protected readonly signalLabel = computed(() => {
        const gaps = this.store.completenessGaps();
        return gaps.length ? `Next: ${gaps[0]}` : 'Signal strong';
    });

    private readonly router = inject(Router);

    protected onFloorSelected(selection: ElvStepperSelection): void {
        this.wizard.goTo(selection.id as CvStepId);
        this.railOpen.set(false);
    }

    protected exit(): void {
        this.router.navigateByUrl('/app/about');
    }
}
