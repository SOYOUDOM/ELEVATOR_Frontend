/**
 * Page copy for the Get Started shell.
 *
 * Kept out of the component so the hero, the panel headings and the benefit
 * strip can be re-worded — or localised — without touching a template.
 */

export interface HeroHighlight {
    /** Full icon class, e.g. `'pi pi-bolt'`. */
    icon: string;
    title: string;
    text: string;
}

export interface BenefitItem {
    icon: string;
    title: string;
    text: string;
}

export const GET_STARTED_HERO = {
    eyebrow: 'Get started',
    /** Rendered in three lines; the accent span sits on `titleAccent`. */
    titleLead: "Let's build your",
    titleAccent: 'professional CV',
    titleTail: 'together.',
    lede: 'Create a standout CV in minutes with smart tools, stunning templates, and AI-powered suggestions tailored just for you.',
    /**
     * The artwork behind the hero. Left empty on purpose — drop a file in
     * `src/assets/img/` and set this to its path (or set `--gs-hero-image` in
     * get-started.component.scss). Empty renders a neutral placeholder frame.
     */
    image: '',
    imageAlt: '',
} as const;

export const GET_STARTED_HIGHLIGHTS: readonly HeroHighlight[] = [
    { icon: 'pi pi-bolt', title: 'Quick & easy', text: 'Get started in minutes' },
    { icon: 'pi pi-shield', title: 'Smart & secure', text: 'Your data is protected' },
    { icon: 'pi pi-sparkles', title: 'Stand out', text: 'Impress employers' },
] as const;

export const GET_STARTED_PANEL = {
    eyebrow: 'Just a few steps',
    title: 'Create your CV in minutes',
} as const;

export const GET_STARTED_BENEFITS = {
    title: 'Why choose ELEVATOR CV builder?',
    items: [
        {
            icon: 'pi pi-pencil',
            title: 'AI powered',
            text: 'Smart suggestions to write stronger content.',
        },
        {
            icon: 'pi pi-verified',
            title: 'ATS optimized',
            text: 'Designed to pass ATS systems and get you noticed.',
        },
        {
            icon: 'pi pi-palette',
            title: 'Professional templates',
            text: 'Modern, recruiter-approved designs.',
        },
        {
            icon: 'pi pi-download',
            title: 'PDF export',
            text: 'Download high-quality PDF anytime.',
        },
    ] as readonly BenefitItem[],
} as const;
