/**
 * THE CAREER TIMELINE
 * ═══════════════════════════════════════════════════════════════════════════
 * A CV is a claim about time, so time gets its own instrument. The reason it
 * earns its space is GAPS: an unexplained hole in a career is the first thing
 * a recruiter looks for and the last thing a form-based builder will ever
 * show you — a list of jobs cannot reveal the months between them.
 */

import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { CvBuilderStore } from '../cv-builder.store';
import { Gap, Span, durationText, fromMonths, gaps, nowMonths, spans, toYm } from '../cv-builder.analysis';

interface Placed extends Span { left: number; width: number; lane: number }

@Component({
  selector: 'elv-cv-timeline',
  standalone: true,
  imports: [ElvButtonComponent],
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

  /* ═══════════════════════════════════════════════════════════════════════
     DRAGGING A SPAN
     ───────────────────────────────────────────────────────────────────────
     The bar is the date. Typing "2021-03" into a field and then checking the
     chart is two steps and a translation; grabbing the end of a bar and
     pulling it to 2021 is one, and it is the step where the mistake would
     have shown up anyway — the gap either opens or closes under your hand.

     Three grips: the two ends move one date each, the body moves both and
     keeps the duration. Everything snaps to the month, because the model
     stores months and a CV has never once needed a day.
     ═══════════════════════════════════════════════════════════════════════ */

  /* `laneBox`, not `lanes`: a template reference variable shadows the
     component member of the same name, so `#lanes` on this div turned every
     `lanes()` call in the template into a call on an HTMLDivElement and the
     whole timeline rendered blank. */
  private readonly lanesEl = viewChild<ElementRef<HTMLElement>>('laneBox');

  /** What is under the hand right now, so the axis can show its dates. */
  readonly drag = signal<{ from: number; to: number; label: string } | null>(null);

  startDrag(s: Placed, grip: 'from' | 'to' | 'move', ev: PointerEvent): void {
    /* An open-ended role has no end date to drag — its right edge IS the
       present, and the present is not ours to move. */
    if (grip === 'to' && s.open) return;

    ev.preventDefault();
    ev.stopPropagation();
    const r = this.range();
    const host = this.lanesEl()?.nativeElement;
    if (!r || !host) return;

    const target = ev.currentTarget as HTMLElement;
    target.setPointerCapture?.(ev.pointerId);

    const width = host.getBoundingClientRect().width;
    const perPx = r.span / Math.max(1, width);
    const startX = ev.clientX;
    const from0 = s.from;
    const to0 = s.to;
    this.store.commit('dates');

    const move = (e: PointerEvent) => {
      const shift = Math.round((e.clientX - startX) * perPx);
      let from = from0;
      let to = to0;

      if (grip === 'move') { from = from0 + shift; to = to0 + shift; }
      /* A start may not pass its own end, and vice versa: a role that ended
         before it began is not a date the reader meant to enter. */
      else if (grip === 'from') from = Math.min(from0 + shift, to0);
      else to = Math.max(to0 + shift, from0);

      from = Math.max(r.from, from);
      this.drag.set({ from, to, label: s.label });
      this.write(s, from, to);
    };

    const up = () => {
      target.releasePointerCapture?.(ev.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      this.drag.set(null);
      this.store.save();
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  /** Keyboard equivalent: the selected bar moves a month at a time. */
  keyDrag(s: Placed, ev: KeyboardEvent): void {
    const dir = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
    if (!dir || !(ev.altKey || ev.shiftKey)) return;
    ev.preventDefault();
    this.store.commit('dates');
    /* Shift moves the whole role; alt stretches the end. */
    if (ev.shiftKey) this.write(s, s.from + dir, s.to + dir);
    else this.write(s, s.from, Math.max(s.from, s.to + dir));
    this.store.save();
  }

  /** One write for every grip — the model is the same three fields either way. */
  private write(s: Placed, from: number, to: number): void {
    this.store.editQuiet((d) => {
      const sec = d.sections.find((x) => x.id === s.secId);
      const item = sec?.items[s.item] as { from?: string; to?: string; current?: boolean } | undefined;
      if (!item) return;
      item.from = toYm(from);
      /* An open role keeps running to the present — writing an end date onto
         it would silently close a job the reader still has. */
      if (!s.open) item.to = toYm(to);
    });
  }

  /** The read-out that follows the hand while a bar is being dragged. */
  dragLabel(): string {
    const d = this.drag();
    if (!d) return '';
    return `${fromMonths(d.from)} — ${fromMonths(d.to)} · ${durationText(d.to - d.from + 1)}`;
  }
}
