import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ElvFieldComponent } from '@shared/components/elv-field';

import { WizardStepFrameComponent } from '../../components/wizard-step-frame/wizard-step-frame.component';
import type { CvBasicInfoDraft } from '../../models/cv-draft.model';
import { CvDraftStore } from '../../services/cv-draft.store';
import { CvWizardService } from '../../services/cv-wizard.service';

/** Anything larger is almost certainly a mistake, not a headshot. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * STEP 02 — basic info.
 *
 * The first floor where the user actually types, so it doubles as the template
 * every other form step copies:
 *
 *   1. a typed reactive form whose controls line up 1:1 with a draft slice
 *      (`CvBasicInfoDraft`);
 *   2. one write path — `valueChanges` patches the store, so every keystroke is
 *      saved and survives a refresh or a walk to another floor and back;
 *   3. no `required` anywhere. Everything is optional by product decision, so
 *      the only validator is a format check on the email, and even that never
 *      blocks Continue — it just shows a hint if what was typed is not an email.
 *
 * The photo is deliberately outside the form: a file is not a form value, it is
 * a data URL produced by a FileReader. It patches the same slice through its own
 * handler, which is why "no photo" is an explicit `null`, not an empty string.
 */
@Component({
    selector: 'app-basic-info',
    standalone: true,
    imports: [ReactiveFormsModule, ElvFieldComponent, WizardStepFrameComponent],
    templateUrl: './basic-info.component.html',
    styleUrl: './basic-info.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInfoComponent {
    protected readonly wizard = inject(CvWizardService);
    protected readonly step = this.wizard.activeStep;

    /** Data URL of the chosen photo, or null for "no photo". */
    protected readonly photo = signal<string | null>(null);
    /** Whether a file is being dragged over the dropzone. Drives the styling. */
    protected readonly dragging = signal(false);
    /** Set when a rejected file needs explaining (too big, not an image). */
    protected readonly photoError = signal<string>('');

    protected readonly hasPhoto = computed(() => this.photo() !== null);

    /**
     * One control per text field on the slice. `nonNullable` keeps them as
     * strings — a reset returns '' rather than null, so the draft shape holds.
     * Built in the constructor because it needs the injected FormBuilder.
     */
    protected readonly form;

    private readonly store = inject(CvDraftStore);
    private readonly fb = inject(FormBuilder);

    constructor() {
        this.form = this.fb.nonNullable.group({
            fullName: [''],
            headline: [''],
            email: ['', [Validators.email]],
            phone: [''],
            location: [''],
            website: [''],
            linkedIn: [''],
            summary: [''],
        });

        // Seed both the form and the photo from whatever is already saved, so
        // returning to this floor shows the user's own words, not a blank form.
        const saved = this.store.basicInfo();
        this.form.patchValue(saved, { emitEvent: false });
        this.photo.set(saved.photoDataUrl);

        // The single write path: every edit flows straight to the draft.
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
            this.store.patchSection('basicInfo', value as Partial<CvBasicInfoDraft>);
        });
    }

    // ── Photo ─────────────────────────────────────────────────────────
    protected onFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.ingest(input.files?.[0] ?? null);
        // Let the same file be re-picked after a remove.
        input.value = '';
    }

    protected onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(false);
        this.ingest(event.dataTransfer?.files?.[0] ?? null);
    }

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(true);
    }

    protected onDragLeave(): void {
        this.dragging.set(false);
    }

    protected removePhoto(): void {
        this.photo.set(null);
        this.photoError.set('');
        this.store.patchSection('basicInfo', { photoDataUrl: null });
    }

    private ingest(file: File | null): void {
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            this.photoError.set('That file is not an image. Try a JPG or PNG.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            this.photoError.set('That image is over 5 MB. Pick a smaller one.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            this.photo.set(dataUrl);
            this.photoError.set('');
            this.store.patchSection('basicInfo', { photoDataUrl: dataUrl });
        };
        reader.onerror = () => this.photoError.set('That image could not be read. Try another one.');
        reader.readAsDataURL(file);
    }
}
