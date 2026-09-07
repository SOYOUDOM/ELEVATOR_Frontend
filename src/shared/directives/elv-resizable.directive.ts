/**
 * ELV-RESIZABLE — drag a panel's edge
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     <aside class="rail" elvResizable side="right" cssVar="--rail-w"
 *            [min]="200" [max]="420" storeKey="cv.rail"></aside>
 *
 * Writes the new width to a CSS custom property on the host's PARENT rather
 * than to the element's own `width`, because in a grid the track owns the
 * width and setting the item's does nothing. The property the layout already
 * reads is the one thing that can move it.
 *
 * The size is remembered. A panel width is a working preference, and having
 * to re-drag it on every visit is how people learn to leave it alone.
 */

import {
  DestroyRef, Directive, ElementRef, OnInit, Renderer2, inject, input,
} from '@angular/core';

@Directive({
  selector: '[elvResizable]',
  standalone: true,
  host: { '[class.elv-resizable]': 'true' },
})
export class ElvResizableDirective implements OnInit {
  /** Which edge carries the handle. */
  readonly side = input<'left' | 'right'>('right');
  /** The custom property the layout reads for this panel's width. */
  readonly cssVar = input.required<string>();
  readonly min = input(180);
  readonly max = input(560);
  /** Where the chosen width is remembered. Omit to forget on reload. */
  readonly storeKey = input('');
  /** Element the property is written to. Defaults to the host's parent. */
  readonly target = input<HTMLElement | null>(null);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  private handle?: HTMLElement;
  private startX = 0;
  private startW = 0;

  ngOnInit(): void {
    const el = this.host.nativeElement as HTMLElement;

    const handle = this.renderer.createElement('span') as HTMLElement;
    handle.className = `elv-resize-handle elv-resize-handle--${this.side()}`;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Resize panel');
    el.appendChild(handle);
    this.handle = handle;

    const saved = this.read();
    if (saved) this.write(saved);

    handle.addEventListener('pointerdown', this.onDown);
    handle.addEventListener('keydown', this.onKey);
    handle.addEventListener('dblclick', this.onReset);

    this.destroyRef.onDestroy(() => {
      handle.removeEventListener('pointerdown', this.onDown);
      handle.removeEventListener('keydown', this.onKey);
      handle.removeEventListener('dblclick', this.onReset);
      handle.remove();
    });
  }

  /* ── dragging ─────────────────────────────────────────────────────────── */

  private readonly onDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    this.startX = ev.clientX;
    this.startW = (this.host.nativeElement as HTMLElement).getBoundingClientRect().width;
    this.handle?.setPointerCapture(ev.pointerId);
    this.handle?.classList.add('is-dragging');
    document.body.classList.add('elv-resizing');
    this.handle?.addEventListener('pointermove', this.onMove);
    this.handle?.addEventListener('pointerup', this.onUp);
  };

  private readonly onMove = (ev: PointerEvent): void => {
    /* A handle on the LEFT edge grows the panel as the pointer moves left,
       so the delta is inverted — otherwise the panel runs away from the
       cursor and the whole thing feels broken rather than merely backwards. */
    const dx = (ev.clientX - this.startX) * (this.side() === 'right' ? 1 : -1);
    this.write(this.clamp(this.startW + dx));
  };

  private readonly onUp = (ev: PointerEvent): void => {
    this.handle?.releasePointerCapture(ev.pointerId);
    this.handle?.classList.remove('is-dragging');
    document.body.classList.remove('elv-resizing');
    this.handle?.removeEventListener('pointermove', this.onMove);
    this.handle?.removeEventListener('pointerup', this.onUp);
    this.persist();
  };

  /** Arrow keys move it too — a drag handle nobody can reach is decoration. */
  private readonly onKey = (ev: KeyboardEvent): void => {
    const step = ev.shiftKey ? 32 : 8;
    const now = (this.host.nativeElement as HTMLElement).getBoundingClientRect().width;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); this.write(this.clamp(now - step)); this.persist(); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); this.write(this.clamp(now + step)); this.persist(); }
  };

  /** Double-click returns it to the theme's own width. */
  private readonly onReset = (): void => {
    this.targetEl()?.style.removeProperty(this.cssVar());
    if (this.storeKey()) { try { localStorage.removeItem(this.storeKey()); } catch { /* private mode */ } }
  };

  /* ── plumbing ─────────────────────────────────────────────────────────── */

  private clamp(w: number): number {
    return Math.round(Math.min(this.max(), Math.max(this.min(), w)));
  }

  private targetEl(): HTMLElement | null {
    return this.target() ?? (this.host.nativeElement as HTMLElement).parentElement;
  }

  private write(w: number): void {
    this.targetEl()?.style.setProperty(this.cssVar(), `${w}px`);
  }

  private persist(): void {
    if (!this.storeKey()) return;
    const w = (this.host.nativeElement as HTMLElement).getBoundingClientRect().width;
    try { localStorage.setItem(this.storeKey(), String(Math.round(w))); } catch { /* private mode */ }
  }

  private read(): number | null {
    if (!this.storeKey()) return null;
    try {
      const v = Number(localStorage.getItem(this.storeKey()));
      return Number.isFinite(v) && v > 0 ? this.clamp(v) : null;
    } catch {
      return null;
    }
  }
}
