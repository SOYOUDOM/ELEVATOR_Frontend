import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { toApiError } from '../api/api-error';
import type { ApiErrorDto, CvDto, CvImportDto, ProfessionalProfileDto } from '../api/cv-api.contracts';
import { CvApiService } from '../api/cv-api.service';
import { CvImportApiService, importStageLabel } from '../api/cv-import-api.service';
import { ProfessionalProfileApiService } from '../api/professional-profile-api.service';

/**
 * ELEVATOR — the three ways in.
 *
 * Start from scratch, import an existing CV, or reuse saved information. All
 * three end at the same place: a normalized CvDocument and a route change into
 * the workspace. The workspace itself never learns which door was used — that
 * is the point of putting the three flows behind one service.
 *
 * The clone that protects the saved profile is done by the SERVER
 * (POST /api/cvs/from-profile). Doing it here would mean trusting every future
 * caller to remember; doing it there means a CV physically cannot hold a
 * reference to the profile.
 */
export type StartPathId = 'scratch' | 'import' | 'profile';
export type ProfileAvailability = 'idle' | 'loading' | 'available' | 'missing' | 'error';

export interface ImportProgress {
    id: string;
    fileName: string;
    status: CvImportDto['status'];
    stageLabel: string;
    progress: number;
    error: ApiErrorDto | null;
}

@Injectable({ providedIn: 'root' })
export class CvStartService {
    private readonly cvApi = inject(CvApiService);
    private readonly profileApi = inject(ProfessionalProfileApiService);
    private readonly importApi = inject(CvImportApiService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    private readonly _profileState = signal<ProfileAvailability>('idle');
    private readonly _profile = signal<ProfessionalProfileDto | null>(null);
    private readonly _busy = signal<StartPathId | null>(null);
    private readonly _error = signal<ApiErrorDto | null>(null);
    private readonly _import = signal<ImportProgress | null>(null);

    readonly profileState = this._profileState.asReadonly();
    readonly profile = this._profile.asReadonly();
    readonly busy = this._busy.asReadonly();
    readonly error = this._error.asReadonly();
    readonly importProgress = this._import.asReadonly();

    readonly hasProfile = computed(() => this._profileState() === 'available');

    /** Last known update time of the saved profile, for the "use saved" card. */
    readonly profileUpdatedAt = computed(() => this._profile()?.updatedAt ?? null);

    private pollSub?: Subscription;

    /** Nothing else on the page depends on this — it resolves the third card. */
    loadProfile(): void {
        if (this._profileState() === 'loading') {
            return;
        }
        this._profileState.set('loading');

        this.profileApi
            .getOrNull()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (profile) => {
                    this._profile.set(profile);
                    this._profileState.set(profile ? 'available' : 'missing');
                },
                error: () => this._profileState.set('error'),
            });
    }

    startFromScratch(name = 'Untitled CV'): void {
        this.begin('scratch');
        this.cvApi
            .create({ source: 'scratch', name })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (cv) => this.open(cv), error: (failure) => this.fail(failure) });
    }

    startFromProfile(): void {
        this.begin('profile');
        this.cvApi
            .createFromProfile({})
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (cv) => this.open(cv), error: (failure) => this.fail(failure) });
    }

    /**
     * Upload → poll → create. The poll subscription is held so leaving the page
     * (or picking a different file) stops it; an orphaned poller hammering a
     * finished import is the classic version of this bug.
     */
    startImport(file: File): void {
        const rejection = this.importApi.validate(file);
        if (rejection) {
            this._error.set({ code: rejection.code, message: rejection.message });
            return;
        }

        this.begin('import');
        this._import.set({
            id: '',
            fileName: file.name,
            status: 'processing',
            stageLabel: 'Uploading',
            progress: 2,
            error: null,
        });

        this.importApi
            .upload(file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (started) => this.track(started),
                error: (failure) => this.fail(failure),
            });
    }

    cancelImport(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
        this._import.set(null);
        this._busy.set(null);
    }

    clearError(): void {
        this._error.set(null);
    }

    private track(started: CvImportDto): void {
        this.applyImport(started);

        this.pollSub?.unsubscribe();
        this.pollSub = this.importApi
            .poll(started.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (snapshot) => {
                    this.applyImport(snapshot);
                    if (snapshot.status === 'completed') {
                        this.createFromImport(snapshot.id);
                    }
                    if (snapshot.status === 'failed') {
                        this._busy.set(null);
                        this._error.set(
                            snapshot.error ?? { code: 'CV_IMPORT_FAILED', message: 'We could not read that document.' }
                        );
                    }
                },
                error: (failure) => this.fail(failure),
            });
    }

    private createFromImport(importId: string): void {
        this.cvApi
            .create({ source: 'import', importId, name: 'Imported CV' })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (cv) => this.open(cv), error: (failure) => this.fail(failure) });
    }

    private applyImport(snapshot: CvImportDto): void {
        this._import.set({
            id: snapshot.id,
            fileName: snapshot.fileName,
            status: snapshot.status,
            stageLabel: importStageLabel(snapshot),
            progress: Math.max(0, Math.min(100, Math.round(snapshot.progress))),
            error: snapshot.error ?? null,
        });
    }

    private begin(path: StartPathId): void {
        this._busy.set(path);
        this._error.set(null);
    }

    private open(cv: CvDto): void {
        this._busy.set(null);
        this._import.set(null);
        void this.router.navigate(['/app/create', cv.id]);
    }

    private fail(failure: unknown): void {
        this._busy.set(null);
        this._error.set(toApiError(failure));
    }
}
