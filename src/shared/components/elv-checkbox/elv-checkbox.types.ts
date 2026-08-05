/**
 * ELEVATOR — elv-checkbox public types.
 *
 * Every union here is emitted verbatim as a `data-*` attribute and resolved in
 * CSS. Nothing in either component switches on these values, so adding one is a
 * single line here plus a single block in the stylesheet.
 *
 * These deliberately MIRROR elv-field's unions rather than importing them: the
 * folder stays self-contained, and the two components disagree on one member
 * anyway (`round` here vs `pill` there — a circle reads as a radio at 20px, a
 * pill does not exist for a square box).
 */

/** Box edge length: 16 / 20 / 24px. Label size and row padding follow. */
export type ElvCheckboxSize = 'sm' | 'md' | 'lg';

/**
 * Surface treatment — same two materials as elv-field.
 *   raised  — lit glass panel: gradient fill, inset gloss, contact shadow
 *   minimal — warm hairline outline on the page's own black; no fill, no gloss
 */
export type ElvCheckboxSkin = 'raised' | 'minimal';

/** Corner language. `sharp` matches ELEVATOR's flat chrome (elv-button). */
export type ElvCheckboxCorner = 'soft' | 'sharp' | 'round';

/** Drives --elv-tone. Derived from state, or forced with the `tone` input. */
export type ElvCheckboxTone = 'accent' | 'success' | 'danger' | 'warning' | 'info';

/** Which side of the box the label sits on. */
export type ElvCheckboxLabelPosition = 'end' | 'start';

export type ElvCheckboxOrientation = 'vertical' | 'horizontal';

/** One row in an elv-checkbox-group. */
export interface ElvCheckboxOption {
    value: string;
    label: string;
    hint?: string;
    disabled?: boolean;
}

/**
 * A preset is a bundle of defaults for one KIND of checkbox.
 *
 * Resolution order for every property below is:
 *     explicit input  →  preset  →  provideElvCheckbox() default  →  built-in
 *
 * So `<elv-checkbox preset="terms" size="lg" />` keeps the whole terms bundle
 * and swaps only the size. A preset never wins over something you wrote.
 *
 * Deliberately excluded: `checked`, `indeterminate`, `disabled`, `error`,
 * `name`. Those are per-instance facts about your form, not properties of a
 * kind of checkbox.
 */
export interface ElvCheckboxPresetDef {
    label?: string;
    hint?: string;
    required?: boolean;
    size?: ElvCheckboxSize;
    skin?: ElvCheckboxSkin;
    corner?: ElvCheckboxCorner;
    tone?: ElvCheckboxTone;
    labelPosition?: ElvCheckboxLabelPosition;
}

/** Built-in preset keys. Custom keys registered via provideElvCheckbox() also work. */
export type ElvCheckboxPresetName = 'terms' | 'remember-me' | 'marketing';

/** `& {}` keeps IntelliSense on the known keys while still allowing custom ones. */
export type ElvCheckboxPreset = ElvCheckboxPresetName | (string & {});

/** App-wide defaults; every one is overridable per-instance. */
export interface ElvCheckboxDefaults {
    size: ElvCheckboxSize;
    skin: ElvCheckboxSkin;
    corner: ElvCheckboxCorner;
    tone: ElvCheckboxTone;
    labelPosition: ElvCheckboxLabelPosition;
    /** When validation visuals are allowed to appear on a group. */
    validateOn: 'touched' | 'always';
}
