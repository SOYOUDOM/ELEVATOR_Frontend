import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { FxGrainComponent } from '@shared/components/fx-grain/fx-grain.component';

import { FooterComponent } from '../../layout/footer.component';
import type { CvStepId } from '../models/cv-draft.model';
import { CreateCvWizardService } from '../services/create-cv-wizard.service';
import { CvDraftStore } from '../services/cv-draft.store';

/** Where a step sits relative to the one the user is on. */
type TrackState = 'done' | 'active' | 'upcoming';

/**
 * The builder shell — full-screen, outside the AdminLTE app shell.
 *
 * It owns three things and nothing else:
 *
 *   • The step track in the header. Wayfinding for the whole flow; the
 *     per-floor rail in the page body carries the status detail, so the two
 *     do not repeat each other.
 *
 *   • The save state. There is no login, so this line is the user's only
 *     assurance their work still exists — including when it fails.
 *
 *   • The footer, so every floor gets it without asking.
 *
 * Known trap honoured: the content wrapper is `.elv-content`, never
 * `content-wrapper` — AdminLTE hooks that class with a margin-left.
 */
@Component({
    selector: 'app-create-cv-shell',
    standalone: true,
    imports: [RouterOutlet, ElvButtonComponent, FxGrainComponent, FooterComponent],
    templateUrl: './create-cv-shell.component.html',
    styleUrl: './create-cv-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-create' },
})
export class CreateCvShellComponent {
    protected readonly store = inject(CvDraftStore);
    protected readonly wizard = inject(CreateCvWizardService);

    /** Header line. Reports failure as loudly as success — see class docs. */
    protected readonly saveText = computed(() => {
        switch (this.store.saveState()) {
            case 'saving':
                return 'Saving…';
            case 'saved': {
                const at = this.store.lastSavedAt();
                return at ? `Saved ${this.time.transform(at, 'HH:mm')}` : 'Saved';
            }
            case 'error':
                return 'Save failed';
            default:
                return 'Draft';
        }
    });

    private readonly router = inject(Router);
    private readonly time = new DatePipe('en-US');

    protected pad(n: number): string {
        return n < 10 ? `0${n}` : String(n);
    }

    protected trackState(id: string, index: number): TrackState {
        if (id === this.wizard.activeId()) {
            return 'active';
        }
        return index < this.wizard.activeIndex() ? 'done' : 'upcoming';
    }

    protected goTo(id: string): void {
        void this.wizard.goTo(id as CvStepId);
    }

    protected exit(): void {
        void this.router.navigateByUrl('/app/about');
    }
}
