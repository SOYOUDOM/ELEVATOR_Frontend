/**
 * THE COMPOSER RAIL
 * ═══════════════════════════════════════════════════════════════════════════
 * The document's structure, and one number that says how ready it is — with
 * the next unmet test named underneath, because a score with no next action
 * is decoration.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { CompositorStore } from '../compositor.store';
import { Fill, itemLabelOf, readiness } from './rail.helpers';
import { ExperienceItem, SECTION_KINDS, Section, SkillGroup } from '../compositor.models';

@Component({
  selector: 'cmp-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rail.component.html',
})
export class RailComponent {
  private readonly store = inject(CompositorStore);

  readonly fill = input.required<Fill>();
  readonly dropSection = output<{ from: number; to: number }>();

  readonly doc = this.store.doc;
  readonly sel = this.store.sel;
  readonly lines = this.store.lines;

  readonly ready = computed(() => readiness(this.doc(), this.fill()));
  readonly nextGap = computed(() => this.ready().tests.find(([, ok]) => !ok)?.[0] ?? '');

  /** Circumference of the readiness ring — r=20, drawn once. */
  readonly circumference = 2 * Math.PI * 20;
  readonly dash = computed(() => `${(this.ready().pct / 100) * this.circumference} ${this.circumference}`);
  readonly tone = computed(() => {
    const p = this.ready().pct;
    return p >= 85 ? '' : p >= 55 ? 'ready--warn' : 'ready--bad';
  });

  kindLabel(sec: Section): string {
    return SECTION_KINDS[sec.type].label;
  }

  label(sec: Section, i: number): string {
    return itemLabelOf(sec, i);
  }

  /** Whether an item carries a bad writing note — the dot in the rail. */
  flagged(secId: string, i: number): boolean {
    return this.lines().some((n) => n.secId === secId && n.item === i && n.level === 'bad');
  }

  /** The right-hand caption on an item row: a year, or "now". */
  when(sec: Section, i: number): string {
    const it = sec.items[i] as Partial<ExperienceItem> & { from?: string; to?: string };
    if (sec.type === 'skills') return String((sec.items[i] as SkillGroup).list.length || '');
    if ((it as ExperienceItem).current) return 'now';
    const end = it.to || it.from || '';
    return end ? end.slice(0, 4) : '';
  }

  select(secId: string, item: number | null): void {
    this.store.select(secId, item);
  }

  toggle(secId: string, ev: Event): void {
    ev.stopPropagation();
    this.store.toggleSection(secId);
  }

  add(type: 'experience' | 'education' | 'projects'): void {
    this.store.addSection(type);
  }
}
