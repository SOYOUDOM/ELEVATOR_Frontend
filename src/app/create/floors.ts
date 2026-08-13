/**
 * ELEVATOR — the ten floors, in order.
 *
 * `step` is what the router's view-transition feature reads to decide which
 * way the lift is travelling; `fx` names an effect that replaces the default
 * horizontal slide. Both are copied onto the route definitions in
 * app-routing.module.ts — this file is the single place the order, the
 * numbering and the copy live.
 */
export interface Floor {
    /** Route path segment under /app/create. */
    id: string;
    step: number;
    /** Shown in the shaft and the eyebrow. 'G' is the ground floor. */
    num: string;
    nav: string;
    eyebrow: string;
    title: string;
    glow: string;
    lede: string;
    /** Never blocks NEXT, and is marked optional in the checklist. */
    optional?: boolean;
    /** Excluded from the completion percentage. */
    unscored?: boolean;
}

export const FLOORS: readonly Floor[] = [
    {
        id: 'lobby',
        step: 0,
        num: 'G',
        nav: 'Lobby',
        eyebrow: 'PICK YOUR ENTRANCE',
        unscored: true,
        title: 'TWO WAYS',
        glow: 'INTO THE BUILDING',
        lede: 'You can hand us the CV you already have and we will read it, or start from an empty page. Either way you end up on the same floors.',
    },
    {
        id: 'basic-info',
        step: 1,
        num: '01',
        nav: 'Basic info',
        eyebrow: 'WHO IS RIDING',
        title: 'START WITH',
        glow: 'THE BASICS',
        lede: 'Five boxes carry the whole CV — a name, a title, and three ways to reach you. The other four are yours to skip.',
    },
    {
        id: 'portrait',
        step: 2,
        num: '02',
        nav: 'Portrait',
        eyebrow: 'THE FACE ON THE DOOR',
        optional: true,
        title: 'ONE GOOD',
        glow: 'PHOTOGRAPH',
        lede: 'Optional, and regional — expected in Cambodia, rejected outright in the US and UK. Upload anything you have and we will clean it up.',
    },
    {
        id: 'experience',
        step: 3,
        num: '03',
        nav: 'Experience',
        eyebrow: 'THE FLOORS BEHIND YOU',
        title: 'WHERE YOU',
        glow: 'HAVE BEEN',
        lede: 'One entry per role, newest first. Lead each line with what changed, not what you were assigned — a reader gives this section six seconds.',
    },
    {
        id: 'education',
        step: 4,
        num: '04',
        nav: 'Education',
        eyebrow: 'WHERE YOU TRAINED',
        title: 'HOW YOU',
        glow: 'LEARNED IT',
        lede: 'Degrees, bootcamps, certifications. If your experience is stronger than your schooling, this can be one line and still do its job.',
    },
    {
        id: 'skills',
        step: 5,
        num: '05',
        nav: 'Skills',
        eyebrow: 'WHAT YOU CARRY',
        title: 'WHAT IS IN',
        glow: 'YOUR TOOLBAG',
        lede: 'Group them so a scanner and a human both find what they came for. Anything you would not be happy to be interviewed on does not belong here.',
    },
    {
        id: 'projects',
        step: 6,
        num: '06',
        nav: 'Projects',
        eyebrow: 'WHAT YOU SHIPPED',
        optional: true,
        title: 'THINGS YOU',
        glow: 'ACTUALLY BUILT',
        lede: 'Optional, and the most persuasive floor in the building — especially early in a career, where it does the work experience cannot.',
    },
    {
        id: 'summary',
        step: 7,
        num: '07',
        nav: 'Summary',
        eyebrow: 'THE PITCH',
        title: 'SIX SECONDS',
        glow: 'TO LAND IT',
        lede: 'Three sentences at the top, read before anything else. Say what you are, what you have done, and what you are aiming at.',
    },
    {
        id: 'template',
        step: 8,
        num: '08',
        nav: 'Template',
        eyebrow: 'PICK THE FINISH',
        title: 'CHOOSE THE',
        glow: 'CAR YOU RIDE IN',
        lede: 'Every template here is single-column parseable underneath, so the choice is about tone — not about whether a machine can read it.',
    },
    {
        id: 'review',
        step: 9,
        num: '09',
        nav: 'Review',
        eyebrow: 'THE DOORS OPEN',
        unscored: true,
        title: 'READY TO',
        glow: 'STEP OUT',
        lede: 'Your CV, the machine read-back, and a match score against any job ad you paste. Change anything by jumping back to its floor.',
    },
];

export const floorAt = (id: string): Floor | undefined => FLOORS.find((f) => f.id === id);
export const floorIndex = (id: string): number => FLOORS.findIndex((f) => f.id === id);
/** Floors that count toward the percentage in the shaft. */
export const SCORED_FLOORS = FLOORS.filter((f) => !f.unscored);
