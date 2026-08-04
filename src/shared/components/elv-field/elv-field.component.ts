import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    numberAttribute,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { ELV_ERROR_RESOLVER, ELV_FIELD_DEFAULTS } from './elv-field.config';
import { ELV_FIELD_PRESETS, type ElvFieldPresetDef, type ElvPreset } from './elv-field.presets';
import type {
    ElvCorner,
    ElvDensity,
    ElvFieldType,
    ElvLabelMode,
    ElvStatus,
    ElvValidateOn,
    ElvValue,
} from './elv-field.types';

let seq = 0;

/**
 * ELEVATOR — the field.
 *
 * Lighting is five layers sharing ONE box-shadow declaration in the
 * stylesheet, driven by --elv-tone. This class never touches appearance: it
 * resolves state, emits it as classes plus data attributes, and gets out of
 * the way.
 *
 * Implements ControlValueAccessor by self-injecting NgControl, so it can read
 * touched/dirty/pending for the visuals — something an NG_VALUE_ACCESSOR
 * provider cannot do without a circular dependency.
 */
@Component({
    selector: 'elv-field',
    standalone: true,
    templateUrl: './elv-field.component.html',
    styleUrl: './elv-field.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-density]': 'density()',
        '[attr.data-corner]': 'corner()',
        '[attr.data-status]': 'status()',
        '[attr.data-label-mode]': 'labelMode()',
        '[style.--elv-accent]': 'accent()',
        '[style.width]': 'widthVar()',
        '[style.maxWidth]': 'maxWidthVar()',
        '[style.--elv-h]': 'heightVar()',
    },
})
export class ElvFieldComponent implements ControlValueAccessor {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_FIELD_DEFAULTS);
    private readonly resolveError = inject(ELV_ERROR_RESOLVER);
    private readonly presetMap = inject(ELV_FIELD_PRESETS);
    private readonly destroyRef = inject(DestroyRef);
    readonly ngControl = inject(NgControl, { optional: true, self: true });

    // ── identity (stable ids for label / aria-describedby wiring) ─────
    private readonly uid = `elv-${++seq}`;
    readonly inputId = `${this.uid}-input`;
    readonly labelId = `${this.uid}-label`;
    readonly msgId = `${this.uid}-msg`;
    readonly countId = `${this.uid}-count`;

    // ── preset ────────────────────────────────────────────────────────
    /**
     * Bundle of defaults for one kind of field ('email', 'password', …).
     * Everything a preset sets is still overridable by writing the property
     * explicitly — resolution is: input → preset → DI default → built-in.
     */
    readonly preset = input<ElvPreset | null>(null);

    /** Empty object when no preset, so every `p().x` read below is safe. */
    private readonly p = computed<ElvFieldPresetDef>(() => {
        const key = this.preset();
        return (key && this.presetMap[key]) || {};
    });

    // ── value ─────────────────────────────────────────────────────────
    /** Two-way bindable for non-Forms usage: [(value)]="query". */
    readonly value = model<ElvValue>('');

    // ── content ───────────────────────────────────────────────────────
    readonly labelIn = input<string | null>(null, { alias: 'label' });
    readonly placeholderIn = input<string | null>(null, { alias: 'placeholder' });
    readonly hintIn = input<string | null>(null, { alias: 'hint' });
    /** Leading PrimeIcon name WITHOUT the `pi ` prefix, e.g. 'pi-envelope'. */
    readonly iconIn = input<string | null>(null, { alias: 'icon' });
    readonly prefixIn = input<string | null>(null, { alias: 'prefix' });
    readonly prefixIconIn = input<string | null>(null, { alias: 'prefixIcon' });
    readonly suffixIn = input<string | null>(null, { alias: 'suffix' });

    readonly label = computed(() => this.labelIn() ?? this.p().label ?? '');
    readonly placeholder = computed(() => this.placeholderIn() ?? this.p().placeholder ?? '');
    readonly hint = computed(() => this.hintIn() ?? this.p().hint ?? '');
    readonly icon = computed(() => this.iconIn() ?? this.p().icon ?? '');
    readonly prefix = computed(() => this.prefixIn() ?? this.p().prefix ?? '');
    readonly prefixIcon = computed(() => this.prefixIconIn() ?? this.p().prefixIcon ?? '');
    readonly suffix = computed(() => this.suffixIn() ?? this.p().suffix ?? '');
    readonly actionLabel = input('');
    readonly kbdIn = input<readonly string[] | null>(null, { alias: 'kbd' });
    readonly kbd = computed(() => this.kbdIn() ?? this.p().kbd ?? null);

    /** Manual overrides — bypass the control's own validity entirely. */
    readonly error = input('');
    readonly warning = input('');
    readonly success = input('');

    // ── native passthrough ────────────────────────────────────────────
    readonly typeIn = input<ElvFieldType | null>(null, { alias: 'type' });
    readonly name = input<string | null>(null);
    readonly autocompleteIn = input<string | null>(null, { alias: 'autocomplete' });
    readonly inputmodeIn = input<string | null>(null, { alias: 'inputmode' });

    readonly type = computed(() => this.typeIn() ?? this.p().type ?? 'text');
    readonly autocomplete = computed(() => this.autocompleteIn() ?? this.p().autocomplete ?? null);
    readonly inputmode = computed(() => this.inputmodeIn() ?? this.p().inputmode ?? null);
    // Two type args are required whenever a transform is present — the
    // single-arg form resolves to the without-transform overloads.
    readonly maxlengthIn = input<number | null, unknown>(null, { transform: nullNum, alias: 'maxlength' });
    readonly maxlength = computed(() => this.maxlengthIn() ?? this.p().maxlength ?? null);
    readonly minlength = input<number | null, unknown>(null, { transform: nullNum });
    readonly min = input<string | number | null>(null);
    readonly max = input<string | number | null>(null);
    readonly step = input<string | number | null>(null);
    readonly rowsIn = input<number | null, unknown>(null, { transform: nullNum, alias: 'rows' });
    readonly rows = computed(() => this.rowsIn() ?? this.p().rows ?? 3);

    // ── behaviour ─────────────────────────────────────────────────────
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    readonly required = input(false, { transform: booleanAttribute });
    readonly optional = input(false, { transform: booleanAttribute });
    readonly autofocus = input(false, { transform: booleanAttribute });
    readonly clearableIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'clearable' });
    readonly revealableIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'revealable' });
    readonly copyableIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'copyable' });
    readonly loading = input(false, { transform: booleanAttribute });
    readonly multilineIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'multiline' });
    readonly autoGrow = input(true, { transform: booleanAttribute });
    readonly counterIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'counter' });
    readonly monoIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'mono' });
    readonly numericIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'numeric' });

    readonly clearable = computed(() => this.clearableIn() ?? this.p().clearable ?? false);
    readonly revealable = computed(() => this.revealableIn() ?? this.p().revealable ?? false);
    readonly copyable = computed(() => this.copyableIn() ?? this.p().copyable ?? false);
    readonly multiline = computed(() => this.multilineIn() ?? this.p().multiline ?? false);
    readonly counter = computed(() => this.counterIn() ?? this.p().counter ?? false);
    readonly mono = computed(() => this.monoIn() ?? this.p().mono ?? false);
    readonly numeric = computed(() => this.numericIn() ?? this.p().numeric ?? false);

    // ── visual (null ⇒ inherit the DI default) ────────────────────────
    readonly densityIn = input<ElvDensity | null>(null, { alias: 'density' });
    readonly cornerIn = input<ElvCorner | null>(null, { alias: 'corner' });
    readonly labelModeIn = input<ElvLabelMode | null>(null, { alias: 'labelMode' });
    readonly validateOnIn = input<ElvValidateOn | null>(null, { alias: 'validateOn' });
    readonly showSuccessIn = input<boolean | null>(null, { alias: 'showSuccess' });
    readonly shakeIn = input<boolean | null>(null, { alias: 'shake' });

    /** Per-field accent override. Any CSS colour. */
    readonly accent = input<string | null>(null);
    /** Any CSS length, or a number for px. */
    readonly width = input<string | number | null>(null);
    readonly maxWidth = input<string | number | null>(null);
    /** Box height. Overrides whatever `density` would have set. */
    readonly heightIn = input<string | number | null>(null, { alias: 'height' });

    readonly density = computed(() => this.densityIn() ?? this.p().density ?? this.cfg.density);
    readonly corner = computed(() => this.cornerIn() ?? this.p().corner ?? this.cfg.corner);
    readonly labelMode = computed(() => this.labelModeIn() ?? this.p().labelMode ?? this.cfg.labelMode);
    readonly validateOn = computed(() => this.validateOnIn() ?? this.cfg.validateOn);
    readonly showSuccess = computed(() => this.showSuccessIn() ?? this.cfg.showSuccess);
    readonly shake = computed(() => this.shakeIn() ?? this.cfg.shake);

    readonly widthVar = computed(() => cssLen(this.width()));
    readonly maxWidthVar = computed(() => cssLen(this.maxWidth()));
    readonly heightVar = computed(() => cssLen(this.heightIn() ?? this.p().height ?? null));

    // ── outputs ───────────────────────────────────────────────────────
    readonly focused = output<FocusEvent>();
    readonly blurred = output<FocusEvent>();
    readonly cleared = output<void>();
    readonly enter = output<KeyboardEvent>();
    readonly action = output<MouseEvent>();
    readonly copied = output<void>();

    // ── view ──────────────────────────────────────────────────────────
    private readonly fieldRef = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('field');

    // ── internal state ────────────────────────────────────────────────
    private readonly isFocused = signal(false);
    private readonly cvaDisabled = signal(false);
    private readonly revealed = signal(false);
    private readonly justCopied = signal(false);
    private readonly shakePhase = signal<0 | 1 | 2>(0);
    /** Bumped on every control event so validity-derived computeds re-run. */
    private readonly tick = signal(0);

    private onChange: (v: ElvValue) => void = () => {};
    private onTouched: () => void = () => {};
    private prevStatus: ElvStatus = 'idle';

    readonly revealedState = this.revealed.asReadonly();
    readonly copiedState = this.justCopied.asReadonly();

    // ── derived state ─────────────────────────────────────────────────
    readonly filled = computed(() => String(this.value() ?? '').length > 0);
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
    readonly floated = computed(() => this.isFocused() || this.filled());
    readonly effectiveType = computed(() => (this.type() === 'password' && this.revealed() ? 'text' : this.type()));

    /** True once the user has interacted enough for us to judge the value. */
    private readonly validationVisible = computed(() => {
        this.tick();
        const mode = this.validateOn();
        if (mode === 'never') {
            return false;
        }
        if (mode === 'always') {
            return true;
        }
        const c = this.ngControl?.control;
        return !!c && (mode === 'touched' ? c.touched : c.dirty);
    });

    readonly status = computed<ElvStatus>(() => {
        this.tick();
        if (this.loading()) {
            return 'loading';
        }
        if (this.error()) {
            return 'error';
        }
        if (this.warning()) {
            return 'warning';
        }

        const c = this.ngControl?.control;
        if (!c) {
            return this.success() ? 'success' : 'idle';
        }
        if (c.pending) {
            return 'loading';
        }
        if (!this.validationVisible()) {
            return 'idle';
        }
        if (c.invalid) {
            return 'error';
        }
        if (c.valid && this.showSuccess() && this.filled()) {
            return 'success';
        }
        return 'idle';
    });

    readonly message = computed(() => {
        this.tick();
        if (this.error()) {
            return this.error();
        }
        if (this.warning()) {
            return this.warning();
        }

        const c = this.ngControl?.control;
        if (c?.invalid && c.errors && this.validationVisible()) {
            return this.resolveError(c.errors, { label: this.label() || 'This field' }) ?? '';
        }
        if (this.status() === 'success' && this.success()) {
            return this.success();
        }
        return this.hint();
    });

    /** Tone icon beside the message. Empty for plain hints. */
    readonly messageIcon = computed(() => {
        switch (this.status()) {
            case 'error':
                return 'pi-exclamation-circle';
            case 'warning':
                return 'pi-exclamation-triangle';
            case 'success':
                return 'pi-check-circle';
            case 'loading':
                return 'pi-info-circle';
            default:
                return '';
        }
    });

    /** Trailing status glyph. Success draws an SVG tick instead. */
    readonly statusIcon = computed(() => {
        switch (this.status()) {
            case 'error':
                return 'pi-exclamation-circle';
            case 'warning':
                return 'pi-exclamation-triangle';
            default:
                return '';
        }
    });

    readonly charCount = computed(() => String(this.value() ?? '').length);
    readonly showCounter = computed(() => this.counter() && this.maxlength() != null);
    readonly counterOver = computed(() => {
        const max = this.maxlength();
        return max != null && this.charCount() >= max;
    });

    readonly showClear = computed(() => this.clearable() && this.filled() && !this.isDisabled() && !this.readonly());
    readonly showReveal = computed(() => this.revealable() && this.type() === 'password' && !this.isDisabled());

    /** Drives the animated assist row open/closed. */
    readonly assistOpen = computed(() => !!this.message() || this.showCounter());

    readonly describedBy = computed(() => {
        const ids: string[] = [];
        if (this.message()) {
            ids.push(this.msgId);
        }
        if (this.showCounter()) {
            ids.push(this.countId);
        }
        return ids.length ? ids.join(' ') : null;
    });

    readonly hostClass = computed(() =>
        [
            'elv-field',
            this.isFocused() ? 'is-focus' : '',
            this.filled() ? 'is-filled' : 'is-empty',
            this.floated() ? 'is-floated' : '',
            this.isDisabled() ? 'is-disabled' : '',
            this.readonly() ? 'is-readonly' : '',
            this.multiline() ? 'is-multiline' : '',
            this.status() !== 'idle' ? `is-${this.status()}` : '',
            this.shakePhase() ? `is-shake-${this.shakePhase()}` : '',
        ]
            .filter(Boolean)
            .join(' ')
    );

    // ── construction ──────────────────────────────────────────────────
    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }

        // AbstractControl.events (v18+) emits value, status, touched AND
        // pristine changes. A statusChanges subscription alone would miss
        // markAsTouched(), which is exactly what validateOn:'touched' needs.
        queueMicrotask(() => {
            this.ngControl?.control?.events
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.tick.update((n) => n + 1));
        });

        // Shake restarts by alternating two identically-defined keyframes —
        // deterministic through the signal graph, no forced-reflow hack and
        // nothing a host [class] binding could clobber.
        effect(() => {
            const s = this.status();
            const prev = this.prevStatus;
            this.prevStatus = s;
            if (s !== 'error' || prev === 'error') {
                return;
            }
            if (!untracked(() => this.shake()) || reducedMotion()) {
                return;
            }
            this.shakePhase.update((p) => (p === 1 ? 2 : 1));
        });

        afterNextRender(() => {
            this.autosize();
            if (this.autofocus()) {
                this.focus();
            }
        });
    }

    // ── ControlValueAccessor ──────────────────────────────────────────
    writeValue(v: ElvValue): void {
        this.value.set(v ?? '');
        queueMicrotask(() => this.autosize());
    }
    registerOnChange(fn: (v: ElvValue) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    // ── DOM handlers ──────────────────────────────────────────────────
    handleInput(ev: Event): void {
        const el = ev.target as HTMLInputElement;
        const next: ElvValue = this.type() === 'number' ? (el.value === '' ? null : el.valueAsNumber) : el.value;
        this.value.set(next);
        this.onChange(next);
        this.autosize();
    }

    handleFocus(ev: FocusEvent): void {
        this.isFocused.set(true);
        this.focused.emit(ev);
    }

    handleBlur(ev: FocusEvent): void {
        this.isFocused.set(false);
        this.onTouched();
        this.blurred.emit(ev);
    }

    handleKeydown(ev: KeyboardEvent): void {
        if (ev.key === 'Enter' && !this.multiline()) {
            this.enter.emit(ev);
        }
        // Escape clears, matching Raycast/Spotlight muscle memory.
        if (ev.key === 'Escape' && this.showClear()) {
            ev.stopPropagation();
            this.clear();
        }
    }

    /**
     * Clicking ANYWHERE on the box focuses the field.
     *
     * Without this only the input's own ~22px line box is a hit target, so
     * the padding above and below it, the leading icon and the prefix segment
     * all swallow the click — you had to aim at the middle of the text. The
     * CSS stretch in the stylesheet fixes the vertical band; this covers the
     * icon, the padding and the segment.
     *
     * Real controls in the trail (reveal, clear, action) are left alone, and
     * so is anything projected — those handle their own focus.
     */
    handleBoxPointerDown(ev: MouseEvent): void {
        if (this.isDisabled()) {
            return;
        }
        const target = ev.target as HTMLElement | null;
        if (target?.closest('button, a, input, textarea, select, [contenteditable], [tabindex]')) {
            return;
        }
        // Suppress the browser's own focus pass so the caret lands where we
        // put it rather than wherever the click happened to be.
        ev.preventDefault();
        this.focus();
    }

    // ── public API ────────────────────────────────────────────────────
    focus(): void {
        this.fieldRef()?.nativeElement.focus();
    }
    blur(): void {
        this.fieldRef()?.nativeElement.blur();
    }
    select(): void {
        this.fieldRef()?.nativeElement.select();
    }
    toggleReveal(): void {
        this.revealed.update((v) => !v);
    }

    clear(): void {
        this.value.set('');
        this.onChange('');
        this.cleared.emit();
        const el = this.fieldRef()?.nativeElement;
        if (el) {
            el.value = '';
            el.focus();
        }
        this.autosize();
    }

    async copy(): Promise<void> {
        const text = String(this.value() ?? '');
        try {
            await navigator.clipboard?.writeText(text);
        } catch {
            // Clipboard permission denied — the tick would be a lie, so skip it.
            return;
        }
        this.justCopied.set(true);
        this.copied.emit();
        setTimeout(() => this.justCopied.set(false), 1400);
    }

    private autosize(): void {
        if (!this.multiline() || !this.autoGrow()) {
            return;
        }
        const el = this.fieldRef()?.nativeElement as HTMLTextAreaElement | undefined;
        if (!el) {
            return;
        }
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
}

// ── helpers ───────────────────────────────────────────────────────────
/** Distinguishes "not written" (null) from an explicit `[x]="false"`. */
function nullBool(v: unknown): boolean | null {
    return v === null || v === undefined ? null : booleanAttribute(v);
}

function nullNum(v: unknown): number | null {
    return v == null || v === '' ? null : numberAttribute(v);
}

function cssLen(v: string | number | null): string | null {
    if (v == null || v === '') {
        return null;
    }
    return typeof v === 'number' ? `${v}px` : v;
}

function reducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
