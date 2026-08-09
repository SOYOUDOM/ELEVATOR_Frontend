import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ElvAiActionComponent } from '@shared/components/elv-ai-action';
import { ElvAvatarComponent } from '@shared/components/elv-avatar/elv-avatar.component';
import { ElvBeforeAfterComponent } from '@shared/components/elv-before-after';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent, type ElvChipTone } from '@shared/components/elv-chip/elv-chip.component';
import { ElvDropzoneComponent } from '@shared/components/elv-dropzone';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvRepeaterComponent, ElvRepeaterItemDirective } from '@shared/components/elv-repeater';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';

import { WizardFloorComponent } from '../../components/wizard-floor/wizard-floor.component';
import { type CvLink, cvId } from '../../models/cv-draft.model';
import { CvAiService } from '../../services/cv-ai.service';
import { CvDraftStore } from '../../services/cv-draft.store';

interface PhotoCheck {
    label: string;
    tone: ElvChipTone;
    icon: string;
}

/**
 * Floor 01 — identity.
 *
 * Left: the photo module. Right: the field stack, with the target job title
 * visually emphasised because it seeds every downstream AI call — if it is
 * blank, the summary, the bullets and the ATS scan all have nothing to aim at.
 *
 * The photo quality gate runs LOCALLY, on a canvas, before anything is
 * uploaded. Telling someone their photo is too dark after a round trip is
 * both slower and ruder than telling them immediately.
 */
@Component({
    selector: 'app-identity-page',
    standalone: true,
    imports: [
        FormsModule,
        WizardFloorComponent,
        ElvFieldComponent,
        ElvButtonComponent,
        ElvChipComponent,
        ElvAvatarComponent,
        ElvDropzoneComponent,
        ElvBeforeAfterComponent,
        ElvSkeletonComponent,
        ElvAiActionComponent,
        ElvRepeaterComponent,
        ElvRepeaterItemDirective,
    ],
    templateUrl: './identity.page.html',
    styleUrl: './identity.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-identity' },
})
export class IdentityPage {
    protected readonly store = inject(CvDraftStore);

    protected readonly identity = this.store.identity;

    protected readonly checks = signal<PhotoCheck[]>([]);
    protected readonly transforming = signal(false);
    protected readonly summaryBusy = signal(false);
    protected readonly transformError = signal('');

    protected readonly photo = computed(() => this.identity().photoDataUrl);
    protected readonly original = computed(() => this.identity().photoOriginalDataUrl);

    /** Both present and different → the before/after is meaningful. */
    protected readonly showCompare = computed(() => {
        const before = this.original();
        const after = this.photo();
        return !!before && !!after && before !== after;
    });

    protected readonly transformsLeft = this.store.photoTransformsLeft;
    protected readonly canTransform = computed(
        () => !!this.photo() && this.transformsLeft() > 0 && !this.transforming()
    );

    /** The one required field on this floor. */
    protected readonly continueDisabled = computed(() => !this.identity().targetJobTitle.trim());

    private readonly ai = inject(CvAiService);

    // ── Field binding ─────────────────────────────────────────────────
    // Written through the store so every keystroke autosaves and the SIGNAL
    // STRENGTH meter moves live. Editing a field also clears any import
    // uncertainty flag on it — the user looking at it and typing IS the review.
    protected set(field: keyof ReturnType<typeof this.identity>, value: string): void {
        this.store.patch('identity', { [field]: value } as never);
        this.store.clearUncertain(`identity.${String(field)}`);
    }

    protected uncertain(field: string): boolean {
        return this.store.isUncertain(`identity.${field}`);
    }

    // ── Links ─────────────────────────────────────────────────────────
    protected readonly newLink = (): CvLink => ({ id: cvId('lnk'), label: '', url: '' });

    protected setLinks(links: CvLink[]): void {
        this.store.patch('identity', { links });
    }

    protected patchLink(index: number, patch: Partial<CvLink>): void {
        const links = this.identity().links.map((l, i) => (i === index ? { ...l, ...patch } : l));
        this.store.patch('identity', { links });
    }

    // ── Photo ─────────────────────────────────────────────────────────
    protected onPhoto(files: File[]): void {
        const file = files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            this.store.patch('identity', { photoDataUrl: dataUrl, photoOriginalDataUrl: dataUrl });
            this.transformError.set('');
            void this.runQualityGate(dataUrl);
        };
        reader.onerror = () => this.transformError.set('That image could not be read. Try another one.');
        reader.readAsDataURL(file);
    }

    protected removePhoto(): void {
        this.store.patch('identity', { photoDataUrl: null, photoOriginalDataUrl: null });
        this.checks.set([]);
        this.transformError.set('');
    }

    protected transform(): void {
        const source = this.photo();
        if (!source || !this.canTransform()) {
            return;
        }
        if (!this.store.consumePhotoTransform()) {
            return;
        }

        this.transforming.set(true);
        this.transformError.set('');

        this.ai.transformPhoto(source).subscribe({
            next: (dataUrl) => {
                this.store.patch('identity', { photoDataUrl: dataUrl });
                this.transforming.set(false);
            },
            error: () => {
                this.transforming.set(false);
                this.transformError.set('The transform failed. Your original photo is untouched.');
            },
        });
    }

    // ── Summary AI ────────────────────────────────────────────────────
    protected summaryTask(mode: 'generate' | 'rewrite' | 'shorten' | 'grammar') {
        return () => this.ai.summary(mode, this.store.draft());
    }

    protected applySummary(text: string): void {
        this.store.patch('identity', { summary: text });
    }

    /**
     * Local quality gate.
     *
     * Draws the image to a small canvas and measures mean luminance plus a
     * rough centre-of-mass of contrast. It is not face detection — and the
     * chip says "looks centred", not "face detected", because claiming a
     * capability we do not have is worse than a vaguer honest label.
     */
    private async runQualityGate(dataUrl: string): Promise<void> {
        const result: PhotoCheck[] = [];

        try {
            const img = await loadImage(dataUrl);

            result.push(
                img.naturalWidth >= 500 && img.naturalHeight >= 500
                    ? { label: 'Resolution OK', tone: 'success', icon: 'pi pi-check' }
                    : { label: 'Low resolution', tone: 'warn', icon: 'pi pi-exclamation-triangle' }
            );

            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);

                let sum = 0;
                let weightX = 0;
                let weightY = 0;
                let weight = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                    sum += lum;

                    const px = (i / 4) % size;
                    const py = Math.floor(i / 4 / size);
                    // Bright regions carry the subject in a typical portrait.
                    const w = Math.max(0, lum - 60);
                    weight += w;
                    weightX += px * w;
                    weightY += py * w;
                }

                const mean = sum / (data.length / 4);
                result.push(
                    mean < 55
                        ? { label: 'Too dark', tone: 'warn', icon: 'pi pi-exclamation-triangle' }
                        : { label: 'Lighting OK', tone: 'success', icon: 'pi pi-check' }
                );

                if (weight > 0) {
                    const cx = weightX / weight / size;
                    const cy = weightY / weight / size;
                    const off = Math.hypot(cx - 0.5, cy - 0.45);
                    result.push(
                        off > 0.22
                            ? { label: 'Off centre', tone: 'warn', icon: 'pi pi-arrows-alt' }
                            : { label: 'Looks centred', tone: 'success', icon: 'pi pi-check' }
                    );
                }
            }
        } catch {
            result.push({ label: 'Could not check', tone: 'neutral', icon: 'pi pi-question-circle' });
        }

        this.checks.set(result);
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
