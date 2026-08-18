/**
 * THE FONT DRAWER
 * ═══════════════════════════════════════════════════════════════════════════
 * Two bundled faces, and — where the browser allows it — every font installed
 * on the reader's own machine.
 *
 * WHY ASK THE MACHINE AT ALL. A CV is a file that gets opened somewhere else,
 * so the safe answer is always one of the two faces that travel with it. But
 * plenty of people already own the face their industry expects, and telling
 * them "these two, take it or leave it" is the kind of restriction a builder
 * has no business imposing. So: the bundled pair first, always, then whatever
 * is on the machine — clearly separated, never mixed.
 *
 * THE PERMISSION. `queryLocalFonts()` is the Local Font Access API. It is
 * Chromium-only, it needs a secure context, and it prompts. All three of
 * those are refusals waiting to happen, so nothing here is called until the
 * reader asks for it, and every failure lands on a state the UI can render
 * rather than on an exception nobody catches.
 */

import { Injectable, computed, signal } from '@angular/core';

export interface FontChoice {
  /** What goes into `design.font`. */
  value: string;
  label: string;
  /** The CSS to preview it in. */
  stack: string;
  source: 'bundled' | 'local';
}

export type FontAccess = 'idle' | 'unsupported' | 'loading' | 'granted' | 'denied';

/** The two faces that travel with the document. */
export const BUNDLED_FONTS: FontChoice[] = [
  { value: 'serif', label: 'Source Serif', stack: 'var(--p-elevator-font-serif)', source: 'bundled' },
  { value: 'sans', label: 'Public Sans', stack: 'var(--p-elevator-font-sans)', source: 'bundled' },
];

interface LocalFontData { family: string; fullName: string; postscriptName: string; style: string }
type FontQuery = () => Promise<LocalFontData[]>;

@Injectable({ providedIn: 'root' })
export class LocalFontsService {
  private readonly _local = signal<FontChoice[]>([]);
  private readonly _state = signal<FontAccess>('idle');

  readonly local = this._local.asReadonly();
  readonly state = this._state.asReadonly();

  /** The bundled pair, then the machine's — in that order, always. */
  readonly all = computed<FontChoice[]>(() => [...BUNDLED_FONTS, ...this._local()]);

  readonly supported = typeof window !== 'undefined' && 'queryLocalFonts' in window;

  constructor() {
    if (!this.supported) this._state.set('unsupported');
  }

  /**
   * Ask the machine. Called from a click, because the permission prompt this
   * raises is only granted from a user gesture — and because a CV builder
   * that enumerates your fonts on load is doing something you did not ask for.
   */
  async load(): Promise<void> {
    if (!this.supported || this._state() === 'loading') return;
    this._state.set('loading');
    try {
      const query = (window as unknown as { queryLocalFonts: FontQuery }).queryLocalFonts;
      const faces = await query();

      /* One entry per FAMILY, not per face. The API returns every weight and
         italic as its own record — 'Helvetica Neue Thin Italic' is not a
         choice anyone wants in a list of six hundred. */
      const families = new Map<string, string>();
      for (const f of faces) {
        if (!f.family || families.has(f.family)) continue;
        families.set(f.family, f.family);
      }

      this._local.set([...families.keys()].sort((a, b) => a.localeCompare(b)).map((family) => ({
        value: family,
        label: family,
        stack: `"${family.replace(/["\\]/g, '')}", var(--p-elevator-font-sans)`,
        source: 'local' as const,
      })));
      this._state.set('granted');
    } catch {
      /* Refusal and "no such API" are the same outcome to the reader: the
         bundled pair is what they get. */
      this._state.set('denied');
    }
  }
}
