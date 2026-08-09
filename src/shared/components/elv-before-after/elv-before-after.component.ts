import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    inject,
    input,
    model,
    numberAttribute,
    signal,
} from '@angular/core';

/**
 * ELEVATOR — the before/after slider.
 *
 * Two images stacked, the top one clipped to a draggable split. Built for the
 * photo-transform reveal but tied to nothing about photos.
 *
 * The accessibility decision worth stating: the handle is a real
 * `role="slider"` with arrow-key support, not a mouse-only affordance. A
 * comparison you can only operate by dragging is a comparison half the
 * audience cannot operate at all.
 *
 * Pointer Events (not mouse+touch pairs) plus `setPointerCapture` means the
 * drag survives the pointer leaving the element, which is the usual bug in
 * hand-rolled sliders.
 *
 * ```html
 * <elv-before-after
 *   [beforeSrc]="original()"
 *   [afterSrc]="generated()"
 *   beforeLabel="ORIGINAL"
 *   afterLabel="STUDIO"
 *   [(position)]="split" />
 * ```
 */
@Component({
    selector: 'elv-before-after',
    standalone: true,
    templateUrl: './elv-before-after.component.html',
    styleUrl: './elv-before-after.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'elv-before-after',
        '[class.is-dragging]': 'dragging()',
        '[style.--elv-ba-pos.%]': 'position()',
    },
})
export class ElvBeforeAfterComponent {
    readonly beforeSrc = input.required<string>();
    readonly afterSrc = input.required<string>();

    readonly beforeLabel = input('Before');
    readonly afterLabel = input('After');

    readonly beforeAlt = input('Before');
    readonly afterAlt = input('After');

    /** Split position, 0–100. Two-way bindable. */
    readonly position = model(50);

    /** Arrow-key increment, in percent. */
    readonly step = input(2, { transform: numberAttribute });

    readonly showLabels = input(true, { transform: booleanAttribute });

    /** CSS aspect-ratio for the frame, e.g. `'3 / 4'`. */
    readonly ratio = input('1 / 1');

    readonly ariaLabel = input('Compare before and after');

    protected readonly dragging = signal(false);

    protected readonly rounded = computed(() => Math.round(this.position()));

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    protected onPointerDown(event: PointerEvent): void {
        const handle = event.currentTarget as HTMLElement;
        // Capture keeps the drag alive once the pointer leaves the handle —
        // without it the slider sticks the moment you move faster than it.
        handle.setPointerCapture(event.pointerId);
        this.dragging.set(true);
        this.applyFromPointer(event);
    }

    protected onPointerMove(event: PointerEvent): void {
        if (!this.dragging()) {
            return;
        }
        event.preventDefault();
        this.applyFromPointer(event);
    }

    protected onPointerUp(event: PointerEvent): void {
        const handle = event.currentTarget as HTMLElement;
        if (handle.hasPointerCapture(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
        }
        this.dragging.set(false);
    }

    protected onKeydown(event: KeyboardEvent): void {
        const step = this.step();
        let next: number | null = null;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                next = this.position() - step;
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                next = this.position() + step;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = 100;
                break;
            case 'PageDown':
                next = this.position() - step * 5;
                break;
            case 'PageUp':
                next = this.position() + step * 5;
                break;
            default:
                return;
        }

        event.preventDefault();
        this.position.set(clamp(next));
    }

    /** Click anywhere on the frame jumps the split there. */
    protected onFramePointerDown(event: PointerEvent): void {
        if ((event.target as HTMLElement).closest('.elv-before-after__handle')) {
            return;
        }
        this.applyFromPointer(event);
    }

    private applyFromPointer(event: PointerEvent): void {
        const frame = this.host.nativeElement.querySelector<HTMLElement>('.elv-before-after__frame');
        if (!frame) {
            return;
        }
        const box = frame.getBoundingClientRect();
        if (box.width === 0) {
            return;
        }
        this.position.set(clamp(((event.clientX - box.left) / box.width) * 100));
    }
}

function clamp(value: number): number {
    return Math.min(100, Math.max(0, value));
}
