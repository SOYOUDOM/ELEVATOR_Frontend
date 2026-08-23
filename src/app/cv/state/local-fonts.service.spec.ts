import { detectInstalledFonts } from './local-fonts.service';

/**
 * Measurement-based detection is what makes the machine-font picker work at
 * all: queryLocalFonts() is Chromium-only, permission-gated, and — measured in
 * this very browser — resolves with an EMPTY array without throwing or
 * prompting. These tests pin the fallback that has to carry the feature.
 */
describe('detectInstalledFonts', () => {
    it('finds a font the platform is guaranteed to have', () => {
        // Every browser resolves at least one of these to a real face.
        const found = detectInstalledFonts(['Arial', 'Helvetica', 'DejaVu Sans', 'Liberation Sans', 'Times New Roman']);

        expect(found.length).toBeGreaterThan(0);
    });

    it('does not claim a font that cannot exist', () => {
        expect(detectInstalledFonts(['NotAFontQZX-1234', 'Definitely Missing Face 99'])).toEqual([]);
    });

    it('returns nothing for an empty candidate list rather than throwing', () => {
        expect(detectInstalledFonts([])).toEqual([]);
    });

    it('survives a family name containing quotes', () => {
        expect(() => detectInstalledFonts(['Bad"Name', "Other'Name"])).not.toThrow();
    });
});
