import type { CvContent } from '@app/cv/models/cv-content.model';
import type { ProfessionalProfile } from '@app/cv/models/professional-profile.model';

/**
 * ELEVATOR — the seed professional profile.
 *
 * THIS FILE IS THE ONE TO EDIT when you want different development data.
 * Change `fullName` here and every screen that reads a profile follows; no
 * handler, store or component knows these strings exist.
 *
 * Handlers are behaviour. Fixtures are data. They never mix.
 */
export const SEED_PROFILE_CONTENT: CvContent = {
    personal: {
        fullName: 'Sok Dara',
        jobTitle: 'Application Support Engineer',
        email: 'dara@example.com',
        phone: '+855 12 345 678',
        location: 'Phnom Penh, Cambodia',
        website: 'github.com/sokdara',
        photoUrl: null,
    },
    summary:
        'Application support engineer in Phnom Penh, four years keeping payment systems upright. I own incidents from the first page to the write-up, and I would rather fix the runbook than answer the same ticket twice.',
    experience: [
        {
            id: 'exp_wing_bank',
            jobTitle: 'Application Support Engineer',
            company: 'Wing Bank',
            location: 'Phnom Penh',
            dates: { start: { year: 2023, month: 3 }, end: null, isPresent: true },
            bullets: [
                'Cut median ticket resolution from 9h to 5h by rewriting the triage flow and its runbook.',
                'Built a Grafana board that caught three payment outages before the first customer call.',
                'Ran the on-call rota for a team of six and wrote the postmortem template still in use.',
            ],
        },
        {
            id: 'exp_smart_axiata',
            jobTitle: 'IT Support Analyst',
            company: 'Smart Axiata',
            location: 'Phnom Penh',
            dates: { start: { year: 2021, month: 7 }, end: { year: 2022, month: 4 }, isPresent: false },
            bullets: [
                'First line for 400 staff across two offices; closed roughly 60 tickets a week.',
                'Automated laptop provisioning, taking new-starter setup from half a day to under an hour.',
            ],
        },
    ],
    education: [
        {
            id: 'edu_rupp',
            degree: 'BSc Computer Science',
            institution: 'Royal University of Phnom Penh',
            location: 'Phnom Penh',
            dates: { start: { year: 2017, month: 9 }, end: { year: 2021, month: 6 }, isPresent: false },
            note: 'Graduated with distinction.',
        },
    ],
    skills: [
        { id: 'skl_platform', name: 'Platform', skills: ['Linux', 'Docker', 'Nginx', 'PostgreSQL'] },
        { id: 'skl_observability', name: 'Observability', skills: ['Grafana', 'Prometheus', 'Elastic Stack'] },
        { id: 'skl_scripting', name: 'Scripting', skills: ['Bash', 'Python', 'SQL'] },
    ],
    projects: [
        {
            id: 'prj_triage',
            name: 'Triage',
            role: 'Sole developer',
            link: 'github.com/sokdara/triage',
            dates: { start: { year: 2024, month: 1 }, end: { year: 2024, month: 6 }, isPresent: false },
            description:
                'A queue router that reads incoming support mail and files it against the right service owner. Runs in production at two companies.',
        },
    ],
    certifications: [
        {
            id: 'crt_itil',
            name: 'ITIL 4 Foundation',
            issuer: 'PeopleCert',
            dates: { start: { year: 2022, month: 11 }, end: null, isPresent: false },
            credentialId: 'GR671142',
        },
    ],
    languages: [
        { id: 'lng_khmer', name: 'Khmer', level: 'Native' },
        { id: 'lng_english', name: 'English', level: 'Fluent' },
    ],
    additional: [
        { id: 'add_volunteering', label: 'Volunteering', value: 'Mentor, Phnom Penh Code Club (2022–present)' },
    ],
};

export function seedProfile(): ProfessionalProfile {
    return {
        id: 'profile_1',
        content: structuredClone(SEED_PROFILE_CONTENT),
        updatedAt: new Date('2026-07-14T09:20:00Z').toISOString(),
    };
}
