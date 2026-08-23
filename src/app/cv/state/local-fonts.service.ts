import { Injectable, computed, signal } from '@angular/core';

import { CV_FONT_CANDIDATES } from '../models/cv-font-candidates';

/**
 * ELEVATOR — fonts installed on the reader's own machine.
 *
 * WHY THIS IS NOT JUST THE LOCAL FONT ACCESS API. queryLocalFonts() looked like
 * the right answer and does not work in practice: it is Chromium-only, it is
 * gesture- and permission-gated, and — measured — it can resolve with an EMPTY
 * ARRAY without throwing and without ever showing a prompt. Brave blocks it as a
 * fingerprinting vector and returns the same silent nothing. A picker built on
 * it alone reports "your browser did not share the font list" and leaves the
 * user with no fonts, which is exactly what happened.
 *
 * So detection is by MEASUREMENT, which needs no permission and works in every
 * browser: render a probe string in `"<candidate>", <generic>` and compare its
 * width against the generic alone. A different width means the candidate
 * resolved, i.e. it is installed. That can only answer "is THIS font here?",
 * never "list everything", which is why cv-font-candidates.ts exists — and why
 * the picker also lets a name be typed in by hand.
 *
 * queryLocalFonts() is still used when it actually returns something: it gives
 * the complete list rather than a probe of known names. It is a bonus on top of
 * detection, never the thing the feature depends on.
 */
export type LocalFontsState = 'idle' | 'scanning' | 'ready';

interface FontData {
    family: string;
}

@Injectable({ providedIn: 'root' })
export class LocalFontsService {
    private readonly _state = signal<LocalFontsState>('idle');
    private readonly _detected = signal<readonly string[]>([]);
    private readonly _fromApi = signal<readonly string[]>([]);
    private readonly _apiTried = signal(false);

    readonly state = this._state.asReadonly();
    readonly apiTried = this._apiTried.asReadonly();

    /** Everything we know is on this machine, from either source. */
    readonly families = computed(() =>
        [...new Set([...this._detected(), ...this._fromApi()])].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        )
    );

    /** True when the fuller, permissioned list is worth offering. */
    readonly canRequestFullList = computed(
        () => typeof globalThis !== 'undefined' && 'queryLocalFonts' in globalThis && this._fromApi().length === 0
    );

    /**
     * Measurement scan. No permission, no prompt, safe to call on first paint.
     * Idempotent — the answer cannot change while the page is open.
     */
    scan(): void {
        if (this._state() !== 'idle') {
            return;
        }
        this._state.set('scanning');
        this._detected.set(detectInstalledFonts(CV_FONT_CANDIDATES));
        this._state.set('ready');
    }

    /**
     * Ask for the complete list. Must run from a click — the prompt is
     * gesture-gated. A refusal, a block, or the silent empty array all leave the
     * measured list in place, so the picker never ends up worse than before.
     */
    async requestFullList(): Promise<void> {
        this._apiTried.set(true);
        try {
            const query = (globalThis as { queryLocalFonts?: () => Promise<FontData[]> }).queryLocalFonts;
            const fonts = query ? await query() : [];
            this._fromApi.set([...new Set(fonts.map((font) => font.family))]);
        } catch {
            this._fromApi.set([]);
        }
    }
}

/** The probe string mixes wide and narrow glyphs so substitution shifts the width. */
const PROBE = 'mmmmmmmmmmlliWWWW@';
const GENERICS = ['monospace', 'sans-serif', 'serif'] as const;

export function detectInstalledFonts(candidates: readonly string[]): string[] {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
        return [];
    }

    // Width of the probe in each generic, to compare against.
    const baseline = GENERICS.map((generic) => {
        context.font = `72px ${generic}`;
        return context.measureText(PROBE).width;
    });

    return candidates.filter((family) =>
        GENERICS.some((generic, index) => {
            // If the family is missing the browser falls back to the generic and
            // the width matches exactly; any difference means it resolved.
            context.font = `72px "${cssEscape(family)}", ${generic}`;
            return Math.abs(context.measureText(PROBE).width - baseline[index]) > 0.5;
        })
    );
}

function cssEscape(family: string): string {
    return family.replace(/["\\]/g, '\\$&');
}
