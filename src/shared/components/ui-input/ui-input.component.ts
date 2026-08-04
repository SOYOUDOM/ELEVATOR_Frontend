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
    numberAttribute,
    output,
    signal,
    untracked,
    viewChild,
    Injector,
    model,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { UI_INPUT_DEFAULTS } from './ui-input.config';
import { UI_INPUT_ERROR_RESOLVER } from './ui-input.errors';
import type {
    UiInputAppearance,
    UiInputBorder,
    UiInputDensity,
    UiInputGlow,
    UiInputLabelMode,
    UiInputShape,
    UiInputSize,
    UiInputStatus,
    UiInputTone,
    UiInputType,
    UiInputValidateOn,
    UiInputValue,
} from './ui-input.types';

let _uid = 0;

/**
 * ELEVATOR — the universal text field.
 *
 * Implements ControlValueAccessor by self-injecting NgControl, so it drops
 * straight onto [formControl] / [formControlName] / [(ngModel)] with no
 * NG_VALUE_ACCESSOR provider (and therefore no circular DI).
 *
 * Appearance is resolved entirely in CSS from the `data-*` attributes this
 * component emits. TypeScript owns state; SCSS owns looks.
 */
@Component({
    selector: 'ui-input',
    standalone: true,
    templateUrl: './ui-input.component.html',
    styleUrl: './ui-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-appearance]': 'appearance()',
        '[attr.data-size]': 'size()',
        '[attr.data-density]': 'density()',
        '[attr.data-shape]': 'shape()',
        '[attr.data-border]': 'border()',
        '[attr.data-glow]': 'glow()',
        '[attr.data-tone]': 'activeTone()',
        '[attr.data-status]': 'status()',
        '[attr.data-label-mode]': 'labelMode()',
        '[style.--ui-radius-custom]': 'radiusVar()',
        '[style.width]': 'width()',
    },
})
export class UiInputComponent implements ControlValueAccessor {
    // ── DI ────────────────────────────────────────────────────────────────
    private readonly cfg = inject(UI_INPUT_DEFAULTS);
    private readonly resolveError = inject(UI_INPUT_ERROR_RESOLVER);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    readonly ngControl = inject(NgControl, { optional: true, self: true });
    private readonly injector = inject(Injector);
    // ── Identity (stable ids for label / aria-describedby wiring) ─────────
    private readonly uid = `ui-input-${++_uid}`;
    readonly inputId = `${this.uid}-field`;
    readonly labelId = `${this.uid}-label`;
    readonly messageId = `${this.uid}-msg`;
    readonly counterId = `${this.uid}-count`;

    // ── Value ─────────────────────────────────────────────────────────────
    /** Two-way bindable for non-Forms usage: `[(value)]="query"`. */
    readonly value = model<UiInputValue>('');

    // ── Content ───────────────────────────────────────────────────────────
    readonly label = input('');
    readonly placeholder = input('');
    readonly hint = input('');
    readonly prefix = input('');
    readonly suffix = input('');
    readonly leadingIcon = input('');
    readonly trailingIcon = input('');

    /** Manual overrides — bypass the control's own validity entirely. */
    readonly error = input('');
    readonly warning = input('');
    readonly success = input('');

    // ── Native passthrough ────────────────────────────────────────────────
    readonly type = input<UiInputType>('text');
    readonly name = input<string | null>(null);
    readonly autocomplete = input<string | null>(null);
    readonly inputmode = input<string | null>(null);
    readonly maxlength = input<number | null, unknown>(null, { transform: nullableNumber });
    readonly minlength = input<number | null, unknown>(null, { transform: nullableNumber });
    readonly min = input<string | number | null>(null);
    readonly max = input<string | number | null>(null);
    readonly step = input<string | number | null>(null);
    readonly pattern = input<string | null>(null);
    readonly spellcheck = input(false, { transform: booleanAttribute });
    readonly autocapitalize = input<string | null>(null);
    readonly rows = input(3, { transform: numberAttribute });

    // ── Behaviour ─────────────────────────────────────────────────────────
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    readonly required = input(false, { transform: booleanAttribute });
    readonly autofocus = input(false, { transform: booleanAttribute });
    readonly clearable = input(false, { transform: booleanAttribute });
    readonly revealable = input(false, { transform: booleanAttribute });
    readonly loading = input(false, { transform: booleanAttribute });
    readonly multiline = input(false, { transform: booleanAttribute });
    readonly autoGrow = input(true, { transform: booleanAttribute });
    readonly selectOnFocus = input(false, { transform: booleanAttribute });
    readonly counter = input(false, { transform: booleanAttribute });
    readonly brackets = input(false, { transform: booleanAttribute });

    /** Rotating typewriter placeholder. Ignored when reduced-motion is on. */
    readonly animatedPlaceholder = input<readonly string[] | null>(null);
    readonly typeSpeed = input(55, { transform: numberAttribute });

    // ── Visual (null ⇒ inherit the DI default) ────────────────────────────
    readonly appearanceIn = input<UiInputAppearance | null>(null, { alias: 'appearance' });
    readonly sizeIn = input<UiInputSize | null>(null, { alias: 'size' });
    readonly densityIn = input<UiInputDensity | null>(null, { alias: 'density' });
    readonly shapeIn = input<UiInputShape | null>(null, { alias: 'shape' });
    readonly borderIn = input<UiInputBorder | null>(null, { alias: 'border' });
    readonly glowIn = input<UiInputGlow | null>(null, { alias: 'glow' });
    readonly toneIn = input<UiInputTone | null>(null, { alias: 'tone' });
    readonly labelModeIn = input<UiInputLabelMode | null>(null, { alias: 'labelMode' });
    readonly validateOnIn = input<UiInputValidateOn | null>(null, { alias: 'validateOn' });
    readonly showSuccessIn = input<boolean | null>(null, { alias: 'showSuccess' });
    readonly shakeIn = input<boolean | null>(null, { alias: 'shake' });

    /** Any CSS length — overrides the shape's radius. */
    readonly radius = input<string | number | null>(null);
    readonly width = input<string | null>(null);

    readonly appearance = computed(() => this.appearanceIn() ?? this.cfg.appearance);
    readonly size = computed(() => this.sizeIn() ?? this.cfg.size);
    readonly density = computed(() => this.densityIn() ?? this.cfg.density);
    readonly shape = computed(() => this.shapeIn() ?? this.cfg.shape);
    readonly border = computed(() => this.borderIn() ?? this.cfg.border);
    readonly glow = computed(() => this.glowIn() ?? this.cfg.glow);
    readonly tone = computed(() => this.toneIn() ?? this.cfg.tone);
    readonly labelMode = computed(() => this.labelModeIn() ?? this.cfg.labelMode);
    readonly validateOn = computed(() => this.validateOnIn() ?? this.cfg.validateOn);
    readonly showSuccess = computed(() => this.showSuccessIn() ?? this.cfg.showSuccess);
    readonly shake = computed(() => this.shakeIn() ?? this.cfg.shake);

    readonly radiusVar = computed(() => {
        const r = this.radius();
        return r == null || r === '' ? null : typeof r === 'number' ? `${r}px` : r;
    });

    // ── Outputs ───────────────────────────────────────────────────────────
    readonly focused = output<FocusEvent>();
    readonly blurred = output<FocusEvent>();
    readonly cleared = output<void>();
    readonly enter = output<KeyboardEvent>();
    readonly trailingIconClick = output<MouseEvent>();

    // ── View ──────────────────────────────────────────────────────────────
    private readonly fieldRef = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('field');

    // ── Internal state ────────────────────────────────────────────────────
    private readonly cvaDisabled = signal(false);
    private readonly isFocused = signal(false);
    private readonly isTyping = signal(false);
    private readonly isAutofilled = signal(false);
    readonly revealed = signal(false);
    private readonly shakePhase = signal<0 | 1 | 2>(0);
    /** Bumped on every control event so validity-derived computeds re-run. */
    private readonly controlTick = signal(0);

    private onChange: (v: UiInputValue) => void = () => {};
    private onTouched: () => void = () => {};
    private typingTimer?: ReturnType<typeof setTimeout>;
    private prevStatus: UiInputStatus = 'idle';

    // ── Derived state ─────────────────────────────────────────────────────
    readonly currentValue = computed(() => this.value());
    readonly filled = computed(() => {
        const v = this.currentValue();
        return v !== null && v !== undefined && String(v).length > 0;
    });

    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

    /** Floating label sits up when focused, filled, or autofilled. */
    readonly floated = computed(() => this.isFocused() || this.filled() || this.isAutofilled());

    readonly effectiveType = computed(() => (this.type() === 'password' && this.revealed() ? 'text' : this.type()));

    /** True once the control has been interacted with enough to judge it. */
    private readonly validationVisible = computed(() => {
        this.controlTick();
        const mode = this.validateOn();
        if (mode === 'never') return false;
        if (mode === 'always') return true;
        const c = this.ngControl?.control;
        if (!c) return false;
        return mode === 'touched' ? c.touched : c.dirty;
    });

    readonly status = computed<UiInputStatus>(() => {
        this.controlTick();
        if (this.error()) return 'invalid';
        if (this.warning()) return 'warning';

        const c = this.ngControl?.control;
        if (!c) return this.success() ? 'valid' : 'idle';

        if (c.pending) return 'pending';
        if (!this.validationVisible()) return 'idle';
        if (c.invalid) return 'invalid';
        if (c.valid && this.showSuccess() && this.filled()) return 'valid';
        return 'idle';
    });

    /** Status wins over the declared tone, so colour always tracks meaning. */
    readonly activeTone = computed<UiInputTone>(() => {
        switch (this.status()) {
            case 'invalid':
                return 'danger';
            case 'warning':
                return 'warning';
            case 'valid':
                return 'success';
            case 'pending':
                return 'info';
            default:
                return this.tone();
        }
    });

    readonly message = computed(() => {
        this.controlTick();
        if (this.error()) return this.error();
        if (this.warning()) return this.warning();

        const c = this.ngControl?.control;
        if (c?.invalid && c.errors && this.validationVisible()) {
            return this.resolveError(c.errors, { label: this.label() || 'This field' }) ?? '';
        }
        if (this.status() === 'valid' && this.success()) return this.success();
        return this.hint();
    });

    readonly messageIcon = computed(() => {
        switch (this.status()) {
            case 'invalid':
                return 'pi-exclamation-circle';
            case 'warning':
                return 'pi-exclamation-triangle';
            case 'valid':
                return 'pi-check-circle';
            case 'pending':
                return 'pi-spinner';
            default:
                return this.hint() ? 'pi-info-circle' : '';
        }
    });

    readonly showCounter = computed(() => this.counter() && this.maxlength() != null);
    readonly charCount = computed(() => String(this.currentValue() ?? '').length);

    readonly showClear = computed(() => this.clearable() && this.filled() && !this.isDisabled() && !this.readonly());
    readonly showReveal = computed(() => this.revealable() && this.type() === 'password' && !this.isDisabled());

    readonly describedBy = computed(() => {
        const ids: string[] = [];
        if (this.message()) ids.push(this.messageId);
        if (this.showCounter()) ids.push(this.counterId);
        return ids.length ? ids.join(' ') : null;
    });

    readonly hostClass = computed(() =>
        [
            'ui-input',
            this.isFocused() ? 'is-focused' : '',
            this.filled() ? 'is-filled' : 'is-empty',
            this.floated() ? 'is-floated' : '',
            this.isDisabled() ? 'is-disabled' : '',
            this.readonly() ? 'is-readonly' : '',
            this.loading() ? 'is-loading' : '',
            this.isTyping() ? 'is-typing' : '',
            this.isAutofilled() ? 'is-autofill' : '',
            this.required() ? 'is-required' : '',
            this.multiline() ? 'is-multiline' : '',
            this.shakePhase() ? `is-shake-${this.shakePhase()}` : '',
        ]
            .filter(Boolean)
            .join(' ')
    );

    // ── Construction ──────────────────────────────────────────────────────
    constructor() {
        // Self-injected NgControl: register as the value accessor by hand.
        // This is what lets the component read validity/touched state for the
        // visuals, which an NG_VALUE_ACCESSOR provider cannot do without a
        // circular dependency.
        if (this.ngControl) this.ngControl.valueAccessor = this;

        this.bindControlEvents();
        this.bindShakeOnError();

        afterNextRender(() => {
            this.trackPointer();
            this.trackAutofill();
            this.runTypewriter();
            if (this.autofocus()) this.focus();
        });
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────
    writeValue(v: UiInputValue): void {
        this.value.set(v ?? '');
        queueMicrotask(() => this.autosize());
    }
    registerOnChange(fn: (v: UiInputValue) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    // ── DOM handlers ──────────────────────────────────────────────────────
    handleInput(ev: Event): void {
        const el = ev.target as HTMLInputElement;
        const next: UiInputValue = this.type() === 'number' ? (el.value === '' ? null : el.valueAsNumber) : el.value;

        this.value.set(next);

        this.onChange(next);

        this.isTyping.set(true);
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => this.isTyping.set(false), 520);

        this.autosize();
    }

    handleFocus(ev: FocusEvent): void {
        this.isFocused.set(true);
        if (this.selectOnFocus()) this.fieldRef()?.nativeElement.select();
        this.focused.emit(ev);
    }

    handleBlur(ev: FocusEvent): void {
        this.isFocused.set(false);
        this.isTyping.set(false);
        this.onTouched();
        this.blurred.emit(ev);
    }

    handleKeydown(ev: KeyboardEvent): void {
        if (ev.key === 'Enter' && !this.multiline()) this.enter.emit(ev);
        // Escape clears, matching Raycast/Spotlight muscle memory.
        if (ev.key === 'Escape' && this.showClear()) {
            ev.stopPropagation();
            this.clear();
        }
    }

    // ── Public API ────────────────────────────────────────────────────────
    focus(): void {
        this.fieldRef()?.nativeElement.focus();
    }
    blur(): void {
        this.fieldRef()?.nativeElement.blur();
    }
    select(): void {
        this.fieldRef()?.nativeElement.select();
    }

    clear(): void {
        this.value.set('');
        this.cleared.emit();
        const el = this.fieldRef()?.nativeElement;
        if (el) {
            el.value = '';
            el.focus();
        }
        this.autosize();
    }

    toggleReveal(): void {
        this.revealed.update((v) => !v);
    }

    // ── Wiring ────────────────────────────────────────────────────────────

    /**
     * `AbstractControl.events` (Angular 18+) emits value, status, touched AND
     * pristine changes — the whole set the visuals depend on. A statusChanges
     * subscription alone would miss `markAsTouched()`.
     */
    private bindControlEvents(): void {
        queueMicrotask(() => {
            const control = this.ngControl?.control;
            if (!control) return;
            control.events
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.controlTick.update((n) => n + 1));
        });
    }

    private bindShakeOnError(): void {
        effect(() => {
            const s = this.status();
            const prev = this.prevStatus;
            this.prevStatus = s;

            if (s !== 'invalid' || prev === 'invalid') return;
            if (!untracked(() => this.shake()) || prefersReducedMotion()) return;

            // Alternate between two identically-defined keyframes so the animation
            // restarts through the signal graph — no reflow hack, no classList
            // mutation that a host [class] binding could clobber.
            this.shakePhase.update((p) => (p === 1 ? 2 : 1));
        });
    }

    /**
     * Ambient pointer tracking. Deliberately NOT a host listener: writing CSS
     * variables directly keeps this off the change-detection path entirely,
     * which matters in a zoneless app.
     */
    private trackPointer(): void {
        const el = this.host.nativeElement;
        let rect: DOMRect | null = null;
        let frame = 0;

        const cache = () => {
            rect = el.getBoundingClientRect();
        };
        const move = (e: PointerEvent) => {
            if (frame || !rect) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (!rect) return;
                el.style.setProperty('--ui-mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                el.style.setProperty('--ui-my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
            });
        };
        const reset = () => {
            rect = null;
            el.style.setProperty('--ui-mx', '50%');
            el.style.setProperty('--ui-my', '50%');
        };

        el.addEventListener('pointerenter', cache, { passive: true });
        el.addEventListener('pointermove', move, { passive: true });
        el.addEventListener('pointerleave', reset, { passive: true });

        this.destroyRef.onDestroy(() => {
            cancelAnimationFrame(frame);
            el.removeEventListener('pointerenter', cache);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', reset);
        });
    }

    /**
     * Chrome fires `animationstart` for the no-op keyframes attached to
     * `:-webkit-autofill` in _states.scss. It's the only reliable autofill
     * signal, and it lets the floating label move out of the way.
     */
    private trackAutofill(): void {
        const el = this.fieldRef()?.nativeElement;
        if (!el) return;
        const onStart = (e: AnimationEvent) => {
            if (e.animationName === 'ui-autofill-on') this.isAutofilled.set(true);
            if (e.animationName === 'ui-autofill-off') this.isAutofilled.set(false);
        };
        el.addEventListener('animationstart', onStart as EventListener);
        this.destroyRef.onDestroy(() => el.removeEventListener('animationstart', onStart as EventListener));
    }

    /** Types, holds, deletes, advances. Writes the DOM attribute directly. */
    private runTypewriter(): void {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let phrase = 0,
            chars = 0,
            deleting = false;

        const stop = () => {
            clearTimeout(timer);
            timer = undefined;
        };

        effect(
            () => {
                const words = this.animatedPlaceholder();
                const idle = !this.isFocused() && !this.filled();
                stop();

                const el = this.fieldRef()?.nativeElement;
                if (!el) return;

                if (!words?.length || !idle || prefersReducedMotion()) {
                    el.placeholder = this.placeholder();
                    return;
                }

                const speed = this.typeSpeed();
                const tick = () => {
                    const word = words[phrase % words.length];
                    chars += deleting ? -1 : 1;
                    el.placeholder = word.slice(0, chars);

                    let delay = deleting ? speed * 0.5 : speed;
                    if (!deleting && chars === word.length) {
                        deleting = true;
                        delay = 1900;
                    } else if (deleting && chars === 0) {
                        deleting = false;
                        phrase++;
                        delay = 320;
                    }

                    timer = setTimeout(tick, delay);
                };
                tick();
            },
            { injector: this.injector }
        );

        this.destroyRef.onDestroy(stop);
    }

    private autosize(): void {
        if (!this.multiline() || !this.autoGrow()) return;
        const el = this.fieldRef()?.nativeElement as HTMLTextAreaElement | undefined;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
}

// ── helpers ─────────────────────────────────────────────────────────────
function nullableNumber(v: unknown): number | null {
    return v == null || v === '' ? null : numberAttribute(v);
}

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
