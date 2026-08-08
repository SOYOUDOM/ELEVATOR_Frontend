import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvToggleTone = 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type ElvToggleSize = 'small' | 'medium' | 'large';
export type ElvToggleCorner = 'pill' | 'round' | 'notch' | 'sharp';
export type ElvToggleLabelPos = 'start' | 'end';

let nextId = 0;

@Component({
    selector: 'app-elv-toggle',
    standalone: true,
    imports: [],
    templateUrl: './elv-toggle.component.html',
    styleUrl: './elv-toggle.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ElvToggleComponent),
            multi: true,
        },
    ],
})
export class ElvToggleComponent implements ControlValueAccessor {
    @Input() tone: ElvToggleTone = 'accent';
    @Input() size: ElvToggleSize = 'medium';
    @Input() corner: ElvToggleCorner = 'pill';

    @Input() label = '';
    @Input() description = '';
    @Input() labelPos: ElvToggleLabelPos = 'end';

    /** Renders ON/OFF text inside the track. */
    @Input() showState = false;
    @Input() onText = 'ON';
    @Input() offText = 'OFF';

    @Input() accentColor = '';
    @Input() ariaLabel = '';
    @Input() customClass = '';

    /** Standalone value — `ngModel` / `formControl` drive it instead when bound. */
    @Input() checked = false;
    @Output() checkedChange = new EventEmitter<boolean>();
    /** Fires only on a real user toggle, never on a programmatic write. */
    @Output() changed = new EventEmitter<boolean>();

    @Input() disabled = false;

    readonly inputId = `elv-toggle-${nextId++}`;

    get classes(): string {
        return [
            'elv-toggle',
            `elv-toggle--${this.tone}`,
            `elv-toggle--${this.size}`,
            `elv-toggle--${this.corner}`,
            `elv-toggle--label-${this.labelPos}`,
            this.checked ? 'elv-toggle--on' : '',
            this.disabled ? 'elv-toggle--disabled' : '',
            this.customClass,
        ]
            .filter(Boolean)
            .join(' ');
    }

    get hasText(): boolean {
        return !!this.label || !!this.description;
    }

    get resolvedAriaLabel(): string | null {
        return this.ariaLabel || (this.hasText ? null : 'Toggle');
    }

    get stateText(): string {
        return this.checked ? this.onText : this.offText;
    }

    toggle(value: boolean): void {
        if (this.disabled || value === this.checked) {
            return;
        }
        this.checked = value;
        this.checkedChange.emit(value);
        this.changed.emit(value);
        this.onChange(value);
        this.onTouched();
    }

    onNativeChange(e: Event): void {
        this.toggle((e.target as HTMLInputElement).checked);
    }

    /* ── ControlValueAccessor ─────────────────────────────────── */
    writeValue(value: boolean): void {
        this.checked = !!value;
    }

    registerOnChange(fn: (value: boolean) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    /* Replaced by the forms API once this control is bound. */
    private onChange: (value: boolean) => void = () => undefined;
    private onTouched: () => void = () => undefined;
}

// ── Usage ─────────────────────────────────────────────────────────
//
// Standalone (two-way `checked`):
// <app-elv-toggle [(checked)]="darkMode" label="Dark mode" />
//
// Template-driven and reactive forms both work — it is a ControlValueAccessor:
// <app-elv-toggle [(ngModel)]="user.isActive" label="Active" />
// <app-elv-toggle formControlName="isActive" label="Active" />
//
// Tones (accent | success | warning | danger | info):
// <app-elv-toggle [(checked)]="on" tone="success" label="Notifications" />
// <app-elv-toggle [(checked)]="on" tone="danger"  label="Maintenance mode" />
//
// Sizes (small | medium | large) · Corners (pill | round | notch | sharp):
// <app-elv-toggle [(checked)]="on" size="large" corner="notch" label="HUD mode" />
//
// Label + description, on either side:
// <app-elv-toggle [(checked)]="on" label="Two-factor auth"
//                 description="Require a code at every sign-in." />
// <app-elv-toggle [(checked)]="on" label="Compact rows" labelPos="start" />
//
// ON/OFF text inside the track (custom copy supported):
// <app-elv-toggle [(checked)]="on" [showState]="true" />
// <app-elv-toggle [(checked)]="on" [showState]="true" onText="LIVE" offText="IDLE" size="large" />
//
// Unlabelled toggles need an aria-label:
// <app-elv-toggle [(checked)]="on" ariaLabel="Toggle grain effect" />
//
// Disabled (or driven by a disabled form control):
// <app-elv-toggle [(checked)]="on" [disabled]="!isAdmin" label="Impersonate" />
//
// React to user changes only (never fires on a programmatic write):
// <app-elv-toggle [(checked)]="on" label="Auto-save" (changed)="persist($event)" />
