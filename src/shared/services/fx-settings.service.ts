import { Injectable, inject, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class FxSettingsService {
  private readonly doc = inject(DOCUMENT);

  readonly grainEnabled = signal(true);
  readonly glowEnabled  = signal(true);

  constructor() {
    try {
      this.grainEnabled.set(localStorage.getItem('elv-fx-grain') !== 'false');
      this.glowEnabled.set( localStorage.getItem('elv-fx-glow')  !== 'false');
    } catch { /* private mode / SSR */ }
    this.sync();
  }

  toggleGrain(): void {
    this.grainEnabled.update(v => !v);
    this.persist('elv-fx-grain', this.grainEnabled());
    this.sync();
  }

  toggleGlow(): void {
    this.glowEnabled.update(v => !v);
    this.persist('elv-fx-glow', this.glowEnabled());
    this.sync();
  }

  setGrain(on: boolean): void {
    this.grainEnabled.set(on);
    this.persist('elv-fx-grain', on);
    this.sync();
  }

  setGlow(on: boolean): void {
    this.glowEnabled.set(on);
    this.persist('elv-fx-glow', on);
    this.sync();
  }

  private persist(key: string, value: boolean): void {
    try { localStorage.setItem(key, String(value)); } catch {}
  }

  private sync(): void {
    const html = this.doc.documentElement;
    this.grainEnabled()
      ? html.removeAttribute('data-fx-grain')
      : html.setAttribute('data-fx-grain', 'false');
    this.glowEnabled()
      ? html.removeAttribute('data-fx-glow')
      : html.setAttribute('data-fx-glow', 'false');
  }
}
