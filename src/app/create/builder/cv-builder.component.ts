/**
 * ELEVATOR — the shell
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Two rooms, one document. The counter fills it in; the press revises it.
 * `stage` is the only thing that changes between them — not the model, not
 * the paginator, not the checks.
 *
 * The A4 page is mounted with `innerHTML` because the paginator has to
 * measure the exact markup it mounts (see cv-builder.paginate.ts). Editing on
 * the page is therefore handled by delegation from this component rather than
 * by bindings, which is also what keeps a caret alive across a reflow.
 */

import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener,
  OnDestroy, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../../theme/theme.service';
import { CvBuilderStore, PANE_LIMITS } from './cv-builder.store';
import { countWords, gaps } from './cv-builder.analysis';
import { PAGE, fontLabel, fontStack, margin, pagesHtml } from './cv-builder.paginate';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvSegComponent, ElvSegOption } from '@shared/components/elv-seg/elv-seg.component';
import { ElvToastService } from '@shared/components/elv-toast/elv-toast.service';
import { ElvToastsComponent } from '@shared/components/elv-toast/elv-toast.component';
import { CounterComponent } from './counter/counter.component';
import { RailComponent } from './press/rail.component';
import { InspectorComponent } from './press/inspector.component';
import { TimelineComponent } from './press/timeline.component';

@Component({
  selector: 'elv-cv-builder',
  standalone: true,
  imports: [
    RouterLink, ElvButtonComponent, ElvSegComponent, ElvToastsComponent,
    CounterComponent, RailComponent, InspectorComponent, TimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cv-builder.component.html',
  /* The state attributes live on the HOST, not on `.app`. The stylesheet
     selects `.elv-cv[data-stage='intake'] .work`, so an attribute one level
     further in matches nothing — the docket would render but the light table
     would never move out from under it. */
  host: {
    'class': 'elv-cv',
    '[attr.data-stage]': `ui().stage === 'counter' ? 'intake' : 'press'`,
    '[attr.data-rail]': `ui().rail ? 'on' : 'off'`,
    '[attr.data-inspector]': `ui().inspector ? 'on' : 'off'`,
    '[attr.data-timeline]': `ui().timeline ? 'on' : 'off'`,
    '[attr.data-scan]': `ui().scan ? 'on' : 'off'`,
    '[attr.data-resizing]': `dragging() ? 'true' : null`,
    '[style.--elv-cv-rail-w.px]': `ui().railW`,
    '[style.--elv-cv-inspector-w.px]': `ui().inspectorW`,
    '[attr.data-guides]': `ui().guides ? 'on' : 'off'`,
    '[attr.data-baseline]': `ui().baseline ? 'on' : 'off'`,
    '[attr.data-mode]': `'edit'`,
  },
})
export class CvBuilderComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(CvBuilderStore);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  readonly theme = inject(ThemeService);

  private readonly counter = viewChild(CounterComponent);
  private readonly pagesEl = viewChild<ElementRef<HTMLElement>>('pages');
  private readonly tableEl = viewChild<ElementRef<HTMLElement>>('table');

  readonly doc = this.store.doc;
  readonly ui = this.store.ui;
  readonly sel = this.store.sel;

  readonly themeOpen = signal(false);
  private readonly toasts = inject(ElvToastService);

  readonly zoomOptions: ElvSegOption<string>[] = [
    { value: 'fit', label: 'FIT', title: 'Fit the page in the window' },
    { value: '0.75', label: '75' },
    { value: '1', label: '100', title: 'True size' },
    { value: '1.5', label: '150' },
  ];

  /* Bumped when the table's width changes, so the fit zoom recomputes. */
  private readonly viewport = signal(0);

  /* ── the page ─────────────────────────────────────────────────────────
     One computed: paginate, then build the markup that was measured. */
  private readonly paged = computed(() => {
    this.store.revision();
    return this.store.paginate();
  });

  readonly fill = computed(() => this.paged().fill);

  readonly zoom = computed(() => {
    this.viewport();
    const z = this.ui().zoom;
    if (z !== 'fit') return +z;
    const table = this.tableEl()?.nativeElement;
    if (!table) return 0.7;
    /* Fit means fit INSIDE. Magnifying past true size stops showing the real
       thing, which is the one job this canvas has. */
    return Math.min(1, Math.max(0.28, (table.clientWidth - 96) / PAGE.w));
  });

  readonly pageHtml = computed<SafeHtml>(() => {
    const { pages, fill } = this.paged();
    const html = pagesHtml(this.doc(), pages, fill, this.sel(), this.store.flaggedKeys());
    /* Trusted because we generate every byte of it and escape every value the
       user typed through `esc()` in the paginator. Nothing else may be passed
       through this call. */
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  /** The CSS face the page is mounted in — the paginator's own mapping, so
      the mounted page and the measured page cannot disagree. */
  readonly docFont = computed(() => fontStack(this.doc().design));
  readonly fontLabel = computed(() => fontLabel(this.doc().design));

  readonly words = computed(() => countWords(this.doc()));
  readonly holes = computed(() => gaps(this.doc()).length);
  /** The page margins, in px — the paginator's own numbers, so the mounted
      page and the measured page cannot disagree. */
  readonly margins = computed(() => margin(this.doc()));

  private ro?: ResizeObserver;

  constructor() {
    /* Boot: a returning document goes straight to the press; the counter is
       for the blank page, which is the only problem it was built to solve. */
    const restored = this.store.restore();
    if (!restored) this.store.patchUi({ stage: 'counter' });

    /* This page takes the whole viewport. The site header is navigation for
       browsing; here the user is composing a document against a fixed A4
       sheet, and 88px of chrome is 88px of paper they cannot see. The bar at
       the top of the builder carries the ELEVATOR mark and a way home, which
       is everything the header was doing for them at this point. */
    this.document.body.dataset['chrome'] = 'none';

    /* Every repaint re-mounts the page, which drops the caret. Put it back. */
    effect(() => {
      this.pageHtml();
      queueMicrotask(() => this.restoreCaret());
    });
  }

  ngAfterViewInit(): void {
    this.counter()?.seed();
    const table = this.tableEl()?.nativeElement;
    if (table && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.viewport.update((n) => n + 1));
      this.ro.observe(table);
    }
    this.viewport.update((n) => n + 1);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    /* Hand the chrome back on the way out, or every other page loses its
       header for the rest of the session. */
    delete this.document.body.dataset['chrome'];
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STAGE
     ═══════════════════════════════════════════════════════════════════════ */

  toPress(): void {
    if (this.ui().stage === 'press') return;
    this.store.patchUi({ stage: 'press' });
    this.store.select(null, null);
    const empty = !this.doc().profile.name;
    this.toast(empty
      ? 'Blank page. Click any greyed block to start writing on it directly.'
      : 'On the table. Click anything to rewrite it; the bin in the inspector removes it.',
      { ms: 6500, action: { label: 'Back to the docket', run: () => this.toCounter() } });
    /* The table is still moving; re-fit once it has stopped. */
    setTimeout(() => this.viewport.update((n) => n + 1), 460);
  }

  toCounter(): void {
    this.store.patchUi({ stage: 'counter' });
    setTimeout(() => this.viewport.update((n) => n + 1), 460);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     EDITING ON THE PAGE
     ═══════════════════════════════════════════════════════════════════════ */

  /** Clicking a block selects it AND lets the caret land — so no repaint here. */
  onPageMouseDown(ev: MouseEvent): void {
    const blk = (ev.target as HTMLElement).closest<HTMLElement>('[data-blk]');
    if (!blk) return;
    const key = blk.dataset['blk']!;
    const [sec, rest] = key === 'profile' ? ['profile', null] : key.split(':');
    const item = rest == null || rest === 'ghost' ? null : +rest;
    if (this.sel().sec === sec && this.sel().item === item) return;

    /* At the counter the page is a map of the docket: clicking a block jumps
       to the step that fills it. The paper is not a picture of the document,
       it IS the document, so it had better answer a click like one. */
    if (this.ui().stage === 'counter') {
      const type = sec === 'profile' ? 'profile' : this.store.sectionById(sec)?.type;
      const map: Record<string, number> = {
        profile: 1, experience: 2, projects: 2, education: 3, skills: 4, summary: 5,
      };
      const target = map[type ?? 'profile'];
      if (target != null) this.counter()?.go(target);
      return;
    }

    this.store.select(sec, item);
  }

  private caret: { path: string; offset: number } | null = null;

  onPageInput(ev: Event): void {
    const el = ev.target as HTMLElement;
    const path = el.dataset?.['path'];
    if (!path) return;
    this.captureCaret(el, path);
    this.store.commit('edit');
    this.store.writePath(path, el.textContent ?? '');
    this.store.save();
  }

  private captureCaret(el: HTMLElement, path: string): void {
    const sel = this.document.getSelection();
    this.caret = { path, offset: sel?.focusOffset ?? 0 };
  }

  /**
   * Typing rewrites the page, which would ordinarily throw the caret away.
   * Remembering the path and offset and putting it back is what lets the
   * document reflow live without the writer noticing.
   */
  private restoreCaret(): void {
    const c = this.caret;
    if (!c) return;
    const host = this.pagesEl()?.nativeElement;
    const el = host?.querySelector<HTMLElement>(`[data-path="${CSS.escape(c.path)}"]`);
    if (!el) return;
    const node = el.firstChild;
    if (!node) { el.focus(); return; }
    const range = this.document.createRange();
    const max = node.textContent?.length ?? 0;
    range.setStart(node, Math.min(c.offset, max));
    range.collapse(true);
    const sel = this.document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus({ preventScroll: true });
  }

  onPageKeydown(ev: KeyboardEvent): void {
    const el = ev.target as HTMLElement;
    if (!el.dataset?.['path']) return;
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); el.blur(); }
    if (ev.key === 'Escape') { this.caret = null; el.blur(); }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════════ */

  setZoom(v: string): void {
    this.store.patchUi({ zoom: v });
    this.viewport.update((n) => n + 1);
  }

  toggleRail(): void { this.store.patchUi({ rail: !this.ui().rail }); this.reflow(); }
  toggleInspector(): void { this.store.patchUi({ inspector: !this.ui().inspector }); this.reflow(); }
  toggleTimeline(): void { this.store.patchUi({ timeline: !this.ui().timeline }); }
  toggleScan(): void { this.store.patchUi({ scan: !this.ui().scan }); }
  toggleGuides(): void { this.store.patchUi({ guides: !this.ui().guides }); }

  private reflow(): void { setTimeout(() => this.viewport.update((n) => n + 1), 240); }

  /* ═══════════════════════════════════════════════════════════════════════
     RESIZING THE PANES
     ───────────────────────────────────────────────────────────────────────
     Pointer events rather than mouse events, so a pen and a touch drag work
     for free, and `setPointerCapture` so the drag survives the pointer
     leaving the 11px handle — which it does immediately, every time.
     ═══════════════════════════════════════════════════════════════════════ */

  readonly dragging = signal<'rail' | 'inspector' | null>(null);

  startResize(pane: 'rail' | 'inspector', ev: PointerEvent): void {
    ev.preventDefault();
    const handle = ev.target as HTMLElement;
    handle.setPointerCapture?.(ev.pointerId);
    this.dragging.set(pane);

    const startX = ev.clientX;
    const startW = pane === 'rail' ? this.ui().railW : this.ui().inspectorW;

    const move = (e: PointerEvent) => {
      /* The inspector grows leftwards, so its delta is the mirror of the
         rail's. Everything else about the two drags is identical. */
      const delta = pane === 'rail' ? e.clientX - startX : startX - e.clientX;
      this.setPaneWidth(pane, startW + delta);
    };
    const up = () => {
      handle.releasePointerCapture?.(ev.pointerId);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      this.dragging.set(null);
      this.store.save();
      this.reflow();
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  /** Arrow keys move a handle too — a resize only a mouse can perform is not
      one every user has. */
  keyResize(pane: 'rail' | 'inspector', ev: KeyboardEvent): void {
    const dir = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
    if (!dir) return;
    ev.preventDefault();
    const step = (ev.shiftKey ? 32 : 8) * (pane === 'rail' ? dir : -dir);
    this.setPaneWidth(pane, (pane === 'rail' ? this.ui().railW : this.ui().inspectorW) + step);
    this.store.save();
    this.reflow();
  }

  private setPaneWidth(pane: 'rail' | 'inspector', px: number): void {
    const { min, max } = PANE_LIMITS[pane];
    const w = Math.round(Math.min(max, Math.max(min, px)));
    this.store.patchUi(pane === 'rail' ? { railW: w } : { inspectorW: w });
    this.viewport.update((n) => n + 1);
  }

  print(): void { this.document.defaultView?.print(); }

  /**
   * EXPORT — the browser's own print-to-PDF, which is the only path that
   * renders the page with real text rather than a picture of it. A CV that
   * an applicant-tracking system cannot read is not an export.
   *
   * The page is deselected first: a selection ring is an editing state, and
   * it has no business appearing in the file the reader sends out.
   */
  exportPdf(): void {
    this.store.select(null, null);
    this.toast('Choose “Save as PDF” as the destination, and leave margins at “None” — the sheet already carries its own.',
      { ms: 6000 });
    /* One frame, so the ring is gone from the paint the print snapshot takes. */
    requestAnimationFrame(() => this.print());
  }

  loadSample(): void {
    this.store.loadSample();
    this.toast('The sample, on the table. Its problems are deliberate — open CHECK to see them.');
  }

  startOver(): void {
    this.store.reset();
    this.toCounter();
    this.counter()?.step.set(0);
    this.counter()?.route.set(null);
    this.toast('Cleared. Back at the counter.', {
      action: { label: 'Undo', run: () => { this.store.undo(); this.toPress(); } },
    });
  }

  undo(): void {
    const label = this.store.undo();
    if (label) this.toast(`Undid ${label}`);
  }

  redo(): void {
    const label = this.store.redo();
    if (label) this.toast(`Redid ${label}`);
  }

  /**
   * AUTO-FIT — the classic prepress move, and the reason the type controls are
   * real. It tightens leading first (least visible), then section spacing,
   * then size (most visible), and only as far as it must. It reports exactly
   * what it changed, because a tool that silently restyles your document is a
   * tool you stop trusting.
   */
  autoFit(): void {
    const before = { ...this.doc().design };
    if (this.fill().pages === 1 && this.fill().pct < 97) {
      this.toast('Already on one page, with room to spare.');
      return;
    }

    this.store.commit('auto-fit');
    const steps: Array<{ key: 'leading' | 'gap' | 'size'; min: number; step: number }> = [
      { key: 'leading', min: 1.18, step: 0.02 },
      { key: 'gap', min: 10, step: 1 },
      { key: 'size', min: 9.2, step: 0.1 },
    ];

    let guard = 0;
    outer: while (guard++ < 200) {
      const fill = this.store.paginate().fill;
      if (fill.pages === 1 && fill.pct <= 97) break;
      for (const s of steps) {
        const d = this.doc().design;
        if (d[s.key] - s.step >= s.min) {
          this.store.editQuiet((draft) => {
            draft.design[s.key] = +(draft.design[s.key] - s.step).toFixed(2);
          });
          continue outer;
        }
      }
      break;                                   // nothing left to give
    }
    this.store.save();

    const after = this.doc().design;
    const changed: string[] = [];
    if (before.leading !== after.leading) changed.push(`leading ${before.leading.toFixed(2)} → ${after.leading.toFixed(2)}`);
    if (before.gap !== after.gap) changed.push(`spacing ${before.gap} → ${after.gap}px`);
    if (before.size !== after.size) changed.push(`size ${before.size.toFixed(1)} → ${after.size.toFixed(1)}px`);

    const fill = this.store.paginate().fill;
    if (fill.pages > 1) {
      this.toast('Still over a page. There is more text here than an A4 will hold — cut a line rather than shrink the type further.', { tone: 'warn', ms: 7000 });
    } else if (changed.length) {
      this.toast(`Fitted: ${changed.join(', ')}`, {
        ms: 6500, action: { label: 'Undo', run: () => this.undo() },
      });
    } else {
      this.toast('Already as tight as it goes.');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     THEME
     ═══════════════════════════════════════════════════════════════════════ */

  useTheme(id: string): void {
    this.theme.use(id);
    this.themeOpen.set(false);
    /* The page is measured, and a theme may change the type family. Re-fit. */
    this.store.touch();
    this.viewport.update((n) => n + 1);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOASTS AND KEYS
     ═══════════════════════════════════════════════════════════════════════ */

  toast(text: string, opts: { tone?: string; ms?: number; action?: { label: string; run: () => void } } = {}): void {
    this.toasts.show(text, { tone: (opts.tone ?? '') as '' | 'warn' | 'bad', ms: opts.ms, action: opts.action });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const mod = ev.metaKey || ev.ctrlKey;
    const el = ev.target as HTMLElement;
    const typing = /^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable;

    if (mod && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      ev.shiftKey ? this.redo() : this.undo();
      return;
    }
    if (mod && ev.key.toLowerCase() === 'p') { ev.preventDefault(); this.print(); return; }
    if (typing) return;

    if (ev.key === '1') this.setZoom('fit');
    if (ev.key === '2') this.setZoom('1');
    if (ev.key === 'r') this.toggleRail();
    if (ev.key === 'i') this.toggleInspector();
    if (ev.key === 't') this.toggleTimeline();
    if (ev.key === 'g') this.toggleGuides();
    if (ev.key === 's') this.toggleScan();
    if (ev.key === 'f') this.autoFit();
    if (ev.key === 'Escape') this.themeOpen.set(false);
  }
}
