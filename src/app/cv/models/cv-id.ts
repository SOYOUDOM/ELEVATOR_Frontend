/**
 * Stable record ids.
 *
 * crypto.randomUUID is available in every browser this app supports and in
 * Karma's Chrome, but not over plain http on some hosts — hence the fallback,
 * which is only ever used for ids that live inside one document.
 */
export function newCvId(prefix: string): string {
    const uuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}_${uuid}`;
}
