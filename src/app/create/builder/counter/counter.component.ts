/**
 * THE COUNTER
 * ═══════════════════════════════════════════════════════════════════════════
 * A print shop does not start at the press. It starts at the counter, where
 * somebody fills in a job docket — who the job is for, what goes on it, how
 * many pages — and only then does the work go through.
 *
 * Three rules the whole stage is built on:
 *
 *   · Nothing is required. Every step skips and the press is one click away,
 *     because a form is worse at revision than the editor is.
 *   · Nothing is invented. The parser reports what it could NOT read; the
 *     suggestions come from prose the writer already typed. No figure and no
 *     achievement is ever supplied by the tool.
 *   · The document is always visible. The light table stays on the right,
 *     running the same paginator the press runs.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { CvBuilderStore } from '../cv-builder.store';
import {
  EducationItem, ExperienceItem, SkillGroup, SummaryItem, newItem,
} from '../cv-builder.models';
import {
  Fill, bulletFlag, documentNotes, durationText, fromMonths, gaps, readiness, suggestedSkills, titleIdeas,
} from '../cv-builder.analysis';
import { ParseReport, parseCv } from './cv-parser';

export type StepKey = 'start' | 'you' | 'work' | 'study' | 'skills' | 'summary' | 'press';

interface StepDef { key: StepKey; name: string; title: string; lede: string; effect?: string }

@Component({
  selector: 'elv-cv-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './counter.component.html',
})
export class CounterComponent {
  private readonly store = inject(CvBuilderStore);

  readonly fill = input.required<Fill>();
  readonly toPress = output<void>();
  readonly notify = output<{ text: string; tone?: string }>();

  readonly doc = this.store.doc;

  readonly step = signal(0);
  readonly route = signal<'blank' | 'reuse' | 'sample' | null>(null);
  readonly skipped = signal<Record<string, boolean>>({});
  readonly touched = signal<Record<string, boolean>>({});
  readonly report = signal<ParseReport | null>(null);
  readonly parseText = signal('');

  /** Template expressions cannot hold a regex literal, so the count lives here. */
  readonly parseWords = computed(() => {
    const t = this.parseText().trim();
    return t ? `${t.split(/\s+/).length} words ready` : 'empty';
  });

  readonly STEPS: StepDef[] = [
    {
      key: 'start', name: 'Start',
      title: 'How do you want to begin?',
      lede: 'Three ways in. The first is fastest if you already have a CV in any form — a Word file, a PDF you can copy out of, an export from anywhere.',
    },
    {
      key: 'you', name: 'You',
      title: 'Who is this CV for?',
      lede: 'The masthead. It is the first thing read and the only part nobody skims.',
      effect: 'Sets the name, the line under it, and the contact row across the top of the page.',
    },
    {
      key: 'work', name: 'Work',
      title: 'Where have you worked?',
      lede: 'Newest first. Two or three roles is usually right — the page will tell you when it is too many.',
      effect: 'Every role becomes a block on the page and a span on the career timeline, which is what makes a gap between jobs visible.',
    },
    {
      key: 'study', name: 'Study',
      title: 'What did you study?',
      lede: 'One line each. If your degree is older than your first job it belongs below Experience — you can drag it there at the press.',
      effect: 'Adds the Education section, and puts your course years on the timeline.',
    },
    {
      key: 'skills', name: 'Skills',
      title: 'What can you do?',
      lede: 'Grouped, not a wall. Four to six per group reads; twenty reads as noise.',
      effect: 'Suggestions below come from words already in your own roles — never from a top-ten list.',
    },
    {
      key: 'summary', name: 'Summary',
      title: 'Say it in three lines.',
      lede: 'Written last on purpose: now the roles are down, the summary can point at them. Skip it — plenty of good CVs have none.',
      effect: 'Sits directly under your name. It is the only paragraph most readers finish.',
    },
    {
      key: 'press', name: 'To press',
      title: 'Ready for the press.',
      lede: 'Here is what is on the docket and what the page will do with it. Everything below is editable afterwards.',
    },
  ];

  readonly current = computed(() => this.STEPS[this.step()]);
  readonly isFirst = computed(() => this.step() === 0);
  readonly isLast = computed(() => this.step() === this.STEPS.length - 1);

  /* ── the docket line for each step ─────────────────────────────────────
     Both read the document directly, so a change made at the press shows
     the moment the counter is reopened. */

  count(key: StepKey): string {
    const d = this.doc();
    switch (key) {
      case 'start': return ({ reuse: 'read in', blank: 'blank', sample: 'sample' } as Record<string, string>)[this.route() ?? ''] ?? '';
      case 'you': return d.profile.name ? '1' : '';
      case 'work': return String(this.exp().filter((i) => i.role || i.org).length || '');
      case 'study': return String(this.edu().filter((i) => i.award || i.org).length || '');
      case 'skills': return String(this.skills().reduce((n, g) => n + g.list.length, 0) || '');
      case 'summary': {
        const t = (this.summary()?.text ?? '').trim();
        return t ? `${t.split(/\s+/).length}w` : '';
      }
      default: return '';
    }
  }

  filled(key: StepKey): boolean {
    const d = this.doc();
    switch (key) {
      case 'start': return !!this.route();
      case 'you': return !!(d.profile.name || d.profile.role);
      case 'work': return this.exp().some((i) => i.role || i.org);
      case 'study': return this.edu().some((i) => i.award || i.org);
      case 'skills': return this.skills().some((g) => g.list.length);
      case 'summary': return !!(this.summary()?.text ?? '').trim();
      default: return false;
    }
  }

  stateOf(key: StepKey): string {
    if (this.touched()[key] && this.filled(key)) return 'dstep--done';
    if (this.filled(key)) return 'dstep--filled';
    if (this.skipped()[key]) return 'dstep--skip';
    return '';
  }

  /* ── typed views of the document ──────────────────────────────────────── */
  readonly exp = computed(() => (this.store.sectionByType('experience')?.items ?? []) as ExperienceItem[]);
  readonly edu = computed(() => (this.store.sectionByType('education')?.items ?? []) as EducationItem[]);
  readonly skills = computed(() => (this.store.sectionByType('skills')?.items ?? []) as SkillGroup[]);
  readonly summary = computed(() => this.store.sectionByType('summary')?.items[0] as SummaryItem | undefined);

  readonly expSecId = computed(() => this.store.sectionByType('experience')?.id ?? '');
  readonly eduSecId = computed(() => this.store.sectionByType('education')?.id ?? '');
  readonly skillSecId = computed(() => this.store.sectionByType('skills')?.id ?? '');
  readonly sumSecId = computed(() => this.store.sectionByType('summary')?.id ?? '');

  readonly roleIdeas = computed(() => titleIdeas(this.doc().profile.role));
  readonly skillIdeas = computed(() => suggestedSkills(this.doc()));
  readonly notes = computed(() => documentNotes(this.doc(), this.fill()).filter((n) => n.level !== 'ok'));
  readonly ready = computed(() => readiness(this.doc(), this.fill()));
  readonly holes = computed(() => gaps(this.doc()));

  readonly summaryVerdict = computed(() => {
    const t = (this.summary()?.text ?? '').trim();
    const w = t ? t.split(/\s+/).length : 0;
    if (!w) return 'Empty. That is a legitimate choice — a strong first role says more than a weak paragraph.';
    if (w < 18) return `${w} words — short. One more sentence would let you name the thing you are good at.`;
    if (w <= 60) return `${w} words — good length. It will read as three lines on the page.`;
    if (w <= 85) return `${w} words — getting long. The last sentence is usually the one to cut.`;
    return `${w} words — this is a paragraph nobody finishes. Cut it to about sixty.`;
  });

  readonly manifest = computed(() => {
    const d = this.doc();
    const sum = (this.summary()?.text ?? '').trim();
    return [
      { step: 1, name: 'Name and title', val: d.profile.name ? `${d.profile.name}${d.profile.role ? ' · ' + d.profile.role : ''}` : 'not set', has: !!d.profile.name },
      { step: 1, name: 'Contact', val: [d.profile.email, d.profile.phone, d.profile.location].filter(Boolean).join(' · ') || 'not set', has: !!(d.profile.email || d.profile.phone) },
      { step: 5, name: 'Summary', val: sum ? `${sum.split(/\s+/).length} words` : 'empty', has: !!sum },
      { step: 2, name: 'Roles', val: String(this.exp().filter((i) => i.role || i.org).length || 'none'), has: this.exp().some((i) => i.role || i.org) },
      { step: 3, name: 'Qualifications', val: String(this.edu().filter((i) => i.award || i.org).length || 'none'), has: this.edu().some((i) => i.award || i.org) },
      { step: 4, name: 'Skills', val: String(this.skills().reduce((n, g) => n + g.list.length, 0) || 'none'), has: this.skills().some((g) => g.list.length) },
    ];
  });

  readonly estimate = computed(() => {
    const f = this.fill();
    if (f.pages > 1) return { over: true, pct: 100, head: `${f.pages} pages`, body: 'Auto-fit at the press will try to pull it back to one — and will say so if it cannot.' };
    const body = f.pct < 45
      ? 'Room to spare. Longer bullets or larger type would carry better than white space.'
      : f.pct > 92
        ? 'Tight. Auto-fit at the press will tighten the setting rather than let it spill.'
        : 'A comfortable single page — the shape a reader expects.';
    return { over: false, pct: f.pct, head: `One page, ${f.pct}% full`, body };
  });

  gapText = (g: { months: number; from: number; to: number }) =>
    `${durationText(g.months)} between ${fromMonths(g.from)} and ${fromMonths(g.to)}`;

  bulletWhy = (text: string) => bulletFlag(text);

  /* ═══════════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════════ */

  go(i: number): void {
    const next = Math.max(0, Math.min(this.STEPS.length - 1, i));
    this.touched.update((t) => ({ ...t, [this.current().key]: true }));
    this.skipped.update((s) => { const c = { ...s }; delete c[this.STEPS[next].key]; return c; });
    this.step.set(next);
  }

  skip(): void {
    this.skipped.update((s) => ({ ...s, [this.current().key]: true }));
    this.go(this.step() + 1);
  }

  pickRoute(v: 'blank' | 'reuse' | 'sample'): void {
    if (v === 'reuse') { this.route.update((r) => (r === 'reuse' ? null : 'reuse')); return; }
    if (v === 'sample') {
      this.route.set('sample');
      this.store.loadSample();
      this.toPress.emit();
      this.notify.emit({ text: 'The sample, on the table. Its problems are deliberate — open CHECK to see what they are.' });
      return;
    }
    this.route.set('blank');
    this.go(1);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     THE PARSER
     ═══════════════════════════════════════════════════════════════════════ */

  runParse(): void {
    const text = this.parseText();
    if (!text.trim()) { this.notify.emit({ text: 'Nothing to read yet — paste the text first.' }); return; }

    const { doc, report } = parseCv(text);
    doc.title = doc.profile.name
      ? `${doc.profile.name}${doc.profile.role ? ' — ' + doc.profile.role : ''}` : 'Untitled CV';
    this.store.replaceDoc(doc, 'parse');
    this.report.set(report);
    this.notify.emit({
      text: `Read ${report.roles} role${report.roles === 1 ? '' : 's'}, ${report.study} qualification${report.study === 1 ? '' : 's'}, ${report.skills} skills.`
        + (report.unread ? ` ${report.unread} date${report.unread === 1 ? '' : 's'} left blank — check them.` : ''),
      tone: report.unread ? 'warn' : '',
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      this.notify.emit({ text: 'That file is larger than 2 MB — paste the text instead.', tone: 'warn' });
      return;
    }
    file.text().then((t) => { this.parseText.set(t); this.runParse(); });
    input.value = '';
  }

  clearParse(): void {
    this.parseText.set('');
    this.report.set(null);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     WRITES — every one goes through the store, so the paper follows
     ═══════════════════════════════════════════════════════════════════════ */

  setProfile(key: string, value: string): void {
    this.store.edit('intake', (d) => {
      (d.profile as unknown as Record<string, string>)[key] = value;
      if (key === 'name' || key === 'role') {
        d.title = d.profile.name
          ? `${d.profile.name}${d.profile.role ? ' — ' + d.profile.role : ''}` : 'Untitled CV';
      }
    });
  }

  setLink(i: number, value: string): void {
    this.store.edit('intake', (d) => {
      d.profile.links ??= [];
      while (d.profile.links.length <= i) d.profile.links.push({ label: 'Link', url: '' });
      d.profile.links[i].url = value;
    });
  }

  setItem(secId: string, i: number, key: string, value: unknown): void {
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (!s) return;
      (s.items[i] as unknown as Record<string, unknown>)[key] = value;
      if (key === 'current' && value === true) (s.items[i] as ExperienceItem).to = '';
    });
  }

  setBullet(secId: string, i: number, j: number, value: string): void {
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (s) (s.items[i] as ExperienceItem).bullets[j] = value;
    });
  }

  addEntry(type: 'experience' | 'education' | 'skills'): void {
    const id = this.store.ensureSection(type);
    this.store.edit('intake add', (d) => {
      const s = d.sections.find((x) => x.id === id)!;
      s.items.push(type === 'skills' ? { group: 'More', list: [] } : newItem(type));
    });
  }

  removeEntry(secId: string, i: number): void {
    const label = this.store.removeItem(secId, i);
    this.notify.emit({ text: `Removed ${label}`, tone: 'warn' });
  }

  addBulletRow(secId: string, i: number): void {
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (s) (s.items[i] as ExperienceItem).bullets.push('');
    });
  }

  removeBulletRow(secId: string, i: number, j: number): void {
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (!s) return;
      const b = (s.items[i] as ExperienceItem).bullets;
      b.splice(j, 1);
      if (!b.length) b.push('');
    });
  }

  addSkill(i: number, value: string, input: HTMLInputElement): void {
    const v = value.trim();
    if (!v) return;
    const secId = this.skillSecId();
    this.store.edit('intake', (d) => {
      const g = d.sections.find((x) => x.id === secId)?.items[i] as SkillGroup | undefined;
      if (g && !g.list.some((s) => s.toLowerCase() === v.toLowerCase())) g.list.push(v);
    });
    input.value = '';
    input.focus();
  }

  removeSkill(i: number, j: number): void {
    const secId = this.skillSecId();
    this.store.edit('intake', (d) => {
      (d.sections.find((x) => x.id === secId)?.items[i] as SkillGroup | undefined)?.list.splice(j, 1);
    });
  }

  suggestSkill(v: string): void {
    const secId = this.store.ensureSection('skills');
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId)!;
      if (!s.items.length) s.items.push({ group: 'Technical', list: [] });
      (s.items[0] as SkillGroup).list.push(v);
    });
  }

  setSummary(value: string): void {
    const secId = this.store.ensureSection('summary');
    this.store.edit('intake', (d) => {
      const s = d.sections.find((x) => x.id === secId)!;
      if (!s.items.length) s.items.push({ text: '' } as SummaryItem);
      (s.items[0] as SummaryItem).text = value;
    });
  }

  /** Called once when the counter opens, so the repeatable steps have a row. */
  seed(): void {
    for (const type of ['experience', 'education', 'skills'] as const) {
      const id = this.store.ensureSection(type);
      const sec = this.store.sectionById(id);
      if (sec && !sec.items.length) {
        this.store.editQuiet((d) => {
          const s = d.sections.find((x) => x.id === id)!;
          if (type === 'skills') { s.items.push({ group: 'Technical', list: [] }, { group: 'Tools', list: [] }); }
          else s.items.push(newItem(type));
        });
      }
    }
  }
}
