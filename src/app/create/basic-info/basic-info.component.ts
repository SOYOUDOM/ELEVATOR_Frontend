import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvFieldType, ElvValue } from '@shared/components/elv-field';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';
import { RevealDirective } from '@shared/directives/reveal.directive';

/* ── Public API ───────────────────────────────────────────────
   Declared before anything else, and deliberately flat: this is
   the shape the CV draft store will eventually own, so nothing
   below may add a field the store does not know about.
   ──────────────────────────────────────────────────────────── */

export interface BasicInfo {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    nationality: string;
    website: string;
    linkedin: string;
    github: string;
}

/** Keys the visitor cannot skip. Drives `canContinue`. */
export const BASIC_INFO_REQUIRED = ['fullName', 'jobTitle', 'email', 'phone', 'location'] as const;

export const EMPTY_BASIC_INFO: BasicInfo = {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    nationality: '',
    website: '',
    linkedin: '',
    github: '',
};

/**
 * One row of the form, rendered by a single <elv-field>.
 *
 * The nine fields are data rather than markup so the completion meter, the
 * required-set and the DOM can never drift apart — add a key here and the
 * percentage, the validation and the grid all pick it up at once.
 */
interface FieldSpec {
    key: keyof BasicInfo;
    label: string;
    placeholder: string;
    required: boolean;
    /** PrimeIcon name WITHOUT the `pi ` prefix — elv-field adds it. */
    icon: string;
    type?: ElvFieldType;
    autocomplete?: string;
    inputmode?: string;
    /** Spans both columns on the two-column layout. */
    wide?: boolean;
}

/**
 * BASIC INFO · floor one of the build.
 *
 * The page is one form and one promise: nine boxes, five of which are load-
 * bearing. Everything visible is either a shared elv-* component or a global
 * ELEVATOR class — the scoped SCSS only lays out the grid and draws the
 * footer rail, because the design system has no equivalent for either yet.
 *
 * State is a single `signal<BasicInfo>` with computed readouts hanging off it.
 * Under the app's zoneless bootstrap that is the whole change-detection story:
 * a `patch()` write schedules the update itself, so there is no markForCheck
 * anywhere and OnPush costs nothing.
 *
 * NOT a Reactive Form on purpose. elv-field implements ControlValueAccessor
 * and would work inside one, but a FormGroup here would mean two sources of
 * truth for the same nine strings the moment the draft store lands.
 */
@Component({
    selector: 'app-basic-info',
    standalone: true,
    templateUrl: './basic-info.component.html',
    styleUrl: './basic-info.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvFieldComponent, ElvProgressComponent, RevealDirective],
})
export class BasicInfoComponent {
    /* ── State ────────────────────────────────────────────────── */

    readonly model = signal<BasicInfo>({ ...EMPTY_BASIC_INFO });

    readonly filledCount = computed(() => {
        const m = this.model();
        return this.fields.reduce((n, f) => (m[f.key].trim() ? n + 1 : n), 0);
    });

    readonly percent = computed(() => Math.round((this.filledCount() / this.fields.length) * 100));

    readonly canContinue = computed(() => {
        const m = this.model();
        return BASIC_INFO_REQUIRED.every((key) => m[key].trim().length > 0);
    });

    /** How many of the five load-bearing fields are still empty. */
    readonly missingRequired = computed(() => {
        const m = this.model();
        return BASIC_INFO_REQUIRED.filter((key) => !m[key].trim()).length;
    });

    readonly meterNote = computed(() => {
        const missing = this.missingRequired();
        if (missing > 0) {
            return `${missing} required ${missing === 1 ? 'field' : 'fields'} left`;
        }
        const optional = this.fields.length - this.filledCount();
        return optional > 0 ? `Ready — ${optional} optional left` : 'Every floor lit';
    });

    /* ── Content ──────────────────────────────────────────────── */

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
        {
            key: 'nationality',
            label: 'NATIONALITY',
            placeholder: 'Optional',
            required: false,
            icon: 'pi-flag',
        },
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

    // Declared last: the lint config wants every public field ahead of the
    // private ones. `fields` is read by the computeds above, but computed()
    // is lazy, so nothing here is touched during field initialisation.
    private readonly router = inject(Router);

    /* ── Intent ───────────────────────────────────────────────── */

    /**
     * elv-field's `value` is a model<ElvValue>, so it can hand back a number or
     * null for numeric/date types. Every field here is textual, so normalise on
     * the way in and BasicInfo stays all-strings for the store.
     */
    patch(key: keyof BasicInfo, value: ElvValue): void {
        this.model.update((m) => ({ ...m, [key]: value == null ? '' : String(value) }));
    }

    back(): void {
        this.router.navigate(['/app/get-started']);
    }

    next(): void {
        // Gate here as well as on the button: elv-button swallows the click when
        // [disabled], but next() is also reachable from the form's submit.
        if (!this.canContinue()) {
            return;
        }
        // TODO: hand off to CvDraftStore — this.draft.setBasicInfo(this.model())
        // once the store exists. Until then the value lives only in this
        // component and is lost on navigation, which is why the route below is
        // still a dead end.
        this.router.navigate(['/app/create/experience']);
    }
}
