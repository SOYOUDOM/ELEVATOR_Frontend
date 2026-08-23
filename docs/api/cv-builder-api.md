# CV Builder API

The contract the ELEVATOR frontend already speaks. Every endpoint below is
implemented today by **MSW** (`src/mocks/cv/`) and consumed by real Angular
services over `HttpClient`. Nothing in the app knows the difference — swapping
MSW for the real backend is a configuration change, not a code change (see
[Switching to the real backend](#switching-to-the-real-backend)).

Use this as the backend implementation checklist.

## Conventions

| | |
|---|---|
| **Base URL** | `API_BASE_URL` (`''` under mocks, `AppConsts.remoteServiceBaseUrl` otherwise). Built in `CvApiRoutes`. |
| **Style** | Plain REST resources, not ABP's `/api/services/app/X/Y` RPC shape. The generated NSwag proxies keep that convention for the existing app services; nothing in this feature has a generated proxy to reuse. |
| **Envelope** | None. Endpoints return the resource directly, not ABP's `{ result, success, … }` wrapper. `AbpHttpInterceptor` only unwraps `Blob`-typed responses (what NSwag requests), so plain JSON passes through untouched. |
| **Auth** | Required on every endpoint. `AbpHttpInterceptor` is registered globally and already attaches the bearer token, tenant id and culture headers to these calls. |
| **Errors** | Always `ApiErrorDto` — `{ code, message, fieldErrors?, traceId? }`. |
| **Content type** | `application/json`, except the import upload, which is `multipart/form-data`. |
| **Types** | `src/app/cv/api/cv-api.contracts.ts`. The MSW handlers import the same file, so mock and app cannot drift without a compile error. |

### `ApiErrorDto`

```ts
interface ApiErrorDto {
    code: string;
    message: string;
    /** Server-side validation, keyed by dotted path: `content.personal.email`. */
    fieldErrors?: Record<string, string[]>;
    traceId?: string;
}
```

### Status codes

`200` ok · `201` created · `202` accepted (import queued) · `204` deleted ·
`400` invalid · `401` unauthenticated · `403` forbidden · `404` missing ·
`413` file too large · `415` unsupported file · `500` unexpected.

---

## CV documents

### `[MOCKED] POST /api/cvs`

Create a CV. The single entry point for two of the three starting paths.

- **Purpose** — start from scratch, or turn a finished import into a CV.
- **Auth** — yes.
- **Request** — `CreateCvRequest`
  ```json
  { "source": "scratch", "name": "Untitled CV" }
  { "source": "import", "importId": "imp_123", "name": "Imported CV" }
  ```
- **Response** — `201` with the full `CvDto`.
- **Errors** — `404 CV_IMPORT_FAILED` when `importId` is unknown or unfinished; `400` validation.
- **Frontend service** — `CvApiService.create()`
- **Used by** — Get Started → *Start from Scratch*, and the tail of the import flow.

### `[MOCKED] GET /api/cvs`

- **Purpose** — list the user's CVs.
- **Response** — `200`, `CvListItemDto[]` (id, name, targetRole, templateId, createdAt, updatedAt). Deliberately lighter than the full document.
- **Frontend service** — `CvApiService.list()`
- **Used by** — not on screen yet; the contract exists for the "my CVs" screen.

### `[MOCKED] GET /api/cvs/:cvId`

- **Purpose** — load a CV into the workspace.
- **Response** — `200`, `CvDto`.
- **Errors** — `404 CV_NOT_FOUND`.
- **Frontend service** — `CvApiService.get()`
- **Used by** — `CvEditorStore.load()` on entering `/app/create/:cvId`.

### `[MOCKED] PATCH /api/cvs/:cvId`

**The autosave endpoint.** Must be a true PATCH: branches the client does not
send are left untouched.

> **Sizing note.** `content.personal.photoUrl` is a **data URI**, so the photo
> travels inside the document rather than as a separate upload. The client
> downscales to a 512px longest edge and re-encodes before storing (see
> `models/cv-photo.ts`), which keeps it in the low tens of KB — but size the
> request body limit and the column for it, and expect a `content` branch on the
> wire whenever the photo changes. If photos ever need to be larger, the change
> is a `POST /api/cvs/:cvId/photo` returning a URL, and `photoUrl` holds that
> instead; nothing else in the model moves.

- **Request** — `UpdateCvRequest`, every field optional:
  ```ts
  { name?, targetRole?, content?: Partial<CvContent>, design?: Partial<CvDesign>, options?: Partial<CvOptions> }
  ```
  The editor sends only the top-level content branches it changed (`experience`,
  `summary`, …), never the whole document.
- **Response** — `200`, the updated `CvDto`. The client takes **only** `updatedAt`
  from it: the user has usually typed more during the round trip, so echoing the
  server's copy back into the editor would delete their work.
- **Errors** — `400 CV_VALIDATION_FAILED` with `fieldErrors`; `404 CV_NOT_FOUND`.
- **Frontend service** — `CvApiService.update()` via `CvEditorStore` (800 ms debounce, serialized).
- **Notes for the backend** — requests are serialized client-side, so they arrive
  in order. Last write wins per branch.

### `[MOCKED] DELETE /api/cvs/:cvId`

- **Response** — `204`. **Errors** — `404 CV_NOT_FOUND`.
- **Frontend service** — `CvApiService.delete()`

### `[MOCKED] POST /api/cvs/from-profile`

- **Purpose** — create a CV from the saved professional profile.
- **Request** — `CreateCvFromProfileRequest` — `{ name?, targetRole? }`.
- **Response** — `201`, `CvDto`.
- **Errors** — `404 PROFILE_NOT_FOUND`.
- **Frontend service** — `CvApiService.createFromProfile()`
- **CRITICAL** — the server must **deep-clone** the profile content into the new
  document. The CV must not share storage with the profile: editing the CV can
  never modify the master copy. Doing the clone server-side is what makes that
  guarantee independent of any client.

### `[MOCKED] POST /api/cvs/:cvId/duplicate`

- **Purpose** — copy an existing CV, **including** its design and options.
- **Response** — `201`, `CvDto` named `"<name> (copy)"`, `source: "duplicate"`.
- **Not the same as from-profile** — duplicate copies a *document*; from-profile
  copies *reusable content* into a fresh document with default presentation.

---

## Professional profile

### `[MOCKED] GET /api/professional-profile`

- **Purpose** — the reusable master copy of the user's career.
- **Response** — `200`, `ProfessionalProfileDto` — `{ id, content, updatedAt }`.
- **Missing profile** — **`404` with `code: PROFILE_NOT_FOUND`. Never a `200`
  carrying `null`.** One representation, so the frontend has exactly one code
  path for "nothing saved yet" (`ProfessionalProfileApiService.getOrNull()`).
- **Used by** — Get Started, to decide whether *Use Saved Information* is a real
  door or an empty state.

### `[MOCKED] PUT /api/professional-profile`

- **Purpose** — explicitly save the current CV's content as reusable information.
- **Request** — `{ content: CvContent }`. **Response** — `200`, the saved profile.
- **Frontend service** — `ProfessionalProfileApiService.save()`
- **CRITICAL** — this is a deliberate, user-initiated action ("Save my
  information"). Autosave must never reach it, and there is a test asserting it
  does not.

---

## Import

### `[MOCKED] POST /api/cv-imports`

- **Purpose** — upload an existing CV for extraction.
- **Content type** — `multipart/form-data`, one part named `file`. A real `File`
  in a real `FormData`; the frontend does not send a JSON stand-in.
- **Accepted** — PDF and DOCX, up to 8 MB. **DOC is not supported** — nothing in
  the pipeline can read it, and offering a format that always fails is worse than
  not offering it.
- **Response** — `202`, `CvImportDto` — `{ id, status: "processing", stage, progress, fileName }`.
- **Errors** — `415 CV_IMPORT_UNSUPPORTED_FORMAT`, `413 CV_IMPORT_TOO_LARGE`, `400 CV_IMPORT_FAILED`.
- **Frontend service** — `CvImportApiService.upload()`

### `[MOCKED] GET /api/cv-imports/:importId`

- **Purpose** — poll extraction progress.
- **Response** — `200`, `CvImportDto`:
  ```json
  { "id": "imp_123", "status": "processing", "stage": "extracting-experience", "progress": 54 }
  { "id": "imp_123", "status": "completed", "progress": 100,
    "result": { "content": { }, "extractedSections": ["personal","experience"], "confidence": 0.82 } }
  { "id": "imp_123", "status": "failed",
    "error": { "code": "CV_IMPORT_FAILED", "message": "The document could not be processed." } }
  ```
- **Stages** — `reading-document` → `extracting-personal` → `extracting-experience`
  → `extracting-education` → `extracting-skills` → `normalizing` → `done`.
- **Frontend service** — `CvImportApiService.poll()` — 900 ms interval, stops on
  the first terminal status, cancelled on navigation.
- **Note** — the result carries normalized `CvContent`, not the source document's
  layout. We import the information, not the design.

---

## ATS

### `[MOCKED] POST /api/cvs/:cvId/ats-check`

- **Purpose** — score the CV the way a tracking system would read it.
- **Request** — `AtsCheckRequest` — `{ jobDescription? }` (absent = generic parse-ability check).
- **Response** — `200`, `AtsResultDto`:
  ```ts
  { score, checksPassed, checksTotal, issues: AtsIssueDto[], suggestions: AtsSuggestionDto[], checkedAt }
  ```
  Each issue carries an optional `sectionId` so the UI can link straight to the
  section that needs work.
- **Errors** — `404 CV_NOT_FOUND`, `500 ATS_CHECK_FAILED`.
- **Frontend service** — `CvAtsApiService.check()`
- **Why server-side** — the number on screen has to be the number the backend
  computed. A browser-side approximation would be a different score wearing the
  same badge.

---

## AI writing

### `[MOCKED] POST /api/cv-ai/write` · `[MOCKED] POST /api/cv-ai/improve`

- **Purpose** — draft new content, or rewrite what the user has.
- **Request** — `CvAiRequest` — `{ cvId, sectionId, recordId?, fieldId?, currentContent, instruction?, tone? }`.
- **Response** — `200`, `CvAiResponseDto` — `{ variants: string[], model, generatedAt }`.
- **Errors** — `500 CV_AI_FAILED`.
- **Frontend service** — `CvAiApiService`
- **CRITICAL** — the provider credential lives on the server. The browser never
  holds a model API key and never calls a provider directly.
- **Product rule** — variants are suggestions. Nothing is applied to the document
  until the user picks one.

---

## Deliberately NOT endpoints

Two things this feature could have had an API for, and does not.

**Templates.** `CV_TEMPLATES` in `src/app/cv/templates/cv-templates.ts` is a
frontend constant — seven of them today (Modern Professional, Classic Serif,
Compact Two-Column, Executive, Minimal, Academic, Banner). A template is a name,
a capability set and a stylesheet that reads the `--cv-*` variables the preview
emits, so shipping one is a frontend release. There is no `GET /api/cv-templates`
and none is mocked. Revisit only if templates become user- or admin-authored; the
`CvTemplate` interface is already shaped like what such an endpoint would return.

**Fonts.** `CvDesign.fontFamily` is a CSS family NAME (`"Georgia"`), not an enum,
because the picker can offer fonts installed on the reader's own machine via the
Local Font Access API. The backend stores and returns the string unchanged — it
never needs to know the list. Documents written before this was widened hold
`'sans' | 'serif' | 'mono' | 'grotesk'`; the frontend maps those in
`models/cv-fonts.ts`, so **no data migration is required**.

**Export.** Export is the browser's own print-to-PDF against `src/styles/_print.scss`.
The document already renders at real page dimensions in millimetres and the print
sheet strips every piece of editor chrome, so there is nothing a server could add.
If server-side rendering is ever needed (a queued batch export, say), the shape
would be `POST /api/cvs/:cvId/export { format: "pdf" }`.

---

## Backend build order

1. **CV CRUD** — `POST/GET/PATCH/DELETE /api/cvs`. Unblocks the entire workspace: without it nothing can be opened or saved.
2. **Professional profile** — `GET/PUT /api/professional-profile`. Unblocks *Use Saved Information* and *Save my information*.
3. **Create from profile** — `POST /api/cvs/from-profile`. Small once 1 and 2 exist, and it is where the clone guarantee lives.
4. **Import** — `POST /api/cv-imports`, `GET /api/cv-imports/:id`. The largest piece of real work (PDF/DOCX extraction) and the only one needing a job queue.
5. **ATS** — `POST /api/cvs/:cvId/ats-check`.
6. **AI** — `POST /api/cv-ai/write`, `/improve`.
7. **Duplicate** — `POST /api/cvs/:cvId/duplicate`. Nice to have; nothing depends on it.

---

## Switching to the real backend

1. Set `useMocks: false` in `src/environments/environment.ts` (production already has it off).
2. Point `assets/appconfig.json` → `remoteServiceBaseUrl` at the API.

That is the whole switch. `main.ts` already resolves `API_BASE_URL` from those two
facts, `CvApiRoutes` builds every URL from that token, and the MSW worker is only
started when `useMocks` is on. No feature component, store or service changes.

### Driving the mock backend

`src/mocks/cv/scenarios.ts` is one switchboard for how the fake backend behaves.
From the browser console:

```js
__elevatorMocks.scenario({ profile: 'missing' });        // empty-state path on Get Started
__elevatorMocks.scenario({ cvSave: 'validation-error' }); // server-side field errors
__elevatorMocks.scenario({ cvSave: 'server-error' });     // save failure + retry
__elevatorMocks.scenario({ import: 'failed' });           // failed extraction
__elevatorMocks.scenario({ ats: 'poor' });                // low ATS score
__elevatorMocks.scenario({ latency: 0 });                 // instant API
__elevatorMocks.reset();                                  // restore the fixtures
```

Development data lives in `src/mocks/cv/data/` — edit `profile.fixture.ts` to
change the person, not the handlers. Handlers are behaviour; fixtures are data.
