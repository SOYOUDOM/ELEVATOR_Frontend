/**
 * ELEVATOR — the theme registry
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every theme fills in the whole contract from `theme.tokens.ts`. Adding a
 * new one is adding one object to `THEMES` and nothing else: no SCSS, no
 * component change, no build step. That is the entire point of routing every
 * colour in the product through `--p-elevator-*`.
 *
 * `elevator-dark` is the default and MUST keep its existing values — the
 * marketing shell, the header, the boot doors and the hero all read these
 * tokens today, and a theme layer that changes how the site already looks is
 * a refactor pretending to be a feature.
 */

import { ThemeTokens } from './theme.tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  /** Stable id — persisted, so renaming one drops a user's choice. */
  id: string;
  /** What the switcher shows. */
  label: string;
  /** One line on what it is for; shown under the label. */
  note: string;
  /**
   * Which way round the theme runs. Drives `color-scheme` (so form controls,
   * scrollbars and the caret match) and PrimeNG's `.app-dark` selector, which
   * is what re-skins every PrimeNG component along with our own CSS.
   */
  scheme: ColorScheme;
  tokens: ThemeTokens;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 · ELEVATOR DARK — the brand, and the default
   ───────────────────────────────────────────────────────────────────────────
   Cool near-black surfaces, one warm accent. These values are lifted
   verbatim from what the preset already emitted, so nothing that exists
   today moves by a pixel or a hex digit.
   ═══════════════════════════════════════════════════════════════════════════ */

const ELEVATOR_DARK: ThemeTokens = {
  bg0: '#04060a',
  bg1: '#070a10',
  ground: '#04060a',
  groundDeep: '#020306',
  panel: '#0a0e15',
  panel2: '#111824',
  panelHi: '#111824',
  panelRaised: '#161f2e',
  overlay: 'rgba(4, 6, 10, .72)',

  ink: '#e9eef5',
  ink2: '#aab4c2',
  ink3: '#6b7585',
  ink4: '#454f5e',

  line: 'rgba(150, 180, 210, .12)',
  lineSoft: 'rgba(150, 180, 210, .07)',
  lineStrong: 'rgba(150, 180, 210, .22)',
  lineHard: 'rgba(150, 180, 210, .34)',

  accent: '#ffd35b',
  accentInk: '#1a1204',
  accentSoft: 'color-mix(in oklch, #ffd35b 22%, transparent)',
  accentWash: 'color-mix(in oklch, #ffd35b 12%, transparent)',
  accentWash2: 'color-mix(in oklch, #ffd35b 24%, transparent)',
  accentGlow: 'color-mix(in oklch, #ffd35b 40%, transparent)',
  accentGlowExtreme: 'color-mix(in oklch, #ffd35b 90%, transparent)',
  accentDim: 'color-mix(in oklch, #ffd35b 55%, #0a0e14)',

  good: '#3fd68b',
  goodWash: 'color-mix(in oklch, #3fd68b 16%, transparent)',
  goodInk: '#041e12',
  caution: '#f0b35b',
  cautionWash: 'color-mix(in oklch, #f0b35b 16%, transparent)',
  cautionInk: '#20150a',
  warn: '#ff6b8a',
  warnWash: 'color-mix(in oklch, #ff6b8a 16%, transparent)',
  warnInk: '#2a0511',

  /* The paper does not follow the chrome into the dark. A CV is printed on
     white and must be composed on white, or every judgement about contrast
     and weight made in the editor is wrong on the day it matters. */
  paper: '#ffffff',
  paperInk: '#101215',
  paperInk2: '#55595f',
  paperInk3: '#83878d',
  paperRule: 'rgba(16, 18, 21, .16)',
  paperMark: 'rgba(210, 220, 235, .30)',
  paperShadow: '0 1px 1px rgba(0, 0, 0, .4), 0 18px 48px -16px rgba(0, 0, 0, .74)',
  grain: 'rgba(150, 180, 210, .030)',

  lift1: '0 1px 2px rgba(0, 0, 0, .34)',
  lift2: '0 2px 6px rgba(0, 0, 0, .40), 0 1px 2px rgba(0, 0, 0, .30)',
  lift3: '0 10px 34px -8px rgba(0, 0, 0, .58), 0 2px 8px rgba(0, 0, 0, .34)',
  lift4: '0 28px 70px -18px rgba(0, 0, 0, .70), 0 4px 14px rgba(0, 0, 0, .40)',

  fontUi: "'Sora', system-ui, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
  fontSerif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  fontSans: "'Public Sans', system-ui, sans-serif",
  fontDisplay: "'Varino', 'Orbitron', system-ui, sans-serif",
};

/* ═══════════════════════════════════════════════════════════════════════════
   2 · PRESS — the light table
   ───────────────────────────────────────────────────────────────────────────
   Built for the create flow. The palette is the process colours of printing:
   cyan for what is live, magenta for what is wrong, over a warm grey that is
   the colour of the surround on a light table. The point of the warm grey is
   that it makes the paper read as the brightest thing on the screen without
   resorting to black chrome — which matters, because the paper is the
   subject and the interface is not.
   ═══════════════════════════════════════════════════════════════════════════ */

const PRESS_LIGHT: ThemeTokens = {
  bg0: '#e4e2dc',
  bg1: '#d6d3cb',
  ground: '#e4e2dc',
  groundDeep: '#d6d3cb',
  panel: '#f5f4f0',
  panel2: '#eceae4',
  panelHi: '#eceae4',
  panelRaised: '#fbfaf8',
  overlay: 'rgba(24, 26, 30, .32)',

  ink: '#16181c',
  ink2: '#4a4f57',
  ink3: '#767c85',
  ink4: '#9aa0a8',

  line: 'rgba(22, 24, 28, .10)',
  lineSoft: 'rgba(22, 24, 28, .06)',
  lineStrong: 'rgba(22, 24, 28, .18)',
  lineHard: 'rgba(22, 24, 28, .30)',

  accent: '#0089b8',
  accentInk: '#ffffff',
  accentSoft: 'rgba(0, 137, 184, .16)',
  accentWash: 'rgba(0, 137, 184, .10)',
  accentWash2: 'rgba(0, 137, 184, .20)',
  accentGlow: 'rgba(0, 137, 184, .40)',
  accentGlowExtreme: 'rgba(0, 137, 184, .90)',
  accentDim: 'color-mix(in srgb, #0089b8 55%, #f5f4f0)',

  good: '#0d7a55',
  goodWash: 'rgba(13, 122, 85, .12)',
  goodInk: '#ffffff',
  caution: '#a8690a',
  cautionWash: 'rgba(168, 105, 10, .12)',
  cautionInk: '#ffffff',
  warn: '#c4126f',
  warnWash: 'rgba(196, 18, 111, .10)',
  warnInk: '#ffffff',

  paper: '#ffffff',
  paperInk: '#101215',
  paperInk2: '#55595f',
  paperInk3: '#83878d',
  paperRule: 'rgba(16, 18, 21, .16)',
  paperMark: 'rgba(16, 18, 21, .34)',
  paperShadow: '0 1px 1px rgba(20, 22, 26, .06), 0 12px 34px -14px rgba(20, 22, 26, .34)',
  grain: 'rgba(70, 66, 56, .028)',

  lift1: '0 1px 2px rgba(20, 22, 26, .08)',
  lift2: '0 2px 6px rgba(20, 22, 26, .10), 0 1px 2px rgba(20, 22, 26, .06)',
  lift3: '0 10px 34px -8px rgba(20, 22, 26, .26), 0 2px 8px rgba(20, 22, 26, .10)',
  lift4: '0 28px 70px -18px rgba(20, 22, 26, .40), 0 4px 14px rgba(20, 22, 26, .12)',

  fontUi: "'Sora', system-ui, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
  fontSerif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  fontSans: "'Public Sans', system-ui, sans-serif",
  fontDisplay: "'Sora', system-ui, sans-serif",
};

/* The same room at night. The chrome inverts; the paper does not. */
const PRESS_DARK: ThemeTokens = {
  ...PRESS_LIGHT,

  bg0: '#0d0f12',
  bg1: '#131619',
  ground: '#131619',
  groundDeep: '#0d0f12',
  panel: '#1b1f24',
  panel2: '#22272d',
  panelHi: '#22272d',
  panelRaised: '#2a3037',
  overlay: 'rgba(6, 8, 10, .58)',

  ink: '#eef1f4',
  ink2: '#b3bac2',
  ink3: '#848c96',
  ink4: '#616872',

  line: 'rgba(200, 214, 230, .10)',
  lineSoft: 'rgba(200, 214, 230, .06)',
  lineStrong: 'rgba(200, 214, 230, .18)',
  lineHard: 'rgba(200, 214, 230, .30)',

  /* Lifted for the darker ground: #0089b8 on #131619 is legible but joyless,
     and the accent has to survive being a 1px rule as well as a fill. */
  accent: '#22b8e8',
  accentInk: '#04222c',
  accentSoft: 'rgba(34, 184, 232, .20)',
  accentWash: 'rgba(34, 184, 232, .13)',
  accentWash2: 'rgba(34, 184, 232, .26)',
  accentGlow: 'rgba(34, 184, 232, .40)',
  accentGlowExtreme: 'rgba(34, 184, 232, .90)',
  accentDim: 'color-mix(in srgb, #22b8e8 55%, #131619)',

  good: '#35c98d',
  goodWash: 'rgba(53, 201, 141, .15)',
  goodInk: '#042315',
  caution: '#dfa03a',
  cautionWash: 'rgba(223, 160, 58, .15)',
  cautionInk: '#231708',
  warn: '#f0559d',
  warnWash: 'rgba(240, 85, 157, .14)',
  warnInk: '#2c0416',

  paperMark: 'rgba(210, 220, 235, .30)',
  paperShadow: '0 1px 1px rgba(0, 0, 0, .4), 0 18px 48px -16px rgba(0, 0, 0, .74)',
  grain: 'rgba(190, 205, 225, .026)',

  lift1: '0 1px 2px rgba(0, 0, 0, .34)',
  lift2: '0 2px 6px rgba(0, 0, 0, .40), 0 1px 2px rgba(0, 0, 0, .30)',
  lift3: '0 10px 34px -8px rgba(0, 0, 0, .58), 0 2px 8px rgba(0, 0, 0, .34)',
  lift4: '0 28px 70px -18px rgba(0, 0, 0, .70), 0 4px 14px rgba(0, 0, 0, .40)',
};

/* ═══════════════════════════════════════════════════════════════════════════
   3 · CARBON — high contrast
   ───────────────────────────────────────────────────────────────────────────
   Not a style. Pure black ground, white ink, one saturated accent, hairlines
   pushed to a weight that survives a cheap panel and a bright room. It exists
   because the light table's warm greys are lovely and, at 9.5px, thin.
   ═══════════════════════════════════════════════════════════════════════════ */

const CARBON: ThemeTokens = {
  ...PRESS_DARK,

  bg0: '#000000',
  bg1: '#000000',
  ground: '#000000',
  groundDeep: '#000000',
  panel: '#0b0b0c',
  panel2: '#151517',
  panelHi: '#151517',
  panelRaised: '#1f1f22',
  overlay: 'rgba(0, 0, 0, .78)',

  ink: '#ffffff',
  ink2: '#dcdce0',
  ink3: '#b4b4ba',
  ink4: '#8e8e96',

  line: 'rgba(255, 255, 255, .22)',
  lineSoft: 'rgba(255, 255, 255, .14)',
  lineStrong: 'rgba(255, 255, 255, .38)',
  lineHard: 'rgba(255, 255, 255, .60)',

  accent: '#4dd2ff',
  accentInk: '#001521',
  accentSoft: 'rgba(77, 210, 255, .26)',
  accentWash: 'rgba(77, 210, 255, .18)',
  accentWash2: 'rgba(77, 210, 255, .34)',
  accentGlow: 'rgba(77, 210, 255, .50)',
  accentGlowExtreme: 'rgba(77, 210, 255, .95)',
  accentDim: '#2a7fa0',

  good: '#4ae5a0',
  goodWash: 'rgba(74, 229, 160, .20)',
  goodInk: '#00160c',
  caution: '#ffc247',
  cautionWash: 'rgba(255, 194, 71, .20)',
  cautionInk: '#1a1200',
  warn: '#ff6fae',
  warnWash: 'rgba(255, 111, 174, .20)',
  warnInk: '#210310',
  grain: 'rgba(255, 255, 255, 0)',
};

/* ═══════════════════════════════════════════════════════════════════════════
   THE REGISTRY
   ═══════════════════════════════════════════════════════════════════════════ */

export const THEMES: readonly Theme[] = [
  {
    id: 'elevator-dark',
    label: 'Elevator',
    note: 'The brand. Near-black chrome, one warm accent.',
    scheme: 'dark',
    tokens: ELEVATOR_DARK,
  },
  {
    id: 'press-light',
    label: 'Light table',
    note: 'Warm grey surround, printer’s cyan. Built for composing a page.',
    scheme: 'light',
    tokens: PRESS_LIGHT,
  },
  {
    id: 'press-dark',
    label: 'Light table, night',
    note: 'The same room after hours. The paper stays white.',
    scheme: 'dark',
    tokens: PRESS_DARK,
  },
  {
    id: 'carbon',
    label: 'High contrast',
    note: 'Black ground, white ink, heavier rules. For bright rooms and tired eyes.',
    scheme: 'dark',
    tokens: CARBON,
  },
] as const;

export const DEFAULT_THEME_ID = 'elevator-dark';

/** The theme the PrimeNG preset bakes in as its `:root` defaults. */
export const BASE_THEME = ELEVATOR_DARK;

export const themeById = (id: string): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
