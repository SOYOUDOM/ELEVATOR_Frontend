import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { CvDesign, CvOptions } from '@app/cv/models/cv-design.model';
import { resolveFontStack } from '@app/cv/models/cv-fonts';
import type { CvContent, CvSectionId } from '@app/cv/models/cv-content.model';
import { type CvDateRange, formatCvDate, formatCvRange } from '@app/cv/models/cv-date';
import { CvEditableDirective } from '@app/cv/directives/cv-editable.directive';
import { CV_SECTIONS, sectionSpec } from '@app/cv/schema/cv-section-schema';

/**
 * ELEVATOR — the CV document.
 *
 * The one place a user's CV is drawn, and the reason there is only one: the
 * editor, the clean preview and the printed page are the SAME component. A
 * template that only existed for export would drift from what the user was
 * shown, and the drift would only surface in the PDF.
 *
 * TWO INDEPENDENT VISUAL SYSTEMS. Everything in here reads `--cv-*` custom
 * properties emitted from the user's CvDesign. Not one `--p-elevator-*` token
 * crosses this boundary — switch ELEVATOR to a light theme and the document
 * does not move; make the document navy serif and the workspace stays dark gold.
 *
 * EXPORT SAFETY: the editor affordances are a class (`is-interactive`) and a
 * print stylesheet, never markup. `interactive: false` — and @media print
 * regardless — leaves plain semantic HTML with no outlines, no hover targets,
 * no edit chrome.
 */
@Component({
    selector: 'app-cv-preview',
    standalone: true,
    templateUrl: './cv-preview.component.html',
    styleUrl: './cv-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CvEditableDirective, NgTemplateOutlet],
    host: { class: 'cv-preview' },
})
export class CvPreviewComponent {
    readonly content = input.required<CvContent>();
    readonly design = input.required<CvDesign>();
    readonly options = input.required<CvOptions>();
    /** False for a clean preview or an export render — no click-to-edit chrome. */
    readonly interactive = input(true);

    readonly fontStack = computed(() => resolveFontStack(this.design().fontFamily));

    /** Sections in the user's order, minus the ones they switched off. */
    readonly visibleSections = computed<CvSectionId[]>(() => {
        const design = this.design();
        const hidden = new Set(design.hiddenSections);
        const ordered = design.sectionOrder.filter((id) => !hidden.has(id));
        // Anything the order array has not heard of (a section added after this
        // CV was saved) still renders, at the end, rather than vanishing.
        const missing = CV_SECTIONS.map((spec) => spec.id).filter(
            (id) => !hidden.has(id) && !design.sectionOrder.includes(id)
        );
        return [...ordered, ...missing].filter((id) => id !== 'personal' && this.hasContent(id));
    });

    /** In two-column mode these move to the sidebar; in one column they stay inline. */
    readonly sidebarSections = computed<CvSectionId[]>(() =>
        this.design().columns === 2 ? this.visibleSections().filter((id) => SIDEBAR_SECTIONS.has(id)) : []
    );

    readonly mainSections = computed<CvSectionId[]>(() => {
        const sidebar = new Set(this.sidebarSections());
        return this.visibleSections().filter((id) => !sidebar.has(id));
    });

    readonly contactParts = computed(() => {
        const personal = this.content().personal;
        return [
            { fieldId: 'email', icon: 'pi-envelope', value: personal.email },
            { fieldId: 'phone', icon: 'pi-phone', value: personal.phone },
            { fieldId: 'location', icon: 'pi-map-marker', value: personal.location },
            { fieldId: 'website', icon: 'pi-globe', value: personal.website },
        ].filter((part) => part.value.trim().length > 0);
    });

    sectionLabel(id: CvSectionId): string {
        return sectionSpec(id).label;
    }

    range(range: CvDateRange): string {
        const options = this.options();
        return formatCvRange(range, options.dateStyle, options.presentLabel);
    }

    point(range: CvDateRange): string {
        return formatCvDate(range.start, this.options().dateStyle);
    }

    /** Blank lines never reach the document — an empty bullet is not a bullet. */
    filled(values: string[]): string[] {
        return values.filter((value) => value.trim().length > 0);
    }

    private hasContent(id: CvSectionId): boolean {
        const content = this.content();
        switch (id) {
            case 'summary':
                return content.summary.trim().length > 0;
            case 'experience':
                return content.experience.length > 0;
            case 'education':
                return content.education.length > 0;
            case 'skills':
                return content.skills.length > 0;
            case 'projects':
                return content.projects.length > 0;
            case 'certifications':
                return content.certifications.length > 0;
            case 'languages':
                return content.languages.length > 0;
            case 'additional':
                return content.additional.length > 0;
            default:
                return false;
        }
    }
}

const SIDEBAR_SECTIONS = new Set<CvSectionId>(['skills', 'languages', 'certifications']);
