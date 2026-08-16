/**
 * ELEVATOR — the CV builder's backend contract
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every call the builder makes, in one file, so a reader can see the whole
 * contract the backend has to honour without opening four others. Nothing
 * here is generated: `service-proxies.ts` is rebuilt from `swagger.json` and
 * would erase hand-written code, so when these endpoints land on the real
 * backend this file is deleted and the generated proxies take over.
 *
 * ABP wraps every response in `{ result, success, error, __abp }`, and the
 * MSW handlers match that exactly. `AbpHttpInterceptor` only unwraps it for
 * BLOB responses — the path the NSwag proxies use — so a plain
 * `HttpClient.post<T>()` receives the envelope intact and has to unwrap it
 * itself. `unwrap()` does that once, and turns `success: false` into a real
 * error rather than a resolved promise carrying a failure.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import { AppConsts } from '@shared/AppConsts';
import { CvDoc } from './builder/cv-builder.models';
import { ParseReport } from './builder/counter/cv-parser';

/** ABP's response envelope, as it actually arrives on a JSON request. */
interface AbpEnvelope<T> {
  result: T;
  success: boolean;
  error: { message: string; details?: string } | null;
}

function unwrap<T>(source: Observable<AbpEnvelope<T>>): Observable<T> {
  return source.pipe(
    map((res) => {
      if (res && typeof res === 'object' && 'success' in res) {
        if (!res.success) throw new Error(res.error?.message ?? 'Request failed');
        return res.result;
      }
      /* A real backend that does not use the envelope still works. */
      return res as unknown as T;
    }),
  );
}

/* ── the shapes the endpoints trade in ──────────────────────────────────── */

export interface CvSummary {
  id: string;
  title: string;
  updatedAt: string;
  pages: number;
  readiness: number;
}

export interface SavedCv extends CvSummary {
  doc: CvDoc;
}

export interface ParseResult {
  doc: CvDoc;
  report: ParseReport;
}

/** A rewrite the tool OFFERS. It never applies one, and never invents a figure. */
export interface LineSuggestion {
  /** The rewrite, with the outcome left as a blank for the writer to fill. */
  text: string;
  /** Why it is better, in one sentence. Shown, not hidden behind a tooltip. */
  why: string;
  /** True when the rewrite needs a number the writer has not given. */
  needsFigure: boolean;
}

export interface SummaryDraft {
  text: string;
  /** The prose it was built from, so the writer can see it invented nothing. */
  sourcedFrom: string[];
}

export interface PortraitJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  /** Data URL when done. */
  image?: string;
  /** What it cost, in USD. Shown before the job runs, not after. */
  cost: number;
  error?: string;
}

export interface ExportJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  url?: string;
  bytes?: number;
}

@Injectable({ providedIn: 'root' })
export class CvApiService {
  private readonly http = inject(HttpClient);

  /* ── documents ────────────────────────────────────────────────────────── */

  list(): Observable<CvSummary[]> {
    return unwrap(this.http.get<AbpEnvelope<CvSummary[]>>(this.url('Cv/List')));
  }

  get(id: string): Observable<SavedCv> {
    return unwrap(this.http.get<AbpEnvelope<SavedCv>>(this.url('Cv/Get'), { params: { id } }));
  }

  /**
   * Autosave. Returns the server's view of the document so a second device
   * cannot quietly diverge — the builder writes localStorage first and treats
   * this as the durable copy, not the other way round.
   */
  save(doc: CvDoc, id?: string): Observable<SavedCv> {
    return unwrap(this.http.post<AbpEnvelope<SavedCv>>(this.url('Cv/Save'), { id, doc }));
  }

  remove(id: string): Observable<void> {
    return unwrap(this.http.post<AbpEnvelope<void>>(this.url('Cv/Delete'), { id }));
  }

  duplicate(id: string): Observable<SavedCv> {
    return unwrap(this.http.post<AbpEnvelope<SavedCv>>(this.url('Cv/Duplicate'), { id }));
  }

  /* ── reading an existing CV ───────────────────────────────────────────── */

  /**
   * Parses an uploaded CV server-side. The counter parses in the browser too
   * — nothing has to leave the machine — and this endpoint exists for the
   * formats the browser cannot read on its own (PDF, DOCX).
   */
  parse(file: File): Observable<ParseResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return unwrap(this.http.post<AbpEnvelope<ParseResult>>(this.url('Cv/Parse'), body));
  }

  parseText(text: string): Observable<ParseResult> {
    return unwrap(this.http.post<AbpEnvelope<ParseResult>>(this.url('Cv/ParseText'), { text }));
  }

  /* ── writing help ─────────────────────────────────────────────────────────
     Everything below OFFERS. Nothing applies itself, and nothing supplies a
     figure the writer did not give — a fabricated metric is what gets someone
     caught in an interview, so `needsFigure` is part of the contract. */

  sharpen(line: string, role: string): Observable<LineSuggestion[]> {
    return unwrap(this.http.post<AbpEnvelope<LineSuggestion[]>>(this.url('Cv/Sharpen'), { line, role }));
  }

  draftSummary(doc: CvDoc): Observable<SummaryDraft> {
    return unwrap(this.http.post<AbpEnvelope<SummaryDraft>>(this.url('Cv/DraftSummary'), { doc }));
  }

  suggestSkills(doc: CvDoc): Observable<string[]> {
    return unwrap(this.http.post<AbpEnvelope<string[]>>(this.url('Cv/SuggestSkills'), { doc }));
  }

  suggestTitles(role: string): Observable<string[]> {
    return unwrap(this.http.post<AbpEnvelope<string[]>>(this.url('Cv/SuggestTitles'), { role }));
  }

  /* ── the portrait ─────────────────────────────────────────────────────────
     Paid per image, so the cost is returned with the job and shown before it
     runs. A tool that spends someone's money without saying so once is a tool
     they stop trusting with the second image. */

  startPortrait(image: string, style: string): Observable<PortraitJob> {
    return unwrap(this.http.post<AbpEnvelope<PortraitJob>>(this.url('Cv/Portrait'), { image, style }));
  }

  portraitStatus(id: string): Observable<PortraitJob> {
    return unwrap(this.http.get<AbpEnvelope<PortraitJob>>(this.url('Cv/PortraitStatus'), { params: { id } }));
  }

  /* ── output ───────────────────────────────────────────────────────────── */

  startExport(doc: CvDoc, format: 'pdf' | 'docx'): Observable<ExportJob> {
    return unwrap(this.http.post<AbpEnvelope<ExportJob>>(this.url('Cv/Export'), { doc, format }));
  }

  exportStatus(id: string): Observable<ExportJob> {
    return unwrap(this.http.get<AbpEnvelope<ExportJob>>(this.url('Cv/ExportStatus'), { params: { id } }));
  }

  private url(path: string): string {
    return `${AppConsts.remoteServiceBaseUrl}/api/services/app/${path}`;
  }
}
