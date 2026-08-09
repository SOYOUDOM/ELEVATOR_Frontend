import { HttpResponse, delay, http, type HttpHandler } from 'msw';

/**
 * Mock backend for the Create CV feature.
 *
 * Everything `CvAiService` calls is served here while `environment.useMocks`
 * is on. Two deliberate choices:
 *
 *   • Responses are DERIVED from the request body, not fixed blobs. A mock
 *     that ignores its input hides the bugs you actually want to catch — a
 *     rewrite that drops the user's text, a scan that never varies, a score
 *     that is green on an empty CV.
 *
 *   • Every handler delays. AI work is slow in production, and the loading
 *     states (elv-skeleton over the target field, elv-progress on import) are
 *     most of this feature's UX. With instant mocks they never render and
 *     never get tested.
 */

const AI_BASE = '*/api/cv';

/** Keeps loading states visible without making the app feel broken. */
const THINK_MS = 900;

// ── helpers ───────────────────────────────────────────────────────────
const STRONG_VERBS = ['Led', 'Shipped', 'Rebuilt', 'Owned', 'Scaled', 'Cut', 'Drove', 'Streamlined'];

function pick<T>(list: readonly T[], seed: number): T {
    return list[Math.abs(seed) % list.length];
}

/** Stable hash so the same input always picks the same verb. */
function seedOf(text: string): number {
    let h = 0;
    for (let i = 0; i < text.length; i++) {
        // Modulo rather than the usual `| 0` — the repo's lint bans bitwise,
        // and keeping the value bounded is all this needs.
        h = (h * 31 + text.charCodeAt(i)) % 2147483647;
    }
    return h;
}

function titleCase(value: string): string {
    return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const createCvHandlers: HttpHandler[] = [
    // ── Import ────────────────────────────────────────────────────────
    // Returns a partial draft plus the paths it is unsure about. Fields it
    // cannot read are simply absent — never invented, per the spec.
    http.post(`${AI_BASE}/import`, async ({ request }) => {
        await delay(1800);

        const form = await request.formData().catch(() => null);
        const file = form?.get('file');
        const fileName = file instanceof File ? file.name : 'cv.pdf';

        return HttpResponse.json({
            fileName,
            fieldsRecovered: 18,
            fieldsNeedingAttention: 4,
            // Low confidence: the extractor found something but would not bet
            // on it. The UI flags these with elv-field [uncertain].
            uncertainFields: ['identity.phone', 'identity.location', 'experience.0.startDate', 'identity.email'],
            draft: {
                identity: {
                    fullName: 'Jordan Avery',
                    targetJobTitle: 'Senior Product Designer',
                    email: 'jordan.avery@example.com',
                    phone: '+855 12 884 021',
                    location: 'Phnom Penh, Cambodia',
                    links: [{ id: 'lnk_import_1', label: 'Portfolio', url: 'jordanavery.design' }],
                    summary:
                        'Product designer with eight years across fintech and logistics, most recently leading the design system that unified four internal tools.',
                    photoDataUrl: null,
                    photoOriginalDataUrl: null,
                    photoTransformsUsed: 0,
                },
                experience: [
                    {
                        id: 'exp_import_1',
                        company: 'Northwind Logistics',
                        role: 'Senior Product Designer',
                        location: 'Phnom Penh',
                        startDate: '2021',
                        endDate: '',
                        current: true,
                        plainLanguage: '',
                        bullets: [
                            {
                                id: 'b_i1',
                                text: 'Led the redesign of the driver dispatch console used by 400 operators.',
                            },
                            { id: 'b_i2', text: 'Built the shared design system adopted by four product teams.' },
                        ],
                    },
                    {
                        id: 'exp_import_2',
                        company: 'Mekong Pay',
                        role: 'Product Designer',
                        location: 'Phnom Penh',
                        startDate: '2018',
                        endDate: '2021',
                        current: false,
                        plainLanguage: '',
                        bullets: [{ id: 'b_i3', text: 'Designed the merchant onboarding flow end to end.' }],
                    },
                ],
                education: [
                    {
                        id: 'edu_import_1',
                        institution: 'Royal University of Phnom Penh',
                        qualification: 'BA, Media & Communication',
                        location: 'Phnom Penh',
                        startDate: '2013',
                        endDate: '2017',
                        description: '',
                    },
                ],
                skills: [
                    { id: 'sk_i1', name: 'Figma', group: 'tools' },
                    { id: 'sk_i2', name: 'Design systems', group: 'technical' },
                    { id: 'sk_i3', name: 'User research', group: 'technical' },
                ],
                languages: [
                    { id: 'lang_i1', name: 'English', level: 'Fluent' },
                    { id: 'lang_i2', name: 'Khmer', level: 'Native' },
                ],
            },
        });
    }),

    // ── Summary ───────────────────────────────────────────────────────
    http.post(`${AI_BASE}/ai/summary`, async ({ request }) => {
        await delay(THINK_MS);
        const body = (await request.json()) as {
            mode: string;
            targetJobTitle?: string;
            currentSummary?: string;
            experience?: { role: string; company: string }[];
        };

        const role = body.targetJobTitle?.trim() || 'professional';
        const current = body.currentSummary?.trim() ?? '';
        const top = body.experience?.[0];
        const where = top?.company ? ` at ${top.company}` : '';

        let text: string;
        switch (body.mode) {
            case 'shorten':
                text = current
                    ? `${current.split(/(?<=[.!?])\s+/)[0]}`
                    : `${titleCase(role)} focused on measurable outcomes.`;
                break;
            case 'grammar':
                // Visible-but-honest: tidy spacing and sentence case.
                text = current
                    ? current
                          .replace(/\s+/g, ' ')
                          .replace(/\s+([,.])/g, '$1')
                          .trim()
                    : '';
                break;
            case 'rewrite':
                text = `${titleCase(role)} who turns messy problems into shipped work. Eight years of hands-on delivery${where}, with a track record of measurable improvement rather than redesign for its own sake.`;
                break;
            default:
                text = `${titleCase(role)} with a record of shipping work that moves numbers, not just mockups. Comfortable owning a problem end to end${where} and equally comfortable handing it over well documented.`;
        }

        return HttpResponse.json({ text });
    }),

    // ── Bullets from plain language ───────────────────────────────────
    http.post(`${AI_BASE}/ai/bullets`, async ({ request }) => {
        await delay(THINK_MS + 300);
        const body = (await request.json()) as { plainLanguage?: string; role?: string; targetJobTitle?: string };

        const said = body.plainLanguage?.trim() || 'the work';
        const subject = said.replace(/^i\s+/i, '').replace(/[.]$/, '');
        const seed = seedOf(said);

        return HttpResponse.json({
            bullets: [
                `${pick(STRONG_VERBS, seed)} ${subject}, handling the full cycle from intake to resolution.`,
                `${pick(STRONG_VERBS, seed + 1)} the day-to-day process behind it, cutting average turnaround by roughly a third.`,
                `${pick(STRONG_VERBS, seed + 2)} onboarding for new team members, shortening ramp-up from weeks to days.`,
                `Worked directly with ${body.role?.trim() || 'stakeholders'} to keep priorities honest and deadlines realistic.`,
            ],
        });
    }),

    // ── Single bullet rework ──────────────────────────────────────────
    http.post(`${AI_BASE}/ai/bullet`, async ({ request }) => {
        await delay(THINK_MS);
        const body = (await request.json()) as { mode: string; text?: string };
        const original = body.text?.trim() || 'Handled day-to-day responsibilities.';
        const seed = seedOf(original);
        const stripped = original.replace(/^[A-Z][a-z]+\s/, '').replace(/[.]$/, '');

        let text: string;
        switch (body.mode) {
            case 'metric':
                text = `${original.replace(/[.]$/, '')}, cutting handling time by 32% across the first two quarters.`;
                break;
            case 'verb':
                text = `${pick(STRONG_VERBS, seed)} ${stripped}.`;
                break;
            default:
                text = `${pick(STRONG_VERBS, seed + 3)} ${stripped}, with the outcome measured rather than assumed.`;
        }

        return HttpResponse.json({ text });
    }),

    // ── Skills scan ───────────────────────────────────────────────────
    // Reads the bullets it is given, so an empty CV honestly returns little.
    http.post(`${AI_BASE}/ai/skills-scan`, async ({ request }) => {
        await delay(THINK_MS + 500);
        const body = (await request.json()) as { bullets?: string[]; targetJobTitle?: string };
        const text = (body.bullets ?? []).join(' ').toLowerCase();
        const role = (body.targetJobTitle ?? '').toLowerCase();

        const found: { name: string; group: string }[] = [];
        const add = (name: string, group: string) => {
            if (!found.some((s) => s.name === name)) {
                found.push({ name, group });
            }
        };

        // Evidence-driven: each rule needs a hit in the user's own words.
        if (/design system|component|token/.test(text)) {
            add('Design systems', 'technical');
        }
        if (/research|interview|usability/.test(text)) {
            add('User research', 'technical');
        }
        if (/figma|sketch/.test(text)) {
            add('Figma', 'tools');
        }
        if (/led|lead|mentor|manage/.test(text)) {
            add('Team leadership', 'soft');
        }
        if (/onboard|document|handover/.test(text)) {
            add('Documentation', 'soft');
        }
        if (/api|endpoint|backend|typescript|angular|react/.test(text)) {
            add('TypeScript', 'technical');
        }
        if (/sql|query|database/.test(text)) {
            add('SQL', 'technical');
        }
        if (/support|customer|client/.test(text)) {
            add('Stakeholder management', 'soft');
        }
        if (/process|turnaround|efficien/.test(text)) {
            add('Process improvement', 'soft');
        }

        // A couple of role-shaped suggestions so the button is never a dead end.
        if (/design/.test(role)) {
            add('Prototyping', 'technical');
            add('Accessibility', 'technical');
        }
        if (/develop|engineer/.test(role)) {
            add('Git', 'tools');
            add('Code review', 'soft');
        }
        if (!found.length) {
            add('Communication', 'soft');
            add('Problem solving', 'soft');
        }

        return HttpResponse.json({ skills: found.slice(0, 10) });
    }),

    // ── Boost suggestions ─────────────────────────────────────────────
    http.post(`${AI_BASE}/ai/boost-suggestions`, async ({ request }) => {
        await delay(700);
        const body = (await request.json()) as { targetJobTitle?: string };
        const role = (body.targetJobTitle ?? '').toLowerCase();

        const sections: string[] = [];
        if (/design|develop|engineer|data/.test(role)) {
            sections.push('projects');
        }
        if (/senior|lead|head|manager/.test(role)) {
            sections.push('awards');
        }
        if (/nurse|teacher|social|care|volunteer/.test(role)) {
            sections.push('volunteer');
        }
        if (!sections.length) {
            sections.push('projects', 'interests');
        }

        return HttpResponse.json({ sections });
    }),

    // ── Photo transform ───────────────────────────────────────────────
    // Echoes the upload back: a mock cannot actually relight a face, and
    // returning a stock portrait would make the before/after a lie.
    http.post(`${AI_BASE}/photo/transform`, async ({ request }) => {
        await delay(2400);
        const body = (await request.json()) as { dataUrl?: string };
        return HttpResponse.json({ dataUrl: body.dataUrl ?? '' });
    }),

    // ── ATS scan ──────────────────────────────────────────────────────
    // Scored from the real draft, so an empty CV scores badly — which is the
    // whole point of having the check.
    http.post(`${AI_BASE}/ats/scan`, async ({ request }) => {
        await delay(1500);
        const { draft } = (await request.json()) as { draft: any };

        const id = draft?.identity ?? {};
        const experience: any[] = draft?.experience ?? [];
        const skills: any[] = draft?.skills ?? [];

        const contact = [id.fullName, id.email, id.phone, id.targetJobTitle].filter(Boolean).length;
        const contactScore = Math.round((contact / 4) * 100);

        const bulletCount = experience.reduce(
            (n, e) => n + (e.bullets?.filter((b: any) => b.text?.trim()).length ?? 0),
            0
        );
        const experienceScore = Math.min(100, bulletCount * 18);

        const quantified = experience
            .flatMap((e) => e.bullets ?? [])
            .filter((b: any) => /\d/.test(b.text ?? '')).length;
        const impactScore = Math.min(100, quantified * 30);

        const keywordScore = Math.min(100, skills.length * 14);
        const summaryScore = Math.min(100, Math.round(((id.summary ?? '').trim().length / 220) * 100));

        const categories = [
            { label: 'Contact', score: contactScore },
            { label: 'Experience', score: experienceScore },
            { label: 'Keywords', score: keywordScore },
            { label: 'Impact', score: impactScore },
            { label: 'Summary', score: summaryScore },
        ];

        const score = Math.round(categories.reduce((t, c) => t + c.score, 0) / categories.length);

        const missing: string[] = [];
        if (keywordScore < 60) {
            missing.push('More role-specific skills');
        }
        if (impactScore < 60) {
            missing.push('Numbers in your bullets');
        }
        if (summaryScore < 60) {
            missing.push('A fuller summary');
        }

        const notes: string[] = [];
        if (!id.targetJobTitle) {
            notes.push('No target job title — the scan has nothing to match against.');
        }
        if (bulletCount < 4) {
            notes.push('Most CVs that pass have at least four strong bullets.');
        }
        if (quantified === 0) {
            notes.push('Not one bullet contains a number. That is the fastest single fix.');
        }

        return HttpResponse.json({ score, categories, missingKeywords: missing, notes });
    }),

    // ── Cover letter ──────────────────────────────────────────────────
    http.post(`${AI_BASE}/ai/cover-letter`, async ({ request }) => {
        await delay(1600);
        const body = (await request.json()) as { targetJobTitle?: string; fullName?: string; summary?: string };
        const role = body.targetJobTitle?.trim() || 'the role';
        const name = body.fullName?.trim() || 'Your name';

        return HttpResponse.json({
            text: [
                `Dear Hiring Team,`,
                ``,
                `I am writing about ${role}. ${body.summary?.trim() || 'I have spent the last several years doing this work hands-on.'}`,
                ``,
                `What I would bring is less about titles and more about throughput: I take unclear problems, make them concrete, and ship something measurable. I am happy to walk through a specific example at whatever depth is useful.`,
                ``,
                `Thank you for your time.`,
                ``,
                name,
            ].join('\n'),
        });
    }),

    // ── Templates ─────────────────────────────────────────────────────
    http.get(`${AI_BASE}/templates`, async () => {
        await delay(250);
        return HttpResponse.json({
            templates: [
                {
                    id: 'shaft',
                    name: 'Shaft',
                    accent: '#7CFFB2',
                    description: 'Single column, heavy structure. The default.',
                },
                {
                    id: 'atrium',
                    name: 'Atrium',
                    accent: '#7AD7FF',
                    description: 'Two columns with a sidebar for skills.',
                },
                { id: 'lobby', name: 'Lobby', accent: '#FFD35B', description: 'Warm, classic, recruiter-safe.' },
                {
                    id: 'penthouse',
                    name: 'Penthouse',
                    accent: '#C8A0FF',
                    description: 'Editorial, generous whitespace.',
                },
                {
                    id: 'service',
                    name: 'Service',
                    accent: '#FF9E7A',
                    description: 'Dense. Fits a long career on one page.',
                },
                {
                    id: 'mezzanine',
                    name: 'Mezzanine',
                    accent: '#9CFFE8',
                    description: 'Timeline-led, good for career changers.',
                },
            ],
        });
    }),
];
