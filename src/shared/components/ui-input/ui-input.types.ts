/**
 * ELEVATOR — ui-input public type surface
 * ---------------------------------------------------------------
 * Every union here is open for extension by editing ONE line and
 * adding ONE SCSS block. Nothing in the component switches on these
 * values — they are emitted verbatim as `data-*` attributes and
 * resolved entirely in CSS.
 * --------------------------------------------------------------- */

/** Visual language. Each is handcrafted in `styles/_variants.scss`. */
export type UiInputAppearance =
  | 'aurora'    // animated aurora ring over frosted panel — the signature
  | 'glass'     // liquid glass: backdrop blur, specular edge, sweep
  | 'neon'      // ELEVATOR HUD hairline + accent bloom (matches elv-button)
  | 'minimal'   // Linear: invisible until it needs to exist
  | 'soft'      // Notion/Stripe: filled surface, soft focus ring
  | 'elevated'  // floating surface, pointer-reactive dynamic shadow
  | 'outline'   // elegant corporate, crisp drawn ring
  | 'underline' // no box — a single spring-loaded rule
  | 'holo'      // holographic iridescence, pointer-shifted
  | 'hud';      // notched, bracketed, scanline readout

export type UiInputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Modulates padding independently of font-size. */
export type UiInputDensity = 'compact' | 'dense' | 'default' | 'comfortable';

export type UiInputShape =
  | 'sharp' | 'soft' | 'rounded' | 'pill' | 'notch' | 'organic';

/** `auto` = let the appearance decide. Anything else overrides it. */
export type UiInputBorder =
  | 'auto' | 'none' | 'solid' | 'dashed' | 'double'
  | 'gradient' | 'aurora' | 'neon' | 'trail'
  | 'sweep' | 'frost' | 'metal';

export type UiInputGlow = 'none' | 'focus' | 'always' | 'pulse';

export type UiInputLabelMode =
  | 'floating'  // starts in-field, rises to a small cap on focus/fill
  | 'stacked'   // persistent label above the field
  | 'inline'    // persistent small cap inside the field
  | 'hidden';   // visually hidden, still announced

/** Drives accent colour for border/glow/message. */
export type UiInputTone =
  | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type UiInputStatus =
  | 'idle' | 'valid' | 'invalid' | 'warning' | 'pending';

/** When validation visuals are allowed to appear. */
export type UiInputValidateOn = 'touched' | 'dirty' | 'always' | 'never';

export type UiInputType =
  | 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  | 'number' | 'date' | 'time' | 'datetime-local' | 'month' | 'week';

export type UiInputValue = string | number | null;

/** App-wide defaults; every field is overridable per-instance. */
export interface UiInputDefaults {
  appearance: UiInputAppearance;
  size: UiInputSize;
  density: UiInputDensity;
  shape: UiInputShape;
  border: UiInputBorder;
  glow: UiInputGlow;
  tone: UiInputTone;
  labelMode: UiInputLabelMode;
  validateOn: UiInputValidateOn;
  showSuccess: boolean;
  shake: boolean;
}