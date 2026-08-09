import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvEmptyStateComponent } from '@shared/components/elv-empty-state/elv-empty-state.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';

import { WizardFloorComponent } from '../../components/wizard-floor/wizard-floor.component';
import { type CvLanguage, type CvSkill, type CvSkillGroup, cvId } from '../../models/cv-draft.model';
import { CvAiService, type CvSkillSuggestion } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

const PRESETS: { group: CvSkillGroup; label: string; items: string[] }[] = [
    {
        group: 'technical',
        label: 'Technical',
        items: [
            'TypeScript',
            'Angular',
            'SQL',
            'Figma',
            'Design systems',
            'User research',
            'Data analysis',
            'Accessibility',
        ],
    },
    {
        group: 'tools',
        label: 'Tools',
        items: ['Git', 'Jira', 'Notion', 'Excel', 'Photoshop', 'Postman', 'Slack', 'Tableau'],
    },
    {
        group: 'soft',
        label: 'Soft',
        items: [
            'Team leadership',
            'Mentoring',
            'Stakeholder management',
            'Written communication',
            'Problem solving',
            'Time management',
        ],
    },
];

const LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'];

/**
 * Floor 04 — skills.
 *
 * SCAN MY EXPERIENCE is the headline affordance: it reads the bullets the
 * user already wrote and proposes skills drawn from them, which is both
 * faster and more honest than a generic list. Suggestions are proposals —
 * tapping one accepts it; nothing is added on the user's behalf.
 */
@Component({
    selector: 'app-skills-page',
    standalone: true,
    imports: [
        WizardFloorComponent,
        ElvChipComponent,
        ElvButtonComponent,
        ElvFieldComponent,
        ElvSkeletonComponent,
        ElvEmptyStateComponent,
    ],
    templateUrl: './skills.page.html',
    styleUrl: './skills.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-skills' },
})
export class SkillsPage {
    protected readonly store = inject(CvDraftStore);
    protected readonly skills = this.store.skills;
    protected readonly languages = this.store.languages;

    protected readonly presets = PRESETS;
    protected readonly levels = LEVELS;

    protected readonly scanning = signal(false);
    protected readonly suggestions = signal<CvSkillSuggestion[]>([]);
    protected readonly scanned = signal(false);

    protected readonly custom = signal('');
    protected readonly newLanguage = signal('');
    protected readonly newLevel = signal(LEVELS[1]);

    /** Nothing to scan if the user has written no bullets yet. */
    protected readonly canScan = computed(() =>
        this.store.experience().some((e) => e.bullets.some((b) => b.text.trim()))
    );

    /** Suggestions already accepted drop out of the proposal row. */
    protected readonly openSuggestions = computed(() => this.suggestions().filter((s) => !this.has(s.name)));

    private readonly ai = inject(CvAiService);

    protected has(name: string): boolean {
        return this.skills().some((s) => s.name.toLowerCase() === name.toLowerCase());
    }

    protected toggle(name: string, group: CvSkillGroup): void {
        if (this.has(name)) {
            this.store.patch(
                'skills',
                this.skills().filter((s) => s.name.toLowerCase() !== name.toLowerCase())
            );
            return;
        }
        this.store.patch('skills', [...this.skills(), { id: cvId('sk'), name, group }]);
    }

    protected addCustom(): void {
        const name = this.custom().trim();
        if (!name || this.has(name)) {
            this.custom.set('');
            return;
        }
        this.store.patch('skills', [...this.skills(), { id: cvId('sk'), name, group: 'technical' }]);
        this.custom.set('');
    }

    protected remove(skill: CvSkill): void {
        this.store.patch(
            'skills',
            this.skills().filter((s) => s.id !== skill.id)
        );
    }

    protected scan(): void {
        if (!this.canScan() || this.scanning()) {
            return;
        }
        this.scanning.set(true);

        this.ai.scanSkills(this.store.draft()).subscribe({
            next: (list) => {
                this.suggestions.set(list);
                this.scanned.set(true);
                this.scanning.set(false);
            },
            error: () => {
                this.scanning.set(false);
                this.scanned.set(true);
            },
        });
    }

    // ── Languages ─────────────────────────────────────────────────────
    protected addLanguage(): void {
        const name = this.newLanguage().trim();
        if (!name) {
            return;
        }
        const entry: CvLanguage = { id: cvId('lang'), name, level: this.newLevel() };
        this.store.patch('languages', [...this.languages(), entry]);
        this.newLanguage.set('');
    }

    protected removeLanguage(lang: CvLanguage): void {
        this.store.patch(
            'languages',
            this.languages().filter((l) => l.id !== lang.id)
        );
    }
}
