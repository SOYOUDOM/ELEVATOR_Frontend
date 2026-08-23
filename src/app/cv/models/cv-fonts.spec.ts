import { CV_FONT_PRESETS, DEFAULT_CV_FONT, fontLabel, normalizeFontFamily, resolveFontStack } from './cv-fonts';

/**
 * The font field was widened from a four-value enum to any CSS family name so a
 * font installed on the reader's machine can be chosen. These tests pin the
 * back-compat contract: a CV saved before that change must render identically.
 */
describe('CV fonts', () => {
    it('maps the four legacy ids to the families they used to mean', () => {
        expect(normalizeFontFamily('sans')).toBe('Inter');
        expect(normalizeFontFamily('serif')).toBe('Georgia');
        expect(normalizeFontFamily('mono')).toBe('IBM Plex Mono');
        expect(normalizeFontFamily('grotesk')).toBe('Space Grotesk');
    });

    it('resolves a legacy id to the exact stack it rendered with before', () => {
        expect(resolveFontStack('serif')).toBe("Georgia, 'Times New Roman', serif");
        expect(resolveFontStack('sans')).toBe("'Inter', 'Helvetica Neue', Arial, sans-serif");
    });

    it('falls back to the default when a CV has no font recorded', () => {
        expect(normalizeFontFamily(null)).toBe(DEFAULT_CV_FONT);
        expect(normalizeFontFamily('')).toBe(DEFAULT_CV_FONT);
    });

    it('quotes an arbitrary machine font and gives it a readable fallback', () => {
        const stack = resolveFontStack('Comic Sans MS');

        expect(stack).toContain("'Comic Sans MS'");
        expect(stack).toContain('sans-serif');
    });

    it('escapes a family name containing a quote rather than breaking the rule', () => {
        expect(resolveFontStack("Bob's Font")).toContain("Bob\\'s Font");
    });

    it('offers both document fonts and ELEVATOR fonts', () => {
        const groups = new Set(CV_FONT_PRESETS.map((option) => option.group));

        expect(groups.has('document')).toBeTrue();
        expect(groups.has('elevator')).toBeTrue();
    });

    it('labels a machine font with its own name', () => {
        expect(fontLabel('Papyrus')).toBe('Papyrus');
        expect(fontLabel('sans')).toBe('Inter');
    });
});
