// ════════════════════════════════════════════════════════════
// ELV-STEPPER · public contract
//
// Deliberately owns no domain knowledge. A stepper is handed a
// list of `ElvStepperItem`s and an active id; it never knows what
// a "CV wizard" is. That is what makes it reusable for the next
// flow (onboarding, checkout, applications) without a rewrite.
// ════════════════════════════════════════════════════════════

/** One node on the track. `id` is what `activeId` and the output speak in. */
export interface ElvStepperItem {
    /** Stable key. Used for tracking, `activeId` matching and the output. */
    id: string;
    /** Short caption under the marker. Keep it to one or two words. */
    label: string;
    /**
     * What the marker shows. Defaults to the 1-based position, which is what
     * the ELEVATOR design uses. Pass a string to show a floor code instead.
     */
    marker?: string | number;
    /** Full icon class shown instead of the marker, e.g. `'pi pi-check'`. */
    icon?: string;
    /** Longer text for assistive tech when `label` is an abbreviation. */
    ariaLabel?: string;
    /** Blocks selection even when the stepper is `[clickable]`. */
    disabled?: boolean;

    /**
     * Marks a step the user can still open but has not finished. The elevator
     * variant draws it as a hollow ring — the spec's "mark, don't lock".
     */
    incomplete?: boolean;
}

/** Where a step sits relative to the active one. Drives every visual. */
export type ElvStepperState = 'done' | 'active' | 'upcoming' | 'disabled';

export type ElvStepperOrientation = 'horizontal' | 'vertical';

/**
 * `default` — the neutral numbered track.
 *
 * `elevator` — the ELEVATOR shaft. Renders vertically as floors with a car
 * that rides between them, and falls back to horizontal below the mobile
 * breakpoint. Free jumping is the point of it: an incomplete floor is marked,
 * never locked, so pair it with `reach="all"`.
 */
export type ElvStepperVariant = 'default' | 'elevator';

/** The rule drawn between two markers. */
export type ElvStepperConnector = 'dashed' | 'solid' | 'none';

export type ElvStepperSize = 'small' | 'medium' | 'large';

/** How much of the track is reachable by click when `[clickable]` is on. */
export type ElvStepperReach =
    | 'visited' // done steps and the active one — the safe default
    | 'all'; // every step, including ones never opened

/** What the emitted step carries, so hosts do not re-look-up the item. */
export interface ElvStepperSelection {
    id: string;
    index: number;
    item: ElvStepperItem;
}
