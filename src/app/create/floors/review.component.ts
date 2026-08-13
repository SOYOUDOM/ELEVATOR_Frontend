import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';

import { CreateUiStore } from '../create-ui.store';
import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { Finding, SkillGroup, TailorResult } from '../cv.models';
import { SCORED_FLOORS } from '../floors';
import { CvSheetComponent } from '../preview/cv-sheet.component';
import { FloorFrameComponent } from './floor-frame.component';

/**
 * FLOOR 09 · review.
 *
 * The read-back tab is the one worth defending: it runs the finished CV back
 * through the same parser that reads uploads. It costs nothing extra because
 * the parser already exists for the import path, and it is the only honest
 * way to claim ATS-ready — every competitor asserts it, this demonstrates it.
 */
@Component({
    selector: 'app-create-review',
    standalone: true,
    templateUrl: './review.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, CvSheetComponent, ElvButtonComponent, ElvFieldComponent],
})
export class ReviewComponent {
    readonly store = inject(CvDraftStore);
    readonly ui = inject(CreateUiStore);

    readonly tabs = [
        { id: 'check', label: 'Checklist' },
        { id: 'ats', label: 'Read-back' },
        { id: 'job', label: 'Tailor' },
        { id: 'export', label: 'Export' },
    ] as const;

    readonly floors = SCORED_FLOORS;
    readonly done = this.store.done;

    readonly findings = signal<Finding[]>([]);
    readonly jobAd = signal('');
    readonly match = signal<TailorResult | null>(null);
    readonly busy = signal('');
    readonly toast = signal('');

    readonly percent = computed(() => {
        const done = this.done();
        return Math.round((this.floors.filter((f) => done[f.id]).length / this.floors.length) * 100);
    });

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    constructor() {
        this.runReadBack();
    }

    tab(): string {
        return this.ui.reviewTab();
    }
    setTab(id: 'check' | 'ats' | 'job' | 'export'): void {
        this.ui.reviewTab.set(id);
        if (id === 'ats') {
            this.runReadBack();
        }
    }

    runReadBack(): void {
        this.busy.set('ats');
        this.api.readBack(this.store.draft()).subscribe({
            next: (f) => {
                this.findings.set(f);
                this.busy.set('');
            },
            error: () => this.busy.set(''),
        });
    }

    setJobAd(value: ElvValue): void {
        this.jobAd.set(value == null ? '' : String(value));
    }

    analyse(): void {
        if (!this.jobAd().trim()) {
            return;
        }
        this.busy.set('job');
        this.api.tailor(this.store.draft(), this.jobAd()).subscribe({
            next: (r) => {
                this.match.set(r);
                this.busy.set('');
            },
            error: () => this.busy.set(''),
        });
    }

    addMissing(skill: string): void {
        this.store.addSkill('technical' as SkillGroup, skill);
        this.analyse();
    }

    export(format: 'pdf' | 'docx', withPhoto: boolean): void {
        this.busy.set('export');
        this.api.export(this.store.draft(), format, withPhoto).subscribe({
            next: (r) => {
                this.busy.set('');
                this.flash(
                    `${format.toUpperCase()} ready — ${r.pages} page${r.pages > 1 ? 's' : ''}${withPhoto ? '' : ', no photo'}`
                );
            },
            error: () => this.busy.set(''),
        });
    }

    mark(level: string): string {
        return level === 'ok' ? '✓' : level === 'warn' ? '!' : '✕';
    }

    private flash(message: string): void {
        this.toast.set(message);
        setTimeout(() => this.toast.set(''), 3200);
    }
}
