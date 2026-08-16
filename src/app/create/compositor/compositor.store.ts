/**
 * COMPOSITOR — the store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One document, two rooms. `stage` is which room you are in; everything else
 * is the same model in both, which is the whole architectural claim: the
 * counter is not an import wizard that hands a payload to an editor, it is
 * the same document seen from the other side.
 *
 * Undo is a stack of whole-document snapshots. For a document this size that
 * is a few kilobytes a step and removes an entire category of bug — there is
 * no such thing as an action that forgot to record its inverse.
 *
 * The app is ZONELESS, so nothing here may rely on a change-detection tick
 * that will not come. State is signals; the page is repainted explicitly by
 * whoever changed it.
 */

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import {
  CvDoc, ExperienceItem, Section, SectionItem, SectionType, SkillGroup,
  blankDoc, newItem, newSection, sampleDoc,
} from './compositor.models';
import { Fill, LineNote, lineNotes } from './compositor.analysis';
import { Page, Ruler, paginate } from './compositor.paginate';

export type Stage = 'counter' | 'press';
export type InspectorTab = 'content' | 'type' | 'check';

export interface Selection { sec: string | null; item: number | null }

export interface UiState {
  stage: Stage;
  tab: InspectorTab;
  zoom: 'fit' | string;
  scan: boolean;
  guides: boolean;
  baseline: boolean;
  timeline: boolean;
  rail: boolean;
  inspector: boolean;
}

const STORE_KEY = 'compositor.v1';

interface HistoryStep { doc: CvDoc; label: string }

@Injectable({ providedIn: 'root' })
export class CompositorStore {
  private readonly document = inject(DOCUMENT);
  private readonly ruler = new Ruler(this.document);

  /* ── the document ───────────────────────────────────────────────────── */
  private readonly _doc = signal<CvDoc>(blankDoc());
  readonly doc = this._doc.asReadonly();

  /* ── the interface ──────────────────────────────────────────────────── */
  private readonly _ui = signal<UiState>({
    stage: 'counter',
    tab: 'content',
    zoom: 'fit',
    scan: false,
    guides: false,
    baseline: false,
    timeline: true,
    rail: true,
    inspector: true,
  });
  readonly ui = this._ui.asReadonly();

  private readonly _sel = signal<Selection>({ sec: null, item: null });
  readonly sel = this._sel.asReadonly();

  /**
   * Bumped by every mutation. Pagination is a DOM measurement, not a pure
   * function of the model, so it cannot be a `computed` — this is the signal
   * the page's effect listens to instead.
   */
  private readonly _revision = signal(0);
  readonly revision = this._revision.asReadonly();

  /* ── derived ────────────────────────────────────────────────────────── */
  readonly lines = computed<LineNote[]>(() => lineNotes(this._doc()));
  readonly flaggedKeys = computed(() => new Set(
    this.lines().filter((n) => n.level === 'bad').map((n) => `${n.secId}:${n.item}`)));

  /* Plain field, not a signal. Pagination is a DOM measurement run from
     inside a `computed` in the shell; writing a signal there would be a
     write-during-compute and Angular would throw. Whoever paginates gets the
     fill back as a return value — this is only the last one, for the few
     readers that cannot be bothered to paginate again. */
  private _fill: Fill = { pages: 1, pct: 0, spilled: '', usedReal: 0, lastUsed: 0 };

  /* ── history ────────────────────────────────────────────────────────── */
  private past: HistoryStep[] = [];
  private future: HistoryStep[] = [];
  private lastCommit = 0;
  private lastLabel = '';

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /* ═════════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═════════════════════════════════════════════════════════════════════ */

  /** @returns whether a saved document was picked up. */
  restore(): boolean {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { doc?: CvDoc; ui?: Partial<UiState> };
      if (!parsed?.doc?.sections) return false;

      const base = blankDoc();
      this._doc.set({ ...base, ...parsed.doc, design: { ...base.design, ...parsed.doc.design } });
      if (parsed.ui) this._ui.update((u) => ({ ...u, ...parsed.ui }));
      this.touch();
      return true;
    } catch {
      return false;
    }
  }

  save(): void {
    try {
      const { stage, zoom, timeline } = this._ui();
      localStorage.setItem(STORE_KEY, JSON.stringify({ doc: this._doc(), ui: { stage, zoom, timeline } }));
    } catch {
      /* private mode — the document simply does not persist */
    }
  }

  loadSample(): void {
    this.commit('sample');
    this._doc.set(sampleDoc());
    this._sel.set({ sec: null, item: null });
    this.touch();
    this.save();
  }

  reset(): void {
    this.commit('reset');
    this._doc.set(blankDoc());
    this._sel.set({ sec: null, item: null });
    this.touch();
    this.save();
  }

  replaceDoc(next: CvDoc, label = 'replace'): void {
    this.commit(label);
    this._doc.set(next);
    this.touch();
    this.save();
  }

  /* ═════════════════════════════════════════════════════════════════════
     MUTATION
     ───────────────────────────────────────────────────────────────────────
     Every write goes through `edit`, which snapshots first and bumps the
     revision after. Reaching into `doc()` and mutating it in place would
     leave the page painted from a model that no longer exists.
     ═════════════════════════════════════════════════════════════════════ */

  /** Snapshot the current document. Rapid edits inside 550ms coalesce. */
  commit(label = ''): void {
    const now = Date.now();
    const merge = now - this.lastCommit < 550 && this.past.length > 0 && label === this.lastLabel;
    if (!merge) {
      this.past.push({ doc: structuredClone(this._doc()), label });
      if (this.past.length > 120) this.past.shift();
    }
    this.lastCommit = now;
    this.lastLabel = label;
    this.future.length = 0;
    this.syncHistoryFlags();
  }

  /** Mutate the document. The callback receives a draft it may write to. */
  edit(label: string, fn: (draft: CvDoc) => void): void {
    this.commit(label);
    const draft = structuredClone(this._doc());
    fn(draft);
    this._doc.set(draft);
    this.touch();
    this.save();
  }

  /** Mutate without a history step — for live typing that already committed. */
  editQuiet(fn: (draft: CvDoc) => void): void {
    const draft = structuredClone(this._doc());
    fn(draft);
    this._doc.set(draft);
    this.touch();
  }

  undo(): string | null {
    const step = this.past.pop();
    if (!step) return null;
    this.future.push({ doc: structuredClone(this._doc()), label: step.label });
    this._doc.set(step.doc);
    this.touch();
    this.save();
    this.syncHistoryFlags();
    return step.label || 'change';
  }

  redo(): string | null {
    const step = this.future.pop();
    if (!step) return null;
    this.past.push({ doc: structuredClone(this._doc()), label: step.label });
    this._doc.set(step.doc);
    this.touch();
    this.save();
    this.syncHistoryFlags();
    return step.label || 'change';
  }

  private syncHistoryFlags(): void {
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  /** Tell the page something changed. */
  touch(): void {
    this._revision.update((n) => n + 1);
  }

  /* ═════════════════════════════════════════════════════════════════════
     UI
     ═════════════════════════════════════════════════════════════════════ */

  patchUi(patch: Partial<UiState>): void {
    this._ui.update((u) => ({ ...u, ...patch }));
    this.save();
  }

  select(sec: string | null, item: number | null = null): void {
    this._sel.set({ sec, item: item == null ? null : +item });
    if (this._ui().tab === 'check') this.patchUi({ tab: 'content' });
  }

  /* ═════════════════════════════════════════════════════════════════════
     PAGINATION
     ───────────────────────────────────────────────────────────────────────
     Called by whoever is about to paint. It writes `fill` as a side effect,
     which is what the gauge, the status strip and every check read.
     ═════════════════════════════════════════════════════════════════════ */

  paginate(): { pages: Page[]; fill: Fill } {
    const result = paginate(this._doc(), this.ruler);
    this._fill = result.fill;
    return result;
  }

  currentFill(): Fill {
    return this._fill;
  }

  /* ═════════════════════════════════════════════════════════════════════
     STRUCTURE — the operations the rail, the inspector and the counter share
     ═════════════════════════════════════════════════════════════════════ */

  sectionById(id: string | null): Section | undefined {
    return id ? this._doc().sections.find((s) => s.id === id) : undefined;
  }

  sectionByType(type: SectionType): Section | undefined {
    return this._doc().sections.find((s) => s.type === type);
  }

  itemsOf(type: SectionType): SectionItem[] {
    return this.sectionByType(type)?.items ?? [];
  }

  ensureSection(type: SectionType): string {
    const found = this.sectionByType(type);
    if (found) return found.id;
    const sec = newSection(type);
    sec.items = [];
    this.editQuiet((d) => { d.sections.push(sec); });
    return sec.id;
  }

  addSection(type: SectionType): string {
    const sec = newSection(type);
    this.edit('add section', (d) => { d.sections.push(sec); });
    this.select(sec.id, 0);
    return sec.id;
  }

  removeSection(id: string): string {
    const title = this.sectionById(id)?.title ?? 'section';
    this.edit('delete section', (d) => { d.sections = d.sections.filter((s) => s.id !== id); });
    this._sel.set({ sec: null, item: null });
    return title;
  }

  toggleSection(id: string): boolean {
    let visible = true;
    this.edit('visibility', (d) => {
      const s = d.sections.find((x) => x.id === id);
      if (s) { s.visible = !s.visible; visible = s.visible; }
    });
    return visible;
  }

  addItem(secId: string): number {
    const sec = this.sectionById(secId);
    if (!sec) return -1;
    let index = -1;
    this.edit('add', (d) => {
      const s = d.sections.find((x) => x.id === secId)!;
      s.items.push(newItem(s.type));
      index = s.items.length - 1;
    });
    this.select(secId, index);
    return index;
  }

  removeItem(secId: string, index: number): string {
    const sec = this.sectionById(secId);
    const label = sec ? this.labelOf(sec, index) : 'entry';
    this.edit('remove', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (!s) return;
      s.items.splice(index, 1);
      if (!s.items.length) s.items.push(newItem(s.type));
    });
    return label;
  }

  moveSection(from: number, to: number): void {
    this.edit('reorder', (d) => {
      const [moved] = d.sections.splice(from, 1);
      d.sections.splice(to, 0, moved);
    });
  }

  private labelOf(sec: Section, index: number): string {
    const it = sec.items[index] as Partial<ExperienceItem & SkillGroup> & Record<string, unknown>;
    return (it?.role as string) || (it?.['award'] as string) || (it?.['name'] as string)
      || (it?.group as string) || 'entry';
  }

  /** Write a dotted path — the page's contenteditable spans address the model this way. */
  writePath(path: string, value: unknown): void {
    this.editQuiet((d) => {
      const keys = path.split('.');
      const last = keys.pop()!;
      const target = keys.reduce<Record<string, unknown> | undefined>(
        (o, k) => (o == null ? o : (o as Record<string, unknown>)[/^\d+$/.test(k) ? +k : k] as Record<string, unknown>),
        d as unknown as Record<string, unknown>);
      if (target) (target as Record<string, unknown>)[/^\d+$/.test(last) ? +last : last] = value;
    });
  }
}
