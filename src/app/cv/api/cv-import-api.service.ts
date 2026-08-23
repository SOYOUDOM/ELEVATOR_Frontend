import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import type { CvImportDto } from './cv-api.contracts';
import { CvApiRoutes } from './cv-api.routes';

/** Client-side gate, mirrored by the server. Both must agree or the UX lies. */
export const CV_IMPORT_LIMITS = {
    maxBytes: 8 * 1024 * 1024,
    accept: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    acceptAttr: '.pdf,.docx',
    extensions: ['pdf', 'docx'],
} as const;

export interface FileRejection {
    code: 'CV_IMPORT_UNSUPPORTED_FORMAT' | 'CV_IMPORT_FILE_TOO_LARGE';
    message: string;
}

/**
 * ELEVATOR — CV import.
 *
 * The upload is a real multipart POST with a real File, exactly as the backend
 * will receive it. MSW reads the FormData on the other side; nothing about the
 * request is bent to make mocking easier.
 *
 * DOC (the old binary Word format) is deliberately absent: nothing in the
 * pipeline can read it today, and offering a format that always fails is worse
 * than not offering it.
 */
@Injectable({ providedIn: 'root' })
export class CvImportApiService {
    private readonly http = inject(HttpClient);
    private readonly routes = inject(CvApiRoutes);

    /** Local pre-flight so an obviously bad file never costs an upload. */
    validate(file: File): FileRejection | null {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        const knownType = (CV_IMPORT_LIMITS.accept as readonly string[]).includes(file.type);
        const knownExtension = (CV_IMPORT_LIMITS.extensions as readonly string[]).includes(extension);

        if (!knownType && !knownExtension) {
            return {
                code: 'CV_IMPORT_UNSUPPORTED_FORMAT',
                message: 'That file type is not supported yet. Upload a PDF or a DOCX.',
            };
        }
        if (file.size > CV_IMPORT_LIMITS.maxBytes) {
            return {
                code: 'CV_IMPORT_FILE_TOO_LARGE',
                message: 'That file is over 8 MB. Try exporting a lighter PDF.',
            };
        }
        return null;
    }

    upload(file: File): Observable<CvImportDto> {
        const form = new FormData();
        form.append('file', file, file.name);
        return this.http.post<CvImportDto>(this.routes.cvImports(), form);
    }

    get(importId: string): Observable<CvImportDto> {
        return this.http.get<CvImportDto>(this.routes.cvImport(importId));
    }

    /**
     * Polls until the import settles, then completes. Emits every intermediate
     * state so the UI can show the extraction stages.
     *
     * `timer` + `switchMap` rather than `interval` so the first read is
     * immediate, and `takeWhile(..., true)` so the terminal state is emitted
     * before completion. The subscription owns the timer, so unsubscribing —
     * which takeUntilDestroyed does for the caller — stops the polling dead.
     */
    poll(importId: string, everyMs = 900): Observable<CvImportDto> {
        return timer(0, everyMs).pipe(
            switchMap(() => this.get(importId)),
            takeWhile((snapshot) => snapshot.status === 'processing', true)
        );
    }
}

/** Human label for an extraction stage. Kept beside the service that emits it. */
export function importStageLabel(dto: CvImportDto): string {
    switch (dto.stage) {
        case 'reading-document':
            return 'Reading the document';
        case 'extracting-personal':
            return 'Extracting personal information';
        case 'extracting-experience':
            return 'Extracting work experience';
        case 'extracting-education':
            return 'Extracting education';
        case 'extracting-skills':
            return 'Extracting skills';
        case 'normalizing':
            return 'Normalizing everything';
        default:
            return dto.status === 'failed' ? 'Extraction failed' : 'Done';
    }
}
