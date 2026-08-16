/**
 * ELV-RING — a completeness dial
 * ═══════════════════════════════════════════════════════════════════════════
 * A percentage with the reason underneath. The caption is required, not
 * decoration: a score with no next action attached is decoration, and the
 * whole reason to draw a ring instead of printing "75%" is that it makes room
 * for the sentence that tells you what the missing 25% is.
 *
 * The tone follows the value — good, caution, warn — from the semantic status
 * tokens rather than the accent, so a brand colour change cannot make
 * "nearly done" and "something is wrong" the same colour.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-elv-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="elv-ring" [class]="tone()">
      <div class="elv-ring__dial">
        <svg viewBox="0 0 46 46" aria-hidden="true">
          <circle class="elv-ring__track" cx="23" cy="23" r="20"></circle>
          <circle class="elv-ring__arc" cx="23" cy="23" r="20"
                  [attr.stroke-dasharray]="dash()" stroke-linecap="round"></circle>
        </svg>
        <span class="elv-ring__pct">{{ value() }}</span>
      </div>
      <div class="elv-ring__text">
        <b>{{ title() }}</b>
        <span>{{ caption() }}</span>
      </div>
    </div>
  `,
  styleUrl: './elv-ring.component.scss',
})
export class ElvRingComponent {
  /** 0–100. */
  readonly value = input.required<number>();
  readonly title = input.required<string>();
  /** What the missing part is. Say the next action, not "keep going". */
  readonly caption = input('');

  private readonly circumference = 2 * Math.PI * 20;

  readonly dash = computed(() =>
    `${(Math.max(0, Math.min(100, this.value())) / 100) * this.circumference} ${this.circumference}`);

  readonly tone = computed(() => {
    const v = this.value();
    return v >= 85 ? 'elv-ring--good' : v >= 55 ? 'elv-ring--caution' : 'elv-ring--warn';
  });
}
