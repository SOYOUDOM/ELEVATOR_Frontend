import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { ExperienceEntry } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

/** Which bullet the rewrite panel is open on, and how far through it is. */
interface AiState {
    i: number;
    j: number;
    answer: string;
    result: string;
    busy: boolean;
}

/**
 * FLOOR 03 · experience.
 *
 * Carries the highest-value AI moment in the product, and the one rule that
 * shapes it: the model is never asked to invent a figure. It asks what
 * changed and rewrites around the answer, so every number on the finished CV
 * is one the candidate can defend. A tool that fabricates metrics is a tool
 * that gets people caught.
 */
@Component({
    selector: 'app-create-experience',
    standalone: true,
    templateUrl: './experience.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvButtonComponent, ElvProgressComponent],
})
export class ExperienceComponent {
    readonly store = inject(CvDraftStore);

    readonly ai = signal<AiState | null>(null);

    readonly canContinue = computed(() => this.store.done()['experience']);
    readonly count = computed(() => this.store.experience().length);
    readonly note = computed(() => (this.count() ? 'Newest first reads best' : 'At least one role'));

    /** Clause-shaped, not sentence-shaped — they have to read on from the verb. */
    readonly quickOutcomes = [
        'cut it roughly in half',
        'saved about a day a week',
        'dropped errors by about a third',
        'took it from two days to two hours',
        'doubled how many it handled',
        'freed up ~10 hours a month',
    ];

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    add(): void {
        this.store.addExperience();
    }
    remove(i: number): void {
        this.store.removeExperience(i);
        this.ai.set(null);
    }
    addBullet(i: number): void {
        this.store.addBullet(i);
    }
    removeBullet(i: number, j: number): void {
        this.store.removeBullet(i, j);
        this.ai.set(null);
    }

    patch(i: number, key: keyof ExperienceEntry, value: ElvValue): void {
        this.store.setExperience(i, key, (value == null ? '' : String(value)) as never);
    }
    patchBullet(i: number, j: number, value: ElvValue): void {
        this.store.setBullet(i, j, value == null ? '' : String(value));
    }

    isGuessed(i: number, key: keyof ExperienceEntry): boolean {
        return this.store.guessed().includes(`experience.${i}.${String(key)}`);
    }

    title(entry: ExperienceEntry): string {
        if (!entry.title) {
            return '';
        }
        return entry.company ? `${entry.title} — ${entry.company}` : entry.title;
    }

    /* ── The AI moment ────────────────────────────────────────── */

    openAi(i: number, j: number): void {
        this.ai.set({ i, j, answer: '', result: '', busy: false });
    }
    closeAi(): void {
        this.ai.set(null);
    }
    setAnswer(value: ElvValue): void {
        this.ai.update((a) => (a ? { ...a, answer: value == null ? '' : String(value) } : a));
    }
    backToQuestion(): void {
        this.ai.update((a) => (a ? { ...a, result: '' } : a));
    }

    rewrite(answer?: string): void {
        const state = this.ai();
        if (!state) {
            return;
        }
        const outcome = answer ?? state.answer;
        const original = this.store.experience()[state.i]?.bullets[state.j] ?? '';
        this.ai.set({ ...state, answer: outcome, busy: true });
        this.api.rewriteBullet(original, outcome).subscribe({
            next: (res) => this.ai.update((a) => (a ? { ...a, result: res.text, busy: false } : a)),
            error: () => this.ai.update((a) => (a ? { ...a, busy: false } : a)),
        });
    }

    accept(): void {
        const state = this.ai();
        if (!state?.result) {
            return;
        }
        this.store.setBullet(state.i, state.j, state.result);
        this.ai.set(null);
    }

    isOpen(i: number, j: number): boolean {
        const a = this.ai();
        return !!a && a.i === i && a.j === j;
    }

    originalOf(i: number, j: number): string {
        return this.store.experience()[i]?.bullets[j] ?? '';
    }
}
