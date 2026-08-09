import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { ElvAccordionComponent, ElvAccordionPanelComponent } from '@shared/components/elv-accordion';
import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvRepeaterComponent, ElvRepeaterItemDirective } from '@shared/components/elv-repeater';

import { WizardFloorComponent } from '../../components/wizard-floor/wizard-floor.component';
import {
    type CvAward,
    type CvBoostSectionId,
    type CvProject,
    type CvReference,
    type CvVolunteer,
    cvId,
} from '../../models/cv-draft.model';
import { CvAiService } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

interface BoostSection {
    id: CvBoostSectionId;
    label: string;
    icon: string;
    blurb: string;
}

const SECTIONS: BoostSection[] = [
    { id: 'projects', label: 'Projects', icon: 'pi pi-folder', blurb: 'Side work, coursework, anything you built.' },
    { id: 'awards', label: 'Awards', icon: 'pi pi-trophy', blurb: 'Recognition worth naming.' },
    { id: 'volunteer', label: 'Volunteer', icon: 'pi pi-heart', blurb: 'Unpaid work still counts as work.' },
    { id: 'references', label: 'References', icon: 'pi pi-users', blurb: 'People who will vouch for you.' },
    { id: 'interests', label: 'Interests', icon: 'pi pi-compass', blurb: 'A line of personality, kept short.' },
];

/**
 * Floor 05 — boost.
 *
 * Everything here is optional, and the page says so loudly: SKIP is a
 * full-size button, not an apologetic text link. Sections are opt-in — tapping
 * a chip expands its panel inline rather than presenting five empty forms
 * nobody asked for.
 */
@Component({
    selector: 'app-boost-page',
    standalone: true,
    imports: [
        WizardFloorComponent,
        ElvChipComponent,
        ElvAlertComponent,
        ElvAccordionComponent,
        ElvAccordionPanelComponent,
        ElvRepeaterComponent,
        ElvRepeaterItemDirective,
        ElvFieldComponent,
    ],
    templateUrl: './boost.page.html',
    styleUrl: './boost.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-boost' },
})
export class BoostPage {
    protected readonly store = inject(CvDraftStore);
    protected readonly boost = this.store.boost;
    protected readonly sections = SECTIONS;

    protected readonly suggested = signal<string[]>([]);

    protected readonly openPanels = computed(() => this.boost().enabled as string[]);

    protected readonly suggestionText = computed(() => {
        const names = this.suggested()
            .map((id) => SECTIONS.find((s) => s.id === id)?.label)
            .filter(Boolean);
        if (!names.length) {
            return '';
        }
        const role = this.store.identity().targetJobTitle || 'this role';
        return `For ${role}, ${names.join(' and ')} tend to carry the most weight. The rest are safe to leave off.`;
    });

    private readonly ai = inject(CvAiService);

    constructor() {
        const role = this.store.identity().targetJobTitle;
        if (role) {
            this.ai.suggestBoostSections(role).subscribe((ids) => this.suggested.set(ids));
        }
    }

    protected readonly newProject = (): CvProject => ({ id: cvId('prj'), name: '', url: '', description: '' });
    protected readonly newAward = (): CvAward => ({ id: cvId('awd'), name: '', issuer: '', year: '' });
    protected readonly newVolunteer = (): CvVolunteer => ({
        id: cvId('vol'),
        organisation: '',
        role: '',
        description: '',
    });
    protected readonly newReference = (): CvReference => ({ id: cvId('ref'), name: '', relationship: '', contact: '' });

    protected isOn(id: CvBoostSectionId): boolean {
        return this.boost().enabled.includes(id);
    }

    protected toggle(id: CvBoostSectionId): void {
        const enabled = this.isOn(id) ? this.boost().enabled.filter((s) => s !== id) : [...this.boost().enabled, id];
        this.store.patch('boost', { enabled });
    }

    protected setList<K extends 'projects' | 'awards' | 'volunteer' | 'references'>(
        key: K,
        list: (typeof this.boost extends never ? never : ReturnType<typeof this.boost>)[K]
    ): void {
        this.store.patch('boost', { [key]: list } as never);
    }

    protected patchIn<K extends 'projects' | 'awards' | 'volunteer' | 'references'>(
        key: K,
        index: number,
        patch: object
    ): void {
        const list = (this.boost()[key] as object[]).map((item, i) => (i === index ? { ...item, ...patch } : item));
        this.store.patch('boost', { [key]: list } as never);
    }

    protected setInterests(value: string): void {
        this.store.patch('boost', {
            interests: value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        });
    }

    protected interestsText(): string {
        return this.boost().interests.join(', ');
    }
}
