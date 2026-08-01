/** Vertical rhythm. Set globally via provideElvField(), overridden per-field. */
export type ElvDensity = 'compact' | 'default' | 'roomy';

/** `sharp` matches ELEVATOR's existing flat chrome (elv-button). */
export type ElvCorner = 'soft' | 'sharp' | 'pill';

export type ElvLabelMode = 'stacked' | 'float' | 'hidden';

export type ElvStatus = 'idle' | 'success' | 'error' | 'warning' | 'loading';

export type ElvValidateOn = 'touched' | 'dirty' | 'always' | 'never';

export type ElvFieldType =
  | 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  | 'number' | 'date' | 'time';

export type ElvValue = string | number | null;

export interface ElvFieldDefaults {
  density: ElvDensity;
  corner: ElvCorner;
  labelMode: ElvLabelMode;
  validateOn: ElvValidateOn;
  showSuccess: boolean;
  shake: boolean;
}