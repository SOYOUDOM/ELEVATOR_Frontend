/**
 * THE FONT CATALOGUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Two sources, one list:
 *
 *   · OURS — the faces the app already loads, so they render identically on
 *     every machine and, more to the point, on the recruiter's.
 *   · YOURS — whatever is installed on this computer, read through the Local
 *     Font Access API where the browser has it, and otherwise probed for by
 *     measurement.
 *
 * A LOCAL FONT IS A TRADE, AND THE UI SAYS SO. A CV set in a font only you
 * have still prints correctly from here, because print uses this machine —
 * but the DOCX export and anyone who opens the file elsewhere will see a
 * substitute, and the page will reflow. That is why every local face is
 * marked, rather than mixed in and hoped for.
 *
 * The probe is the old trick: render a string in the candidate with each of
 * the three generic fallbacks and see whether the width moves. If the
 * candidate is missing, the browser uses the fallback and the widths match.
 */

export interface FontEntry {
  /** What goes in `font-family`, quoted if it needs to be. */
  stack: string;
  label: string;
  /** `ours` renders the same everywhere; `local` is this machine only. */
  source: 'ours' | 'local';
  kind: 'serif' | 'sans' | 'mono' | 'display';
}

/* ── ours ─────────────────────────────────────────────────────────────────
   Read from the theme so a theme that changes the document's voice changes
   this list with it, rather than the two drifting apart. */
export function ourFonts(read: (token: string) => string): FontEntry[] {
  const pick = (token: string, label: string, kind: FontEntry['kind']): FontEntry | null => {
    const stack = read(token);
    return stack ? { stack, label, source: 'ours', kind } : null;
  };
  return [
    pick('fontSerif', 'Source Serif', 'serif'),
    pick('fontSans', 'Public Sans', 'sans'),
    pick('fontUi', 'Sora', 'sans'),
    pick('fontMono', 'IBM Plex Mono', 'mono'),
  ].filter(Boolean) as FontEntry[];
}

/* ── the ones worth probing for ───────────────────────────────────────────
   Faces that actually ship with Windows, macOS or a common Office install,
   and that a CV is plausibly set in. Probing for four hundred names would
   cost a hundred milliseconds and offer a list nobody can read. */
const CANDIDATES: Array<[string, FontEntry['kind']]> = [
  ['Georgia', 'serif'], ['Garamond', 'serif'], ['EB Garamond', 'serif'],
  ['Palatino Linotype', 'serif'], ['Book Antiqua', 'serif'], ['Cambria', 'serif'],
  ['Constantia', 'serif'], ['Charter', 'serif'], ['Times New Roman', 'serif'],
  ['Iowan Old Style', 'serif'], ['Baskerville', 'serif'], ['Merriweather', 'serif'],

  ['Calibri', 'sans'], ['Segoe UI', 'sans'], ['Helvetica Neue', 'sans'],
  ['Arial', 'sans'], ['Verdana', 'sans'], ['Tahoma', 'sans'], ['Corbel', 'sans'],
  ['Candara', 'sans'], ['Lato', 'sans'], ['Open Sans', 'sans'], ['Roboto', 'sans'],
  ['Inter', 'sans'], ['Avenir Next', 'sans'], ['Optima', 'sans'],

  ['Consolas', 'mono'], ['Menlo', 'mono'], ['Courier New', 'mono'],
  ['SF Mono', 'mono'], ['Cascadia Code', 'mono'],

  /* Khmer — ELEVATOR is built for Cambodia first, and a CV written in Khmer
     in a Latin-only face is a page of empty boxes. */
  ['Khmer OS', 'sans'], ['Khmer OS Battambang', 'sans'], ['Khmer OS Siemreap', 'sans'],
  ['Kantumruy Pro', 'sans'], ['Noto Sans Khmer', 'sans'], ['Noto Serif Khmer', 'serif'],
  ['Leelawadee UI', 'sans'],
];

const PROBE = 'mmmmmmmmmmlliWWWWWWWWកាន';
const GENERICS = ['monospace', 'serif', 'sans-serif'];

/** Width of `PROBE` in a family, at a size big enough to expose a difference. */
function widthIn(ctx: CanvasRenderingContext2D, family: string): number {
  ctx.font = `72px ${family}`;
  return ctx.measureText(PROBE).width;
}

/**
 * Faces installed on this machine. Uses the Local Font Access API when the
 * browser has it AND the user grants it; falls back to measurement, which
 * needs no permission and no prompt.
 */
export async function localFonts(): Promise<FontEntry[]> {
  const api = (globalThis as unknown as {
    queryLocalFonts?: () => Promise<Array<{ family: string; fullName: string }>>;
  }).queryLocalFonts;

  if (typeof api === 'function') {
    try {
      const seen = new Map<string, FontEntry>();
      for (const f of await api()) {
        if (seen.has(f.family)) continue;
        seen.set(f.family, {
          stack: `"${f.family}"`,
          label: f.family,
          source: 'local',
          kind: guessKind(f.family),
        });
      }
      return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      /* Declined, or not allowed in this context. Fall through and measure —
         a refusal must not leave the user with no list at all. */
    }
  }
  return probeFonts();
}

/** No permission, no prompt: measure and compare. */
export function probeFonts(): FontEntry[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const base = GENERICS.map((g) => widthIn(ctx, g));

  return CANDIDATES
    .filter(([name]) => GENERICS.some((g, i) => widthIn(ctx, `"${name}", ${g}`) !== base[i]))
    .map(([name, kind]) => ({ stack: `"${name}"`, label: name, source: 'local' as const, kind }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function guessKind(family: string): FontEntry['kind'] {
  const f = family.toLowerCase();
  if (/mono|code|consol|courier|menlo/.test(f)) return 'mono';
  if (/serif|georgia|garamond|times|cambria|palatino|book|charter|baskerville/.test(f)) return 'serif';
  return 'sans';
}
