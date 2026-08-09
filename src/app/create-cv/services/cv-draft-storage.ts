import { InjectionToken } from '@angular/core';

import { CV_DRAFT_SCHEMA_VERSION, type CvDraft } from '../models/cv-draft.model';

/**
 * Where an in-progress draft lives between page loads.
 *
 * The store depends on this interface, never on IndexedDB directly, so moving
 * drafts to an account-backed API later is a provider swap in the route — no
 * store and no screen changes.
 */
export interface CvDraftStorage {
    read(id: string): Promise<CvDraft | null>;
    write(draft: CvDraft): Promise<void>;
    delete(id: string): Promise<void>;
    /** Newest first. Used by the resume prompt. */
    list(): Promise<CvDraft[]>;
}

/**
 * Root-provided on purpose.
 *
 * `CvDraftStore` is `providedIn: 'root'` (the header save-chip, the wizard and
 * the editor all need the same instance and do not share a route subtree), and
 * a root service cannot see route-level providers — the root injector sits
 * ABOVE them. Defaulting the token here is what keeps the store injectable
 * from anywhere while leaving it overridable: a route or a test can still
 * provide its own implementation for the components beneath it.
 */
export const CV_DRAFT_STORAGE = new InjectionToken<CvDraftStorage>('CV_DRAFT_STORAGE', {
    providedIn: 'root',
    factory: () => provideCvDraftStorage(),
});

const DB_NAME = 'elevator';
const DB_VERSION = 1;
const STORE = 'cv-drafts';

/**
 * IndexedDB, hand-rolled.
 *
 * Deliberately not a new dependency: this needs one object store and four
 * operations, which is less code than the wrapper libraries' own README.
 *
 * IndexedDB is used rather than localStorage because a draft carries base64
 * photos — two of those blow past localStorage's ~5 MB ceiling, and a
 * QuotaExceededError there is silent data loss on the one flow that has no
 * login to fall back on.
 *
 * Every path is defensive: a browser in private mode, with storage disabled,
 * or mid-upgrade must degrade to "no draft", never throw into a screen.
 */
export class IndexedDbCvDraftStorage implements CvDraftStorage {
    private dbPromise: Promise<IDBDatabase | null> | null = null;

    async read(id: string): Promise<CvDraft | null> {
        const db = await this.db();
        if (!db) {
            return null;
        }
        try {
            const raw = await request<CvDraft | undefined>(
                db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
            );
            // A payload from an older shape is not worth migrating for an
            // anonymous draft — treat it as absent and start clean.
            return raw && raw.schemaVersion === CV_DRAFT_SCHEMA_VERSION ? raw : null;
        } catch {
            return null;
        }
    }

    async write(draft: CvDraft): Promise<void> {
        const db = await this.db();
        if (!db) {
            // Surfaced by the store as saveState 'error' — the header chip
            // must be able to tell the user their work is not being kept.
            throw new Error('No draft storage available');
        }
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(draft);
        await transaction(tx);
    }

    async delete(id: string): Promise<void> {
        const db = await this.db();
        if (!db) {
            return;
        }
        try {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            await transaction(tx);
        } catch {
            // Best effort — the caller asked to forget it, not to be told why not.
        }
    }

    async list(): Promise<CvDraft[]> {
        const db = await this.db();
        if (!db) {
            return [];
        }
        try {
            const all = await request<CvDraft[]>(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
            return (all ?? [])
                .filter((d) => d.schemaVersion === CV_DRAFT_SCHEMA_VERSION)
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        } catch {
            return [];
        }
    }

    /** Opened once, lazily. Null means "this browser cannot store drafts". */
    private db(): Promise<IDBDatabase | null> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
            if (typeof indexedDB === 'undefined') {
                resolve(null);
                return;
            }

            let open: IDBOpenDBRequest;
            try {
                open = indexedDB.open(DB_NAME, DB_VERSION);
            } catch {
                resolve(null);
                return;
            }

            open.onupgradeneeded = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            open.onsuccess = () => resolve(open.result);
            open.onerror = () => resolve(null);
            // Another tab holding an old version open: don't hang forever.
            open.onblocked = () => resolve(null);
        });

        return this.dbPromise;
    }
}

/** In-memory stand-in for tests and non-browser targets. */
export class MemoryCvDraftStorage implements CvDraftStorage {
    private readonly map = new Map<string, CvDraft>();

    async read(id: string): Promise<CvDraft | null> {
        return this.map.get(id) ?? null;
    }

    async write(draft: CvDraft): Promise<void> {
        this.map.set(draft.id, draft);
    }

    async delete(id: string): Promise<void> {
        this.map.delete(id);
    }

    async list(): Promise<CvDraft[]> {
        return [...this.map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
}

export function provideCvDraftStorage(): CvDraftStorage {
    return typeof indexedDB === 'undefined' ? new MemoryCvDraftStorage() : new IndexedDbCvDraftStorage();
}

// ── Promise wrappers around the callback API ──────────────────────────
function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Resolves on `complete`, not on the put's own success — a transaction can
 * still abort (quota) after the individual request succeeded, and reporting
 * "saved" in that case is the exact lie this feature cannot afford.
 */
function transaction(tx: IDBTransaction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
