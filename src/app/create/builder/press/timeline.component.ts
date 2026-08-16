/**
 * THE CAREER TIMELINE
 * ═══════════════════════════════════════════════════════════════════════════
 * A CV is a claim about time, so time gets its own instrument. The reason it
 * earns its space is GAPS: an unexplained hole in a career is the first thing
 * a recruiter looks for and the last thing a form-based builder will ever
 * show you — a list of jobs cannot reveal the months between them.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CvBuilderStore } from '../cv-builder.store';
import { Gap, Span, durationText, fromMonths, gaps, nowMonths, spans } from '../cv-builder.analysis';

interface Placed extends Span { left: number; width: number; lane: number }

@Component({
  selector: 'elv-cv-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
})
export class TimelineComponent {
  private readonly store = inject(CvBuilderStore);
  readonly sel = this.store.sel;

  private readonly all = computed(() => spans(this.store.doc()));

  /** The axis: whole years, from a year before the first span to now. */
  readonly range = computed(() => {
    const list = this.all();
    const now = nowMonths();
    if (!list.length) return null;
    const from = Math.floor(Math.min(...list.map((s) => s.from)) / 12) * 12;
    const to = Math.ceil((now + 6) / 12) * 12;
    return { from, to, span: Math.max(1, to - from) };
  });

  readonly ticks = computed(() => {
    const r = this.range();
    if (!r) return [];
    const out: Array<{ year: number; left: number; major: boolean }> = [];
    for (let m = r.from; m <= r.to; m += 12) {
      out.push({ year: m / 12, left: ((m - r.from) / r.span) * 100, major: (m / 12) % 5 === 0 });
    }
    return out;
  });

  readonly nowLeft = computed(() => {
    const r = this.range();
    return r ? ((nowMonths() - r.from) / r.span) * 100 : 0;
  });

  /** Spans packed into lanes so two overlapping roles never sit on top of each other. */
  readonly lanes = computed<Placed[][]>(() => {
    const r = this.range();
    if (!r) return [];
    const ends: number[] = [];
    const placed: Placed[] = [];

    for (const s of this.all()) {
      let lane = ends.findIndex((end) => s.from > end + 1);
      if (lane < 0) { lane = ends.length; ends.push(s.to); } else { ends[lane] = s.to; }
      placed.push({
        ...s, lane,
        left: ((s.from - r.from) / r.span) * 100,
        width: Math.max(1.4, ((s.to - s.from + 1) / r.span) * 100),
      });
    }

    const out: Placed[][] = [];
    for (const p of placed) (out[p.lane] ??= []).push(p);
    return out;
  });

  readonly holes = computed<Array<Gap & { left: number; width: number }>>(() => {
    const r = this.range();
    if (!r) return [];
    return gaps(this.store.doc()).map((g) => ({
      ...g,
      left: ((g.from - r.from) / r.span) * 100,
      width: ((g.months) / r.span) * 100,
    }));
  });

  gapLabel(g: Gap): string {
    return durationText(g.months).replace(' months', 'M').replace(' month', 'M');
  }

  gapTitle(g: Gap): string {
    return `${durationText(g.months)} unaccounted for — ${fromMonths(g.from)} to ${fromMonths(g.to)}`;
  }

  isSel(s: Placed): boolean {
    return this.sel().sec === s.secId && this.sel().item === s.item;
  }

  pick(s: Placed): void {
    this.store.select(s.secId, s.item);
  }

  hide(): void {
    this.store.patchUi({ timeline: false });
  }
}
