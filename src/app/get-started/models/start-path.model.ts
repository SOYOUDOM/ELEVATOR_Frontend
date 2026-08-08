/** The three ways into the builder, offered on step one. */
export type StartPathId = 'scratch' | 'import' | 'template';

export interface StartPath {
    readonly id: StartPathId;

    /** Full icon class, e.g. `'pi pi-plus'`. */
    readonly icon: string;

    readonly title: string;
    readonly text: string;

    /** Label on the card's own button. */
    readonly cta: string;

    /** Ribbon above the card. Only one path should carry it. */
    readonly badge?: string;

    /**
     * Where picking this path sends the user. Every path lands back in the
     * wizard; `import` and `template` will grow their own interstitial steps,
     * at which point only this field changes.
     */
    readonly nextStepId: string;
}
