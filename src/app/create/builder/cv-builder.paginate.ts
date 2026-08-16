/**
 * ELEVATOR — the paginator
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The page is never resized to fit the content. It is A4, and a preview that
 * silently rescaled would answer the wrong question — "does this fit" is the
 * one thing this canvas exists to tell you, so it has to be measured against
 * a real sheet.
 *
 * Content that does not fit continues on a second sheet, cut BETWEEN blocks
 * so a line is never sliced across a page break, with the section heading
 * reprinted as "(cont.)".
 *
 * The document is generated as an HTML string rather than a component tree,
 * for two reasons that both matter:
 *
 *   · Measurement has to be synchronous. The paginator lays a block into an
 *     off-screen ruler and reads its height during render, so the page is
 *     correct on its FIRST paint. A layout measured a frame later is a layout
 *     the reader watches snap into place.
 *   · The same markup has to go through the ruler and onto the sheet. One
 *     string, measured then mounted, cannot disagree with itself.
 *
 * Because that markup is mounted with `innerHTML`, Angular never stamps it
 * with a `_ngcontent` attribute — which is exactly why `_cv-builder.scss` is
 * a GLOBAL partial and not a component stylesheet. See CLAUDE.md.
 */

import {
  CvDoc, EducationItem, ExperienceItem, ProjectItem, SECTION_KINDS,
  SkillGroup, SummaryItem, SectionItem, Section, SectionType, itemHasContent,
} from './cv-builder.models';
import { Fill, formatRange } from './cv-builder.analysis';

/** A4 at 96dpi, and the three margin settings in px. */
export const PAGE = { w: 794, h: 1123 };

export const MARGINS: Record<string, { side: number; top: number; bottom: number }> = {
  tight: { side: 44, top: 40, bottom: 44 },
  normal: { side: 62, top: 58, bottom: 62 },
  roomy: { side: 86, top: 76, bottom: 84 },
};

export const margin = (doc: CvDoc) => MARGINS[doc.design.margin] ?? MARGINS['normal'];

export const contentBox = (doc: CvDoc) => {
  const m = margin(doc);
  return { w: PAGE.w - m.side * 2, h: PAGE.h - m.top - m.bottom };
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/* ═══════════════════════════════════════════════════════════════════════════
   THE DOCUMENT AS BLOCKS
   ───────────────────────────────────────────────────────────────────────────
   Every block is addressable (`data-blk`), labelled (`data-tag`), and knows
   whether it is real or a ghost. Pagination moves whole blocks and nothing
   smaller.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Block {
  kind: 'profile' | 'item';
  secId: string;
  secTitle?: string;
  tag: string;
  html: string;
  ghost: boolean;
  item?: number | null;
}

export interface PageGroup { secId?: string; title: string | null; cont?: boolean; blocks: Block[] }
export interface Page { groups: PageGroup[] }

/** An editable run of text on the page. */
function ed(path: string, value: unknown, placeholder: string, cls = ''): string {
  const empty = !String(value ?? '').trim();
  return `<span class="${cls}" data-path="${path}" contenteditable="plaintext-only" spellcheck="false"`
    + `${empty ? ` data-empty="${esc(placeholder)}"` : ''}>${esc(value ?? '')}</span>`;
}

function profileBlock(doc: CvDoc): string {
  const p = doc.profile;
  const contact = [p.email, p.phone, p.location, ...p.links.filter((l) => l.url).map((l) => l.url)]
    .filter(Boolean);

  const photo = doc.design.photo && p.photo
    ? `<img class="doc__photo" src="${esc(p.photo)}" alt="">` : '';

  return `<div class="doc__head">${photo}<div>
      <h2 class="doc__name">${ed('profile.name', p.name, 'Your name')}</h2>
      <p class="doc__role">${ed('profile.role', p.role, 'What you do')}</p>
      <div class="doc__contact">
        ${contact.length
          ? contact.map((c) => `<span><i></i>${esc(c)}</span>`).join('')
          : '<span><i></i>Add a way to reach you</span>'}
      </div>
    </div></div>`;
}

function itemBlock(doc: CvDoc, sec: Section, item: SectionItem, i: number): string {
  const secIndex = doc.sections.findIndex((s) => s.id === sec.id);
  const path = `sections.${secIndex}.items.${i}`;

  switch (sec.type) {
    case 'summary':
      return `<div class="doc__summary">${ed(`${path}.text`, (item as SummaryItem).text,
        'Three sentences: what you are, what you have done, what you are aiming at.')}</div>`;

    case 'experience': {
      const it = item as ExperienceItem;
      return `<div class="doc__item">
        <h4>${ed(`${path}.role`, it.role, 'Role')}</h4>
        <div class="doc__meta">
          <span>${ed(`${path}.org`, it.org, 'Company')}${it.place ? ' · ' + esc(it.place) : ''}</span>
          <em>${esc(formatRange(it.from, it.to, it.current)) || 'Dates'}</em>
        </div>
        ${it.bullets.length ? `<ul>${it.bullets.map((b, j) =>
          `<li data-line="${j}">${ed(`${path}.bullets.${j}`, b, 'What changed because you were there')}</li>`
        ).join('')}</ul>` : ''}
      </div>`;
    }

    case 'education': {
      const it = item as EducationItem;
      return `<div class="doc__item">
        <h4>${ed(`${path}.award`, it.award, 'Qualification')}</h4>
        <div class="doc__meta">
          <span>${ed(`${path}.org`, it.org, 'Institution')}</span>
          <em>${esc(formatRange(it.from, it.to, false)) || 'Dates'}</em>
        </div>
        ${it.note ? `<div>${ed(`${path}.note`, it.note, '')}</div>` : ''}
      </div>`;
    }

    case 'projects': {
      const it = item as ProjectItem;
      return `<div class="doc__item">
        <h4>${ed(`${path}.name`, it.name, 'Project')}</h4>
        <div class="doc__meta">
          <span>${ed(`${path}.role`, it.role, 'Your part')}${it.link ? ' · ' + esc(it.link) : ''}</span>
          <em>${esc(formatRange(it.from, it.to, false))}</em>
        </div>
        <div>${ed(`${path}.desc`, it.desc, 'The problem, and what you built')}</div>
      </div>`;
    }

    case 'skills': {
      const it = item as SkillGroup;
      return `<div class="doc__skillrow">
        <b>${esc(it.group)}</b>
        <div class="doc__skills">${it.list.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
      </div>`;
    }
    default:
      return '';
  }
}

/**
 * Ghosts. An unwritten section still occupies its place on the page, greyed,
 * so the empty document shows the SHAPE of the finished one and "what is
 * missing" appears where the reader will look for it rather than only in a
 * checklist somebody has to go and read.
 */
const GHOST: Record<SectionType, () => string> = {
  summary: () => `<div class="doc__summary">Three sentences about what you are, what you have
      done, and what you are aiming at. This is the first thing anyone reads.</div>`,
  experience: () => `<div class="doc__item"><h4>Your most recent role</h4>
      <div class="doc__meta"><span>Company · City</span><em>Mar 2023 — Present</em></div>
      <ul><li>What changed because you were there.</li><li>And the figure that proves it.</li></ul></div>`,
  education: () => `<div class="doc__item"><h4>Your qualification</h4>
      <div class="doc__meta"><span>Where you studied</span><em>2019 — 2023</em></div></div>`,
  projects: () => `<div class="doc__item"><h4>Something you built</h4>
      <div class="doc__meta"><span>Your part · a link</span><em>2024</em></div>
      <div>The problem, and what you made to solve it.</div></div>`,
  skills: () => `<div class="doc__skillrow"><b>Technical</b>
      <div class="doc__skills"><span>A language</span><span>A platform</span><span>A tool</span></div></div>`,
};

/** The flat list of things to flow, each carrying its section. */
export function documentBlocks(doc: CvDoc): Block[] {
  const out: Block[] = [{
    kind: 'profile', secId: 'profile', tag: 'HEADER', html: profileBlock(doc), ghost: false,
  }];

  for (const sec of doc.sections) {
    if (!sec.visible) continue;
    const kind = SECTION_KINDS[sec.type];
    const real = sec.items.filter((it) => itemHasContent(sec.type, it));

    if (!real.length) {
      out.push({
        kind: 'item', secId: sec.id, secTitle: sec.title, tag: kind.tag,
        html: GHOST[sec.type](), ghost: true, item: null,
      });
      continue;
    }

    sec.items.forEach((item, i) => {
      if (!itemHasContent(sec.type, item)) return;
      out.push({
        kind: 'item', secId: sec.id, secTitle: sec.title, tag: kind.tag,
        html: itemBlock(doc, sec, item, i), ghost: false, item: i,
      });
    });
  }
  return out;
}

export function docClasses(doc: CvDoc): string {
  const d = doc.design;
  const layout: Record<string, string> = {
    classic: '', rule: 'doc--rule', quiet: 'doc--quiet', centred: 'doc--centred', split: 'doc--split',
  };
  return ['doc', d.font === 'sans' ? 'doc--sans' : '', layout[d.layout] ?? ''].filter(Boolean).join(' ');
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE RULER
   ───────────────────────────────────────────────────────────────────────────
   One off-screen node, reused. It carries the document's own custom
   properties so the measurement is made at the type size that will actually
   be printed — measuring at the theme's defaults and hoping is how a
   paginator ends up one line out on every page.
   ═══════════════════════════════════════════════════════════════════════════ */

export class Ruler {
  private el: HTMLElement | null = null;

  constructor(private readonly doc: Document) {}

  measure(html: string, width: number, docClass: string, cv: CvDoc): number {
    if (!this.el) {
      const el = this.doc.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none';
      this.doc.body.appendChild(el);
      this.el = el;
    }
    const el = this.el;
    el.className = `doc ${docClass}`;
    el.style.width = `${width}px`;
    el.style.setProperty('--doc-size', `${cv.design.size}px`);
    el.style.setProperty('--doc-leading', String(cv.design.leading));
    el.style.setProperty('--doc-gap', String(cv.design.gap));
    el.style.setProperty('--doc-font', cv.design.font === 'serif'
      ? 'var(--p-elevator-font-serif)' : 'var(--p-elevator-font-sans)');
    el.style.setProperty('--doc-accent', cv.design.accent);
    el.innerHTML = html;
    return el.getBoundingClientRect().height;
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
  }
}

export interface PaginateResult { pages: Page[]; fill: Fill }

export function paginate(cv: CvDoc, ruler: Ruler): PaginateResult {
  const box = contentBox(cv);
  const cls = docClasses(cv);
  const width = cv.design.layout === 'split' ? Math.round(box.w * 0.66) : box.w;

  const blocks = documentBlocks(cv);
  const pages: Page[] = [{ groups: [] }];
  let used = 0;
  let usedReal = 0;
  let spilled = '';
  const seen = new Set<string>();

  const headingH = (title: string) =>
    ruler.measure(`<div class="doc__sec"><h3>${esc(title)}</h3></div>`, width, cls, cv);

  for (const b of blocks) {
    const page = pages[pages.length - 1];
    const h = ruler.measure(b.html, width, cls, cv);

    if (b.kind === 'profile') {
      page.groups.push({ title: null, blocks: [b] });
      used += h;
      usedReal += h;
      continue;
    }

    const existing = page.groups.find((g) => g.secId === b.secId);
    const needsHeading = !existing;
    const cost = h + (needsHeading ? headingH(b.secTitle!) + cv.design.gap : 0);

    if (used + cost > box.h && used > 0) {
      if (!spilled) spilled = b.secTitle ?? '';
      pages.push({ groups: [] });
      used = 0;
    }

    const target = pages[pages.length - 1];
    let group = target.groups.find((g) => g.secId === b.secId);
    if (!group) {
      group = { secId: b.secId, title: b.secTitle ?? null, cont: seen.has(b.secId), blocks: [] };
      target.groups.push(group);
      seen.add(b.secId);
      used += headingH(b.secTitle!) + cv.design.gap;
    }
    group.blocks.push(b);
    used += h;
    if (!b.ghost) usedReal += h;
  }

  return {
    pages,
    fill: {
      pages: pages.length,
      pct: clamp(Math.round((usedReal / box.h) * 100), 0, 100),
      spilled,
      usedReal,
      lastUsed: used,
    },
  };
}

/**
 * The page's HTML, ready to mount. Kept next to the paginator because the
 * markup it emits per block must be byte-identical to what was measured.
 */
export function pagesHtml(cv: CvDoc, pages: Page[], fill: Fill, sel: { sec: string | null; item: number | null },
                          flagged: Set<string>): string {
  const m = margin(cv);
  const box = contentBox(cv);
  const cls = docClasses(cv);

  return pages.map((page, pi) => {
    const groups = page.groups.map((g) => {
      const body = g.blocks.map((b) => {
        const key = b.item == null ? `${b.secId}:ghost` : `${b.secId}:${b.item}`;
        const isSel = sel.sec === b.secId && (sel.item === b.item || (sel.item == null && b.item == null));
        const classes = ['blk', b.ghost ? 'is-ghost' : '', isSel ? 'is-sel' : '',
          flagged.has(key) ? 'is-flagged' : ''].filter(Boolean).join(' ');
        return `<div class="${classes}" data-blk="${key}" data-tag="${esc(b.tag)}" tabindex="0"`
          + ` role="button" aria-label="${esc(b.tag)}">${b.html}`
          + `${b.ghost ? '<span class="ghost-tag">EMPTY</span>' : ''}</div>`;
      }).join('');

      if (!g.title) {
        const b = g.blocks[0];
        const isSel = sel.sec === 'profile';
        return `<div class="blk ${isSel ? 'is-sel' : ''}" data-blk="profile" data-tag="HEADER"`
          + ` tabindex="0" role="button" aria-label="Header">${b.html}</div>`;
      }
      return `<section class="doc__sec"><h3>${esc(g.title)}`
        + `${g.cont ? '<span class="doc__cont"> (cont.)</span>' : ''}</h3>${body}</section>`;
    }).join('');

    /* The fold marker only makes sense on the last page that has room left. */
    const foldTop = pi === pages.length - 1 && pages.length === 1
      ? m.top + Math.min(fill.lastUsed, box.h)
      : null;

    return `<div class="sheet" data-page="${pi}">
      <div class="sheet__guide"></div>
      <div class="sheet__baseline"></div>
      ${pi === 0 ? `<div class="gauge ${fill.pages > 1 ? 'gauge--over' : fill.pct > 92 ? 'gauge--tight' : ''}">
        <div class="gauge__fill" style="height:${fill.pages > 1 ? 100 : fill.pct}%"></div></div>` : ''}
      <div class="sheet__body ${cls}">${groups}</div>
      ${foldTop != null && fill.pct > 12 && fill.pct < 99
        ? `<div class="fold" style="top:${foldTop}px" data-label="ROOM LEFT — ${100 - fill.pct}%"></div>` : ''}
      <div class="sheet__folio">PAGE ${pi + 1} OF ${pages.length} · A4</div>
    </div>`;
  }).join('');
}
