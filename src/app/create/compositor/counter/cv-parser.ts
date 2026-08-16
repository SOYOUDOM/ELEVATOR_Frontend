/**
 * THE CV PARSER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Heuristic, local, and honest about it. It reads the shapes a CV actually
 * comes in — a heading, then entries, then bullets — and it leaves a field
 * BLANK rather than guess, then reports how often it had to.
 *
 * A parser that silently invents a plausible date is worse than no parser,
 * because you stop checking its work. Everything it could not read is counted
 * and shown with the same weight as everything it could.
 *
 * Runs in the browser. Nothing is uploaded, which is the only reason it is
 * reasonable to ask someone to hand over their whole CV.
 */

import {
  CvDoc, EducationItem, ExperienceItem, ProjectItem, SkillGroup, SummaryItem, blankDoc,
} from '../compositor.models';

export interface ParseReport {
  roles: number;
  study: number;
  skills: number;
  /** Dates written in a form the parser could not read at all. */
  unread: number;
  /** Dates that gave a year with no month, and now sit on January. */
  approx: number;
}

const MONTH_WORDS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Anything a human writes for a month → 'YYYY-MM', 'PRESENT', or '' . */
export function parseWhen(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase().replace(/[.,]/g, '');
  if (!s) return '';
  if (/^(present|now|current|to date|ongoing)$/.test(s)) return 'PRESENT';

  let m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}`;

  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[2]}-${String(+m[1]).padStart(2, '0')}`;

  m = /^([a-z]{3,9})\s+(\d{4})$/.exec(s);
  if (m) {
    const key = MONTH_WORDS[m[1].slice(0, 4)] !== undefined ? m[1].slice(0, 4) : m[1].slice(0, 3);
    if (MONTH_WORDS[key] !== undefined) {
      return `${m[2]}-${String(MONTH_WORDS[key]).padStart(2, '0')}`;
    }
  }

  /* A bare year is real information, so it is kept — pinned to January and
     counted as approximate, rather than thrown away or invented into a month. */
  if (/^(19|20)\d{2}$/.test(s)) return `${s}-01`;

  return '';
}

const bareYear = (v: string) => /^(19|20)\d{2}$/.test(String(v ?? '').trim());

interface Range { from: string; to: string; current: boolean; rest: string; unread: number; approx: number }

/** Pull a date range out of a line, and return the line without it. */
export function extractRange(line: string): Range {
  const pat = /((?:[A-Za-z]{3,9}\s+)?(?:\d{1,2}\/)?(?:19|20)\d{2}(?:-\d{1,2})?)\s*(?:–|—|-{1,2}|to)\s*((?:[A-Za-z]{3,9}\s+)?(?:\d{1,2}\/)?(?:19|20)\d{2}(?:-\d{1,2})?|present|now|current|ongoing)/i;
  const m = pat.exec(line);
  if (!m) return { from: '', to: '', current: false, rest: line, unread: 0, approx: 0 };

  const from = parseWhen(m[1]);
  const toRaw = parseWhen(m[2]);
  return {
    from: from === 'PRESENT' ? '' : from,
    to: toRaw === 'PRESENT' ? '' : toRaw,
    current: toRaw === 'PRESENT',
    rest: line.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim(),
    unread: (from ? 0 : 1) + (toRaw ? 0 : 1),
    approx: (bareYear(m[1]) ? 1 : 0) + (bareYear(m[2]) ? 1 : 0),
  };
}

const HEADINGS: Record<string, RegExp> = {
  summary: /^(summary|profile|about|objective|personal statement)\b/i,
  experience: /^(experience|work experience|employment|professional experience|work history|career)\b/i,
  education: /^(education|qualifications|academic|studies|training)\b/i,
  skills: /^(skills|technical skills|competenc|expertise|technologies)\b/i,
  projects: /^(projects|selected projects|side projects|portfolio)\b/i,
};

const BULLET_MARK = /^[\s]*[-–—•*·▪◦]\s+/;

/** "Role — Employer — Place" in any of the punctuations people use. */
function splitHead(head: string, extra: string[] = []): [string, string, string, string] {
  const parts = String(head ?? '')
    .split(/\s*(?:—|–|\||·|,|\bat\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 1 && extra.length) {
    parts.push(...extra[0].split(/\s*(?:—|–|\||·|,)\s*/).map((s) => s.trim()));
  }
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? ''];
}

function splitList(s: string): string[] {
  return String(s ?? '')
    .split(/\s*(?:,|·|\||;|•)\s*/)
    .map((t) => t.replace(BULLET_MARK, '').trim())
    .filter((t) => t && t.length < 34);
}

interface RawEntry { head: string; from: string; to: string; current: boolean; bullets: string[]; extra: string[] }

export function parseCv(text: string): { doc: CvDoc; report: ParseReport } {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n');
  const doc = blankDoc();
  const report: ParseReport = { roles: 0, study: 0, skills: 0, unread: 0, approx: 0 };

  /* ── the header block: everything before the first known heading ─────── */
  let firstHeading = lines.findIndex((l) => Object.values(HEADINGS).some((re) => re.test(l.trim())));
  if (firstHeading < 0) firstHeading = Math.min(lines.length, 6);
  const head = lines.slice(0, firstHeading).map((l) => l.trim()).filter(Boolean);

  const all = lines.join('\n');
  const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
  const email = EMAIL.exec(all);
  const phone = /(\+?\d[\d\s().-]{7,}\d)/.exec(all.replace(/\d{4}\s*[-–—]\s*\d{4}/g, ' '));
  if (email) doc.profile.email = email[0];
  if (phone) doc.profile.phone = phone[1].trim();

  const contactish = (l: string) => /@|\+?\d{6,}|https?:|www\.|\.com|\.dev|\.io|linkedin|github/i.test(l);
  const nameLine = head.find((l) => !contactish(l) && l.split(/\s+/).length <= 5);
  if (nameLine) doc.profile.name = nameLine.replace(/^[#*\s]+/, '').trim();
  const roleLine = head.find((l) => l !== nameLine && !contactish(l) && l.length < 70);
  if (roleLine) doc.profile.role = roleLine.replace(/^[#*\s]+/, '').trim();

  /* Almost nobody gives their city its own line — it rides on the contact
     row next to the email and the phone. So the header is re-read as
     FRAGMENTS, split on the separators people actually type, and the one
     that looks like a place is the one with a comma and no domain in it. */
  const frags = head
    .filter((l) => l !== nameLine && l !== roleLine)
    .flatMap((l) => l.split(/\s*[|·•]\s*/))
    .map((f) => f.trim())
    .filter(Boolean);
  const place = frags.find((f) => /,/.test(f) && !contactish(f) && f.split(/\s+/).length <= 6);
  if (place) doc.profile.location = place;

  /* Emails are stripped before the link scan, or every CV comes back
     carrying its own mail domain as a portfolio link. */
  const noEmail = all.replace(new RegExp(EMAIL.source, 'gi'), ' ');
  const links = [...noEmail.matchAll(/((?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|dev|io|net|org|me)(?:\/[\w\-./]*)?)/gi)]
    .map((m) => m[1]).slice(0, 2);
  doc.profile.links = links.length
    ? links.map((u, i) => ({ label: i ? 'Also' : 'Site', url: u }))
    : [{ label: 'Portfolio', url: '' }];

  /* ── walk the body, one heading at a time ────────────────────────────── */
  let mode: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!mode || !buffer.length) { buffer = []; return; }
    const sec = doc.sections.find((s) => s.type === mode);
    if (!sec) { buffer = []; return; }

    if (mode === 'summary') {
      sec.items = [{ text: buffer.join(' ').replace(/\s{2,}/g, ' ').trim() } as SummaryItem];
    }

    if (mode === 'skills') {
      const groups: SkillGroup[] = [];
      for (const line of buffer) {
        const kv = /^([A-Za-z][\w\s/&+-]{1,26}):\s*(.+)$/.exec(line);
        if (kv) {
          groups.push({ group: kv[1].trim(), list: splitList(kv[2]) });
        } else {
          const list = splitList(line);
          if (!list.length) continue;
          if (groups.length && !/[:]/.test(line)) groups[groups.length - 1].list.push(...list);
          else groups.push({ group: 'Skills', list });
        }
      }
      sec.items = groups.filter((g) => g.list.length).map((g) => ({ ...g, list: g.list.slice(0, 14) }));
      report.skills = sec.items.reduce((n, g) => n + (g as SkillGroup).list.length, 0);
    }

    if (mode === 'experience' || mode === 'education' || mode === 'projects') {
      const entries: RawEntry[] = [];
      for (const line of buffer) {
        if (BULLET_MARK.test(line)) {
          const t = line.replace(BULLET_MARK, '').trim();
          if (entries.length && t) entries[entries.length - 1].bullets.push(t);
          continue;
        }
        const r = extractRange(line);
        report.unread += r.unread;
        report.approx += r.approx;

        /* A line carrying a date opens a new entry; a line without one
           continues the entry above it, or starts one if there is none. */
        if (r.from || r.to || r.current || !entries.length) {
          entries.push({ head: r.rest, from: r.from, to: r.to, current: r.current, bullets: [], extra: [] });
        } else {
          entries[entries.length - 1].extra.push(line.trim());
        }
      }

      if (mode === 'experience') {
        sec.items = entries.map((e) => {
          const [role, org, place] = splitHead(e.head, e.extra);
          return {
            role, org, place, from: e.from, to: e.to, current: e.current,
            bullets: e.bullets.length ? e.bullets : [''],
          } as ExperienceItem;
        }).filter((it) => (it as ExperienceItem).role || (it as ExperienceItem).org);
        report.roles = sec.items.length;
      }

      if (mode === 'education') {
        sec.items = entries.map((e) => {
          const [award, org, , note] = splitHead(e.head, e.extra);
          return { award, org, from: e.from, to: e.to, note: note || e.bullets[0] || '' } as EducationItem;
        }).filter((it) => (it as EducationItem).award || (it as EducationItem).org);
        report.study = sec.items.length;
      }

      if (mode === 'projects') {
        sec.items = entries.map((e) => {
          const [name, role] = splitHead(e.head, e.extra);
          return {
            name, role, link: '', from: e.from, to: e.to,
            desc: e.bullets.join(' ') || e.extra.join(' '),
          } as ProjectItem;
        }).filter((it) => (it as ProjectItem).name);
      }
    }
    buffer = [];
  };

  for (const raw of lines.slice(firstHeading)) {
    const line = raw.trim();
    const hit = Object.entries(HEADINGS).find(([, re]) => re.test(line) && line.length < 46);
    if (hit) { flush(); mode = hit[0]; continue; }
    if (line) buffer.push(line);
  }
  flush();

  /* Sections the source did not have stay in the document but stay empty —
     the ghost blocks on the page are how "you have no projects" is said. */
  return { doc, report };
}
