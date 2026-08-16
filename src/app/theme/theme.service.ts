/**
 * ELEVATOR — the theme switcher
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The whole public surface is one call:
 *
 *     theme.use('press-light');
 *
 * Everything else — every panel, rule, chip, sheet and PrimeNG component —
 * follows, because nothing in the app holds a colour of its own.
 *
 * HOW IT WORKS. The PrimeNG preset emits the default theme's values as
 * `--p-elevator-*` on `:root` at build time. Applying a theme writes the same
 * property names onto `<html>` as INLINE styles, which win over `:root`
 * regardless of specificity or source order — so no `!important`, no
 * stylesheet swap, no flash of the previous palette, and one paint.
 *
 * WHY NOT A CLASS PER THEME. A `.theme-carbon` class means every new theme
 * needs new CSS, which is the thing this layer exists to avoid. Writing the
 * values keeps themes as data: `themes.ts` is the only file a new theme
 * touches.
 */

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';

import { INVARIANT_TOKENS, THEME_TOKENS, cssVarName } from './theme.tokens';
import { DEFAULT_THEME_ID, THEMES, Theme, themeById } from './themes';

const STORE_KEY = 'elevator.theme';

/** PrimeNG's `darkModeSelector`, set in `main.ts`. Keep the two in step. */
const DARK_CLASS = 'app-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  private readonly _id = signal<string>(DEFAULT_THEME_ID);

  /** The active theme id. Read it in a template; it is a signal. */
  readonly id = this._id.asReadonly();
  readonly current = computed<Theme>(() => themeById(this._id()));
  readonly scheme = computed(() => this.current().scheme);
  readonly all = THEMES;

  /**
   * Called once from the app initialiser, before the first paint, so a
   * returning user never sees the default theme flash past their choice.
   */
  init(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORE_KEY);
    } catch {
      /* private mode — the choice simply does not persist */
    }
    this.apply(saved && THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME_ID, false);

    /* A handle for trying palettes from the console while designing:
       `__theme.use('carbon')`, `__theme.patch({ accent: '#f50' })`.
       Dev only — it never ships. */
    if (isDevMode()) (globalThis as unknown as Record<string, unknown>)['__theme'] = this;
  }

  /** Switch theme. This is the function the whole layer exists to make cheap. */
  use(id: string): void {
    this.apply(id, true);
  }

  /** Step to the next theme in the registry — for a single toggle control. */
  next(): void {
    const at = THEMES.findIndex((t) => t.id === this._id());
    this.use(THEMES[(at + 1) % THEMES.length].id);
  }

  /**
   * Flip light ↔ dark within the current family where one exists, otherwise
   * fall back to the first theme running the other way. A user reaching for a
   * dark-mode toggle wants the dark version of what they are looking at, not
   * an unrelated palette.
   */
  toggleScheme(): void {
    const now = this.current();
    const want = now.scheme === 'dark' ? 'light' : 'dark';
    const family = now.id.replace(/-(light|dark)$/, '');
    const sibling =
      THEMES.find((t) => t.scheme === want && t.id.startsWith(family)) ??
      THEMES.find((t) => t.scheme === want);
    if (sibling) this.use(sibling.id);
  }

  /**
   * Override single tokens on top of the active theme — the hook a "brand
   * colour" picker or a per-tenant palette plugs into, without needing to be
   * a theme of its own.
   */
  patch(tokens: Partial<Record<string, string>>): void {
    const root = this.doc.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
      if (value != null) root.style.setProperty(cssVarName(key), value);
    }
  }

  /** Read a token's computed value — for canvas, PDF export, meta tags. */
  read(token: string): string {
    return getComputedStyle(this.doc.documentElement).getPropertyValue(cssVarName(token)).trim();
  }

  /* ── the actual write ─────────────────────────────────────────────────── */

  private apply(id: string, persist: boolean): void {
    const theme = themeById(id);
    const root = this.doc.documentElement;

    /* Every token, every time. Writing only what changed would leave the
       previous theme's value in place for anything the new one happens not to
       mention — which is exactly the bug the full-contract type prevents at
       compile time, so it would be careless to reintroduce it here. */
    for (const token of THEME_TOKENS) {
      root.style.setProperty(cssVarName(token), theme.tokens[token]);
    }

    /* The invariants are emitted by the preset already; they are re-asserted
       here so a page rendered before the preset's stylesheet arrives (or in a
       detached document, as the print path uses) still has its geometry. */
    for (const [token, value] of Object.entries(INVARIANT_TOKENS)) {
      root.style.setProperty(cssVarName(token), value);
    }

    /* Two switches that are not ours: PrimeNG re-skins its components off the
       dark class, and the browser paints form controls, scrollbars and the
       caret off `color-scheme`. Both have to agree with the tokens or the
       parts we do not draw will belong to the other theme. */
    root.classList.toggle(DARK_CLASS, theme.scheme === 'dark');
    root.style.colorScheme = theme.scheme;
    root.dataset['theme'] = theme.id;

    this._id.set(theme.id);

    if (persist) {
      try {
        localStorage.setItem(STORE_KEY, theme.id);
      } catch {
        /* private mode */
      }
    }
  }
}
