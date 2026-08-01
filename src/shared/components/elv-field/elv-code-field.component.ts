import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    model,
    numberAttribute,
    output,
    signal,
    viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

/**
 * ELEVATOR — verification code.
 *
 * Each cell is a full box with its own lighting stack, so the focus ring
 * lands per digit rather than around the group. The bound value is the
 * joined string; a single paste fills every cell, which is what people
 * actually do with a one-time code.
 */
@Component({
    selector: 'elv-code-field',
    standalone: true,
    templateUrl: './elv-code-field.component.html',
    styleUrl: './elv-code-field.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class]': 'hostClass()' },
})
export class ElvCodeFieldComponent implements ControlValueAccessor {
    readonly ngControl = inject(NgControl, { optional: true, self: true });

    readonly value = model('');
    readonly label = input('Verification code');
    readonly length = input(6, { transform: numberAttribute });
    /** Insert a visual gap after this many cells. 0 disables it. */
    readonly groupAfter = input(3, { transform: numberAttribute });
    readonly hint = input('');
    readonly error = input('');
    readonly disabled = input(false, { transform: booleanAttribute });

    readonly completed = output<string>();

    private readonly cells = viewChildren<ElementRef<HTMLInputElement>>('cell');
    private readonly cvaDisabled = signal(false);

    private onChange: (v: string) => void = () => {};
    private onTouched: () => void = () => {};

    readonly slots = computed(() => Array.from({ length: this.length() }, (_, i) => i));
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
    readonly hostClass = computed(() =>
        ['elv-code', this.error() ? 'is-error' : '', this.isDisabled() ? 'is-disabled' : ''].filter(Boolean).join(' ')
    );

    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    // ── ControlValueAccessor ──────────────────────────────────────────
    writeValue(v: string): void {
        this.value.set(v ?? '');
    }
    registerOnChange(fn: (v: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    charAt(i: number): string {
        return this.value()[i] ?? '';
    }

    // ── keyboard model ────────────────────────────────────────────────
    onCellInput(i: number, ev: Event): void {
        const el = ev.target as HTMLInputElement;
        const digit = el.value.replace(/\D/g, '').slice(-1);
        el.value = digit;
        this.writeAt(i, digit);
        if (digit) {
            this.cells()[i + 1]?.nativeElement.focus();
        }
    }

    onCellKeydown(i: number, ev: KeyboardEvent): void {
        const el = ev.target as HTMLInputElement;
        if (ev.key === 'Backspace' && !el.value && i > 0) {
            this.cells()[i - 1].nativeElement.focus();
            this.writeAt(i - 1, '');
        }
        if (ev.key === 'ArrowLeft') {
            this.cells()[i - 1]?.nativeElement.focus();
        }
        if (ev.key === 'ArrowRight') {
            this.cells()[i + 1]?.nativeElement.focus();
        }
    }

    onPaste(ev: ClipboardEvent): void {
        ev.preventDefault();
        const digits = (ev.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, this.length());
        this.commit(digits);
        this.cells()[Math.min(digits.length, this.length() - 1)]?.nativeElement.focus();
    }

    markTouched(): void {
        this.onTouched();
    }

    // ── value plumbing ────────────────────────────────────────────────
    /** Spaces act as placeholders for empty cells so indices stay stable. */
    private writeAt(i: number, ch: string): void {
        const arr = this.value().padEnd(this.length(), ' ').split('');
        arr[i] = ch || ' ';
        this.commit(arr.join('').trimEnd());
    }

    private commit(next: string): void {
        this.value.set(next);
        this.onChange(next);
        if (next.replace(/\s/g, '').length === this.length()) {
            this.completed.emit(next);
        }
    }
}
