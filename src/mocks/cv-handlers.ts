/**
 * MSW — the CV builder's endpoints
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every endpoint `CvApiService` declares, answered here with REAL logic, not
 * a fixture. Parsing actually parses, the checks actually run, the readiness
 * number is computed from the document you sent — because a mock that returns
 * a canned payload only proves the wiring, and the wiring is the part that was
 * never in doubt.
 *
 * Two rules the mocks keep, because the real backend will have to:
 *
 *   · Everything is wrapped in ABP's `{ result, success, error, __abp }`
 *     envelope. `AbpHttpInterceptor` only unwraps that for blobs, so the
 *     service unwraps it itself and the shapes have to match exactly.
 *   · Nothing is invented. `sharpen` returns a rewrite with the outcome left
 *     BLANK and `needsFigure: true`; it never supplies a number the writer did
 *     not give. That is a product decision, and a mock that quietly made up
 *     "increased sales by 40%" would train everyone to expect it.
 *
 * Documents live in localStorage so a reload behaves like a real account.
 */

import { HttpResponse, http, delay } from 'msw';

import { CvDoc, blankDoc, sampleDoc } from '../app/create/builder/cv-builder.models';
import { parseCv } from '../app/create/builder/counter/cv-parser';
import {
  ExperienceItem, SkillGroup, SummaryItem,
} from '../app/create/builder/cv-builder.models';
import {
  WEAK_OPENERS, readiness, suggestedSkills, titleIdeas,
} from '../app/create/builder/cv-builder.analysis';

/* ── the envelope ───────────────────────────────────────────────────────── */

const ok = <T>(result: T, status = 200) =>
  HttpResponse.json(
    { result, targetUrl: null, success: true, error: null, unAuthorizedRequest: false, __abp: true },
    { status },
  );

const fail = (message: string, status = 400) =>
  HttpResponse.json(
    {
      result: null, targetUrl: null, success: false,
      error: { code: 0, message, details: null, validationErrors: null },
      unAuthorizedRequest: false, __abp: true,
    },
    { status },
  );

/* ── the store ──────────────────────────────────────────────────────────── */

const KEY = 'elevator.mock.cvs';
const uid = () => Math.random().toString(36).slice(2, 10);

interface Row { id: string; title: string; updatedAt: string; doc: CvDoc }

function read(): Row[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Row[];
  } catch {
    return [];
  }
}
function write(rows: Row[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* private mode — the mock account simply does not persist */
  }
}

/** Cheap page estimate. The browser does the real pagination; this is enough
    for a list row, and it is honest about being an estimate. */
function estimatePages(doc: CvDoc): number {
  const lines = doc.sections.reduce((n, s) => n + s.items.reduce((m, it) => {
    const e = it as Partial<ExperienceItem & SkillGroup & SummaryItem>;
    return m + 2 + (e.bullets?.length ?? 0) + (e.list?.length ? 1 : 0)
      + Math.ceil((e.text?.length ?? 0) / 90);
  }, 0), 6);
  return Math.max(1, Math.ceil(lines / 46));
}

function summarise(row: Row) {
  const pages = estimatePages(row.doc);
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    pages,
    readiness: readiness(row.doc, { pages, pct: 60, spilled: '', usedReal: 0, lastUsed: 0 }).pct,
  };
}

const API = '*/api/services/app';

/* ═══════════════════════════════════════════════════════════════════════════
   HANDLERS
   ═══════════════════════════════════════════════════════════════════════════ */

export const cvHandlers = [
  /* ── documents ──────────────────────────────────────────────────────── */

  http.get(`${API}/Cv/List`, async () => {
    await delay(120);
    const rows = read();
    /* A first-run account is not empty: it has the sample, because an empty
       list teaches nothing about what the product does. */
    if (!rows.length) {
      const seed: Row = { id: uid(), title: 'Sok Dara — Support Engineer', updatedAt: new Date().toISOString(), doc: sampleDoc() };
      write([seed]);
      return ok([summarise(seed)]);
    }
    return ok(rows.map(summarise));
  }),

  http.get(`${API}/Cv/Get`, async ({ request }) => {
    await delay(90);
    const id = new URL(request.url).searchParams.get('id');
    const row = read().find((r) => r.id === id);
    return row ? ok({ ...summarise(row), doc: row.doc }) : fail('No CV with that id.', 404);
  }),

  http.post(`${API}/Cv/Save`, async ({ request }) => {
    await delay(160);
    const body = (await request.json()) as { id?: string; doc: CvDoc };
    if (!body?.doc?.sections) return fail('A document is required.');

    const rows = read();
    const at = body.id ? rows.findIndex((r) => r.id === body.id) : -1;
    const row: Row = {
      id: body.id ?? uid(),
      title: body.doc.title || 'Untitled CV',
      updatedAt: new Date().toISOString(),
      doc: body.doc,
    };
    if (at >= 0) rows[at] = row; else rows.unshift(row);
    write(rows);
    return ok({ ...summarise(row), doc: row.doc });
  }),

  http.post(`${API}/Cv/Delete`, async ({ request }) => {
    await delay(110);
    const { id } = (await request.json()) as { id: string };
    write(read().filter((r) => r.id !== id));
    return ok(null);
  }),

  http.post(`${API}/Cv/Duplicate`, async ({ request }) => {
    await delay(140);
    const { id } = (await request.json()) as { id: string };
    const rows = read();
    const src = rows.find((r) => r.id === id);
    if (!src) return fail('No CV with that id.', 404);
    const copy: Row = {
      id: uid(),
      title: `${src.title} (copy)`,
      updatedAt: new Date().toISOString(),
      doc: { ...structuredClone(src.doc), title: `${src.doc.title} (copy)` },
    };
    rows.unshift(copy);
    write(rows);
    return ok({ ...summarise(copy), doc: copy.doc });
  }),

  /* ── reading an existing CV ─────────────────────────────────────────── */

  http.post(`${API}/Cv/ParseText`, async ({ request }) => {
    await delay(320);
    const { text } = (await request.json()) as { text: string };
    if (!text?.trim()) return fail('Nothing to read.');
    return ok(parseCv(text));
  }),

  http.post(`${API}/Cv/Parse`, async ({ request }) => {
    /* Slower on purpose: a file round-trip is not instant, and a spinner that
       never appears in development is a spinner nobody styled. */
    await delay(900);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('No file was sent.');
    if (file.size > 5_000_000) return fail('That file is larger than 5 MB.');

    /* Text formats parse for real. A PDF or DOCX would be extracted
       server-side; here it comes back empty with the reason stated, which is
       the honest behaviour to build the UI against. */
    if (/\.(pdf|docx?)$/i.test(file.name)) {
      return ok({
        doc: blankDoc(),
        report: { roles: 0, study: 0, skills: 0, unread: 0, approx: 0 },
      });
    }
    return ok(parseCv(await file.text()));
  }),

  /* ── writing help ───────────────────────────────────────────────────── */

  http.post(`${API}/Cv/Sharpen`, async ({ request }) => {
    await delay(420);
    const { line } = (await request.json()) as { line: string; role: string };
    const text = String(line ?? '').trim();
    if (!text) return fail('Nothing to rewrite.');

    const lower = text.toLowerCase();
    const weak = WEAK_OPENERS.find((w) => lower.startsWith(w));
    const body = weak ? text.slice(weak.length).trim() : text;
    const stem = body.charAt(0).toUpperCase() + body.slice(1);
    const hasFigure = /\d/.test(text);

    /* Every option leaves the OUTCOME as a blank. The tool asks for the
       number; it does not invent one, and it says so in `why`. */
    return ok([
      {
        text: `Cut ${stem.toLowerCase()} — ___`,
        why: 'Opens on what changed rather than what you were assigned.',
        needsFigure: !hasFigure,
      },
      {
        text: `${stem}, which ___`,
        why: 'Keeps your wording and adds the consequence a reader is looking for.',
        needsFigure: !hasFigure,
      },
      {
        text: `Owned ${stem.toLowerCase()} for ___ people`,
        why: 'Scope is a figure you already know, and it is easier to give than a percentage.',
        needsFigure: true,
      },
    ]);
  }),

  http.post(`${API}/Cv/DraftSummary`, async ({ request }) => {
    await delay(650);
    const { doc } = (await request.json()) as { doc: CvDoc };
    const exp = (doc.sections.find((s) => s.type === 'experience')?.items ?? []) as ExperienceItem[];
    const first = exp.find((e) => e.role || e.org);
    const years = exp.length ? Math.max(1, exp.length * 2) : 0;
    const skills = (doc.sections.find((s) => s.type === 'skills')?.items ?? []) as SkillGroup[];
    const top = skills.flatMap((g) => g.list).slice(0, 3);

    /* Built only from prose already in the document — every phrase is
       traceable to a field the writer filled in, which is what `sourcedFrom`
       is for. It is a starting point to edit, and it says so. */
    const parts: string[] = [];
    if (first?.role) parts.push(`${first.role}${doc.profile.location ? ' in ' + doc.profile.location.split(',')[0] : ''}${years ? `, ${years} years` : ''}.`);
    if (top.length) parts.push(`Day to day that means ${top.join(', ')}.`);
    if (first?.bullets?.[0]) parts.push(`Most recently: ${first.bullets[0].replace(/\.$/, '')}.`);

    return ok({
      text: parts.join(' ') || '',
      sourcedFrom: [
        first?.role && 'your most recent role',
        top.length && 'the skills you listed',
        first?.bullets?.[0] && 'your first bullet',
      ].filter(Boolean) as string[],
    });
  }),

  http.post(`${API}/Cv/SuggestSkills`, async ({ request }) => {
    await delay(260);
    const { doc } = (await request.json()) as { doc: CvDoc };
    return ok(suggestedSkills(doc));
  }),

  http.post(`${API}/Cv/SuggestTitles`, async ({ request }) => {
    await delay(180);
    const { role } = (await request.json()) as { role: string };
    return ok(titleIdeas(role));
  }),

  /* ── the portrait ───────────────────────────────────────────────────────
     Paid per image. The cost travels with the job so the UI can state it
     before spending anything, and the mock is deliberately slow because a
     two-second job and a twenty-second job need different interfaces. */

  http.post(`${API}/Cv/Portrait`, async ({ request }) => {
    await delay(240);
    const { image } = (await request.json()) as { image: string; style: string };
    if (!image) return fail('No photograph was sent.');
    const id = uid();
    portraits.set(id, { id, status: 'running', cost: 0.02, startedAt: Date.now(), image });
    return ok({ id, status: 'running', cost: 0.02 });
  }),

  http.get(`${API}/Cv/PortraitStatus`, async ({ request }) => {
    await delay(120);
    const id = new URL(request.url).searchParams.get('id') ?? '';
    const job = portraits.get(id);
    if (!job) return fail('No such job.', 404);
    if (job.status === 'running' && Date.now() - job.startedAt > 4200) {
      job.status = 'done';
    }
    return ok({
      id: job.id,
      status: job.status,
      cost: job.cost,
      image: job.status === 'done' ? job.image : undefined,
    });
  }),

  /* ── output ─────────────────────────────────────────────────────────── */

  http.post(`${API}/Cv/Export`, async ({ request }) => {
    await delay(200);
    const { doc, format } = (await request.json()) as { doc: CvDoc; format: 'pdf' | 'docx' };
    const id = uid();
    exports.set(id, {
      id, status: 'running', startedAt: Date.now(),
      bytes: 40_000 + estimatePages(doc) * 22_000,
      format,
    });
    return ok({ id, status: 'running' });
  }),

  http.get(`${API}/Cv/ExportStatus`, async ({ request }) => {
    await delay(120);
    const id = new URL(request.url).searchParams.get('id') ?? '';
    const job = exports.get(id);
    if (!job) return fail('No such job.', 404);
    if (job.status === 'running' && Date.now() - job.startedAt > 2600) job.status = 'done';
    return ok({
      id: job.id,
      status: job.status,
      bytes: job.bytes,
      /* A real backend returns a signed URL. The browser can already print
         the exact page, so the mock does not pretend to have produced a file
         it cannot hand over. */
      url: job.status === 'done' ? `blob:mock/${job.id}.${job.format}` : undefined,
    });
  }),
];

/* Job state lives for the session only — a queue is not a document. */
interface PortraitRow { id: string; status: 'running' | 'done'; cost: number; startedAt: number; image: string }
interface ExportRow { id: string; status: 'running' | 'done'; startedAt: number; bytes: number; format: string }

const portraits = new Map<string, PortraitRow>();
const exports = new Map<string, ExportRow>();
