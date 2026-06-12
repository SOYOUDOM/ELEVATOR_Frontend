# ELEVATOR — Angular animation migration

Everything from the prototype's animation system, ported to your Angular + PrimeNG + Tailwind project. Your boot overlay/lifecycle was already in place — this package **upgrades it to the dramatic v2 doors** and adds the **per-component scroll-reveal system**, plus the **brand/nav choreography hooks** your markup was missing.

## Files in this folder

| File | What it is | Where it goes |
|---|---|---|
| `reveal.directive.ts` | `elvReveal` scroll-reveal directive (IntersectionObserver) | `src/app/shared/directives/` |
| `_reveals.scss` | The 12-effect `.rv-*` library the directive drives | `src/styles/` → `@use "styles/reveals";` in `styles.scss` |
| `_boot-intro-v2.scss` | Dramatic doors v2 + power-on choreography | **Replaces** the `//intro` block in your `styles.scss` |
| `header.component.html` | Adds the `nav-saber` sweep span | replaces yours |
| `header-left-navbar.component.html` | Brand letter-cascade markup (`.lead` / `.brand-l` / `.brand-sub`) | replaces yours |
| `landing.component.html` | Landing page with per-component `elvReveal` assignments | replaces yours |

## Install steps

### 1. Boot v2 (slower, dramatic doors)
- In `styles.scss`, delete the old intro block (from `/* boot overlay: elevator doors */` through `@keyframes navLink`) and paste in `_boot-intro-v2.scss` (or `@use` it as a partial).
- In `app.component.html`, add the flash layer to the overlay:
  ```html
  <div class="boot" *ngIf="booting" aria-hidden="true">
    <div class="boot-door l"></div>
    <div class="boot-door r"></div>
    <div class="boot-flash"></div>   <!-- NEW -->
    <div class="boot-seam"></div>
    <div class="boot-label">…</div>
  </div>
  ```
- In `app.component.ts`: `BOOT_MS = 2400` → **`3600`** (doors now finish at ~2.4s, content choreographs through ~3.4s).

### 2. Scroll reveals
- Drop `reveal.directive.ts` into your shared directives folder.
- Add `_reveals.scss` to your global styles (selectors are global on purpose — the directive works in any component regardless of view encapsulation).
- Import the directive where used:
  ```ts
  // landing.component.ts
  import { RevealDirective } from '@shared/directives/reveal.directive';
  @Component({ imports: [CommonModule, …, RevealDirective], … })
  ```
- Use it:
  ```html
  <div elvReveal="scan" [revealDelay]="i * 0.08">…</div>
  ```
  Effects: `rise` (default) · `left` · `right` · `pop` · `flip` · `doors` · `iris` · `scan` · `wipe` · `zoom` · `glitch` · `drop`
  Options: `[revealDelay]` (s) · `[revealY]` (px, rise only) · `[revealOnce]` · `[revealThreshold]`

### 3. Brand + nav choreography
- Replace `header.component.html` (adds `<span class="nav-saber">`).
- Replace `header-left-navbar.component.html` and add to its `.ts`:
  ```ts
  brandLetters = 'LEVATOR'.split('');
  ```

### 4. Landing assignments (already wired in the provided template)
| Component | Effect |
|---|---|
| Stats band, photo spotlight | `doors` — clips open from a flashing seam |
| Section heads | `wipe` |
| Feature cards | `scan`, staggered `i * 0.08` |
| Step cards | `flip`, staggered `i * 0.12` |
| CTA band | `zoom` |
| Hero | untouched — boot choreography owns it |

## Notes
- All hidden states are gated behind `prefers-reduced-motion: no-preference`; reduced-motion users see content instantly, and the directive force-adds `.seen` under SSR so nothing pre-renders invisible.
- Reveals **replay** when elements scroll out and back in. If you'd rather fire once (analytics-heavy pages, long lists), set `[revealOnce]="true"` per element or flip the default in the directive.
- The CSS reads accent colors from `--p-elevator-accent` / `--p-elevator-accent-glow` (your PrimeNG preset vars) with hard-coded brand fallbacks.
- `OnPush` components are fine: the directive only toggles classes via Renderer2, no change detection needed.
