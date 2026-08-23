import type { CvDocument } from '@app/cv/models/cv-document.model';
import type { ProfessionalProfile } from '@app/cv/models/professional-profile.model';
import type { CvImportDto } from '@app/cv/api/cv-api.contracts';

import { seedCvs } from './data/cv.fixture';
import { seedProfile } from './data/profile.fixture';

/**
 * ELEVATOR — the mock database.
 *
 * A typed in-memory store, mirrored into sessionStorage so a page refresh does
 * not throw away the CV you were just editing. No dependency, no schema, no
 * migration — anything more would be a database to maintain for a mock.
 *
 * Mutations behave like a real backend: POST then GET returns the new record,
 * PATCH is visible to the next GET, DELETE removes it.
 */
const STORAGE_KEY = 'elv-mock-db';

interface MockDbShape {
    cvs: CvDocument[];
    profile: ProfessionalProfile | null;
    imports: CvImportDto[];
}

function seed(): MockDbShape {
    return { cvs: seedCvs(), profile: seedProfile(), imports: [] };
}

class MockDb {
    private state: MockDbShape = restore() ?? seed();

    get cvs(): CvDocument[] {
        return this.state.cvs;
    }

    findCv(id: string): CvDocument | undefined {
        return this.state.cvs.find((cv) => cv.id === id);
    }

    insertCv(cv: CvDocument): CvDocument {
        this.state.cvs = [cv, ...this.state.cvs];
        this.persist();
        return cv;
    }

    replaceCv(next: CvDocument): CvDocument {
        this.state.cvs = this.state.cvs.map((cv) => (cv.id === next.id ? next : cv));
        this.persist();
        return next;
    }

    deleteCv(id: string): boolean {
        const before = this.state.cvs.length;
        this.state.cvs = this.state.cvs.filter((cv) => cv.id !== id);
        this.persist();
        return this.state.cvs.length < before;
    }

    getProfile(): ProfessionalProfile | null {
        return this.state.profile;
    }

    setProfile(profile: ProfessionalProfile): ProfessionalProfile {
        this.state.profile = profile;
        this.persist();
        return profile;
    }

    clearProfile(): void {
        this.state.profile = null;
        this.persist();
    }

    findImport(id: string): CvImportDto | undefined {
        return this.state.imports.find((entry) => entry.id === id);
    }

    upsertImport(entry: CvImportDto): CvImportDto {
        const existing = this.state.imports.findIndex((item) => item.id === entry.id);
        if (existing >= 0) {
            this.state.imports[existing] = entry;
        } else {
            this.state.imports.push(entry);
        }
        this.persist();
        return entry;
    }

    /** Development helper — restores every fixture. Never exposed as an endpoint. */
    reset(): void {
        this.state = seed();
        this.persist();
    }

    private persist(): void {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {
            /* private mode: the store simply stays in memory for this tab */
        }
    }
}

function restore(): MockDbShape | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as MockDbShape;
        if (!Array.isArray(parsed.cvs)) {
            return null;
        }
        return { cvs: parsed.cvs, profile: parsed.profile ?? null, imports: parsed.imports ?? [] };
    } catch {
        return null;
    }
}

export const mockDb = new MockDb();
