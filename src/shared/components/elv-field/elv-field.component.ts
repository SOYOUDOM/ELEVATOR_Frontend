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
    },
})
export class ElvFieldComponent implements ControlValueAccessor {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_FIELD_DEFAULTS);
    private readonly resolveError = inject(ELV_ERROR_RESOLVER);
    private readonly destroyRef = inject(DestroyRef);
    readonly ngControl = inject(NgControl, { optional: true, self: true });

    // ── identity (stable ids for label / aria-describedby wiring) ─────
    private readonly uid = `elv-${++seq}`;
    readonly inputId = `${this.uid}-input`;
    readonly labelId = `${this.uid}-label`;
    readonly msgId = `${this.uid}-msg`;
    readonly countId = `${this.uid}-count`;

    // ── value ─────────────────────────────────────────────────────────
    /** Two-way bindable for non-Forms usage: [(value)]="query". */
    readonly value = model<ElvValue>('');

    // ── content ───────────────────────────────────────────────────────
    readonly label = input('');
    readonly placeholder = input('');
    readonly hint = input('');
    /** Leading PrimeIcon name WITHOUT the `pi ` prefix, e.g. 'pi-envelope'. */
    readonly icon = input('');
    readonly prefix = input('');
    readonly prefixIcon = input('');
    readonly suffix = input('');
    readonly actionLabel = input('');
    readonly kbd = input<readonly string[] | null>(null);

    /** Manual overrides — bypass the control's own validity entirely. */
    readonly error = input('');
    readonly warning = input('');
    readonly success = input('');

    // ── native passthrough ────────────────────────────────────────────
    readonly type = input<ElvFieldType>('text');
    readonly name = input<string | null>(null);
    readonly autocomplete = input<string | null>(null);
    readonly inputmode = input<string | null>(null);
    // Two type args are required whenever a transform is present — the
    // single-arg form resolves to the without-transform overloads.
    readonly maxlength = input<number | null, unknown>(null, { transform: nullNum });
    readonly minlength = input<number | null, unknown>(null, { transform: nullNum });
    readonly min = input<string | number | null>(null);
    readonly max = input<string | number | null>(null);
    readonly step = input<string | number | null>(null);
    readonly rows = input(3, { transform: numberAttribute });

    // ── behaviour ─────────────────────────────────────────────────────
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    readonly required = input(false, { transform: booleanAttribute });
    readonly optional = input(false, { transform: booleanAttribute });
    readonly autofocus = input(false, { transform: booleanAttribute });
    readonly clearable = input(false, { transform: booleanAttribute });
    readonly revealable = input(false, { transform: booleanAttribute });
    readonly copyable = input(false, { transform: booleanAttribute });
    readonly loading = input(false, { transform: booleanAttribute });
    readonly multiline = input(false, { transform: booleanAttribute });
    readonly autoGrow = input(true, { transform: booleanAttribute });
    readonly counter = input(false, { transform: booleanAttribute });
    readonly mono = input(false, { transform: booleanAttribute });
    readonly numeric = input(false, { transform: booleanAttribute });

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

    readonly density = computed(() => this.densityIn() ?? this.cfg.density);
    readonly corner = computed(() => this.cornerIn() ?? this.cfg.corner);
    readonly labelMode = computed(() => this.labelModeIn() ?? this.cfg.labelMode);
    readonly validateOn = computed(() => this.validateOnIn() ?? this.cfg.validateOn);
    readonly showSuccess = computed(() => this.showSuccessIn() ?? this.cfg.showSuccess);
    readonly shake = computed(() => this.shakeIn() ?? this.cfg.shake);

    readonly widthVar = computed(() => cssLen(this.width()));
    readonly maxWidthVar = computed(() => cssLen(this.maxWidth()));

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
