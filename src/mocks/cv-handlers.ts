import { HttpHandler, HttpResponse, delay, http } from 'msw';

import type {
    CvDraft,
    ExportResult,
    Finding,
    ParseResult,
    PhotoOps,
    PhotoRenderResult,
    SkillGroup,
    SkillSuggestion,
    SummaryTone,
    TailorResult,
} from '../app/create/cv.models';

/**
 * ELEVATOR — mocked CV endpoints.
 *
 * None of these exist on the ABP backend yet (swagger.json has only Account,
 * Role, Session, Tenant and User), so the whole create flow is served from
 * here while the contract is still being agreed. Every handler answers with
 * ABP's envelope, because AbpHttpInterceptor unwraps `result` before the
 * caller sees it — a bare payload would arrive as `undefined`.
 *
 * The logic below is deliberately real rather than canned: the read-back
 * actually inspects the draft, the tailor actually matches keywords, the
 * rewrite actually reshapes the sentence. That way the UI is exercised
 * against plausible variety instead of one fixed fixture, and the shape each
 * endpoint has to return is unambiguous when the backend picks this up.
 */

/** ABP's response envelope. */
const abp = <T>(result: T) =>
    HttpResponse.json({
        result,
        targetUrl: null,
        success: true,
        error: null,
        unAuthorizedRequest: false,
        __abp: true,
    });

/** Stands in for real latency so loading states are actually visible in dev. */
const LATENCY = { parse: 1400, ai: 700, photo: 1600, review: 500, export: 900 };

/* ════════════════════════════════════════════════════════════
   Shared vocabulary — the parser and the tailor read against the
   same bank, which is what makes the read-back honest: it is the
   same machine on both sides.
   ════════════════════════════════════════════════════════════ */
const BANK: { term: string; group: SkillGroup }[] = [
    { term: 'SQL', group: 'technical' },
    { term: 'Python', group: 'technical' },
    { term: 'TypeScript', group: 'technical' },
    { term: 'JavaScript', group: 'technical' },
    { term: 'Angular', group: 'technical' },
    { term: 'React', group: 'technical' },
    { term: 'Docker', group: 'technical' },
    { term: 'Kubernetes', group: 'technical' },
    { term: 'Linux', group: 'technical' },
    { term: 'AWS', group: 'technical' },
    { term: 'Azure', group: 'technical' },
    { term: 'REST APIs', group: 'technical' },
    { term: 'CI/CD', group: 'technical' },
    { term: 'Kafka', group: 'technical' },
    { term: 'Git', group: 'tools' },
    { term: 'Jira', group: 'tools' },
    { term: 'Grafana', group: 'tools' },
    { term: 'Postman', group: 'tools' },
    { term: 'Figma', group: 'tools' },
    { term: 'Excel', group: 'tools' },
    { term: 'incident response', group: 'soft' },
    { term: 'triage', group: 'soft' },
    { term: 'runbook', group: 'soft' },
    { term: 'on-call', group: 'soft' },
    { term: 'postmortem', group: 'soft' },
    { term: 'monitoring', group: 'soft' },
    { term: 'observability', group: 'soft' },
    { term: 'root cause analysis', group: 'soft' },
    { term: 'stakeholder communication', group: 'soft' },
    { term: 'technical writing', group: 'soft' },
    { term: 'mentoring', group: 'soft' },
    { term: 'automation', group: 'soft' },
];

const draftProse = (d: CvDraft): string =>
    [
        ...d.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
        ...d.projects.map((p) => `${p.name} ${p.desc}`),
    ]
        .join(' ')
        .toLowerCase();

const allSkills = (d: CvDraft): string[] => Object.values(d.skills).flat();

/* ════════════════════════════════════════════════════════════
   The sample CV the import path returns.
   ════════════════════════════════════════════════════════════ */
const PARSED_DRAFT = (): CvDraft => ({
    source: 'import',
    guessed: [],
    basic: {
        fullName: 'Sok Dara',
        jobTitle: 'Application Support Engineer',
        email: 'dara@example.com',
        phone: '+855 12 345 678',
        location: 'Phnom Penh, Cambodia',
        nationality: 'Cambodian',
        website: 'https://sokdara.dev',
        linkedin: 'linkedin.com/in/sokdara',
        github: 'github.com/sokdara',
    },
    photo: {
        src: '',
        renderedSrc: '',
        ops: { bg: true, light: true, crop: true, colour: false },
        renders: 0,
        include: true,
    },
    experience: [
        {
            title: 'Application Support Engineer',
            company: 'Wing Bank',
            location: 'Phnom Penh',
            period: 'Mar 2023 — Present',
            bullets: [
                'Cut median ticket resolution from 9h to 5h by rewriting the triage flow and its runbook.',
                'Built a Grafana board that caught three payment outages before the first customer call.',
                'Ran the on-call rota for a team of six and wrote the postmortem template still in use.',
            ],
        },
        {
            title: 'IT Support Analyst',
            company: 'Smart Axiata',
            location: 'Phnom Penh',
            period: 'Jul 2021 — Feb 2023',
            bullets: [
                'First line for 400 staff across two offices; closed roughly 60 tickets a week.',
                'Responsible for handling laptop provisioning for new starters.',
            ],
        },
    ],
    education: [
        {
            degree: 'BSc Computer Science',
            school: 'Royal University of Phnom Penh',
            period: '2017 — 2021',
            note: 'Graduated with distinction',
        },
    ],
    projects: [
        {
            name: 'Triage',
            role: 'Sole developer',
            link: 'github.com/sokdara/triage',
            period: '2024',
            desc: 'A queue router that reads incoming support mail and files it against the right service owner. Runs in production at two companies.',
        },
    ],
    skills: {
        technical: ['SQL', 'Python', 'REST APIs', 'Linux'],
        tools: ['Jira', 'Grafana', 'Git', 'Postman'],
        languages: ['Khmer — native', 'English — fluent'],
        soft: ['Incident triage', 'Technical writing'],
    },
    summary: { text: '', tone: 'confident' },
    template: { id: 'monolith', accent: '#ffd35b', region: 'KH' },
});

/* ════════════════════════════════════════════════════════════
   Handlers
   ════════════════════════════════════════════════════════════ */
export const cvHandlers: HttpHandler[] = [
    /* ── Import ───────────────────────────────────────────────
       A real parse is never clean: two-column PDFs interleave, dates
       arrive in a dozen formats. So the response carries the fields it
       was NOT sure about instead of pretending everything landed. */
    http.post('*/api/services/app/CvParse/Parse', async () => {
        await delay(LATENCY.parse);
        const draft = PARSED_DRAFT();
        const guessed = ['basic.phone', 'experience.1.period'];
        return abp<ParseResult>({ draft: { ...draft, guessed }, guessed });
    }),

    /* ── Bullet rewrite ───────────────────────────────────────
       THE contract rule: the model may not invent a figure. It is handed
       the outcome and rewrites around it, so nothing appears on the CV
       that the candidate cannot defend. A tool that fabricates metrics is
       a tool that gets people caught in interviews. */
    http.post('*/api/services/app/CvAi/RewriteBullet', async ({ request }) => {
        await delay(LATENCY.ai);
        const { original = '', outcome = '' } = (await request.json()) as {
            original: string;
            outcome: string;
        };

        const verb = /automat|script|provision/i.test(original)
            ? 'Automated'
            : /rebuil|rewr|creat|buil|design|migrat/i.test(original)
              ? 'Built'
              : /manage|led|ran|coordinat|own/i.test(original)
                ? 'Ran'
                : /fix|resolv|troubleshoot|support|handl/i.test(original)
                  ? 'Handled'
                  : 'Delivered';

        const what = original
            .replace(/^(responsible for|in charge of|helped with|worked on|tasked with)\s*/i, '')
            .replace(/^(handling|managing|doing)\s+/i, '')
            .replace(/\.$/, '')
            .trim();

        const body = what.charAt(0).toLowerCase() + what.slice(1);
        const o = outcome.trim().replace(/\.$/, '');
        const text = o ? `${verb} ${body}, ${o.charAt(0).toLowerCase()}${o.slice(1)}.` : `${verb} ${body}.`;

        return abp({ text });
    }),

    /* ── Summary ──────────────────────────────────────────────
       Assembled from floors already filled. Every clause traces to
       something the visitor entered; nothing is introduced. */
    http.post('*/api/services/app/CvAi/DraftSummary', async ({ request }) => {
        await delay(LATENCY.ai);
        const { draft, tone } = (await request.json()) as { draft: CvDraft; tone: SummaryTone };
        const b = draft.basic;
        const roles = draft.experience.length;
        const top = draft.skills.technical.slice(0, 3).join(', ');
        const current = draft.experience[0]?.company;

        const closer: Record<SummaryTone, string> = {
            concise: 'Looking for work where the systems matter and the feedback loop is short.',
            confident: 'Comfortable owning an incident from the first page to the write-up.',
            warm: 'Happiest when a fix also makes the next person’s job easier.',
        };

        const text = [
            `${b.jobTitle || 'Professional'}${b.location ? ` based in ${b.location}` : ''}` +
                `${roles ? ` with ${roles === 1 ? 'a track record' : `${roles} roles`} across support and delivery` : ''}.`,
            current ? `Currently at ${current}, where the work is measured in uptime rather than tickets closed.` : '',
            top ? `Day to day that means ${top}.` : '',
            closer[tone] ?? closer.confident,
        ]
            .filter(Boolean)
            .join(' ');

        return abp({ text });
    }),

    /* ── Skill suggestions ────────────────────────────────────
       Drawn from the visitor's OWN prose, not a generic popular list —
       and each one reports the phrase that implied it, so the suggestion
       can be judged rather than just accepted. */
    http.post('*/api/services/app/CvAi/SuggestSkills', async ({ request }) => {
        await delay(LATENCY.ai);
        const { draft } = (await request.json()) as { draft: CvDraft };
        const hay = draftProse(draft);
        const have = allSkills(draft).map((s) => s.toLowerCase());

        const out: SkillSuggestion[] = BANK.filter(
            ({ term }) => hay.includes(term.toLowerCase()) && !have.includes(term.toLowerCase())
        )
            .slice(0, 8)
            .map(({ term, group }) => {
                const sentence =
                    draft.experience
                        .flatMap((e) => e.bullets)
                        .concat(draft.projects.map((p) => p.desc))
                        .find((s) => s.toLowerCase().includes(term.toLowerCase())) ?? '';
                return { skill: term, group, seenIn: sentence.slice(0, 90) };
            });

        return abp(out);
    }),

    /* ── Title normalisation ──────────────────────────────────
       Recruiters search by title. This maps a written title onto the
       phrasings that get searched — it never adds seniority. */
    http.post('*/api/services/app/CvAi/NormaliseTitle', async ({ request }) => {
        await delay(LATENCY.ai);
        const { title = '' } = (await request.json()) as { title: string };
        const map: Record<string, string[]> = {
            'application support': [
                'Application Support Engineer',
                'Application Support Analyst',
                'Technical Support Engineer',
            ],
            support: ['Technical Support Engineer', 'IT Support Analyst', 'Customer Support Specialist'],
            developer: ['Software Developer', 'Software Engineer', 'Full-Stack Developer'],
            engineer: ['Software Engineer', 'Systems Engineer', 'Platform Engineer'],
            designer: ['Product Designer', 'UI/UX Designer', 'Visual Designer'],
            analyst: ['Business Analyst', 'Data Analyst', 'Systems Analyst'],
        };
        const t = title.trim().toLowerCase();
        const hit = Object.keys(map).find((k) => t.includes(k));
        const out = (hit ? map[hit] : []).filter((v) => v.toLowerCase() !== t).slice(0, 3);
        return abp(out);
    }),

    /* ── Portrait ─────────────────────────────────────────────
       Mocked: echoes the original back, so the UI wires up end to end
       without a GPU. Two constraints the real Qwen-Image-Edit call must
       keep, both visible in the UI:

         1. NAMED operations, never one magic "enhance". Narrow edits give
            better results and a visitor trusts what they can name.
         2. The edit touches background, lighting and framing — never the
            face. Identity-preserving models are documented to lighten skin
            and drift features toward a Western average; for a product built
            in Cambodia that is a launch blocker, and it needs a test set
            drawn from the real market before this ships. */
    http.post('*/api/services/app/CvPhoto/Enhance', async ({ request }) => {
        await delay(LATENCY.photo);
        const { image = '' } = (await request.json()) as { image: string; ops: PhotoOps };
        RENDERS += 1;
        return abp<PhotoRenderResult>({
            url: image, // the browser applies the simulated look; the server would return a new asset
            renders: RENDERS,
            cost: +(RENDERS * 0.02).toFixed(2),
        });
    }),

    /* ── Machine read-back ────────────────────────────────────
       The finished CV pushed back through the import parser. Every check
       below is one a real ATS would apply. */
    http.post('*/api/services/app/CvReview/ReadBack', async ({ request }) => {
        await delay(LATENCY.review);
        const { draft } = (await request.json()) as { draft: CvDraft };
        const out: Finding[] = [];
        const ok = (text: string) => out.push({ level: 'ok', text });
        const warn = (text: string) => out.push({ level: 'warn', text });
        const bad = (text: string) => out.push({ level: 'bad', text });
        const b = draft.basic;

        if (b.fullName) {
            ok(`Name read as “${b.fullName}”`);
        } else {
            bad('No name found in the header');
        }
        if (b.jobTitle) {
            ok(`Title read as “${b.jobTitle}”`);
        } else {
            warn('No title under the name — most parsers expect one');
        }
        if (b.email) {
            ok('Email found');
        } else {
            bad('No email — a CV with no email fails most filters');
        }

        if (draft.experience.length) {
            ok(`${draft.experience.length} role${draft.experience.length > 1 ? 's' : ''} parsed`);
            const undated = draft.experience.filter((e) => !/\d{4}/.test(e.period)).length;
            if (undated) {
                warn(`${undated} role${undated > 1 ? 's have' : ' has'} no year — use “Mar 2023 — Present”`);
            }
        } else {
            bad('No experience section detected');
        }

        const weak = draft.experience
            .flatMap((e) => e.bullets)
            .filter((x) => /^(responsible for|in charge of|helped with|worked on)/i.test(x.trim())).length;
        if (weak) {
            warn(`${weak} line${weak > 1 ? 's start' : ' starts'} with a duty, not a result — sharpen on Floor 03`);
        }

        if (draft.education.length) {
            ok('Education parsed');
        } else {
            warn('No education section detected');
        }

        const skills = allSkills(draft).length;
        if (skills) {
            ok(`${skills} skills lifted as keywords`);
        } else {
            warn('No skills section — keyword matching will score low');
        }

        if (draft.template.id === 'shaft') {
            warn('Sidebar layouts put skills in a second column — older parsers read them out of order');
        }
        if (draft.summary.text.trim().length < 40) {
            warn('Summary is short or missing — it is the first thing read');
        }

        const region = draft.template.region;
        const photoOn = draft.photo.include && !!(draft.photo.renderedSrc || draft.photo.src);
        if (photoOn && ['US', 'UK', 'AU'].includes(region)) {
            bad(`Photo included, but ${region} employers usually reject CVs with photos`);
        }

        return abp(out);
    }),

    /* ── Job-ad match ─────────────────────────────────────────
       Same bank as the parser, run over the posting. A term counts as
       matched if it is in the skills list OR anywhere in the prose, so
       evidence in a bullet is worth as much as a chip. */
    http.post('*/api/services/app/CvReview/Tailor', async ({ request }) => {
        await delay(LATENCY.review);
        const { draft, jobAd = '' } = (await request.json()) as { draft: CvDraft; jobAd: string };
        const ad = jobAd.toLowerCase();
        const wanted = BANK.map((x) => x.term).filter((t) => ad.includes(t.toLowerCase()));
        const have = allSkills(draft).map((s) => s.toLowerCase());
        const prose = draftProse(draft);
        const matched = wanted.filter((t) => have.includes(t.toLowerCase()) || prose.includes(t.toLowerCase()));
        const missing = wanted.filter((t) => !matched.includes(t));

        return abp<TailorResult>({
            wanted,
            matched,
            missing,
            score: wanted.length ? Math.round((matched.length / wanted.length) * 100) : 0,
        });
    }),

    /* ── Export ───────────────────────────────────────────────
       `withPhoto` is a parameter, not a draft field: the same CV goes to
       markets that expect a photo and markets that reject one, and both
       must be produced without editing anything. */
    http.post('*/api/services/app/CvExport/Create', async ({ request }) => {
        await delay(LATENCY.export);
        const {
            draft,
            format = 'pdf',
            withPhoto = true,
        } = (await request.json()) as {
            draft: CvDraft;
            format: string;
            withPhoto: boolean;
        };
        const lines =
            draft.experience.reduce((n, e) => n + 2 + e.bullets.filter((x) => x.trim()).length, 0) +
            draft.education.length * 2 +
            draft.projects.length * 3;
        return abp<ExportResult>({
            format,
            url: `blob:elevator-mock/${format}/${withPhoto ? 'with-photo' : 'no-photo'}`,
            pages: Math.max(1, Math.ceil(lines / 26)),
        });
    }),

    /* ── Persistence ──────────────────────────────────────────
       In-memory for now, so a save round-trips within a session and the
       UI can show a real "saved" state. */
    http.post('*/api/services/app/CvDraft/Save', async ({ request }) => {
        await delay(200);
        const { draft } = (await request.json()) as { draft: CvDraft };
        SAVED = draft;
        return abp({ id: 'draft-1', savedAt: new Date().toISOString() });
    }),

    http.get('*/api/services/app/CvDraft/Get', async () => {
        await delay(200);
        return abp(SAVED);
    }),
];

/* Session-scoped mock state. Resets on reload, which is the right lifetime
   for something standing in for a database. */
let RENDERS = 0;
let SAVED: CvDraft | null = null;
