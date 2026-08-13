import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { CvDraftStore } from '../cv-draft.store';
import { CvDraft } from '../cv.models';

/** One block of the CV. The smallest thing pagination is allowed to move. */
interface Block {
    kind: 'head' | 'item';
    /** Section it belongs to; blank for the header block. */
    section: string;
    html: string;
}

/** A single physical page, already filled. */
export interface Sheet {
    /** Section title → the items that landed on this page, in order. */
    groups: { title: string; continued: boolean; items: string[] }[];
    head: boolean;
}

const PAGE = { w: 794, h: 1123, padY: 46, padX: 48 };
const CONTENT_H = PAGE.h - PAGE.padY * 2;

const SECTION_LABEL: Record<string, string> = {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
};

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/**
 * ELEVATOR — the CV preview, as real pages.
 *
 * The sheet is ALWAYS A4 (794×1123 at 96dpi). Content never resizes the page;
 * when it runs past the bottom it continues on a new sheet, cut between
 * blocks so a line is never sliced in half. A section that spills reprints
 * its heading with “(cont.)”, the way a printed CV does.
 *
 * Measurement happens synchronously inside the computed below, against one
 * reusable off-screen ruler — NOT in a rAF. A view transition snapshots the
 * DOM the moment the route swaps, so anything sized a frame later gets
 * captured at the wrong size and visibly pops.
 *
 * `scale` is applied with a transform, which does not affect layout, so the
 * host reports the scaled height through --sheet-stack-h for the caller to
 * reserve space with.
 */
@Component({
    selector: 'app-cv-sheet',
    standalone: true,
    templateUrl: './cv-sheet.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'elv-cv-sheets-host' },
})
export class CvSheetComponent {
    /** 1 = full size. The dock passes a fraction; review passes 1. */
    readonly scale = input(1);
    /** Dim what a recruiter skips on the first pass. */
    readonly sixSecond = input(false);

    /* eslint-disable @typescript-eslint/member-ordering --
       The private field below is read DURING the initialisation of the public
       members that follow it, so it genuinely has to be declared first. The
       ordering rule cannot express that dependency, and re-enabling it after
       the field does not help: the rule reports on the PUBLIC members, not on
       the private one. Scoped to this class only. */
    private readonly store = inject(CvDraftStore);
    readonly draft = this.store.draft;
    readonly template = this.store.template;
    readonly sidebar = computed(() => this.template().id === 'shaft');

    readonly paperClass = computed(() => {
        const map: Record<string, string> = {
            monolith: '',
            shaft: 'elv-paper--sidebar',
            ledger: 'elv-paper--rule',
            beacon: 'elv-paper--center',
        };
        return [map[this.template().id] ?? '', this.sixSecond() ? 'elv-paper--six' : ''].filter(Boolean).join(' ');
    });

    readonly sheets = computed<Sheet[]>(() => this.paginate(this.draft()));
    readonly pageCount = computed(() => this.sheets().length);

    /** Reserve the scaled height — transform leaves layout untouched. */
    readonly stackHeight = computed(() => `${this.pageCount() * (PAGE.h + 22) * this.scale()}px`);

    readonly headHtml = computed(() => this.buildHead(this.draft()));
    readonly sideHtml = computed(() => this.buildSide(this.draft()));

    /* ── Pagination ───────────────────────────────────────────── */

    private ruler?: HTMLElement;

    private measure(html: string, width: number, cls: string): number {
        if (!this.ruler) {
            const el = document.createElement('div');
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none';
            document.body.appendChild(el);
            this.ruler = el;
        }
        this.ruler.className = `elv-paper ${cls}`;
        this.ruler.style.width = `${width}px`;
        this.ruler.innerHTML = html;
        return this.ruler.getBoundingClientRect().height;
    }

    private paginate(d: CvDraft): Sheet[] {
        const side = d.template.id === 'shaft';
        const cls = side ? 'elv-paper--sidebar' : this.paperClass() || '';
        const width = side ? Math.round(PAGE.w * 0.66) - 68 : PAGE.w - PAGE.padX * 2;

        const blocks = this.buildBlocks(d, side);
        const pages: Sheet[] = [{ groups: [], head: true }];
        let used = this.measure(this.buildHead(d), width, cls);
        const seen = new Set<string>();

        for (const blk of blocks) {
            const page = pages[pages.length - 1];
            const label = SECTION_LABEL[blk.section] ?? blk.section;
            let group = page.groups.find((g) => g.title === label);
            const headingCost = group ? 0 : this.measure(`<h4>${label}</h4>`, width, cls);
            const need = headingCost + this.measure(blk.html, width, cls);

            if (used + need > CONTENT_H && (page.groups.length || page.head)) {
                pages.push({ groups: [], head: false });
                used = 0;
                group = undefined;
            }

            const target = pages[pages.length - 1];
            group = target.groups.find((g) => g.title === label);
            if (!group) {
                group = { title: label, continued: seen.has(label), items: [] };
                target.groups.push(group);
                used += this.measure(`<h4>${label}</h4>`, width, cls);
                seen.add(label);
            }
            group.items.push(blk.html);
            used += this.measure(blk.html, width, cls);
        }

        return pages;
    }

    /* ── Content ──────────────────────────────────────────────── */

    private buildHead(d: CvDraft): string {
        const b = d.basic;
        const contact = [b.email, b.phone, b.location, b.website, b.linkedin, b.github]
            .filter(Boolean)
            .map((x) => `<span>${esc(x)}</span>`)
            .join('');
        const src = this.store.photoOnCv() ? this.store.photoSrc() : '';
        const img = src ? `<img class="elv-pphoto" src="${src}" alt="">` : '';
        return `<div class="elv-phead">${img}<div>
            <h3 class="elv-pname">${esc(b.fullName || 'Your Name')}</h3>
            <p class="elv-prole">${esc(b.jobTitle || 'Your title')}</p>
            <div class="elv-pcontact">${contact}</div></div></div>`;
    }

    /** The 'shaft' template's dark column. Page one only; the band repeats. */
    private buildSide(d: CvDraft): string {
        const all = Object.values(d.skills).flat();
        const edu = d.education
            .filter((e) => e.degree || e.school)
            .map(
                (e) => `<div class="elv-pitem"><b>${esc(e.degree)}</b>
                <div class="elv-pmeta"><span>${esc(e.school)}</span></div>
                <div style="font-size:10.5px">${esc(e.period)}</div></div>`
            )
            .join('');
        return `${this.buildHead(d)}
            ${
                all.length
                    ? `<div class="elv-psec"><h4>Skills</h4>
              <div class="elv-pskills">${all.map((s) => `<span>${esc(s)}</span>`).join('')}</div></div>`
                    : ''
            }
            ${edu ? `<div class="elv-psec"><h4>Education</h4>${edu}</div>` : ''}`;
    }

    private buildBlocks(d: CvDraft, side: boolean): Block[] {
        const out: Block[] = [];
        const push = (section: string, html: string) => out.push({ kind: 'item', section, html });

        if (d.summary.text.trim()) {
            push('summary', `<div>${esc(d.summary.text)}</div>`);
        }
        for (const e of d.experience.filter((x) => x.title || x.company)) {
            const lines = e.bullets.filter((x) => x.trim());
            push(
                'experience',
                `<div class="elv-pitem"><b>${esc(e.title || 'Role')}</b>
                 <div class="elv-pmeta"><span>${esc(e.company)}${e.location ? ' · ' + esc(e.location) : ''}</span>
                   <span>${esc(e.period)}</span></div>
                 ${lines.length ? `<ul>${lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`
            );
        }
        for (const p of d.projects.filter((x) => x.name)) {
            push(
                'projects',
                `<div class="elv-pitem"><b>${esc(p.name)}</b>
                 <div class="elv-pmeta"><span>${esc(p.role)}${p.link ? ' · ' + esc(p.link) : ''}</span>
                   <span>${esc(p.period)}</span></div>
                 ${p.desc ? `<div>${esc(p.desc)}</div>` : ''}</div>`
            );
        }
        // The sidebar template already carries these in its dark column.
        if (!side) {
            for (const e of d.education.filter((x) => x.degree || x.school)) {
                push(
                    'education',
                    `<div class="elv-pitem"><b>${esc(e.degree)}</b>
                     <div class="elv-pmeta"><span>${esc(e.school)}</span><span>${esc(e.period)}</span></div>
                     ${e.note ? `<div>${esc(e.note)}</div>` : ''}</div>`
                );
            }
            const all = Object.values(d.skills).flat();
            if (all.length) {
                push('skills', `<div class="elv-pskills">${all.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`);
            }
        }
        return out;
    }
}
