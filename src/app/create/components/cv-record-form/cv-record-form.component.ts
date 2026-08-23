import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    computed,
    effect,
    inject,
    input,
    untracked,
} from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvToggleComponent } from '@shared/components/elv-toggle/elv-toggle.component';

import type { CvSectionId } from '@app/cv/models/cv-content.model';
import { type CvDateRange, parseMonthInput, toMonthInput } from '@app/cv/models/cv-date';
import type { CvFieldSpec, CvListFieldSpec, CvRangeFieldSpec, CvTextFieldSpec } from '@app/cv/schema/cv-field.types';
import { isListSection, sectionSpec } from '@app/cv/schema/cv-section-schema';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';

/**
 * ELEVATOR — one form, every section.
 *
 * Renders whatever the section registry declares. There is no experience-form,
 * no education-form and no ninth copy of the same markup waiting to drift: add
 * a field to cv-section-schema.ts and it appears here, in the preview's edit
 * targets and in the completion ring at the same moment.
 *
 * FOCUS is the other half of click-to-edit. When the preview selects a field,
 * the selection store bumps a token; the effect below finds the matching input
 * by its `data-field-id` — a contract inside this component, not a DOM guess
 * across components — scrolls it into view and focuses it.
 */
@Component({
    selector: 'app-cv-record-form',
    standalone: true,
    templateUrl: './cv-record-form.component.html',
    styleUrl: './cv-record-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvFieldComponent, ElvButtonComponent, ElvToggleComponent],
    host: { class: 'cv-form' },
})
export class CvRecordFormComponent {
    private readonly editor = inject(CvEditorStore);
    private readonly selection = inject(CvSelectionStore);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly sectionId = input.required<CvSectionId>();
    /** null for the singleton sections (personal, summary). */
    readonly recordId = input<string | null>(null);

    readonly spec = computed(() => sectionSpec(this.sectionId()));

    readonly record = computed<Record<string, unknown> | null>(() => {
        const content = this.editor.content();
        if (!content) {
            return null;
        }
        const spec = this.spec();
        if (!isListSection(spec)) {
            return spec.read(content) as unknown as Record<string, unknown>;
        }
        const id = this.recordId();
        const found = spec.read(content).find((entry) => entry.id === id);
        return (found as unknown as Record<string, unknown>) ?? null;
    });

    readonly fields = computed(() => this.spec().fields as CvFieldSpec<unknown>[]);

    constructor() {
        effect(() => {
            const request = this.selection.focusRequest();
            const fieldId = request?.target.fieldId;
            if (!request || !fieldId || request.target.sectionId !== untracked(this.sectionId)) {
                return;
            }
            if ((request.target.recordId ?? null) !== untracked(this.recordId)) {
                return;
            }
            // After the view has settled on the newly selected record.
            queueMicrotask(() => this.focusField(fieldId));
        });
    }

    // ── narrowing helpers the template needs (no `any` in the markup) ──
    asText(field: CvFieldSpec<unknown>): CvTextFieldSpec<unknown> {
        return field as CvTextFieldSpec<unknown>;
    }

    asRange(field: CvFieldSpec<unknown>): CvRangeFieldSpec<unknown> {
        return field as CvRangeFieldSpec<unknown>;
    }

    asList(field: CvFieldSpec<unknown>): CvListFieldSpec<unknown> {
        return field as CvListFieldSpec<unknown>;
    }

    textValue(field: CvFieldSpec<unknown>): string {
        const record = this.record();
        return record ? this.asText(field).read(record) : '';
    }

    rangeValue(field: CvFieldSpec<unknown>): CvDateRange {
        const record = this.record();
        return record ? this.asRange(field).read(record) : { start: null, end: null, isPresent: false };
    }

    listValue(field: CvFieldSpec<unknown>): string[] {
        const record = this.record();
        return record ? this.asList(field).read(record) : [];
    }

    monthValue(field: CvFieldSpec<unknown>, edge: 'start' | 'end'): string {
        return toMonthInput(this.rangeValue(field)[edge]);
    }

    /**
     * Server-side validation for one field. The path mirrors the DTO, so a
     * backend that reports `content.personal.email` lands on the right input
     * without any translation table.
     */
    errorFor(field: CvFieldSpec<unknown>): string {
        const errors = this.editor.saveError()?.fieldErrors;
        if (!errors) {
            return '';
        }
        const recordId = this.recordId();
        const path = recordId
            ? `content.${this.sectionId()}.${recordId}.${field.id}`
            : `content.${this.sectionId()}.${field.id}`;
        return (errors[path] ?? errors[`content.${this.sectionId()}.${field.id}`] ?? [])[0] ?? '';
    }

    // ── writes ────────────────────────────────────────────────────────
    setText(field: CvFieldSpec<unknown>, value: string | number | null): void {
        const spec = this.asText(field);
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) =>
            spec.write(record, String(value ?? ''))
        );
    }

    setMonth(field: CvFieldSpec<unknown>, edge: 'start' | 'end', value: string | number | null): void {
        const spec = this.asRange(field);
        const parsed = parseMonthInput(String(value ?? ''));
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) => {
            const range = spec.read(record);
            return spec.write(record, { ...range, [edge]: parsed });
        });
    }

    setPresent(field: CvFieldSpec<unknown>, isPresent: boolean): void {
        const spec = this.asRange(field);
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) => {
            const range = spec.read(record);
            // "Still going" and an end date are mutually exclusive facts.
            return spec.write(record, { ...range, isPresent, end: isPresent ? null : range.end });
        });
    }

    setListItem(field: CvFieldSpec<unknown>, index: number, value: string | number | null): void {
        const spec = this.asList(field);
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) => {
            const items = [...spec.read(record)];
            items[index] = String(value ?? '');
            return spec.write(record, items);
        });
    }

    addListItem(field: CvFieldSpec<unknown>): void {
        const spec = this.asList(field);
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) =>
            spec.write(record, [...spec.read(record), ''])
        );
    }

    removeListItem(field: CvFieldSpec<unknown>, index: number): void {
        const spec = this.asList(field);
        this.editor.setFieldValue(this.sectionId(), this.recordId(), (record) =>
            spec.write(
                record,
                spec.read(record).filter((_, position) => position !== index)
            )
        );
    }

    onFieldFocus(field: CvFieldSpec<unknown>): void {
        this.selection.select(
            { sectionId: this.sectionId(), recordId: this.recordId() ?? undefined, fieldId: field.id },
            false
        );
    }

    private focusField(fieldId: string): void {
        const wrapper = this.host.nativeElement.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(fieldId)}"]`);
        const control = wrapper?.querySelector<HTMLElement>('input, textarea, button');
        if (!wrapper || !control) {
            return;
        }
        wrapper.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        control.focus({ preventScroll: true });
    }
}

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
