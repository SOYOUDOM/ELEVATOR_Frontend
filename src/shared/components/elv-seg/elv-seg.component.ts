/**
 * ELV-SEG — a segmented control
 * ═══════════════════════════════════════════════════════════════════════════
 * One row, one choice, all options visible. Use it where a select would hide
 * the alternatives behind a click and the alternatives are the point — zoom
 * levels, an inspector's tabs, a margin preset.
 *
 * Not a radio group in a trench coat: it is styled as one object with a
 * sliding pressed state, so the reader sees a range rather than a list.
 * For more than about five options, use a select.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ElvSegOption<T = string> {
  value: T;
  /** Kept short — this control is horizontal and every option is on screen. */
  label: string;
  title?: string;
}

@Component({
  selector: 'app-elv-seg',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="elv-seg" role="group" [attr.aria-label]="label()">
      @for (o of options(); track o.value) {
        <button type="button"
                [attr.aria-pressed]="o.value === value()"
                [attr.title]="o.title || null"
                (click)="pick(o.value)">{{ o.label }}</button>
      }
    </div>
  `,
  styleUrl: './elv-seg.component.scss',
})
export class ElvSegComponent<T = string> {
  readonly options = input.required<ElvSegOption<T>[]>();
  readonly value = input.required<T>();
  readonly label = input('');
  readonly valueChange = output<T>();

  pick(v: T): void {
    if (v !== this.value()) this.valueChange.emit(v);
  }
}
