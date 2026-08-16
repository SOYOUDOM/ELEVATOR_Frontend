/**
 * ELV-TOAST — transient messages with an undo attached
 * ═══════════════════════════════════════════════════════════════════════════
 * A toast that only says what happened is a toast that made the user's
 * decision for them. The `action` is the point: "Removed Experience · Undo"
 * is the difference between a confirmation dialog before every delete and
 * none at all.
 *
 * Signal-backed, so a zoneless app repaints without a change-detection tick.
 */

import { Injectable, signal } from '@angular/core';

export type ElvToastTone = '' | 'warn' | 'bad';

export interface ElvToastAction {
  label: string;
  run: () => void;
}

export interface ElvToast {
  id: number;
  text: string;
  tone: ElvToastTone;
  action?: ElvToastAction;
}

@Injectable({ providedIn: 'root' })
export class ElvToastService {
  private readonly _items = signal<ElvToast[]>([]);
  readonly items = this._items.asReadonly();

  private nextId = 0;

  /**
   * @param ms Longer for anything carrying an action — four seconds is not
   *           enough time to read a sentence and decide to undo it.
   */
  show(text: string, opts: { tone?: ElvToastTone; ms?: number; action?: ElvToastAction } = {}): void {
    const id = ++this.nextId;
    this._items.update((list) => [...list, { id, text, tone: opts.tone ?? '', action: opts.action }]);
    setTimeout(() => this.dismiss(id), opts.ms ?? (opts.action ? 6500 : 4200));
  }

  dismiss(id: number): void {
    this._items.update((list) => list.filter((t) => t.id !== id));
  }

  run(t: ElvToast): void {
    t.action?.run();
    this.dismiss(t.id);
  }

  clear(): void {
    this._items.set([]);
  }
}
