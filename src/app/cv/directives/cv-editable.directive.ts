import { Directive, ElementRef, computed, inject, input } from '@angular/core';

import type { CvSectionId } from '../models/cv-content.model';
import type { CvEditTarget } from '../models/cv-selection.model';
import { CvSelectionStore } from '../state/cv-selection.store';

/**
 * ELEVATOR — click a CV to edit it.
 *
 * The preview is not a picture of the document, it IS the document's controls.
 * A node marked with this directive declares WHICH PART OF THE MODEL it stands
 * for — section, record, field — and clicking it selects exactly that.
 *
 * Nothing here reads text. There is no `if (el.innerText === 'Wing Bank')`
 * anywhere in this feature: the identity travels as data, so renaming a company
 * cannot break the wiring, and two roles at the same employer stay distinct.
 *
 * Interactivity is opt-out for a reason. Field nodes are real buttons —
 * focusable, Enter/Space activated, labelled. Record WRAPPERS pass
 * [cvEditableInteractive]="false" so the document never nests a button inside a
 * button; they still carry the data attributes and light up when the selection
 * lands inside them.
 *
 * Outside the editor (print, export, a read-only preview) there is no
 * CvSelectionStore to inject, the directive goes inert, and the DOM it leaves
 * behind is plain semantic markup.
 */
@Directive({
    selector: '[cvEditable]',
    standalone: true,
    host: {
        class: 'cv-editable',
        '[class.cv-editable--live]': 'live()',
        '[class.is-selected]': 'selected()',
        '[class.is-active]': 'active()',
        '[class.is-hovered]': 'hovered()',
        '[attr.data-cv-section]': 'sectionId()',
        '[attr.data-cv-record]': 'recordId() || null',
        '[attr.data-cv-field]': 'fieldId() || null',
        '[attr.role]': "live() ? 'button' : null",
        '[attr.tabindex]': 'live() ? 0 : null',
        '[attr.aria-label]': 'ariaLabel()',
        '(click)': 'activate($event)',
        '(keydown)': 'onKeydown($event)',
        '(mouseenter)': 'onEnter()',
        '(mouseleave)': 'onLeave()',
        '(focus)': 'onEnter()',
        '(blur)': 'onLeave()',
    },
})
export class CvEditableDirective {
    private readonly selection = inject(CvSelectionStore, { optional: true });
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly sectionId = input.required<CvSectionId>({ alias: 'cvEditable' });
    readonly recordId = input<string | undefined>(undefined, { alias: 'cvRecord' });
    readonly fieldId = input<string | undefined>(undefined, { alias: 'cvField' });
    /** Spoken name for the control — "Edit job title". */
    readonly editLabel = input<string>('', { alias: 'cvEditableLabel' });
    readonly interactive = input(true, { alias: 'cvEditableInteractive' });

    readonly target = computed<CvEditTarget>(() => ({
        sectionId: this.sectionId(),
        recordId: this.recordId(),
        fieldId: this.fieldId(),
    }));

    /** Editable only when a selection store exists AND this node opted in. */
    readonly live = computed(() => !!this.selection && this.interactive());

    readonly selected = computed(() => !!this.selection?.isSelected(this.target()));
    /** The selection is inside me — how a record lights up when one of its fields is picked. */
    readonly active = computed(() => !!this.selection?.isWithin(this.target()));
    readonly hovered = computed(() => !!this.selection?.isHoveredWithin(this.target()));

    readonly ariaLabel = computed(() => {
        if (!this.live()) {
            return null;
        }
        return this.editLabel() || `Edit ${this.fieldId() ?? this.sectionId()}`;
    });

    activate(event: Event): void {
        const selection = this.selection;
        if (!selection || !this.live()) {
            return;
        }
        // A field sits inside a record wrapper that may also be editable —
        // the innermost declaration is the specific one, so it wins.
        event.stopPropagation();
        selection.select(this.target());
    }

    onKeydown(event: KeyboardEvent): void {
        if (!this.live() || (event.key !== 'Enter' && event.key !== ' ')) {
            return;
        }
        event.preventDefault();
        this.activate(event);
    }

    onEnter(): void {
        this.selection?.setHovered(this.target());
    }

    onLeave(): void {
        if (this.selection?.isHoveredWithin(this.target())) {
            this.selection.setHovered(null);
        }
    }

    /** Used by the preview to scroll a selected record into view. */
    get element(): HTMLElement {
        return this.host.nativeElement;
    }
}
