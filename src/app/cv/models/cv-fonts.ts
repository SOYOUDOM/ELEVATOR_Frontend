/**
 * ELEVATOR — fonts for the CV.
 *
 * `CvDesign.fontFamily` is a CSS FAMILY NAME, not an enum. That is what lets a
 * font the user already has on their machine be selected: the value is whatever
 * queryLocalFonts() reported, and the document just asks for it.
 *
 * Three groups, in the order a person actually chooses from:
 *   • document — the fonts a CV should usually be set in. Web-safe or already
 *     loaded, so they render for anyone opening the file.
 *   • elevator — our own faces, offered because people ask for the site's look.
 *     Display faces: fine for a name, deliberately not defaults for body copy.
 *   • local    — whatever the browser reports from the machine (see
 *     LocalFontsService). Not stored anywhere; re-queried per session.
 *
 * BACK-COMPAT: documents saved before this change hold 'sans' / 'serif' /
 * 'mono' / 'grotesk'. resolveFontStack() maps those, so an old CV keeps its
 * exact appearance without a migration.
 */
export type CvFontGroup = 'document' | 'elevator' | 'local';

export interface CvFontOption {
    /** Stored verbatim in CvDesign.fontFamily. */
    id: string;
    label: string;
    group: CvFontGroup;
    /** Full CSS stack, including fallbacks. */
    stack: string;
}

export const CV_FONT_PRESETS: readonly CvFontOption[] = [
    { id: 'Inter', label: 'Inter', group: 'document', stack: "'Inter', 'Helvetica Neue', Arial, sans-serif" },
    { id: 'Arial', label: 'Arial', group: 'document', stack: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
    { id: 'Helvetica', label: 'Helvetica', group: 'document', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { id: 'Georgia', label: 'Georgia', group: 'document', stack: "Georgia, 'Times New Roman', serif" },
    { id: 'Times New Roman', label: 'Times New Roman', group: 'document', stack: "'Times New Roman', Times, serif" },
    { id: 'Garamond', label: 'Garamond', group: 'document', stack: "Garamond, 'EB Garamond', Georgia, serif" },
    { id: 'Cambria', label: 'Cambria', group: 'document', stack: 'Cambria, Georgia, serif' },
    { id: 'Calibri', label: 'Calibri', group: 'document', stack: "Calibri, Candara, 'Segoe UI', sans-serif" },
    { id: 'Verdana', label: 'Verdana', group: 'document', stack: 'Verdana, Geneva, sans-serif' },
    { id: 'Tahoma', label: 'Tahoma', group: 'document', stack: 'Tahoma, Geneva, sans-serif' },
    {
        id: 'Space Grotesk',
        label: 'Space Grotesk',
        group: 'document',
        stack: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    },
    {
        id: 'IBM Plex Mono',
        label: 'IBM Plex Mono',
        group: 'document',
        stack: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace",
    },

    // ELEVATOR's own faces. Orbitron, Sora and Jost are already loaded by
    // styles/_font.scss; Varino, Designer and Moon are local @font-face in
    // styles.scss. Anyone opening the exported PDF sees them because the PDF
    // embeds what the browser rendered.
    { id: 'Jost', label: 'Jost — ELEVATOR UI', group: 'elevator', stack: "'Jost', 'Inter', sans-serif" },
    { id: 'Sora', label: 'Sora — ELEVATOR', group: 'elevator', stack: "'Sora', 'Inter', sans-serif" },
    {
        id: 'Chakra Petch',
        label: 'Chakra Petch — ELEVATOR body',
        group: 'elevator',
        stack: "'Chakra Petch', system-ui, sans-serif",
    },
    {
        id: 'Orbitron',
        label: 'Orbitron — ELEVATOR display',
        group: 'elevator',
        stack: "'Orbitron', 'Chakra Petch', sans-serif",
    },
    { id: 'Varino', label: 'Varino — ELEVATOR mark', group: 'elevator', stack: "'Varino', 'Orbitron', sans-serif" },
] as const;

/** What the four pre-existing enum values meant, so old documents do not shift. */
const LEGACY_FAMILIES: Record<string, string> = {
    sans: 'Inter',
    serif: 'Georgia',
    mono: 'IBM Plex Mono',
    grotesk: 'Space Grotesk',
};

const PRESETS_BY_ID = new Map(CV_FONT_PRESETS.map((option) => [option.id, option]));

export const DEFAULT_CV_FONT = 'Inter';

/** Normalizes a stored value to a family name, resolving legacy enum ids. */
export function normalizeFontFamily(family: string | null | undefined): string {
    if (!family) {
        return DEFAULT_CV_FONT;
    }
    return LEGACY_FAMILIES[family] ?? family;
}

/**
 * The CSS the document actually gets. A preset contributes its curated stack; a
 * font picked off the user's machine is quoted and given a generic fallback, so
 * a CV opened on a different computer degrades to something readable instead of
 * to the browser default.
 */
export function resolveFontStack(family: string | null | undefined): string {
    const name = normalizeFontFamily(family);
    const preset = PRESETS_BY_ID.get(name);
    if (preset) {
        return preset.stack;
    }
    return `'${name.replace(/'/g, "\\'")}', 'Inter', system-ui, sans-serif`;
}

export function fontLabel(family: string | null | undefined): string {
    const name = normalizeFontFamily(family);
    return PRESETS_BY_ID.get(name)?.label ?? name;
}
