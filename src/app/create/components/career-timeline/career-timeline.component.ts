import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

import { formatCvRange } from '@app/cv/models/cv-date';
import type { CvSectionId } from '@app/cv/models/cv-content.model';
import type { TimelineEntry } from '@app/cv/models/cv-timeline.model';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';
import { WORKSPACE_LIMITS, WorkspaceUiStore } from '@app/cv/state/workspace-ui.store';
import { sectionSpec } from '@app/cv/schema/cv-section-schema';

/**
 * ELEVATOR — the Career Timeline.
 *
 * Career time, not media time. There is no play button, no transport and no
 * frame counter — the horizontal axis is a person's working life, and the only
 * moving thing on it is TODAY.
 *
 * It is a third view of the same selection: a bar lights because the store says
 * that record is selected, and clicking one selects it for the builder and the
 * document at the same instant.
 *
 * Geometry is computed in cv-timeline.ts and read here as one already-laid-out
 * object. Nothing in the template does arithmetic, so a fifty-role CV costs one
 * layout pass per content change rather than one per bar per tick.
 *
 * Drag-to-edit is deliberately NOT here yet. monthAtFraction() is the inverse
 * the drag needs and it already exists and is tested; adding a pointer handler
 * on the bar is an additive change, not a rewrite. Shipping a half-working
 * drag would have been the worse trade.
 */
@Component({
    selector: 'app-career-timeline',
    standalone: true,
    templateUrl: './career-timeline.component.html',
    styleUrl: './career-timeline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent],
    host: { class: 'tl' },
})
export class CareerTimelineComponent {
    private readonly editor = inject(CvEditorStore);
    private readonly selection = inject(CvSelectionStore);
    readonly ui = inject(WorkspaceUiStore);

    readonly zoomLimits = WORKSPACE_LIMITS.timelineZoom;
    readonly layout = this.editor.timeline;

    readonly isEmpty = computed(() => (this.layout()?.rows ?? []).every((row) => row.bars.length === 0));

    /** Zoom widens the track inside a scroller; it never changes the geometry. */
    readonly trackWidth = computed(() => `${this.ui.timelineZoom()}%`);

    barLabel(entry: TimelineEntry): string {
        const range = formatCvRange(entry.range, 'short', this.editor.options()?.presentLabel ?? 'Present');
        return range ? `${entry.label} — ${range}` : `${entry.label} — no dates yet`;
    }

    rangeText(entry: TimelineEntry): string {
        return formatCvRange(entry.range, 'short', this.editor.options()?.presentLabel ?? 'Present');
    }

    isSelected(entry: TimelineEntry): boolean {
        return this.selection.isWithin({ sectionId: entry.sectionId, recordId: entry.recordId });
    }

    select(entry: TimelineEntry): void {
        this.selection.select({ sectionId: entry.sectionId, recordId: entry.recordId }, false);
    }

    /** Jumps straight to the dates field — the reason someone clicks a bar. */
    editDates(entry: TimelineEntry): void {
        this.selection.select({ sectionId: entry.sectionId, recordId: entry.recordId, fieldId: 'dates' });
    }

    add(sectionId: CvSectionId): void {
        const recordId = this.editor.addRecord(sectionId);
        if (recordId) {
            this.selection.select({ sectionId, recordId, fieldId: sectionSpec(sectionId).fields[0]?.id });
        }
    }

    addLabelFor(sectionId: CvSectionId): string {
        const spec = sectionSpec(sectionId);
        return spec.kind === 'list' ? spec.addLabel : 'Add';
    }
}
