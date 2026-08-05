/**
 * ELEVATOR — elv-accordion public types.
 *
 * Every union here is emitted verbatim as a `data-*` attribute and resolved in
 * CSS. Neither component switches on these values, so adding one is a single
 * line here plus a single block in the stylesheet.
 *
 * These deliberately MIRROR elv-field's unions rather than importing them: the
 * folder stays self-contained, and the two components disagree on one member
 * anyway (no `pill` corner here — a 56px header row with a 999px radius reads
 * as a button, not as a section of a list).
 */

/** Vertical rhythm. Drives header height: 44 / 56 / 68px. */
export type ElvAccordionDensity = 'compact' | 'default' | 'roomy';

/**
 * Surface treatment — same two materials as elv-field.
 *   raised  — each panel is a lit glass card: gradient fill, inset gloss,
 *             contact shadow, and a gap between panels.
 *   minimal — a flush list on the page's own black: no card, no gap, one
 *             hairline between neighbours.
 */
export type ElvAccordionSkin = 'raised' | 'minimal';

/** Corner language. `sharp` matches ELEVATOR's flat chrome (elv-button). */
export type ElvAccordionCorner = 'soft' | 'sharp';

/** `<h1>`…`<h6>`. The header button is always wrapped in one of these. */
export type ElvAccordionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A preset is a bundle of defaults for one KIND of accordion.
 *
 * Resolution order for every property below is:
 *     explicit input  →  preset  →  provideElvAccordion() default  →  built-in
 *
 * So `<elv-accordion preset="faq" density="roomy" />` keeps the whole faq
 * bundle and swaps only the density. A preset never wins over something you
 * wrote — which is why the boolean members are read through a transform that
 * preserves `null`, so `[multiple]="false"` can still beat a preset's `true`.
 *
 * Deliberately excluded: `value`, `disabled`. Those are per-instance facts
 * about your page, not properties of a kind of accordion.
 */
export interface ElvAccordionPresetDef {
    skin?: ElvAccordionSkin;
    density?: ElvAccordionDensity;
    corner?: ElvAccordionCorner;
    multiple?: boolean;
    collapsible?: boolean;
    headingLevel?: ElvAccordionHeadingLevel;
    /** faq sets this: a question list reads quieter without a glyph column. */
    hideIcons?: boolean;
}

/** Built-in preset keys. Custom keys registered via provideElvAccordion() also work. */
export type ElvAccordionPresetName = 'faq' | 'settings' | 'cv-section';

/** `& {}` keeps IntelliSense on the known keys while still allowing custom ones. */
export type ElvAccordionPreset = ElvAccordionPresetName | (string & {});

/** App-wide defaults; every one is overridable per-instance. */
export interface ElvAccordionDefaults {
    skin: ElvAccordionSkin;
    density: ElvAccordionDensity;
    corner: ElvAccordionCorner;
    multiple: boolean;
    collapsible: boolean;
    headingLevel: ElvAccordionHeadingLevel;
    hideIcons: boolean;
}
