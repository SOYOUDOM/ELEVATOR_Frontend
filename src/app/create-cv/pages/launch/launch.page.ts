import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvCardComponent } from '@shared/components/elv-card/elv-card.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvDropzoneComponent } from '@shared/components/elv-dropzone';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';
import { HeroTitleComponent } from '@shared/components/hero-title/hero-title.component';
import { RevealDirective } from '@shared/directives/reveal.directive';

import { CREATE_CV_BASE } from '../../config/create-cv-steps.config';
import { CvAiService, type CvImportResult, type CvTemplate } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

type LaunchMode = 'choose' | 'import';
type ImportStage = 'idle' | 'rendering' | 'reading' | 'mapping' | 'done' | 'error';

/** Staged labels, straight from the spec. Each is a real phase, not theatre. */
const STAGES: { stage: ImportStage; label: string; value: number }[] = [
    { stage: 'rendering', label: 'Rendering pages', value: 22 },
    { stage: 'reading', label: 'Reading content', value: 58 },
    { stage: 'mapping', label: 'Mapping fields', value: 88 },
];

/**
 * /create — the launch pad.
 *
 * Two doors and a template strip. The import door is the interesting one: it
 * runs a real request and narrates it in three stages, because a silent
 * ten-second wait on the very first interaction is how you lose someone
 * before they have typed anything.
 *
 * Import never invents data. Fields the extractor returns as null stay empty,
 * and anything it was unsure about is recorded on the draft so the identity
 * floor can flag it with `[uncertain]` rather than quietly presenting a guess
 * as fact.
 */
@Component({
    selector: 'app-launch-page',
    standalone: true,
    imports: [
        HeroTitleComponent,
        ElvCardComponent,
        ElvButtonComponent,
        ElvChipComponent,
        ElvAlertComponent,
        ElvProgressComponent,
        ElvDropzoneComponent,
        RevealDirective,
    ],
    templateUrl: './launch.page.html',
    styleUrl: './launch.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-launch' },
})
export class LaunchPage {
    protected readonly mode = signal<LaunchMode>('choose');
    protected readonly stage = signal<ImportStage>('idle');
    protected readonly progress = signal(0);
    protected readonly stageLabel = signal('');
    protected readonly report = signal<CvImportResult | null>(null);
    protected readonly importError = signal('');

    protected readonly templates = signal<CvTemplate[]>([]);
    protected readonly templatePage = signal(0);
    protected readonly selectedTemplate = computed(() => this.store.meta().templateId);

    protected readonly busy = computed(() => {
        const s = this.stage();
        return s === 'rendering' || s === 'reading' || s === 'mapping';
    });

    /** Three per page keeps each card readable at every width. */
    protected readonly pageSize = 3;

    protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.templates().length / this.pageSize)));

    protected readonly visibleTemplates = computed(() => {
        const start = this.templatePage() * this.pageSize;
        return this.templates().slice(start, start + this.pageSize);
    });

    private readonly store = inject(CvDraftStore);
    private readonly ai = inject(CvAiService);
    private readonly router = inject(Router);

    private timers: ReturnType<typeof setTimeout>[] = [];

    constructor() {
        // Bring any saved draft back before the user picks a door, so
        // "start from scratch" can honestly warn that it discards work.
        void this.store.hydrate();
        this.ai.templates().subscribe((list) => this.templates.set(list));
    }

    protected chooseScratch(): void {
        this.store.setStartPath('scratch');
        void this.router.navigateByUrl(`${CREATE_CV_BASE}/identity`);
    }

    protected chooseImport(): void {
        this.mode.set('import');
    }

    protected backToChoice(): void {
        this.mode.set('choose');
        this.resetImport();
    }

    protected onFiles(files: File[]): void {
        const file = files[0];
        if (!file) {
            return;
        }

        this.resetImport();
        this.runStages();

        this.ai.importCv(file).subscribe({
            next: (result) => {
                this.clearTimers();
                this.stage.set('done');
                this.progress.set(100);
                this.stageLabel.set('Extraction complete');
                this.report.set(result);
                this.store.applyImport(result.draft, result.uncertainFields, file.name);
            },
            error: () => {
                this.clearTimers();
                this.stage.set('error');
                this.progress.set(0);
                this.importError.set('That file could not be read. Try another, or start from scratch.');
            },
        });
    }

    protected continueToIdentity(): void {
        void this.router.navigateByUrl(`${CREATE_CV_BASE}/identity`);
    }

    protected selectTemplate(id: string): void {
        this.store.setTemplate(id);
    }

    protected pageBy(delta: number): void {
        const next = this.templatePage() + delta;
        if (next < 0 || next >= this.pageCount()) {
            return;
        }
        this.templatePage.set(next);
    }

    /**
     * Narrates the request. The stages are advanced on a timer rather than
     * from real parser events because the endpoint reports only completion —
     * so they are paced to be honest about ORDER, and the bar never claims
     * 100% until the response actually lands.
     */
    private runStages(): void {
        this.clearTimers();
        STAGES.forEach((s, i) => {
            this.timers.push(
                setTimeout(() => {
                    this.stage.set(s.stage);
                    this.progress.set(s.value);
                    this.stageLabel.set(s.label);
                }, i * 620)
            );
        });
    }

    private resetImport(): void {
        this.clearTimers();
        this.stage.set('idle');
        this.progress.set(0);
        this.stageLabel.set('');
        this.report.set(null);
        this.importError.set('');
    }

    private clearTimers(): void {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }
}
