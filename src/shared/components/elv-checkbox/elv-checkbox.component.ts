import {
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
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { ELV_CHECKBOX_DEFAULTS, ELV_CHECKBOX_PRESETS } from './elv-checkbox.config';
import type {
    ElvCheckboxCorner,
    ElvCheckboxLabelPosition,
    ElvCheckboxPreset,
    ElvCheckboxPresetDef,
    ElvCheckboxSize,
    ElvCheckboxSkin,
    ElvCheckboxTone,
} from './elv-checkbox.types';

let seq = 0;

/**
 * ELEVATOR — the checkbox.
 *
 * Sibling of elv-field: the same five lighting layers share ONE box-shadow
 * declaration in the stylesheet, all driven by --elv-tone. This class never
 * touches appearance — it resolves state, emits it as classes plus data
 * attributes, and gets out of the way.
 *
 * The control is a REAL <input type="checkbox">, visually hidden but focusable
 * and in tab order, wrapped in a <label> so the whole row toggles it. Every
 * keyboard, AT and autofill behaviour is the browser's, not ours.
 *
 * Implements ControlValueAccessor by self-injecting NgControl, so it can read
 * touched/dirty for the visuals — something an NG_VALUE_ACCESSOR provider
 * cannot do without a circular dependency.
 */
@Component({
    selector: 'elv-checkbox',
    standalone: true,
    templateUrl: './elv-checkbox.component.html',
    styleUrl: './elv-checkbox.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'hostClass()',
        '[attr.data-size]': 'size()',
        '[attr.data-skin]': 'skin()',
        '[attr.data-corner]': 'corner()',
        '[attr.data-tone]': 'tone()',
        '[attr.data-label-position]': 'labelPosition()',
    },
})
export class ElvCheckboxComponent implements ControlValueAccessor {
    // ── DI ────────────────────────────────────────────────────────────
    private readonly cfg = inject(ELV_CHECKBOX_DEFAULTS);
    private readonly presetMap = inject(ELV_CHECKBOX_PRESETS);
    private readonly destroyRef = inject(DestroyRef);
    readonly ngControl = inject(NgControl, { optional: true, self: true });

    // ── identity (stable ids for aria-describedby wiring) ─────────────
    private readonly uid = `elv-cbx-${++seq}`;
    readonly inputId = `${this.uid}-input`;
    readonly labelId = `${this.uid}-label`;
    readonly hintId = `${this.uid}-hint`;
    readonly errId = `${this.uid}-err`;

    // ── preset ────────────────────────────────────────────────────────
    readonly preset = input<ElvCheckboxPreset | null>(null);

    /** Empty object when no preset, so every `p().x` read below is safe. */
    private readonly p = computed<ElvCheckboxPresetDef>(() => {
        const key = this.preset();
        return (key && this.presetMap[key]) || {};
    });

    // ── value ─────────────────────────────────────────────────────────
    /** Two-way bindable AND the CVA value: [(checked)]="agreed". */
    readonly checked = model(false);

    // ── content ───────────────────────────────────────────────────────
    readonly labelIn = input('', { alias: 'label' });
    readonly hintIn = input('', { alias: 'hint' });
    /** Forces the danger tone and replaces the hint line. */
    readonly error = input('');

    readonly label = computed(() => this.labelIn() || this.p().label || '');
    readonly hint = computed(() => this.hintIn() || this.p().hint || '');

    // ── behaviour ─────────────────────────────────────────────────────
    /** Tri-state. Cleared the first time the user toggles. */
    readonly indeterminateIn = input(false, { transform: booleanAttribute, alias: 'indeterminate' });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    // Two type args are required whenever a transform is present — the
    // single-arg form resolves to the without-transform overloads.
    readonly requiredIn = input<boolean | null, unknown>(null, { transform: nullBool, alias: 'required' });
    readonly name = input<string | null>(null);

    readonly required = computed(() => this.requiredIn() ?? this.p().required ?? false);

    // ── visual (null ⇒ inherit preset, then the DI default) ───────────
    readonly sizeIn = input<ElvCheckboxSize | null>(null, { alias: 'size' });
    readonly skinIn = input<ElvCheckboxSkin | null>(null, { alias: 'skin' });
    readonly cornerIn = input<ElvCheckboxCorner | null>(null, { alias: 'corner' });
    readonly toneIn = input<ElvCheckboxTone | null>(null, { alias: 'tone' });
    readonly labelPositionIn = input<ElvCheckboxLabelPosition | null>(null, { alias: 'labelPosition' });

    readonly size = computed(() => this.sizeIn() ?? this.p().size ?? this.cfg.size);
    readonly skin = computed(() => this.skinIn() ?? this.p().skin ?? this.cfg.skin);
    readonly corner = computed(() => this.cornerIn() ?? this.p().corner ?? this.cfg.corner);
    readonly labelPosition = computed(() => this.labelPositionIn() ?? this.p().labelPosition ?? this.cfg.labelPosition);

    // ── outputs ───────────────────────────────────────────────────────
    readonly change = output<boolean>();
    readonly focused = output<FocusEvent>();
    readonly blurred = output<FocusEvent>();

    // ── view ──────────────────────────────────────────────────────────
    private readonly boxRef = viewChild<ElementRef<HTMLInputElement>>('box');

    // ── internal state ────────────────────────────────────────────────
    private readonly isFocused = signal(false);
    private readonly cvaDisabled = signal(false);
    /**
     * null  ⇒ honour the `indeterminate` input verbatim
     * false ⇒ the user has toggled, so the tri-state is resolved
     * Reset to null whenever the input itself changes, so a consumer can put
     * the control back into the mixed state after a user toggle.
     */
    private readonly indetOverride = signal<boolean | null>(null);
    /** Bumped on every control event so validity-derived computeds re-run. */
    private readonly tick = signal(0);

    private onChange: (v: boolean) => void = () => {};
    private onTouched: () => void = () => {};

    // ── derived state ─────────────────────────────────────────────────
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
    readonly indeterminate = computed(() => this.indetOverride() ?? this.indeterminateIn());

    /** True once the user has interacted enough for us to judge the value. */
    private readonly validationVisible = computed(() => {
        this.tick();
        if (this.cfg.validateOn === 'always') {
            return true;
        }
        const c = this.ngControl?.control;
        return !!c && c.touched;
    });

    readonly invalid = computed(() => {
        this.tick();
        if (this.error()) {
            return true;
        }
        const c = this.ngControl?.control;
        return !!c && c.invalid && this.validationVisible();
    });

    /**
     * State picks the tone; an explicit `tone` input overrides it. Everything
     * visual — border, ring, bloom, fill, message colour — derives from this
     * one value in the stylesheet.
     */
    readonly tone = computed<ElvCheckboxTone>(() => {
        if (this.invalid()) {
            return 'danger';
        }
        return this.toneIn() ?? this.p().tone ?? this.cfg.tone;
    });

    /** Error wins the assist line; otherwise the hint. */
    readonly message = computed(() => this.error() || this.hint());

    readonly describedBy = computed(() => {
        if (this.error()) {
            return this.errId;
        }
        return this.hint() ? this.hintId : null;
    });

    readonly hostClass = computed(() =>
        [
            'elv-checkbox',
            this.checked() ? 'is-checked' : 'is-unchecked',
            this.indeterminate() ? 'is-indeterminate' : '',
            this.isFocused() ? 'is-focus' : '',
            this.isDisabled() ? 'is-disabled' : '',
            this.readonly() ? 'is-readonly' : '',
            this.invalid() ? 'is-error' : '',
            this.required() ? 'is-required' : '',
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
        // markAsTouched(), which is exactly what the touched gate needs.
        queueMicrotask(() => {
            this.ngControl?.control?.events
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.tick.update((n) => n + 1));
        });

        // `indeterminate` has no HTML attribute — it is a DOM property only,
        // so it has to be written imperatively on every change.
        effect(() => {
            const el = this.boxRef()?.nativeElement;
            const mixed = this.indeterminate();
            if (el) {
                el.indeterminate = mixed;
            }
        });

        // A fresh value on the input re-arms the tri-state: drop the override
        // so `indeterminate` means what the consumer just said it means.
        effect(() => {
            this.indeterminateIn();
            untracked(() => this.indetOverride.set(null));
        });
    }

    // ── ControlValueAccessor ──────────────────────────────────────────
    writeValue(v: unknown): void {
        this.checked.set(v === true);
    }
    registerOnChange(fn: (v: boolean) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    // ── DOM handlers ──────────────────────────────────────────────────
    /**
     * The native change event covers every activation path at once — clicking
     * the box, clicking the label text, clicking the row padding, and Space —
     * because the browser routes all of them through the real input.
     */
    handleChange(ev: Event): void {
        // The native `change` bubbles, and this component publishes an output
        // that is ALSO called `change`. Angular subscribes to the output *and*
        // leaves a DOM listener in place when the two names collide, so a
        // parent's (change) binding would fire twice per toggle: once with our
        // boolean, once with the raw Event. A truthy Event is indistinguishable
        // from `true` at the call site, which silently corrupts anything that
        // trusts the payload. The native event has done its job by the line
        // below, so it stops here.
        ev.stopPropagation();

        const next = (ev.target as HTMLInputElement).checked;
        // The mixed state is a statement about a set of children, and the user
        // has just made a definite choice, so it no longer holds.
        this.indetOverride.set(false);
        this.checked.set(next);
        this.onChange(next);
        this.change.emit(next);
    }

    /**
     * `readonly` is not a thing for checkboxes in HTML — the attribute parses
     * but the browser ignores it — so the toggle has to be cancelled here.
     * Cancelling on click (not change) keeps the input focusable and in tab
     * order, which `disabled` would not.
     *
     * Anchors and buttons inside a projected label are left alone: activating
     * "the Terms" must follow the link, not tick the box.
     */
    handleClick(ev: MouseEvent): void {
        const target = ev.target as HTMLElement | null;
        if (target?.closest('a, button')) {
            ev.preventDefault();
            return;
        }
        if (this.readonly()) {
            ev.preventDefault();
        }
    }

    /** Space on a readonly box would toggle it without ever firing a click. */
    handleKeydown(ev: KeyboardEvent): void {
        if (this.readonly() && (ev.key === ' ' || ev.key === 'Spacebar')) {
            ev.preventDefault();
        }
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

    // ── public API ────────────────────────────────────────────────────
    focus(): void {
        this.boxRef()?.nativeElement.focus();
    }
    blur(): void {
        this.boxRef()?.nativeElement.blur();
    }
}

// ── helpers ───────────────────────────────────────────────────────────
/**
 * Distinguishes "not written" (null) from an explicit [x]="false".
 * booleanAttribute alone collapses both to false, which would make a preset's
 * `required: true` impossible to switch off per instance.
 */
function nullBool(v: unknown): boolean | null {
    return v === null || v === undefined ? null : booleanAttribute(v);
}
