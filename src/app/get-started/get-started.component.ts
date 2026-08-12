import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    signal,
} from '@angular/core';

import { appModuleAnimation } from '@shared/animations/routerTransition';
import { RevealDirective } from '@shared/directives/reveal.directive';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvCardComponent } from '@shared/components/elv-card/elv-card.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';
import { ElvCheckboxComponent } from '@shared/components/elv-checkbox';
import { ElvAccordionComponent, ElvAccordionPanelComponent } from '@shared/components/elv-accordion';
import { Stat, StatsComponent } from '@shared/components/stats/stats.component';

import { FooterComponent } from '../layout/footer.component';

/* ── Page data shapes ─────────────────────────────────────────── */
type EntranceId = 'blank' | 'import' | 'rebuild';

interface Entrance {
    id: EntranceId;
    num: string;
    icon: string; // primeicons name — 'pi-upload' (NOT 'pi pi-upload')
    tag: string;
    eta: string;
    title: string;
    text: string;
    best: string;
}

interface PrepItem {
    id: string;
    label: string;
    hint: string;
}

interface Stop {
    num: string;
    icon: string;
    title: string;
    text: string;
    meta: string;
}

interface Faq {
    id: string;
    q: string;
    a: string;
}

/**
 * GET STARTED · the boarding sequence.
 *
 * The page is one guided flow rather than a wall of copy: pick an entrance →
 * tick the prep kit → watch the ascent → take the boarding pass. Two things
 * carry that guidance, and they are deliberately built on different machinery:
 *
 *   • CHOICE state (entrance, prep kit, progress) is signals. Writes schedule
 *     change detection on their own, which is what makes this safe under the
 *     app's zoneless bootstrap — no zone.js, no markForCheck.
 *
 *   • SCROLL state (the shaft lighting up, the car travelling, the HUD
 *     appearing) is IntersectionObserver writing classes and custom properties
 *     straight onto the DOM. It never enters change detection at all.
 *
 * Everything visual is either a shared elv-* component, a global ELEVATOR class
 * (.elv-container / .elv-section-head / .elv-eyebrow / .elv-seam), or the
 * elvReveal directive. The scoped SCSS only adds what has no equivalent yet:
 * the call panel, the shaft, and the boarding pass.
 *
 * Reduced motion: reveals gate themselves in reveals.scss, and wire() below
 * skips straight to the finished state, so the shaft is never left dark.
 */
@Component({
    selector: 'app-get-started',
    standalone: true,
    templateUrl: './get-started.component.html',
    styleUrl: './get-started.component.scss',
    animations: [appModuleAnimation()],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RevealDirective,
        ElvAlertComponent,
        ElvButtonComponent,
        ElvCardComponent,
        ElvChipComponent,
        ElvProgressComponent,
        ElvCheckboxComponent,
        ElvAccordionComponent,
        ElvAccordionPanelComponent,
        StatsComponent,
        FooterComponent,
    ],
})
export class GetStartedComponent {
    /* ── Content ──────────────────────────────────────────────── */
    readonly heroStats: Stat[] = [
        { value: '03', label: 'Steps to a PDF' },
        { value: '2 MIN', label: 'Typical import' },
        { value: '$0', label: 'At every step' },
    ];

    readonly entrances: Entrance[] = [
        {
            id: 'import',
            num: '01',
            icon: 'pi-upload',
            tag: 'FASTEST',
            eta: '~2 MIN',
            title: 'Bring your old CV',
            text: 'Drop a PDF or DOCX. We read it, rebuild the layout, and keep every word you wrote.',
            best: 'Best if you already have something on paper.',
        },
        {
            id: 'rebuild',
            num: '02',
            icon: 'pi-sparkles',
            tag: 'LEAST EFFORT',
            eta: '~4 MIN',
            title: 'Rebuild from scraps',
            text: 'A LinkedIn export, an old cover letter, three bullet points in a note. The AI turns it into a full CV.',
            best: 'Best if your CV is scattered across five files.',
        },
        {
            id: 'blank',
            num: '03',
            icon: 'pi-pencil',
            tag: 'MOST CONTROL',
            eta: '~6 MIN',
            title: 'Start from a blank floor',
            text: 'Nothing to upload. Answer a short run of prompts and the AI drafts each section alongside you.',
            best: 'Best for a first CV, or a clean restart.',
        },
    ];

    readonly prep: PrepItem[] = [
        {
            id: 'photo',
            label: 'A photo of your face',
            hint: 'Any selfie will do — the AI adds the suit, the lighting and the studio backdrop.',
        },
        {
            id: 'history',
            label: 'Where you have worked',
            hint: 'Titles, companies, rough dates. Half-remembered bullet points are enough.',
        },
        {
            id: 'target',
            label: 'A job you actually want',
            hint: 'Paste the ad later and the ATS check scores your CV against that exact posting.',
        },
        {
            id: 'contact',
            label: 'Contact details',
            hint: 'Email and phone. Add a portfolio or LinkedIn if you have one.',
        },
    ];

    readonly stops: Stop[] = [
        {
            num: '01',
            icon: 'pi-upload',
            title: 'Fill the frame',
            text: 'Import or type. Sections snap into place as you go, so there is no formatting to fight.',
            meta: 'AUTOSAVED · NO SETUP',
        },
        {
            num: '02',
            icon: 'pi-sparkles',
            title: 'Let the AI write with you',
            text: 'Weak bullet? Ask for three stronger versions. Empty summary? It drafts one from your own history.',
            meta: 'REWRITE · EXPAND · TIGHTEN',
        },
        {
            num: '03',
            icon: 'pi-shield',
            title: 'Score against the real job',
            text: 'Paste the ad. See your match score, the keywords you are missing, and exactly where to put them.',
            meta: 'LIVE ATS SCORE',
        },
        {
            num: '04',
            icon: 'pi-download',
            title: 'Take the PDF and go',
            text: 'Watch one short ad and download a pixel-perfect file. No card, no trial, no watermark.',
            meta: 'PDF · DOCX',
        },
    ];

    readonly faqs: Faq[] = [
        {
            id: 'free',
            q: 'Is it actually free, or free until I hit export?',
            a: 'Free at every step, export included. One short ad plays when you download — that is the entire business model. There is no card form anywhere in the product.',
        },
        {
            id: 'ats',
            q: 'Will an applicant tracking system be able to read it?',
            a: 'Yes. Every template is built parse-first: real text, real headings, nothing important trapped inside an image. The ATS check scores your file against a specific job before you export it.',
        },
        {
            id: 'nocv',
            q: 'I do not have a CV yet. Can I still start?',
            a: 'That is what the blank floor is for. It asks you a short run of questions and drafts each section with you. If you do have an old CV, importing it is the faster road.',
        },
        {
            id: 'data',
            q: 'What happens to my data?',
            a: 'Your CV stays yours. It is not sold, and it is not used to train a public model. You can delete everything from your account in a single action.',
        },
        {
            id: 'time',
            q: 'How long does this really take?',
            a: 'About two minutes if you import an existing CV, closer to six if you start from blank. The prep kit above is the whole list of things worth having open.',
        },
    ];

    /* ── Interactive state ────────────────────────────────────── */
    /** Which entrance the visitor picked. Drives the prep copy and the pass. */
    readonly picked = signal<EntranceId | null>(null);
    /** Ids of the prep-kit rows that are ticked. */
    readonly ready = signal<string[]>([]);
    /** Flipped once the boarding pass scrolls into view — the flow is done. */
    readonly boarded = signal(false);
    /** The bottom HUD only earns its space after the hero has left. */
    readonly hudUp = signal(false);

    readonly pickedEntrance = computed(() => this.entrances.find((e) => e.id === this.picked()) ?? null);
    readonly readyCount = computed(() => this.ready().length);
    readonly readyPct = computed(() => Math.round((this.readyCount() / this.prep.length) * 100));

    /** 40% for choosing, 40% for the prep kit, 20% for reaching the pass. */
    readonly progress = computed(() =>
        Math.round(
            100 *
                (0.4 * (this.picked() ? 1 : 0) +
                    0.4 * (this.readyCount() / this.prep.length) +
                    0.2 * (this.boarded() ? 1 : 0))
        )
    );

    /** 1-based index of the step the visitor still has to finish. */
    readonly step = computed(() => {
        if (!this.picked()) {
            return 1;
        }
        if (this.readyCount() < this.prep.length) {
            return 2;
        }
        return 3;
    });

    readonly stepLabel = computed(() => `0${this.step()}`);

    /** The one thing left to do — the HUD button and its label both read this. */
    readonly nextAction = computed(() => {
        switch (this.step()) {
            case 1:
                return {
                    anchor: 'gs-entrance',
                    cta: 'CHOOSE AN ENTRANCE',
                    note: 'Step 1 of 3 — pick how you want to start',
                };
            case 2:
                return {
                    anchor: 'gs-prep',
                    cta: 'FINISH THE PREP KIT',
                    note: 'Step 2 of 3 — tick what you already have',
                };
            default:
                return { anchor: 'gs-launch', cta: 'OPEN THE DOORS', note: 'Step 3 of 3 — you are cleared to board' };
        }
    });

    /** Readiness caption beside the ring. */
    readonly readyState = computed(() => {
        const n = this.readyCount();
        if (n === 0) {
            return {
                tag: 'STANDBY',
                note: 'Nothing here is mandatory — ticking it just makes the next few minutes quicker.',
            };
        }
        if (n < this.prep.length - 1) {
            return {
                tag: 'WARMING UP',
                note: 'Good start. Grab the rest and you will not have to stop halfway through.',
            };
        }
        if (n < this.prep.length) {
            return { tag: 'ALMOST THERE', note: 'One item short of a clean, uninterrupted run.' };
        }
        return { tag: 'CLEARED', note: 'Everything is in hand. The rest of this page is what the app does for you.' };
    });

    /** Contextual line that reacts to the entrance the visitor picked. */
    readonly prepIntro = computed(() => {
        const e = this.pickedEntrance();
        if (!e) {
            return 'Pick an entrance above and this list adapts to it. In the meantime, here is what almost everyone needs.';
        }
        return `You picked “${e.title}” (${e.eta}). Have these open before you start and you will not have to stop halfway.`;
    });

    // ── DI ────────────────────────────────────────────────────
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        afterNextRender(() => this.wire());
    }

    /* ── Choice handlers ──────────────────────────────────────── */
    pick(id: EntranceId): void {
        this.picked.update((current) => (current === id ? null : id));
    }

    isPicked(id: EntranceId): boolean {
        return this.picked() === id;
    }

    isReady(id: string): boolean {
        return this.ready().includes(id);
    }

    setReady(id: string, on: boolean): void {
        this.ready.update((ids) => (on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)));
    }

    /** Ticks every row at once — the impatient path through step 2. */
    readyForAll(): void {
        this.ready.set(this.prep.map((p) => p.id));
    }

    scrollTo(id: string): void {
        const target = this.host.nativeElement.querySelector<HTMLElement>(`#${id}`);
        target?.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    private reducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* ── Scroll choreography ──────────────────────────────────────
       Deliberately outside change detection: classes and custom
       properties are written straight onto the DOM, so scrolling
       costs nothing even though the page is zoneless.
       ─────────────────────────────────────────────────────────── */
    private wire(): void {
        const root = this.host.nativeElement;

        const rail = root.querySelector<HTMLElement>('.gs-rail');
        const car = root.querySelector<HTMLElement>('.gs-car');
        const stops = Array.from(root.querySelectorAll<HTMLElement>('.gs-stop'));
        const hero = root.querySelector<HTMLElement>('.gs-hero');
        const launch = root.querySelector<HTMLElement>('#gs-launch');

        // Reduced motion (or no IO support): show the finished state at once.
        if (this.reducedMotion() || !('IntersectionObserver' in window)) {
            stops.forEach((s) => s.classList.add('is-lit'));
            rail?.style.setProperty('--lit', '1');
            this.boarded.set(true);
            return;
        }

        // ── the shaft: each stop lights once, the car rides to it ──
        let lit = 0;

        const stopIO = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) {
                        continue;
                    }

                    const el = entry.target as HTMLElement;
                    el.classList.add('is-lit');
                    stopIO.unobserve(el);

                    lit = Math.max(lit, stops.indexOf(el) + 1);
                    rail?.style.setProperty('--lit', String(lit / stops.length));

                    // Measured against the rail rather than read from offsetTop:
                    // offsetParent depends on which ancestor happens to be
                    // positioned, and this must not care.
                    if (car && rail) {
                        const railBox = rail.getBoundingClientRect();
                        const stopBox = el.getBoundingClientRect();
                        const y = stopBox.top + stopBox.height / 2 - railBox.top;
                        car.style.transform = `translateY(${Math.round(y)}px)`;
                    }
                }
            },
            { threshold: 0.35, rootMargin: '0px 0px -12% 0px' }
        );
        stops.forEach((s) => stopIO.observe(s));

        // ── the HUD: up once the hero leaves, down once the pass lands ──
        const heroIO = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    this.hudUp.set(!entry.isIntersecting);
                }
            },
            { threshold: 0.15 }
        );
        if (hero) {
            heroIO.observe(hero);
        }

        const launchIO = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        this.boarded.set(true);
                        this.hudUp.set(false);
                        launchIO.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.35 }
        );
        if (launch) {
            launchIO.observe(launch);
        }

        this.destroyRef.onDestroy(() => {
            stopIO.disconnect();
            heroIO.disconnect();
            launchIO.disconnect();
        });
    }
}
