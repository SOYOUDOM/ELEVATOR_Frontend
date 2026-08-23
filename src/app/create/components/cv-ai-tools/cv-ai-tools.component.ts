import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';

import { CvAiApiService } from '@app/cv/api/cv-ai-api.service';
import type { CvAiRequest, CvAiTone } from '@app/cv/api/cv-api.contracts';
import { toApiError } from '@app/cv/api/api-error';
import type { CvTextFieldSpec } from '@app/cv/schema/cv-field.types';
import { isListSection, sectionSpec } from '@app/cv/schema/cv-section-schema';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';

/**
 * ELEVATOR — AI writing help.
 *
 * Works on whatever text field is selected, which is why it needs no field
 * picker of its own: the shared selection already knows.
 *
 * Nothing is applied automatically. The service returns candidates, the user
 * reads them and presses Use — an AI suggestion that edited the document on
 * arrival would be a different, worse product.
 *
 * The mock backend labels its output `[mock-writer]` and says so on screen. A
 * fake that looked like a real model is exactly the thing that ships by
 * accident.
 */
@Component({
    selector: 'app-cv-ai-tools',
    standalone: true,
    templateUrl: './cv-ai-tools.component.html',
    styleUrl: './cv-ai-tools.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvAlertComponent, ElvSkeletonComponent],
    host: { class: 'ai' },
})
export class CvAiToolsComponent {
    private readonly api = inject(CvAiApiService);
    private readonly editor = inject(CvEditorStore);
    private readonly selection = inject(CvSelectionStore);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly variants = signal<string[]>([]);
    readonly model = signal<string | null>(null);
    readonly tone = signal<CvAiTone>('impactful');

    readonly tones: CvAiTone[] = ['concise', 'impactful', 'formal'];

    /** The selected field, but only if it is text the model could write. */
    readonly focus = computed(() => {
        const target = this.selection.target();
        const content = this.editor.content();
        if (!target?.fieldId || !content) {
            return null;
        }

        const spec = sectionSpec(target.sectionId);
        const field = spec.fields.find((candidate) => candidate.id === target.fieldId);
        if (!field || (field.control !== 'text' && field.control !== 'textarea')) {
            return null;
        }

        const record = isListSection(spec)
            ? spec.read(content).find((entry) => entry.id === target.recordId)
            : spec.read(content);
        if (!record) {
            return null;
        }

        return {
            sectionLabel: spec.label,
            fieldLabel: field.label,
            value: (field as CvTextFieldSpec<unknown>).read(record),
            target,
        };
    });

    setTone(tone: CvAiTone): void {
        this.tone.set(tone);
    }

    write(): void {
        this.run('write');
    }

    improve(): void {
        this.run('improve');
    }

    /** The only place a variant reaches the document, and only on a click. */
    apply(variant: string): void {
        const focus = this.focus();
        if (!focus) {
            return;
        }
        const spec = sectionSpec(focus.target.sectionId);
        const field = spec.fields.find((candidate) => candidate.id === focus.target.fieldId) as
            | CvTextFieldSpec<unknown>
            | undefined;
        if (!field) {
            return;
        }
        this.editor.setFieldValue(focus.target.sectionId, focus.target.recordId ?? null, (record) =>
            field.write(record, variant)
        );
        this.variants.set([]);
    }

    dismiss(): void {
        this.variants.set([]);
        this.error.set(null);
    }

    private run(mode: 'write' | 'improve'): void {
        const focus = this.focus();
        const cv = this.editor.document();
        if (!focus || !cv) {
            return;
        }

        const request: CvAiRequest = {
            cvId: cv.id,
            sectionId: focus.target.sectionId,
            recordId: focus.target.recordId,
            fieldId: focus.target.fieldId,
            currentContent: focus.value,
            tone: this.tone(),
        };

        this.loading.set(true);
        this.error.set(null);
        this.variants.set([]);

        const call = mode === 'write' ? this.api.write(request) : this.api.improve(request);
        call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response) => {
                this.variants.set(response.variants);
                this.model.set(response.model);
                this.loading.set(false);
            },
            error: (failure) => {
                this.error.set(toApiError(failure).message);
                this.loading.set(false);
            },
        });
    }
}
