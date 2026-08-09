import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';

import { ElvAiActionComponent } from '@shared/components/elv-ai-action';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvRepeaterComponent, ElvRepeaterItemDirective } from '@shared/components/elv-repeater';

import { WizardFloorComponent } from '../../components/wizard-floor/wizard-floor.component';
import { type CvCertification, type CvEducation, cvId } from '../../models/cv-draft.model';
import { CvAiService } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

/**
 * Floor 03 — education and certifications.
 *
 * Two repeaters on one page rather than two floors: for most people both
 * lists are short, and splitting them would add a click without adding
 * clarity. AI is offered on the description fields only — there is nothing
 * to rewrite about a degree title.
 */
@Component({
    selector: 'app-education-page',
    standalone: true,
    imports: [
        WizardFloorComponent,
        ElvRepeaterComponent,
        ElvRepeaterItemDirective,
        ElvFieldComponent,
        ElvAiActionComponent,
    ],
    templateUrl: './education.page.html',
    styleUrl: './education.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-edu' },
})
export class EducationPage {
    protected readonly store = inject(CvDraftStore);
    protected readonly education = this.store.education;
    protected readonly certifications = this.store.certifications;

    private readonly ai = inject(CvAiService);

    protected readonly newEducation = (): CvEducation => ({
        id: cvId('edu'),
        institution: '',
        qualification: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
    });

    protected readonly newCertification = (): CvCertification => ({
        id: cvId('cert'),
        name: '',
        issuer: '',
        year: '',
        description: '',
    });

    protected eduTitle = (e: CvEducation, i: number): string =>
        [e.qualification, e.institution].filter(Boolean).join(' · ') || `Education ${String(i + 1).padStart(2, '0')}`;

    protected certTitle = (c: CvCertification, i: number): string =>
        [c.name, c.issuer].filter(Boolean).join(' · ') || `Certification ${String(i + 1).padStart(2, '0')}`;

    protected setEducation(list: CvEducation[]): void {
        this.store.patch('education', list);
    }

    protected setCertifications(list: CvCertification[]): void {
        this.store.patch('certifications', list);
    }

    protected patchEducation(index: number, patch: Partial<CvEducation>): void {
        this.store.patch(
            'education',
            this.education().map((e, i) => (i === index ? { ...e, ...patch } : e))
        );
    }

    protected patchCertification(index: number, patch: Partial<CvCertification>): void {
        this.store.patch(
            'certifications',
            this.certifications().map((c, i) => (i === index ? { ...c, ...patch } : c))
        );
    }

    /** Reuses the bullet endpoint — a description is the same shape of work. */
    protected describeTask(text: string) {
        return () => this.ai.rewriteBullet('rewrite', text, this.store.identity().targetJobTitle);
    }
}
