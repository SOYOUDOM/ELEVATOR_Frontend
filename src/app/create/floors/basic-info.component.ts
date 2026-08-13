import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvFieldType, ElvValue } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { BasicInfo, REQUIRED_BASIC } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

interface FieldSpec {
    key: keyof BasicInfo;
    label: string;
    placeholder: string;
    required: boolean;
    icon: string;
    type?: ElvFieldType;
    autocomplete?: string;
    inputmode?: string;
    wide?: boolean;
}

/**
 * FLOOR 01 · basic info.
 *
 * Nine fields, five of them load-bearing. The nine are data rather than
 * markup so the completion meter, the required set and the DOM cannot drift
 * apart — add a key here and all three follow.
 */
@Component({
    selector: 'app-create-basic-info',
    standalone: true,
    templateUrl: './basic-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent, ElvProgressComponent],
})
export class BasicInfoComponent {
    readonly store = inject(CvDraftStore);

    readonly titleIdeas = signal<string[]>([]);
    readonly required = REQUIRED_BASIC;

    readonly filled = this.store.basicFilled;
    readonly canContinue = computed(() => this.store.missingRequired().length === 0);

    readonly note = computed(() => {
        const missing = this.store.missingRequired().length;
        if (missing) {
            return `${missing} required field${missing > 1 ? 's' : ''} left`;
        }
        return `Ready — ${9 - this.filled()} optional left`;
    });

    readonly guessedCount = computed(() => this.store.guessed().filter((g) => g.startsWith('basic.')).length);

    readonly fields: readonly FieldSpec[] = [
        {
            key: 'fullName',
            label: 'FULL NAME',
            placeholder: 'Your full name',
            required: true,
            icon: 'pi-user',
            autocomplete: 'name',
        },
        {
            key: 'jobTitle',
            label: 'PROFESSION / TITLE',
            placeholder: 'Application Support',
            required: true,
            icon: 'pi-briefcase',
            autocomplete: 'organization-title',
        },
        {
            key: 'email',
            label: 'EMAIL ADDRESS',
            placeholder: 'you@example.com',
            required: true,
            icon: 'pi-envelope',
            type: 'email',
            autocomplete: 'email',
            inputmode: 'email',
        },
        {
            key: 'phone',
            label: 'PHONE NUMBER',
            placeholder: '+855 ...',
            required: true,
            icon: 'pi-phone',
            type: 'tel',
            autocomplete: 'tel',
            inputmode: 'tel',
        },
        {
            key: 'location',
            label: 'LOCATION',
            placeholder: 'City, Country',
            required: true,
            icon: 'pi-map-marker',
            autocomplete: 'address-level2',
        },
        { key: 'nationality', label: 'NATIONALITY', placeholder: 'Optional', required: false, icon: 'pi-flag' },
        {
            key: 'website',
            label: 'PORTFOLIO / WEBSITE',
            placeholder: 'https://your-portfolio.com',
            required: false,
            icon: 'pi-globe',
            type: 'url',
            autocomplete: 'url',
            inputmode: 'url',
        },
        {
            key: 'linkedin',
            label: 'LINKEDIN',
            placeholder: 'linkedin.com/in/yourname',
            required: false,
            icon: 'pi-linkedin',
            inputmode: 'url',
        },
        {
            key: 'github',
            label: 'GITHUB / OTHER LINK',
            placeholder: 'github.com/yourname',
            required: false,
            icon: 'pi-github',
            inputmode: 'url',
            wide: true,
        },
    ];

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    isGuessed(key: keyof BasicInfo): boolean {
        return this.store.guessed().includes(`basic.${key}`);
    }

    /** elv-field's value model can hand back a number or null; BasicInfo is all strings. */
    patch(key: keyof BasicInfo, value: ElvValue): void {
        this.store.setBasic(key, value == null ? '' : String(value));
        if (key === 'jobTitle') {
            this.titleIdeas.set([]);
        }
    }

    /** Recruiters search by title, so offer the phrasings that get searched. */
    suggestTitles(): void {
        const title = this.store.basic().jobTitle;
        if (!title.trim()) {
            return;
        }
        this.api.normaliseTitle(title).subscribe((ideas) => this.titleIdeas.set(ideas));
    }

    useTitle(title: string): void {
        this.store.setBasic('jobTitle', title);
        this.titleIdeas.set([]);
    }
}
