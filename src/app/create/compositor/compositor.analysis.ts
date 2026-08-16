/**
 * COMPOSITOR — dates, spans, gaps and the checks
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pure functions over a `CvDoc`. No DOM, no injection, no state — which is
 * what lets the same code answer the timeline, the rail's readiness ring, the
 * inspector's CHECK tab and the counter's manifest without any of them
 * disagreeing about what is wrong with the document.
 *
 * Every finding is a note a good editor would actually make. Nothing here is
 * a score for its own sake: a number with no action attached is decoration.
 */

import {
  CvDoc, EducationItem, ExperienceItem, ProjectItem, Section, SkillGroup,
  SummaryItem, itemLabel,
} from './compositor.models';

/* ═══════════════════════════════════════════════════════════════════════════
   DATES — stored as 'YYYY-MM'
   ═══════════════════════════════════════════════════════════════════════════ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' → months since year zero. NaN when unparseable. */
export function toMonths(ym: string | undefined | null): number {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(ym ?? '').trim());
  return m ? +m[1] * 12 + (+m[2] - 1) : NaN;
}

export function fromMonths(n: number): string {
  return `${MONTHS[n % 12]} ${Math.floor(n / 12)}`;
}

export function nowMonths(): number {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
}

/** What the page prints for a date range. */
export function formatRange(from: string, to: string, current: boolean): string {
  const a = toMonths(from);
  if (Number.isNaN(a)) return '';
  const head = fromMonths(a);
  if (current) return `${head} — Present`;
  const b = toMonths(to);
  return Number.isNaN(b) ? head : `${head} — ${fromMonths(b)}`;
}

export function durationText(months: number): string {
  if (months < 1) return 'under a month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}y ${m}m` : `${y} year${y === 1 ? '' : 's'}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPANS AND GAPS
   ═══════════════════════════════════════════════════════════════════════════ */

export type SpanKind = 'work' | 'study' | 'proj';

export interface Span {
  secId: string; item: number; kind: SpanKind; label: string;
  from: number; to: number; open: boolean; org: string;
}

/** Every dated thing on the CV, normalised. */
export function spans(doc: CvDoc): Span[] {
  const out: Span[] = [];
  const now = nowMonths();

  for (const sec of doc.sections) {
    if (!sec.visible) continue;
    sec.items.forEach((item, i) => {
      let from: number, to: number, label: string, kind: SpanKind;

      if (sec.type === 'experience') {
        const it = item as ExperienceItem;
        from = toMonths(it.from);
        to = it.current ? now : toMonths(it.to);
        label = it.role || it.org || 'Untitled role';
        kind = 'work';
      } else if (sec.type === 'education') {
        const it = item as EducationItem;
        from = toMonths(it.from);
        to = toMonths(it.to);
        label = it.award || it.org || 'Study';
        kind = 'study';
      } else if (sec.type === 'projects') {
        const it = item as ProjectItem;
        from = toMonths(it.from);
        to = toMonths(it.to) || from;
        label = it.name || 'Project';
        kind = 'proj';
      } else {
        return;
      }

      if (Number.isNaN(from)) return;
      const org = (item as ExperienceItem).org || (item as ExperienceItem).role || '';
      out.push({
        secId: sec.id, item: i, kind, label,
        from, to: Number.isNaN(to) ? from : Math.max(from, to),
        open: sec.type === 'experience' && !!(item as ExperienceItem).current,
        org,
      });
    });
  }
  return out.sort((a, b) => a.from - b.from);
}

export interface Gap { from: number; to: number; months: number }

/**
 * Months with no work or study covering them, between the first dated thing
 * and today. Projects deliberately do NOT close a gap: a side project is not
 * an answer to "what were you doing for eight months", and pretending it is
 * would be the tool lying on the candidate's behalf.
 */
export function gaps(doc: CvDoc, minMonths = 3): Gap[] {
  const covering = spans(doc).filter((s) => s.kind !== 'proj');
  if (!covering.length) return [];

  const start = Math.min(...covering.map((s) => s.from));
  const end = nowMonths();
  const filled: boolean[] = new Array(Math.max(0, end - start + 1)).fill(false);

  for (const s of covering) {
    for (let m = Math.max(s.from, start); m <= Math.min(s.to, end); m++) filled[m - start] = true;
  }

  const out: Array<[number, number]> = [];
  let run: number | null = null;
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i]) { if (run === null) run = i; }
    else if (run !== null) { out.push([start + run, start + i - 1]); run = null; }
  }
  if (run !== null) out.push([start + run, end]);

  return out
    .map(([a, b]) => ({ from: a, to: b, months: b - a + 1 }))
    .filter((g) => g.months >= minMonths);
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE CHECKS
   ═══════════════════════════════════════════════════════════════════════════ */

export const WEAK_OPENERS = [
  'responsible for', 'in charge of', 'helped with', 'worked on', 'tasked with',
  'assisted with', 'involved in', 'duties included', 'participated in',
];
const HEDGES = ['various', 'several', 'numerous', 'many different', 'a range of', 'etc'];
const STRONG = [
  'built', 'cut', 'ran', 'led', 'shipped', 'automated', 'rewrote', 'reduced', 'raised',
  'designed', 'migrated', 'launched', 'resolved', 'grew', 'saved', 'delivered', 'owned',
  'negotiated', 'trained', 'recovered', 'halved', 'doubled', 'wrote', 'fixed', 'scaled',
];
export const HAS_NUMBER = /\d|\b(half|halved|doubled|tripled|quarter|third)\b/i;

export type NoteLevel = 'bad' | 'warn' | 'soft' | 'ok';

export interface LineNote {
  secId: string; item: number; bullet: number; text: string;
  level: NoteLevel; kind: string; note: string;
}

/** Line-level writing notes, addressed to the exact bullet they concern. */
export function lineNotes(doc: CvDoc): LineNote[] {
  const out: LineNote[] = [];

  for (const sec of doc.sections) {
    if (sec.type !== 'experience' || !sec.visible) continue;

    sec.items.forEach((raw, i) => {
      const item = raw as ExperienceItem;
      item.bullets.forEach((line, j) => {
        const text = String(line || '').trim();
        if (!text) return;
        const lower = text.toLowerCase();
        const at = { secId: sec.id, item: i, bullet: j, text };

        const weak = WEAK_OPENERS.find((w) => lower.startsWith(w));
        if (weak) {
          out.push({ ...at, level: 'bad', kind: 'opener',
            note: `Opens with “${weak}” — a duty, not a result. Lead with what changed.` });
        } else if (!STRONG.includes(lower.split(/\s+/)[0].replace(/[^a-z]/g, ''))) {
          out.push({ ...at, level: 'soft', kind: 'verb',
            note: 'Does not open on a verb of action. Try leading with what you did.' });
        }

        if (!HAS_NUMBER.test(text)) {
          out.push({ ...at, level: 'soft', kind: 'number',
            note: 'No figure. Even a rough one — “about half”, “around 60 a week” — lands harder.' });
        }

        const hedge = HEDGES.find((h) => lower.includes(h));
        if (hedge) {
          out.push({ ...at, level: 'soft', kind: 'hedge',
            note: `“${hedge}” is doing no work. Name the thing or cut the word.` });
        }

        if (text.split(/\s+/).length > 34) {
          out.push({ ...at, level: 'soft', kind: 'length',
            note: 'Long for a bullet. Two short lines read faster than one long one.' });
        }
      });
    });
  }
  return out;
}

/** The live-typing version: one line, one verdict, or null when it is fine. */
export function bulletFlag(text: string): string | null {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  const weak = WEAK_OPENERS.find((w) => t.startsWith(w));
  if (weak) return `Opens with “${weak}” — that is a duty. What changed because you did it?`;
  if (!HAS_NUMBER.test(t) && t.split(/\s+/).length > 4) {
    return 'No figure. Even a rough one — “about half”, “around 60 a week” — lands harder.';
  }
  return null;
}

export interface Fill { pages: number; pct: number; spilled: string; usedReal: number; lastUsed: number }

export interface DocNote {
  level: NoteLevel;
  text: string;
  action: { go?: string; gap?: Gap; fit?: boolean; lines?: boolean };
}

/** Document-level findings, in the order a reader would hit them. */
export function documentNotes(doc: CvDoc, fill: Fill): DocNote[] {
  const out: DocNote[] = [];
  const p = doc.profile;
  const push = (level: NoteLevel, text: string, action: DocNote['action'] = {}) =>
    out.push({ level, text, action });

  if (!p.name.trim()) push('bad', 'No name on the document.', { go: 'profile' });
  if (!p.role.trim()) push('warn', 'No title under the name. Most parsers expect one.', { go: 'profile' });
  if (!p.email.trim()) push('bad', 'No email address — the one field a filter cannot do without.', { go: 'profile' });

  const exp = doc.sections.find((s) => s.type === 'experience');
  const roles = (exp?.items ?? []).filter((i) => (i as ExperienceItem).role || (i as ExperienceItem).org) as ExperienceItem[];
  if (!roles.length) push('bad', 'No experience section.', { go: exp?.id });

  const undated = roles.filter((r) => Number.isNaN(toMonths(r.from)));
  if (undated.length) {
    push('warn', `${undated.length} role${undated.length > 1 ? 's have' : ' has'} no start date — they cannot be placed on the timeline.`, { go: exp?.id });
  }

  for (const hole of gaps(doc)) {
    push('warn', `${durationText(hole.months)} unaccounted for, ${fromMonths(hole.from)} to ${fromMonths(hole.to)}.`, { gap: hole });
  }

  const sum = doc.sections.find((s) => s.type === 'summary');
  const sumText = ((sum?.items[0] as SummaryItem | undefined)?.text ?? '').trim();
  if (sum?.visible && sumText.length < 40) {
    push('warn', 'The summary is the first thing read and it is nearly empty.', { go: sum.id });
  } else if (sumText.length > 480) {
    push('warn', 'The summary runs past four lines. Three sentences is the working limit.', { go: sum!.id });
  }

  const skillCount = doc.sections
    .filter((s) => s.type === 'skills')
    .flatMap((s) => s.items.flatMap((i) => (i as SkillGroup).list)).length;
  if (skillCount === 0) push('warn', 'No skills listed — keyword matching will score this low.');
  if (skillCount > 26) push('soft', `${skillCount} skills is more than anyone reads. The best twelve do more work.`);

  if (fill.pages > 1) {
    push('warn', `Runs to ${fill.pages} pages${fill.spilled ? ` — ${fill.spilled} moved over` : ''}. Auto-fit can pull it back.`, { fit: true });
  } else if (fill.pct > 96) {
    push('soft', 'Page one is full to the edge. One more line and it breaks.', { fit: true });
  } else if (fill.pct < 45 && roles.length) {
    push('soft', 'Over half the page is empty. Longer bullets or larger type would carry better.');
  }

  if (doc.design.layout === 'split') {
    push('soft', 'Two-column layouts read out of order in older parsers. Fine for a human, risky for a filter.');
  }
  if (doc.design.size < 9.4) {
    push('warn', 'Below about 9.5px the print is smaller than most people will read comfortably.', { go: 'design' });
  }

  const bad = lineNotes(doc).filter((n) => n.level === 'bad').length;
  if (bad) push('bad', `${bad} line${bad > 1 ? 's open' : ' opens'} with a duty rather than a result.`, { lines: true });

  return out;
}

export interface Readiness { pct: number; tests: Array<[string, boolean]>; done: number; total: number }

/** The single readiness number in the rail, and why it is not higher. */
export function readiness(doc: CvDoc, fill: Fill): Readiness {
  const p = doc.profile;
  const tests: Array<[string, boolean]> = [
    ['A name and a title', !!(p.name.trim() && p.role.trim())],
    ['A way to reach you', !!(p.email.trim() && (p.phone.trim() || p.location.trim()))],
    ['At least one role', doc.sections.some((s) => s.type === 'experience'
      && s.items.some((i) => (i as ExperienceItem).role && (i as ExperienceItem).org))],
    ['Dated roles', doc.sections.some((s) => s.type === 'experience'
      && s.items.some((i) => !Number.isNaN(toMonths((i as ExperienceItem).from))))],
    ['A summary', doc.sections.some((s) => s.type === 'summary' && s.visible
      && ((s.items[0] as SummaryItem | undefined)?.text || '').trim().length > 40)],
    ['Skills', doc.sections.some((s) => s.type === 'skills'
      && s.items.some((i) => (i as SkillGroup).list.length))],
    ['Results, not duties', lineNotes(doc).every((n) => n.level !== 'bad')],
    ['Fits one page', fill.pages === 1],
  ];
  const done = tests.filter(([, ok]) => ok).length;
  return { pct: Math.round((done / tests.length) * 100), tests, done, total: tests.length };
}

export function countWords(doc: CvDoc): number {
  const prose = doc.sections.flatMap((s) => s.items.flatMap((it) => [
    (it as SummaryItem).text, (it as ExperienceItem).role, (it as ExperienceItem).org,
    (it as ProjectItem).desc, (it as EducationItem).note,
    ...((it as ExperienceItem).bullets || []),
  ])).concat([doc.profile.name, doc.profile.role]).filter(Boolean).join(' ');
  return prose.trim() ? prose.trim().split(/\s+/).length : 0;
}

/** Skills implied by the candidate's own prose. Their words, not a top-ten list. */
const SKILL_BANK = [
  'SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node',
  'Linux', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Git', 'REST APIs', 'GraphQL',
  'Grafana', 'Jira', 'Figma', 'Postman', 'Excel', 'Power BI', 'Tableau',
  'incident response', 'on-call', 'runbooks', 'postmortems', 'triage',
  'monitoring', 'observability', 'root cause analysis', 'technical writing', 'mentoring',
];

export function suggestedSkills(doc: CvDoc): string[] {
  const prose = doc.sections.flatMap((s) => s.items.flatMap((it) => [
    (it as ExperienceItem).role, (it as ExperienceItem).org, (it as ProjectItem).name,
    (it as ProjectItem).desc, (it as SummaryItem).text, ...((it as ExperienceItem).bullets || []),
  ])).join(' ').toLowerCase();

  const have = doc.sections.filter((s) => s.type === 'skills')
    .flatMap((s) => s.items.flatMap((i) => (i as SkillGroup).list))
    .map((s) => s.toLowerCase());

  return SKILL_BANK
    .filter((t) => prose.includes(t.toLowerCase()) && !have.includes(t.toLowerCase()))
    .slice(0, 8);
}

const TITLE_MAP: Record<string, string[]> = {
  'application support': ['Application Support Engineer', 'Application Support Analyst', 'Technical Support Engineer'],
  support: ['Technical Support Engineer', 'IT Support Analyst', 'Service Desk Analyst'],
  developer: ['Software Developer', 'Software Engineer', 'Full-Stack Developer'],
  engineer: ['Software Engineer', 'Systems Engineer', 'Platform Engineer'],
  designer: ['Product Designer', 'UI/UX Designer', 'Visual Designer'],
  analyst: ['Business Analyst', 'Data Analyst', 'Systems Analyst'],
  manager: ['Delivery Manager', 'Engineering Manager', 'Programme Manager'],
};

export function titleIdeas(title: string): string[] {
  const t = String(title || '').trim().toLowerCase();
  if (t.length < 3) return [];
  const hit = Object.keys(TITLE_MAP).find((k) => t.includes(k));
  return (hit ? TITLE_MAP[hit] : []).filter((v) => v.toLowerCase() !== t).slice(0, 3);
}

/** A machine's view of the document — the CHECK tab's read-back. */
export function machineReadBack(doc: CvDoc): string {
  const p = doc.profile;
  const pad = (s: string) => s.padEnd(7);
  const lines: string[] = [
    `${pad('NAME')} ${p.name || '—'}`,
    `${pad('TITLE')} ${p.role || '—'}`,
    `${pad('EMAIL')} ${p.email || '—'}`,
    `${pad('PHONE')} ${p.phone || '—'}`,
    `${pad('PLACE')} ${p.location || '—'}`,
    '',
  ];
  for (const sec of doc.sections) {
    if (!sec.visible) continue;
    lines.push(`[${sec.title.toUpperCase()}]`);
    if (!sec.items.length) lines.push('  (empty)');
    sec.items.forEach((it) => {
      const label = itemLabel(sec.type, it);
      if (sec.type === 'experience') {
        const e = it as ExperienceItem;
        lines.push(`  ${label || '(untitled)'} @ ${e.org || '?'} · ${formatRange(e.from, e.to, e.current) || 'no dates'}`);
        e.bullets.filter(Boolean).forEach((b) => lines.push(`    - ${b}`));
      } else if (sec.type === 'skills') {
        lines.push(`  ${label}: ${(it as SkillGroup).list.join(', ') || '(none)'}`);
      } else if (sec.type === 'summary') {
        lines.push(`  ${((it as SummaryItem).text || '(empty)').slice(0, 120)}`);
      } else {
        lines.push(`  ${label || '(untitled)'}`);
      }
    });
    lines.push('');
  }
  return lines.join('\n');
}

export const sectionById = (doc: CvDoc, id: string): Section | undefined =>
  doc.sections.find((s) => s.id === id);
