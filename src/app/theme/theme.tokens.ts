/**
 * ELEVATOR — the design-token contract
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ONE list of token names, used by three things that must never disagree:
 *
 *   1. `my-preset.ts`   — spreads a theme's tokens into the PrimeNG preset, so
 *                         they are emitted as `--p-elevator-*` at build time.
 *   2. `themes.ts`      — every named theme fills in this same contract.
 *   3. `ThemeService`   — writes a theme's values onto the document root at
 *                         runtime, using the same names.
 *
 * WHY A CONTRACT AND NOT JUST OBJECTS. A theme switcher only works if every
 * theme sets every token. If one theme forgets `--p-elevator-warn`, the
 * previous theme's magenta survives the switch and you get a colour from a
 * palette you are no longer using, on a surface that has moved. Typing the
 * map as `Record<ThemeToken, string>` makes that a compile error rather than
 * a screenshot someone notices three weeks later.
 *
 * NOTHING IN THE APP MAY HARD-CODE A COLOUR. Stylesheets read
 * `var(--p-elevator-…)` and only that. That single rule is what makes the
 * theme switch total — swapping the values re-skins the whole product,
 * including the CV page, without touching one line of SCSS.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   THE SCHEME TOKENS — everything a theme is allowed to change
   ═══════════════════════════════════════════════════════════════════════════ */

export const THEME_TOKENS = [
  /* ── surfaces ─────────────────────────────────────────────────────────
     `ground` is the surround the work sits on; `panel` is chrome; the
     `raised` step is for anything that must read as lifted off its panel. */
  'bg0',            // deepest ground — the app's backdrop
  'bg1',            // one step up, for large inset areas
  'ground',         // the light table's surround
  'groundDeep',     // its shadowed edge
  'panel',          // chrome panels: bars, rails, inspectors
  'panel2',         // recessed within a panel: tracks, wells, heads
  'panelHi',        // legacy alias of panel2, kept for existing components
  'panelRaised',    // lifted within a panel: cards, fields, active segments
  'overlay',        // the scrim behind modals and drawers

  /* ── ink ──────────────────────────────────────────────────────────────
     Four steps, strongest to faintest. Nothing may invent a fifth. */
  'ink',
  'ink2',
  'ink3',
  'ink4',

  /* ── rules ────────────────────────────────────────────────────────────
     Hairlines, three weights. `line` is the default divider. */
  'line',
  'lineSoft',
  'lineStrong',
  'lineHard',

  /* ── the accent, and the states derived from it ───────────────────────
     `accentInk` is what goes ON the accent — a theme with a pale accent
     must be able to say "black text", which a computed contrast cannot
     be trusted to get right at these sizes. */
  'accent',
  'accentInk',
  'accentSoft',
  'accentWash',
  'accentWash2',
  'accentGlow',
  'accentGlowExtreme',
  'accentDim',

  /* ── semantic status, kept separate from the accent ───────────────────
     A theme may make its accent green; that must not silently turn every
     "good" state into the brand colour, nor make a warning invisible. */
  'good',           // complete, passing, on track
  'goodWash',
  'goodInk',        // what goes ON a good fill
  'caution',        // worth a look, not wrong
  'cautionWash',
  'cautionInk',
  'warn',           // wrong, missing, over the limit
  'warnWash',
  'warnInk',

  /* ── the paper ────────────────────────────────────────────────────────
     A CV that looked different depending on the editor's theme would be a
     lie about what gets printed, so themes normally leave these alone —
     but they remain tokens so a "print proof" or high-contrast theme can
     legitimately change them. */
  'paper',
  'paperInk',
  'paperInk2',
  'paperInk3',
  'paperRule',
  'paperMark',      // crop marks and registration
  'paperShadow',

  /* ── texture ──────────────────────────────────────────────────────────
     The barely-there fibre grain on the light table's surround. A token
     because a high-contrast theme wants it gone, and a paper-stock theme
     might want it stronger. */
  'grain',

  /* ── elevation ────────────────────────────────────────────────────────
     Shadows are colour, not geometry: the same offsets that read as depth
     on a light ground read as dirt on a dark one. Per-theme. */
  'lift1',
  'lift2',
  'lift3',
  'lift4',

  /* ── type ─────────────────────────────────────────────────────────────
     Families are per-theme so a theme can change the voice, not just the
     colour. The size scale below is invariant. */
  'fontUi',
  'fontMono',
  'fontSerif',
  'fontSans',
  'fontDisplay',
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/** Every token, filled in. A theme may not be partial — see the note above. */
export type ThemeTokens = Record<ThemeToken, string>;

/* ═══════════════════════════════════════════════════════════════════════════
   THE INVARIANT TOKENS — geometry, scale and motion
   ───────────────────────────────────────────────────────────────────────────
   These are the product's proportions, not its skin. A theme that could
   change the A4 page size or the type scale would not be a theme; it would
   be a different application. They are emitted once from the preset.
   ═══════════════════════════════════════════════════════════════════════════ */

export const INVARIANT_TOKENS = {
  /* A4 at 96dpi, and the unitless twins the zoom maths needs — `scale()`
     takes a NUMBER, and dividing two lengths yields a length, which makes
     the whole transform invalid and silently drops it. */
  pageWn: '794',
  pageHn: '1123',
  pageW: 'calc(var(--p-elevator-page-wn) * 1px)',
  pageH: 'calc(var(--p-elevator-page-hn) * 1px)',

  /* the create-flow chrome */
  barH: '52px',
  statusH: '28px',
  railW: '268px',
  inspectorW: '340px',
  timelineH: '148px',
  intakeW: 'clamp(430px, 45vw, 660px)',
  docketW: '186px',

  /* the marketing shell, unchanged */
  navbarHeight: '88px',
  corner: '13px',
  maxw: '1240px',
  minw: '937px',
  edgecolor: '--p-elevator-line',

  /* A 1.2 scale, held to strictly. Nothing in the create flow is off it. */
  t2xs: '9.5px',
  txs: '10.5px',
  tsm: '11.5px',
  tmd: '13px',
  tlg: '15px',
  txl: '18px',
  t2xl: '22px',
  t3xl: '27px',
  t4xl: '33px',
  trackWide: '.18em',
  trackMono: '.04em',

  /* motion */
  ease: 'cubic-bezier(.2, .7, .2, 1)',
  easeOut: 'cubic-bezier(.16, 1, .3, 1)',
  easeSnap: 'cubic-bezier(.5, 0, .1, 1)',
  tFast: '.14s',
  tBase: '.22s',
  tSlow: '.42s',
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   NAME MAPPING
   ───────────────────────────────────────────────────────────────────────────
   PrimeNG dash-cases a camelCase primitive key and prefixes it, so
   `panelRaised` is emitted as `--p-elevator-panel-raised`. A trailing digit
   stays welded to the word it belongs to: `ink2` → `--p-elevator-ink2`, which
   is why the ink ramp is named that way rather than `ink-2`.

   The runtime switcher has to produce byte-identical names or it would write
   a second, unused variable and appear to do nothing. So both sides go
   through this one function.
   ═══════════════════════════════════════════════════════════════════════════ */

export function cssVarName(token: string): string {
  const kebab = token.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `--p-elevator-${kebab}`;
}
