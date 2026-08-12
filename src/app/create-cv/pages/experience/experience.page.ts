import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvCheckboxComponent } from '@shared/components/elv-checkbox';
import { ElvEmptyStateComponent } from '@shared/components/elv-empty-state/elv-empty-state.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';

import { CvLivePreviewComponent } from '../../components/cv-live-preview/cv-live-preview.component';
import { StepRailComponent } from '../../components/step-rail/step-rail.component';
import { type CvExperience, cvId } from '../../models/cv-draft.model';
import { CvAiService } from '../../services/cv-ai.service';
import { CreateCvWizardService } from '../../services/create-cv-wizard.service';
import { CvDraftStore } from '../../services/cv-draft.store';

/**
 * Step 02 — experience.
 *
 * Three columns: heading + rail on the left, the form in the centre, the live
 * preview on the right. The preview is the point — it updates as the user
 * types, so the form never feels like shouting into a void.
 *
 * Bullets are INDIVIDUAL ROWS, never one blob textarea: a blob cannot be
 * reordered, removed or rewritten per line, and every AI affordance here
 * operates on exactly one bullet.
 */
@Component({
    selector: 'app-experience-page',
    standalone: true,
    imports: [
        StepRailComponent,
        CvLivePreviewComponent,
        ElvFieldComponent,
        ElvButtonComponent,
        ElvCheckboxComponent,
        ElvSkeletonComponent,
        ElvEmptyStateComponent,
    ],
    templateUrl: './experience.page.html',
    styleUrl: './experience.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-exp' },
})
export class ExperiencePage {
    protected readonly store = inject(CvDraftStore);
    protected readonly wizard = inject(CreateCvWizardService);
    protected readonly entries = this.store.experience;

    /** Entry ids currently generating — drives the per-card skeleton. */
    protected readonly generating = signal<string[]>([]);

    private readonly ai = inject(CvAiService);

    protected pad(n: number): string {
        return n < 10 ? `0${n}` : String(n);
    }

    protected filledCount(entry: CvExperience): number {
        return entry.bullets.filter((b) => b.text.trim()).length;
    }

    // ── Entries ───────────────────────────────────────────────────────
    protected addEntry(): void {
        const entry: CvExperience = {
            id: cvId('exp'),
            company: '',
            role: '',
            location: '',
            employmentType: '',
            startDate: '',
            endDate: '',
            current: false,
            // One empty row so the user has somewhere to type immediately.
            bullets: [{ id: cvId('b'), text: '' }],
            plainLanguage: '',
        };
        this.store.patch('experience', [...this.entries(), entry]);
    }

    protected removeEntry(index: number): void {
        this.store.patch(
            'experience',
            this.entries().filter((_, i) => i !== index)
        );
    }

    protected patchEntry(index: number, patch: Partial<CvExperience>): void {
        this.store.patch(
            'experience',
            this.entries().map((e, i) => (i === index ? { ...e, ...patch } : e))
        );
    }

    // ── Bullets ───────────────────────────────────────────────────────
    protected addBullet(index: number): void {
        const entry = this.entries()[index];
        if (!entry) {
            return;
        }
        this.patchEntry(index, { bullets: [...entry.bullets, { id: cvId('b'), text: '' }] });
    }

    protected removeBullet(index: number, bulletIndex: number): void {
        const entry = this.entries()[index];
        if (!entry) {
            return;
        }
        this.patchEntry(index, { bullets: entry.bullets.filter((_, i) => i !== bulletIndex) });
    }

    protected patchBullet(index: number, bulletIndex: number, text: string): void {
        const entry = this.entries()[index];
        if (!entry) {
            return;
        }
        this.patchEntry(index, {
            bullets: entry.bullets.map((b, i) => (i === bulletIndex ? { ...b, text } : b)),
        });
    }

    protected isGenerating(id: string): boolean {
        return this.generating().includes(id);
    }

    /**
     * Plain language in, drafted rows out.
     *
     * Replaces only the EMPTY rows and appends the rest, so a user who has
     * already written two good bullets does not lose them to the generator.
     */
    protected generateBullets(index: number): void {
        const entry = this.entries()[index];
        if (!entry || !entry.plainLanguage.trim()) {
            return;
        }

        this.generating.update((ids) => [...ids, entry.id]);

        this.ai.generateBullets(entry.plainLanguage, entry.role, this.store.identity().targetJobTitle).subscribe({
            next: (lines) => {
                const current = this.entries().find((e) => e.id === entry.id);
                if (current) {
                    const kept = current.bullets.filter((b) => b.text.trim());
                    const added = lines.map((text) => ({ id: cvId('b'), text }));
                    this.store.patch(
                        'experience',
                        this.entries().map((e) => (e.id === entry.id ? { ...e, bullets: [...kept, ...added] } : e))
                    );
                }
                this.stopGenerating(entry.id);
            },
            error: () => this.stopGenerating(entry.id),
        });
    }

    private stopGenerating(id: string): void {
        this.generating.update((ids) => ids.filter((x) => x !== id));
    }
}
