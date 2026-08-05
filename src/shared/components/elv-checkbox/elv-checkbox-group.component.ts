import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    model,
    numberAttribute,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { ElvCheckboxComponent } from './elv-checkbox.component';
import { ELV_CHECKBOX_DEFAULTS } from './elv-checkbox.config';
import type {
    ElvCheckboxCorner,
    ElvCheckboxLabelPosition,
    ElvCheckboxOption,
    ElvCheckboxOrientation,
    ElvCheckboxSize,
    ElvCheckboxSkin,
    ElvCheckboxTone,
} from './elv-checkbox.types';

let seq = 0;

/**
 * ELEVATOR — a set of checkboxes bound to one string[].
 *
 * Uses <fieldset> + <legend> rather than role="group": the legend is the one
 * labelling mechanism screen readers announce when focus ENTERS the group, so
 * "Skills — Angular, checkbox, 1 of 4" comes out right without extra wiring.
 *
 * Visual props are forwarded to every row, so the group is styled once. Rows
 * are plain elv-checkbox instances with no NgControl of their own; the group
 * owns the CVA.
 */
@Component({
    selector: 'elv-checkbox-group',
    standalone: true,
    imports: [ElvCheckboxComponent],
    templateUrl: './elv-checkbox-group.component.html',
    styleUrl: './elv-checkbox-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-orientation]': 'orientation()',
    },
})
export class ElvCheckboxGroupComponent implements ControlValueAccessor {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_CHECKBOX_DEFAULTS);
    private readonly destroyRef = inject(DestroyRef);
    readonly ngControl = inject(NgControl, { optional: true, self: true });

    private readonly uid = `elv-cbxg-${++seq}`;
    readonly legendId = `${this.uid}-legend`;
    readonly msgId = `${this.uid}-msg`;

    // ── value ─────────────────────────────────────────────────────────
    /** Two-way bindable AND the CVA value: [(value)]="skills". */
    readonly value = model<string[]>([]);

    // ── content ───────────────────────────────────────────────────────
    readonly options = input<readonly ElvCheckboxOption[]>([]);
    /** Group legend. */
    readonly label = input('');
    readonly hint = input('');
    readonly error = input('');

    // ── behaviour ─────────────────────────────────────────────────────
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    readonly required = input(false, { transform: booleanAttribute });
    // Two type args are required whenever a transform is present.
    readonly min = input<number | null, unknown>(null, { transform: nullNum });
    readonly max = input<number | null, unknown>(null, { transform: nullNum });

    // ── visual (forwarded to every row) ───────────────────────────────
    readonly orientation = input<ElvCheckboxOrientation>('vertical');
    readonly size = input<ElvCheckboxSize | null>(null);
    readonly skin = input<ElvCheckboxSkin | null>(null);
    readonly corner = input<ElvCheckboxCorner | null>(null);
    readonly tone = input<ElvCheckboxTone | null>(null);
    readonly labelPosition = input<ElvCheckboxLabelPosition | null>(null);

    // ── outputs ───────────────────────────────────────────────────────
    readonly change = output<string[]>();

    // ── internal state ────────────────────────────────────────────────
    private readonly cvaDisabled = signal(false);
    private readonly touched = signal(false);
    private readonly tick = signal(0);

    private onChange: (v: string[]) => void = () => {};
    private onTouched: () => void = () => {};

    // ── derived state ─────────────────────────────────────────────────
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
    readonly count = computed(() => this.value().length);

    /** O(1) membership for the row bindings — options lists get long. */
    private readonly selected = computed(() => new Set(this.value()));

    readonly atMax = computed(() => {
        const max = this.max();
        return max != null && this.count() >= max;
    });

    private readonly validationVisible = computed(() => {
        this.tick();
        if (this.cfg.validateOn === 'always') {
            return true;
        }
        const c = this.ngControl?.control;
        return c ? c.touched : this.touched();
    });

    /** min/max as a sentence. Empty when the group is satisfied. */
    private readonly rangeError = computed(() => {
        const min = this.min();
        const max = this.max();
        const n = this.count();
        if (min != null && n < min) {
            return `Select at least ${min}.`;
        }
        if (max != null && n > max) {
            return `Select no more than ${max}.`;
        }
        if (this.required() && n === 0) {
            return 'Select at least one option.';
        }
        return '';
    });

    readonly invalid = computed(() => {
        this.tick();
        if (this.error()) {
            return true;
        }
        const c = this.ngControl?.control;
        if (c && c.invalid && this.validationVisible()) {
            return true;
        }
        return !!this.rangeError() && this.validationVisible();
    });

    /** Explicit error wins, then the range sentence, then the hint. */
    readonly message = computed(() => {
        if (this.error()) {
            return this.error();
        }
        if (this.rangeError() && this.validationVisible()) {
            return this.rangeError();
        }
        return this.hint();
    });

    readonly showAsError = computed(() => !!this.error() || (!!this.rangeError() && this.validationVisible()));

    readonly hostClass = computed(() =>
        ['elv-checkbox-group', this.isDisabled() ? 'is-disabled' : '', this.invalid() ? 'is-error' : '']
            .filter(Boolean)
            .join(' ')
    );

    // ── construction ──────────────────────────────────────────────────
    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
        queueMicrotask(() => {
            this.ngControl?.control?.events
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.tick.update((n) => n + 1));
        });
    }

    // ── ControlValueAccessor ──────────────────────────────────────────
    writeValue(v: unknown): void {
        this.value.set(Array.isArray(v) ? (v as string[]).slice() : []);
    }
    registerOnChange(fn: (v: string[]) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    // ── template helpers ──────────────────────────────────────────────
    isSelected(v: string): boolean {
        return this.selected().has(v);
    }

    /**
     * A row is disabled when the group is, when the option says so, or when
     * the ceiling is reached and this row is not one of the ones holding it
     * up — otherwise `max` would be a rule you can only discover by breaking.
     */
    isRowDisabled(opt: ElvCheckboxOption): boolean {
        if (this.isDisabled() || opt.disabled) {
            return true;
        }
        return this.atMax() && !this.isSelected(opt.value);
    }

    onToggle(optValue: string, checked: boolean): void {
        if (this.readonly()) {
            return;
        }
        // Belt and braces against a stray DOM Event arriving here instead of
        // the output's boolean — a truthy object would read as "checked".
        const on = checked === true;
        // Rebuild in `options` order rather than click order, so the emitted
        // array is stable and comparable between sessions.
        const next = new Set(this.value());
        if (on) {
            next.add(optValue);
        } else {
            next.delete(optValue);
        }
        const ordered = this.options()
            .map((o) => o.value)
            .filter((v) => next.has(v));
        // Anything already in the value but no longer in `options` is kept, so
        // an async options list cannot silently drop a stored selection.
        for (const v of this.value()) {
            if (next.has(v) && !ordered.includes(v)) {
                ordered.push(v);
            }
        }

        this.touched.set(true);
        this.value.set(ordered);
        this.onChange(ordered);
        this.onTouched();
        this.change.emit(ordered);
    }
}

function nullNum(v: unknown): number | null {
    return v == null || v === '' ? null : numberAttribute(v);
}
