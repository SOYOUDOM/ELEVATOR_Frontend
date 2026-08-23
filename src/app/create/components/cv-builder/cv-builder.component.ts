import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvEmptyStateComponent } from '@shared/components/elv-empty-state/elv-empty-state.component';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

import type { CvRecord, CvSectionId } from '@app/cv/models/cv-content.model';
import { CV_SECTIONS, type CvListSection, isListSection, sectionSpec } from '@app/cv/schema/cv-section-schema';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';

import { CvRecordFormComponent } from '../cv-record-form/cv-record-form.component';

interface BuilderRow {
    id: CvSectionId;
    label: string;
    icon: string;
    hint: string;
    isList: boolean;
    count: number;
    completion: number;
    addLabel: string;
    records: { id: string; title: string; subtitle: string }[];
}

/**
 * ELEVATOR — the builder panel.
 *
 * A section list that IS the navigation, and one form for whatever is selected.
 * It holds no copy of the CV and no second idea of what is selected: rows come
 * from the section registry, values from the editor store, and the open section
 * from the shared selection. Click a company name in the document and this
 * panel is already showing that record — not because it listened for an event,
 * but because it renders the same state the document does.
 */
@Component({
    selector: 'app-cv-builder',
    standalone: true,
    templateUrl: './cv-builder.component.html',
    styleUrl: './cv-builder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvProgressComponent, ElvEmptyStateComponent, CvRecordFormComponent],
    host: { class: 'cv-builder' },
})
export class CvBuilderComponent {
    private readonly editor = inject(CvEditorStore);
    readonly selection = inject(CvSelectionStore);

    readonly overall = this.editor.overallCompletion;

    readonly rows = computed<BuilderRow[]>(() => {
        const content = this.editor.content();
        const completion = this.editor.completion();
        if (!content) {
            return [];
        }

        return CV_SECTIONS.map((spec) => {
            const list = isListSection(spec) ? (spec as CvListSection<CvRecord>) : null;
            const records = list ? list.read(content) : [];
            const describe = (record: CvRecord) =>
                list
                    ? { id: record.id, title: list.titleOf(record), subtitle: list.subtitleOf(record) }
                    : { id: record.id, title: '', subtitle: '' };
            return {
                id: spec.id,
                label: spec.label,
                icon: spec.icon,
                hint: spec.hint,
                isList: !!list,
                count: records.length,
                completion: completion[spec.id],
                addLabel: list?.addLabel ?? '',
                records: records.map(describe),
            };
        });
    });

    /** The section whose form is open — the shared selection, with a sane default. */
    readonly openSection = computed<CvSectionId>(() => this.selection.sectionId() ?? 'personal');

    readonly openRow = computed(() => this.rows().find((row) => row.id === this.openSection()) ?? null);

    /**
     * Which record's form is showing. Falls back to the first one so opening a
     * populated section never lands on an empty panel.
     */
    readonly openRecordId = computed<string | null>(() => {
        const row = this.openRow();
        if (!row?.isList) {
            return null;
        }
        const selected = this.selection.recordId();
        if (selected && row.records.some((record) => record.id === selected)) {
            return selected;
        }
        return row.records[0]?.id ?? null;
    });

    toggleSection(id: CvSectionId): void {
        if (this.openSection() === id) {
            this.selection.clear();
            return;
        }
        this.selection.selectSection(id);
    }

    selectRecord(sectionId: CvSectionId, recordId: string): void {
        this.selection.select({ sectionId, recordId }, false);
    }

    addRecord(sectionId: CvSectionId): void {
        const recordId = this.editor.addRecord(sectionId);
        if (!recordId) {
            return;
        }
        // Straight into the first field of the record that was just created.
        const firstField = sectionSpec(sectionId).fields[0];
        this.selection.select({ sectionId, recordId, fieldId: firstField?.id });
    }

    removeRecord(sectionId: CvSectionId, recordId: string): void {
        this.editor.removeRecord(sectionId, recordId);
        if (this.selection.recordId() === recordId) {
            this.selection.selectSection(sectionId);
        }
    }

    moveRecord(sectionId: CvSectionId, recordId: string, delta: number): void {
        this.editor.moveRecord(sectionId, recordId, delta);
    }

    isOpen(id: CvSectionId): boolean {
        return this.openSection() === id;
    }
}
