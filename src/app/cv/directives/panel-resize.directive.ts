import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * ELEVATOR — drag a panel edge.
 *
 * Pointer events rather than mouse events, so a trackpad, a pen and a touch
 * drag all work from one code path, and pointer capture keeps the drag alive
 * when the cursor outruns the 6px handle.
 *
 * Emits deltas, not widths: the store owns the clamping, so no two callers can
 * disagree about the minimum size. Keyboard is a first-class path here — a
 * resize handle nobody can reach with a keyboard is a resize handle half the
 * users do not have.
 */
@Directive({
    selector: '[elvPanelResize]',
    standalone: true,
    host: {
        class: 'elv-resizer',
        role: 'separator',
        tabindex: '0',
        '[attr.aria-orientation]': "axis() === 'x' ? 'vertical' : 'horizontal'",
        '[attr.aria-label]': 'resizeLabel()',
        '(pointerdown)': 'onPointerDown($event)',
        '(keydown)': 'onKeydown($event)',
    },
})
export class PanelResizeDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly axis = input<'x' | 'y'>('x', { alias: 'elvPanelResize' });
    /** +1 when dragging right/down grows the panel, -1 when it shrinks it. */
    readonly direction = input<1 | -1>(1, { alias: 'elvPanelResizeDirection' });
    readonly resizeLabel = input('Resize panel', { alias: 'elvPanelResizeLabel' });
    readonly keyStep = input(24, { alias: 'elvPanelResizeStep' });

    readonly resized = output<number>();

    private origin = 0;
    private activePointer: number | null = null;

    constructor() {
        this.destroyRef.onDestroy(() => this.release());
    }

    onPointerDown(event: PointerEvent): void {
        event.preventDefault();
        this.origin = this.axis() === 'x' ? event.clientX : event.clientY;
        this.activePointer = event.pointerId;
        this.host.nativeElement.setPointerCapture(event.pointerId);
        this.host.nativeElement.addEventListener('pointermove', this.onPointerMove);
        this.host.nativeElement.addEventListener('pointerup', this.onPointerUp);
        this.host.nativeElement.classList.add('is-dragging');
    }

    onKeydown(event: KeyboardEvent): void {
        const horizontal = this.axis() === 'x';
        const decrease = horizontal ? 'ArrowLeft' : 'ArrowUp';
        const increase = horizontal ? 'ArrowRight' : 'ArrowDown';

        if (event.key !== decrease && event.key !== increase) {
            return;
        }
        event.preventDefault();
        const step = event.key === increase ? this.keyStep() : -this.keyStep();
        this.resized.emit(step * this.direction());
    }

    private readonly onPointerMove = (event: PointerEvent): void => {
        if (this.activePointer !== event.pointerId) {
            return;
        }
        const position = this.axis() === 'x' ? event.clientX : event.clientY;
        const delta = position - this.origin;
        if (delta === 0) {
            return;
        }
        this.origin = position;
        this.resized.emit(delta * this.direction());
    };

    private readonly onPointerUp = (): void => this.release();

    private release(): void {
        const element = this.host.nativeElement;
        if (this.activePointer !== null && element.hasPointerCapture(this.activePointer)) {
            element.releasePointerCapture(this.activePointer);
        }
        this.activePointer = null;
        element.removeEventListener('pointermove', this.onPointerMove);
        element.removeEventListener('pointerup', this.onPointerUp);
        element.classList.remove('is-dragging');
    }
}
