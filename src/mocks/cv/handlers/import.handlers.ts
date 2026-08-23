import { HttpResponse, http } from 'msw';

import type { CvImportDto, CvImportStage } from '@app/cv/api/cv-api.contracts';
import { CV_ERROR_CODES } from '@app/cv/api/cv-api.contracts';
import { CV_IMPORT_LIMITS } from '@app/cv/api/cv-import-api.service';

import { importedContent } from '../data/cv.fixture';
import { mockDb } from '../db';
import { mockScenario } from '../scenarios';
import { MOCK_LATENCY, apiError, mockId, notFound, pause } from '../utils';

/**
 * CV import.
 *
 * The extraction "process" lives HERE and nowhere else. There are no setTimeout
 * calls scattered through components pretending to be progress: the upload
 * records a start time, and each status read derives the stage from how long
 * ago that was. Polling therefore behaves like polling a real job — including
 * when the browser tab was asleep for ten seconds.
 */
const STAGES: { stage: CvImportStage; until: number }[] = [
    { stage: 'reading-document', until: 0.15 },
    { stage: 'extracting-personal', until: 0.3 },
    { stage: 'extracting-experience', until: 0.55 },
    { stage: 'extracting-education', until: 0.72 },
    { stage: 'extracting-skills', until: 0.88 },
    { stage: 'normalizing', until: 1 },
];

/** Wall-clock length of a mocked extraction. */
const EXTRACTION_MS = { success: 5200, slow: 12000, failed: 3200 } as const;

const startedAt = new Map<string, number>();

export const importHandlers = [
    http.post('*/api/cv-imports', async ({ request }) => {
        const form = await request.formData();
        const file = form.get('file');
        await pause(MOCK_LATENCY.upload);

        if (!(file instanceof File)) {
            return apiError(400, {
                code: CV_ERROR_CODES.importFailed,
                message: 'No file was attached to the upload.',
            });
        }

        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (mockScenario.import === 'unsupported' || !CV_IMPORT_LIMITS.extensions.includes(extension as never)) {
            return apiError(415, {
                code: CV_ERROR_CODES.importUnsupported,
                message: 'That file type is not supported. Upload a PDF or a DOCX.',
            });
        }

        if (file.size > CV_IMPORT_LIMITS.maxBytes) {
            return apiError(413, {
                code: CV_ERROR_CODES.importTooLarge,
                message: 'That file is over 8 MB.',
            });
        }

        const record: CvImportDto = {
            id: mockId('imp'),
            status: 'processing',
            stage: 'reading-document',
            progress: 2,
            fileName: file.name,
        };

        startedAt.set(record.id, Date.now());
        mockDb.upsertImport(record);
        return HttpResponse.json(record, { status: 202 });
    }),

    http.get('*/api/cv-imports/:importId', async ({ params }) => {
        await pause(MOCK_LATENCY.read);

        const id = String(params['importId']);
        const record = mockDb.findImport(id);
        if (!record) {
            return notFound(CV_ERROR_CODES.importFailed, 'That import no longer exists.');
        }
        if (record.status !== 'processing') {
            return HttpResponse.json(record);
        }

        const scenario = mockScenario.import;
        const total =
            scenario === 'slow'
                ? EXTRACTION_MS.slow
                : scenario === 'failed'
                  ? EXTRACTION_MS.failed
                  : EXTRACTION_MS.success;
        const elapsed = Date.now() - (startedAt.get(id) ?? Date.now());
        const ratio = Math.min(1, elapsed / total);

        if (ratio < 1) {
            const next: CvImportDto = {
                ...record,
                stage: STAGES.find((entry) => ratio <= entry.until)?.stage ?? 'normalizing',
                progress: Math.max(2, Math.round(ratio * 100)),
            };
            mockDb.upsertImport(next);
            return HttpResponse.json(next);
        }

        if (scenario === 'failed') {
            const failed: CvImportDto = {
                ...record,
                status: 'failed',
                stage: 'done',
                progress: 100,
                error: {
                    code: CV_ERROR_CODES.importFailed,
                    message: 'We could not read that document. It may be a scan rather than real text.',
                },
            };
            mockDb.upsertImport(failed);
            return HttpResponse.json(failed);
        }

        const content = importedContent();
        const completed: CvImportDto = {
            ...record,
            status: 'completed',
            stage: 'done',
            progress: 100,
            result: {
                content,
                extractedSections: ['personal', 'summary', 'experience', 'education', 'skills'],
                confidence: 0.82,
            },
        };
        mockDb.upsertImport(completed);
        return HttpResponse.json(completed);
    }),
];
