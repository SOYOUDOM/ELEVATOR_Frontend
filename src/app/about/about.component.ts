import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  DestroyRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { AppConsts } from '@shared/AppConsts';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { ElvButtonComponent} from '@shared/components/elv-button/elv-button.component';
/**
 * ABOUT · STORY
 *
 * Zoneless-safe: the observers write classes and a CSS custom property
 * straight onto the DOM. No signals, no change detection involved, so
 * nothing here depends on zone.js being present.
 *
 * Deliberately avoids clip-path for hidden states — a collapsed
 * clip-path zeroes the layout box and IntersectionObserver then never
 * fires isIntersecting. Reveals use opacity + translate only.
 */
@Component({
  selector: 'about',
  standalone: true,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, ElvButtonComponent],
})
export class AboutComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly branding = AppConsts.branding;
  constructor() {
    afterNextRender(() => this.wire());
  }

  private wire(): void {
    const root = this.host.nativeElement as HTMLElement;

    const list  = root.querySelector<HTMLElement>('.acr');
    const lines = Array.from(root.querySelectorAll<HTMLElement>('.acr-line'));
    const built = root.querySelector<HTMLElement>('.built');
    const fades = Array.from(root.querySelectorAll<HTMLElement>('.rv'));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion (or no IO support): show the finished state at once.
    if (reduced || !('IntersectionObserver' in window)) {
      lines.forEach((l) => l.classList.add('is-lit'));
      fades.forEach((f) => f.classList.add('is-in'));
      list?.style.setProperty('--lit', '1');
      built?.classList.add('is-open');
      return;
    }

    let lit = 0;

    // ── the shaft: each line ignites its call button once ──────────
    const shaftIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const el = entry.target as HTMLElement;
          el.classList.add('is-lit');
          shaftIO.unobserve(el);

          lit += 1;
          list?.style.setProperty('--lit', String(lit / lines.length));
        }
      },
      { threshold: 0.4, rootMargin: '0px 0px -10% 0px' },
    );
    lines.forEach((l) => shaftIO.observe(l));

    // ── generic fades ──────────────────────────────────────────────
    const fadeIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          fadeIO.unobserve(entry.target);
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );
    fades.forEach((f) => fadeIO.observe(f));

    // ── the doors: seam ignites, then the panels part ──────────────
    let doorTimer: number | undefined;

    const doorIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const el = entry.target as HTMLElement;
          el.classList.add('is-arming');
          doorTimer = window.setTimeout(() => el.classList.add('is-open'), 420);
          doorIO.unobserve(el);
        }
      },
      { threshold: 0.45 },
    );
    if (built) doorIO.observe(built);

    this.destroyRef.onDestroy(() => {
      shaftIO.disconnect();
      fadeIO.disconnect();
      doorIO.disconnect();
      if (doorTimer !== undefined) clearTimeout(doorTimer);
    });
  }
}