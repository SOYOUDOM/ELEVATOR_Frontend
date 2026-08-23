/**
 * ELEVATOR — elv-field public types.
 *
 * Every union here is emitted verbatim as a `data-*` attribute and resolved
 * in CSS. Nothing in the component switches on these values, so adding one
 * is a single line here plus a single block in the stylesheet.
 */

/** Vertical rhythm. Changes height, font size and horizontal padding together. */
export type ElvDensity = 'compact' | 'default' | 'roomy';

/**
 * Surface treatment.
 *   raised  — lit glass panel: gradient fill, inset gloss, contact shadow
 *   minimal — hairline outline on the page's own black; no fill, no gloss
 */
export type ElvSkin = 'raised' | 'minimal';

/** Corner language. `sharp` matches ELEVATOR's existing flat chrome (elv-button). */
export type ElvCorner = 'soft' | 'sharp' | 'pill';

export type ElvLabelMode = 'stacked' | 'float' | 'hidden';

/** Derived, never an input. Precedence: loading > error > warning > success. */
export type ElvStatus = 'idle' | 'success' | 'error' | 'warning' | 'loading';

/** When validation visuals are allowed to appear. */
export type ElvValidateOn = 'touched' | 'dirty' | 'always' | 'never';

export type ElvFieldType =
    | 'text'
    | 'email'
    | 'password'
    | 'search'
    | 'tel'
    | 'url'
    | 'number'
    | 'date'
    | 'month'
    | 'time';

export type ElvValue = string | number | null;

/** App-wide defaults; every field is overridable per-instance. */
export interface ElvFieldDefaults {
    density: ElvDensity;
    corner: ElvCorner;
    skin: ElvSkin;
    labelMode: ElvLabelMode;
    validateOn: ElvValidateOn;
    showSuccess: boolean;
    shake: boolean;
}
