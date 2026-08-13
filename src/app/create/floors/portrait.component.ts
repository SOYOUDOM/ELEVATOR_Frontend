import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { PhotoOps } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

interface OpSpec {
    key: keyof PhotoOps;
    title: string;
    desc: string;
}

/**
 * FLOOR 02 · portrait.
 *
 * Two constraints shaped this floor and both are visible in the UI:
 *
 *   1. NAMED operations, never one magic "enhance". Narrow edits produce
 *      better results and a visitor trusts what they can name.
 *   2. The edits touch background, lighting and framing — never the face.
 *      Identity-preserving models are documented to lighten skin and drift
 *      features toward a Western average; for a product built in Cambodia
 *      that is a launch blocker, so the original is always one drag away and
 *      both versions are shown at full size.
 *
 * The rendered result is echoed back by the mock, so the after side applies a
 * browser-side approximation of the edit. The real render is server-side.
 */
@Component({
    selector: 'app-create-portrait',
    standalone: true,
    templateUrl: './portrait.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvButtonComponent],
})
export class PortraitComponent {
    readonly store = inject(CvDraftStore);

    readonly busy = signal(false);
    readonly split = signal(50);
    readonly photo = this.store.photo;
    readonly region = this.store.region;
    readonly rendered = computed(() => !!this.photo().renderedSrc);
    readonly anyOp = computed(() => Object.values(this.photo().ops).some(Boolean));
    readonly cost = computed(() => (this.photo().renders * 0.02).toFixed(2));
    readonly freeLeft = computed(() => Math.max(0, 3 - this.photo().renders));

    readonly ops: readonly OpSpec[] = [
        { key: 'bg', title: 'Clean background', desc: 'Replace whatever is behind you with a plain studio backdrop' },
        { key: 'light', title: 'Even the lighting', desc: 'Lift shadows and flatten harsh window light' },
        { key: 'crop', title: 'Straighten and crop', desc: 'Re-frame to a standard headshot, eyes on the upper third' },
        { key: 'colour', title: 'Neutral colour', desc: 'Remove the colour cast from indoor lighting' },
    ];

    /** Browser-side approximation of the server render, for the after side. */
    readonly afterFilter = computed(() => {
        if (!this.rendered()) {
            return 'none';
        }
        const o = this.photo().ops;
        return (
            [
                o.light ? 'brightness(1.07) contrast(1.09)' : '',
                o.colour ? 'saturate(.92) hue-rotate(-4deg)' : '',
                o.bg ? 'contrast(1.03)' : '',
            ]
                .filter(Boolean)
                .join(' ') || 'none'
        );
    });

    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);

    // Private fields sit below the public surface — the lint config
    // orders members that way, and none of these is read at field-init time.
    private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');
    private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
    private dragging = false;

    pick(): void {
        this.fileInput()?.nativeElement.click();
    }

    onFile(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => this.store.setPhotoSrc(String(reader.result));
        reader.readAsDataURL(file);
    }

    toggleOp(key: keyof PhotoOps): void {
        this.store.toggleOp(key);
    }
    toggleInclude(): void {
        this.store.togglePhotoInclude();
    }
    removePhoto(): void {
        this.store.clearPhoto();
    }

    enhance(): void {
        const p = this.photo();
        if (!p.src || !this.anyOp()) {
            return;
        }
        this.busy.set(true);
        this.api.enhancePhoto(p.src, p.ops).subscribe({
            next: (res) => {
                this.store.applyRender(res.url, res.renders);
                this.busy.set(false);
            },
            error: () => this.busy.set(false),
        });
    }

    /* ── Before / after divider ───────────────────────────────── */
    startDrag(event: PointerEvent): void {
        this.dragging = true;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
    }
    onDrag(event: PointerEvent): void {
        if (!this.dragging) {
            return;
        }
        const box = this.frame()?.nativeElement.getBoundingClientRect();
        if (!box) {
            return;
        }
        this.setSplit(((event.clientX - box.left) / box.width) * 100);
    }
    endDrag(): void {
        this.dragging = false;
    }
    nudge(event: KeyboardEvent): void {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }
        event.preventDefault();
        this.setSplit(this.split() + (event.key === 'ArrowRight' ? 4 : -4));
    }
    private setSplit(value: number): void {
        this.split.set(Math.max(0, Math.min(100, value)));
    }
}
