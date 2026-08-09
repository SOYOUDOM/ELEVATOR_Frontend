import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { ElvAiActionComponent } from '@shared/components/elv-ai-action';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvRepeaterComponent, ElvRepeaterItemDirective } from '@shared/components/elv-repeater';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';
import { ElvToggleComponent } from '@shared/components/elv-toggle/elv-toggle.component';

import { WizardFloorComponent } from '../../components/wizard-floor/wizard-floor.component';
import { type CvBullet, type CvExperience, cvId } from '../../models/cv-draft.model';
import { CvAiService, type CvBulletMode } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

/**
 * Floor 02 — experience.
 *
 * The structural decision that matters: bullets are an inner repeater of
 * INDIVIDUAL ROWS, never one blob textarea. A blob cannot be rewritten,
 * reordered, or scored per line — and every AI affordance on this screen
 * operates on exactly one bullet.
 *
 * The plain-language field is the on-ramp for people who freeze at a blank
 * bullet list: "I did customer support at a bank" becomes four drafted rows
 * they can then edit.
 */
@Component({
    selector: 'app-experience-page',
    standalone: true,
    imports: [
        WizardFloorComponent,
        ElvRepeaterComponent,
        ElvRepeaterItemDirective,
        ElvFieldComponent,
        ElvButtonComponent,
        ElvToggleComponent,
        ElvSkeletonComponent,
        ElvAiActionComponent,
    ],
    templateUrl: './experience.page.html',
    styleUrl: './experience.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-exp' },
})
export class ExperiencePage {
    protected readonly store = inject(CvDraftStore);
    protected readonly entries = this.store.experience;

    /** Entry ids currently generating bullets — drives the skeleton per card. */
    protected readonly generating = signal<string[]>([]);

    private readonly ai = inject(CvAiService);

    protected readonly newEntry = (): CvExperience => ({
        id: cvId('exp'),
        company: '',
        role: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: [],
        plainLanguage: '',
    });

    protected cardTitle = (entry: CvExperience, index: number): string =>
        [entry.role, entry.company].filter(Boolean).join(' · ') || `Role ${String(index + 1).padStart(2, '0')}`;

    protected setEntries(entries: CvExperience[]): void {
        this.store.patch('experience', entries);
    }

    protected patchEntry(index: number, patch: Partial<CvExperience>): void {
        this.store.patch(
            'experience',
            this.entries().map((e, i) => (i === index ? { ...e, ...patch } : e))
        );
    }

    // ── Bullets ───────────────────────────────────────────────────────
    protected newBullet = (): CvBullet => ({ id: cvId('b'), text: '' });

    protected setBullets(index: number, bullets: CvBullet[]): void {
        this.patchEntry(index, { bullets });
    }

    protected patchBullet(entryIndex: number, bulletIndex: number, text: string): void {
        const entry = this.entries()[entryIndex];
        if (!entry) {
            return;
        }
        this.patchEntry(entryIndex, {
            bullets: entry.bullets.map((b, i) => (i === bulletIndex ? { ...b, text } : b)),
        });
    }

    /** Task factory for the per-bullet AI buttons. */
    protected bulletTask(mode: CvBulletMode, entryIndex: number, bulletIndex: number) {
        return () => {
            const text = this.entries()[entryIndex]?.bullets[bulletIndex]?.text ?? '';
            return this.ai.rewriteBullet(mode, text, this.store.identity().targetJobTitle);
        };
    }

    protected isGenerating(id: string): boolean {
        return this.generating().includes(id);
    }

    /** Plain language in, drafted bullet rows out. Appends, never replaces. */
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
                    const added = lines.map((text) => ({ id: cvId('b'), text }));
                    this.store.patch(
                        'experience',
                        this.entries().map((e) => (e.id === entry.id ? { ...e, bullets: [...e.bullets, ...added] } : e))
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
