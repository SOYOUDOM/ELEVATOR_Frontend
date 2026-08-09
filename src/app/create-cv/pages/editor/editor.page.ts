import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { ElvAccordionComponent, ElvAccordionPanelComponent } from '@shared/components/elv-accordion';
import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';
import { StatsComponent, type Stat } from '@shared/components/stats/stats.component';

import { AdGateComponent } from '../../components/ad-gate/ad-gate.component';
import { CvPreviewComponent } from '../../components/cv-preview/cv-preview.component';
import { CvAiService, type CvAtsResult } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';
import { CreateCvWizardService } from '../../services/create-cv-wizard.service';

type EditorTab = 'edit' | 'preview';
type Panel = 'ats' | 'cover' | null;

/**
 * /create/editor — the last room.
 *
 * Left: every section inline-editable, bound straight to the store. Right: a
 * sticky A4 preview and the action rail.
 *
 * Export is gated behind a watched ad, which is the entire business model —
 * so `exportUnlocked` lives on the draft rather than in component state, and
 * survives a refresh. Making someone re-watch it because they hit reload
 * would be a straightforwardly hostile bug.
 */
@Component({
    selector: 'app-editor-page',
    standalone: true,
    imports: [
        ElvAccordionComponent,
        ElvAccordionPanelComponent,
        ElvFieldComponent,
        ElvButtonComponent,
        ElvChipComponent,
        ElvProgressComponent,
        ElvSkeletonComponent,
        ElvAlertComponent,
        StatsComponent,
        CvPreviewComponent,
        AdGateComponent,
    ],
    templateUrl: './editor.page.html',
    styleUrl: './editor.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-editor' },
})
export class EditorPage {
    protected readonly store = inject(CvDraftStore);
    protected readonly wizard = inject(CreateCvWizardService);

    protected readonly identity = this.store.identity;
    protected readonly draft = this.store.draft;

    protected readonly tab = signal<EditorTab>('edit');
    protected readonly zoom = signal(0.72);
    protected readonly panel = signal<Panel>(null);

    protected readonly scanning = signal(false);
    protected readonly ats = signal<CvAtsResult | null>(null);

    protected readonly writingCover = signal(false);
    protected readonly coverLetter = signal('');

    protected readonly adOpen = signal(false);

    protected readonly unlocked = computed(() => this.store.meta().exportUnlocked);

    /** ATS category breakdown, in the shape `stats` expects. */
    protected readonly atsStats = computed<Stat[]>(
        () => this.ats()?.categories.map((c) => ({ value: `${c.score}`, label: c.label })) ?? []
    );

    protected readonly atsTone = computed(() => {
        const score = this.ats()?.score ?? 0;
        if (score >= 75) {
            return 'success' as const;
        }
        return score >= 45 ? ('warning' as const) : ('danger' as const);
    });

    private readonly ai = inject(CvAiService);

    protected setIdentity(
        field: 'fullName' | 'targetJobTitle' | 'email' | 'phone' | 'location' | 'summary',
        value: string
    ): void {
        this.store.patch('identity', { [field]: value } as never);
    }

    protected patchBullet(entryIndex: number, bulletIndex: number, text: string): void {
        const list = this.store.experience();
        const entry = list[entryIndex];
        if (!entry) {
            return;
        }
        this.store.patch(
            'experience',
            list.map((e, i) =>
                i === entryIndex
                    ? { ...e, bullets: e.bullets.map((b, bi) => (bi === bulletIndex ? { ...b, text } : b)) }
                    : e
            )
        );
    }

    protected zoomBy(delta: number): void {
        this.zoom.update((z) => Math.min(1.15, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
    }

    // ── Actions ───────────────────────────────────────────────────────
    protected runAts(): void {
        if (this.scanning()) {
            return;
        }
        this.panel.set('ats');
        this.scanning.set(true);

        this.ai.atsScan(this.store.draft()).subscribe({
            next: (result) => {
                this.ats.set(result);
                this.scanning.set(false);
            },
            error: () => this.scanning.set(false),
        });
    }

    protected runCoverLetter(): void {
        if (this.writingCover()) {
            return;
        }
        this.panel.set('cover');
        this.writingCover.set(true);

        this.ai.coverLetter(this.store.draft()).subscribe({
            next: (text) => {
                this.coverLetter.set(text);
                this.writingCover.set(false);
            },
            error: () => this.writingCover.set(false),
        });
    }

    protected closePanel(): void {
        this.panel.set(null);
    }

    // ── Export ────────────────────────────────────────────────────────
    protected exportPdf(): void {
        if (!this.unlocked()) {
            this.adOpen.set(true);
            return;
        }
        this.download();
    }

    protected onAdComplete(): void {
        this.adOpen.set(false);
        this.store.unlockExport();
        this.download();
    }

    protected onAdDismiss(): void {
        this.adOpen.set(false);
    }

    /**
     * Hands the preview to the browser's own print-to-PDF.
     *
     * Deliberately not a client-side PDF library: the preview is already
     * laid out in CSS at A4, and printing it keeps the exported file as real
     * selectable text — which is the whole reason the templates are built
     * parse-first for ATS.
     */
    private download(): void {
        window.print();
    }
}
