import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { SkillGroup, SkillSuggestion } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

interface GroupSpec {
    key: SkillGroup;
    name: string;
    hint: string;
    suggestions: string[];
}

/**
 * FLOOR 05 · skills.
 *
 * The suggestions that matter come from the visitor's OWN prose on Experience
 * and Projects, not from a popular-skills list — and each one reports the
 * phrase that implied it, so it can be judged rather than just accepted. The
 * static chips below are only a starting point for an empty draft.
 */
@Component({
    selector: 'app-create-skills',
    standalone: true,
    templateUrl: './skills.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvProgressComponent],
})
export class SkillsComponent {
    readonly store = inject(CvDraftStore);

    readonly implied = signal<SkillSuggestion[]>([]);
    readonly canContinue = computed(() => this.store.done()['skills']);
    readonly count = this.store.skillCount;
    readonly note = computed(() => (this.count() < 4 ? 'Add at least four' : 'Good spread'));

    readonly groups: readonly GroupSpec[] = [
        {
            key: 'technical',
            name: 'Technical',
            hint: 'Languages, frameworks and platforms you would be happy to be tested on.',
            suggestions: ['TypeScript', 'Angular', 'SQL', 'Python', 'REST APIs', 'Linux', 'Docker'],
        },
        {
            key: 'tools',
            name: 'Tools',
            hint: 'What you actually open every day.',
            suggestions: ['Jira', 'Git', 'Figma', 'Postman', 'Grafana', 'Excel'],
        },
        {
            key: 'languages',
            name: 'Languages',
            hint: 'Spoken, with a level if it is not fluent.',
            suggestions: ['Khmer — native', 'English — fluent', 'Mandarin — basic'],
        },
        {
            key: 'soft',
            name: 'Ways of working',
            hint: 'Keep these few and specific. Three beats ten.',
            suggestions: ['Incident triage', 'Stakeholder communication', 'Technical writing', 'Mentoring'],
        },
    ];

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    constructor() {
        this.refreshSuggestions();
    }

    refreshSuggestions(): void {
        this.api.suggestSkills(this.store.draft()).subscribe((list) => this.implied.set(list));
    }

    /** Chips the visitor has not already added. */
    unusedIn(group: GroupSpec): string[] {
        const have = this.store.skills()[group.key];
        return group.suggestions.filter((s) => !have.includes(s));
    }

    addFromInput(group: SkillGroup, field: ElvFieldComponent): void {
        const value = String(field.value() ?? '').trim();
        if (!value) {
            return;
        }
        this.store.addSkill(group, value);
        field.value.set('');
        this.refreshSuggestions();
    }

    add(group: SkillGroup, skill: string): void {
        this.store.addSkill(group, skill);
        this.refreshSuggestions();
    }

    remove(group: SkillGroup, i: number): void {
        this.store.removeSkill(group, i);
        this.refreshSuggestions();
    }
}
