import { Injectable, signal } from '@angular/core';

/**
 * ELEVATOR — fonts installed on the reader's own machine.
 *
 * Uses the Local Font Access API. Two things about it shape this service:
 *
 *   1. It is PERMISSIONED and gesture-gated. queryLocalFonts() must be called
 *      from a user activation and the browser shows a prompt, so this can only
 *      run from a button — never on load, never speculatively.
 *
 *   2. It is Chromium-only today. Firefox and Safari have not shipped it, so
 *      `supported` is false there and the UI keeps the curated preset list
 *      rather than showing a button that cannot work.
 *
 * Nothing is persisted. The list belongs to the machine, not to the CV; only
 * the chosen family NAME is stored in the document.
 */
export type LocalFontsState = 'unsupported' | 'idle' | 'loading' | 'granted' | 'denied' | 'error';

interface FontData {
    family: string;
    fullName: string;
    postscriptName: string;
    style: string;
}

type FontQuery = () => Promise<FontData[]>;

@Injectable({ providedIn: 'root' })
export class LocalFontsService {
    private readonly _state = signal<LocalFontsState>(this.detect());
    private readonly _families = signal<readonly string[]>([]);

    readonly state = this._state.asReadonly();
    /** Unique family names, alphabetical. Empty until the user grants access. */
    readonly families = this._families.asReadonly();

    get supported(): boolean {
        return this._state() !== 'unsupported';
    }

    /** Must be called from a click. Safe to call twice; the second is a no-op. */
    async load(): Promise<void> {
        if (!this.supported || this._state() === 'loading' || this._state() === 'granted') {
            return;
        }

        this._state.set('loading');
        try {
            const query = (globalThis as { queryLocalFonts?: FontQuery }).queryLocalFonts;
            const fonts = query ? await query() : [];
            const families = [...new Set(fonts.map((font) => font.family))].sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
            );
            this._families.set(families);
            this._state.set(families.length ? 'granted' : 'denied');
        } catch (error) {
            // A refused prompt throws NotAllowedError; anything else is a real
            // failure and should not read as "you said no".
            this._state.set((error as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'error');
        }
    }

    private detect(): LocalFontsState {
        return typeof globalThis !== 'undefined' && 'queryLocalFonts' in globalThis ? 'idle' : 'unsupported';
    }
}
