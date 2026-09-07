/**
 * THE CAREER TIMELINE
 * ═══════════════════════════════════════════════════════════════════════════
 * A CV is a claim about time, so time gets its own instrument. The reason it
 * earns its space is GAPS: an unexplained hole in a career is the first thing
 * a recruiter looks for and the last thing a form-based builder will ever
 * show you — a list of jobs cannot reveal the months between them.
 */

import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { CvBuilderStore } from '../cv-builder.store';
import { ExperienceItem } from '../cv-builder.models';
import { Gap, Span, durationText, fromMonths, gaps, nowMonths, spans } from '../cv-builder.analysis';

type DragMode = 'move' | 'from' | 'to';

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

  /* `#lanesEl`, not `#lanes`: a template reference variable SHADOWS a
     component member of the same name, so `@for (lane of lanes())` would
     have resolved to the ElementRef and the timeline would render its axis
     and then nothing — which is exactly what it did. */
  private readonly lanesEl = viewChild<ElementRef<HTMLElement>>('lanesEl');

  /** What is being dragged, and the live preview while it moves. */
  readonly drag = signal<{ secId: string; item: number; mode: DragMode; from: number; to: number } | null>(null);

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

  /* ═══════════════════════════════════════════════════════════════════════
     DRAGGING A DATE
     ───────────────────────────────────────────────────────────────────────
     The axis is already the honest picture of the dates; letting it be
     WRITTEN as well closes the loop. Drag the body to move a role in time,
     drag either end to change just that end.

     It snaps to whole months because the model stores 'YYYY-MM' — a drag
     that could land between two months would be inventing precision the
     document cannot hold.
     ═══════════════════════════════════════════════════════════════════════ */

  startDrag(ev: PointerEvent, s: Placed, mode: DragMode): void {
    if (s.kind === 'proj' && mode === 'move') { /* projects drag too */ }
    ev.preventDefault();
    ev.stopPropagation();

    const r = this.range();
    const lanes = this.lanesEl()?.nativeElement;
    if (!r || !lanes) return;

    const pxPerMonth = lanes.getBoundingClientRect().width / r.span;
    const startX = ev.clientX;
    const orig = { from: s.from, to: s.to };
    const target = ev.target as HTMLElement;
    target.setPointerCapture(ev.pointerId);

    this.store.select(s.secId, s.item);
    this.drag.set({ secId: s.secId, item: s.item, mode, from: orig.from, to: orig.to });

    const move = (e: PointerEvent) => {
      const months = Math.round((e.clientX - startX) / pxPerMonth);
      let from = orig.from;
      let to = orig.to;
      if (mode === 'move') { from += months; to += months; }
      if (mode === 'from') from = Math.min(orig.to, orig.from + months);
      if (mode === 'to') to = Math.max(orig.from, orig.to + months);
      this.drag.set({ secId: s.secId, item: s.item, mode, from, to });
    };

    const up = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      const d = this.drag();
      this.drag.set(null);
      if (!d || (d.from === orig.from && d.to === orig.to)) return;
      this.commitDrag(s, d.from, d.to, mode);
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  private commitDrag(s: Placed, from: number, to: number, mode: DragMode): void {
    const ym = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
    this.store.edit('dates', (d) => {
      const sec = d.sections.find((x) => x.id === s.secId);
      const item = sec?.items[s.item] as (ExperienceItem & { award?: string }) | undefined;
      if (!item) return;
      if (mode !== 'to') item.from = ym(from);
      /* A role marked "still here" has no end date to drag, and dragging its
         right edge is how someone says it ended — so the switch follows. */
      if (mode !== 'from') {
        if (s.open && to < nowMonths()) item.current = false;
        if (!item.current) item.to = ym(to);
      }
    });
  }

  /** The live position while dragging, so the span follows the pointer. */
  liveBox(s: Placed): { left: number; width: number } | null {
    const d = this.drag();
    const r = this.range();
    if (!d || !r || d.secId !== s.secId || d.item !== s.item) return null;
    return {
      left: ((d.from - r.from) / r.span) * 100,
      width: Math.max(1.4, ((d.to - d.from + 1) / r.span) * 100),
    };
  }

  liveLabel(): string {
    const d = this.drag();
    if (!d) return '';
    return `${fromMonths(d.from)} — ${fromMonths(d.to)} · ${durationText(d.to - d.from + 1)}`;
  }

  show(): void {
    this.store.patchUi({ timeline: true });
  }

  hide(): void {
    this.store.patchUi({ timeline: false });
  }
}
