import { HttpResponse, http } from 'msw';

import type { AtsIssueDto, AtsResultDto } from '@app/cv/api/cv-api.contracts';

import { mockDb } from '../db';
import { mockScenario } from '../scenarios';
import { MOCK_LATENCY, notFound, nowIso, pause, serverError } from '../utils';

/**
 * ATS check.
 *
 * The score is scenario-driven, but the ISSUES are derived from the CV the
 * request names — an empty summary really does produce "your summary is empty".
 * A check that ignored the document would train everyone to ignore the check.
 */
export const atsHandlers = [
    http.post('*/api/cvs/:cvId/ats-check', async ({ params }) => {
        await pause(MOCK_LATENCY.ats);

        if (mockScenario.ats === 'error') {
            return serverError('The ATS service is not responding.');
        }

        const cv = mockDb.findCv(String(params['cvId']));
        if (!cv) {
            return notFound('CV_NOT_FOUND', 'That CV no longer exists.');
        }

        const issues: AtsIssueDto[] = [];
        const { content } = cv;

        if (!content.personal.email.trim()) {
            issues.push({
                id: 'contact-email',
                severity: 'critical',
                message: 'No email address — most parsers reject a CV they cannot reply to.',
                sectionId: 'personal',
            });
        }
        if (content.summary.trim().length < 80) {
            issues.push({
                id: 'summary-thin',
                severity: 'warning',
                message: 'Your summary is short. Three or four lines gives the parser keywords to match.',
                sectionId: 'summary',
            });
        }
        if (content.experience.length === 0) {
            issues.push({
                id: 'no-experience',
                severity: 'critical',
                message: 'No work experience listed.',
                sectionId: 'experience',
            });
        }
        if (content.experience.some((role) => role.bullets.filter((line) => line.trim()).length === 0)) {
            issues.push({
                id: 'empty-bullets',
                severity: 'warning',
                message: 'A role has no bullet points. Add one outcome per role at minimum.',
                sectionId: 'experience',
            });
        }
        if (content.skills.length === 0) {
            issues.push({
                id: 'no-skills',
                severity: 'warning',
                message: 'No skills listed — this is the section keyword matching leans on hardest.',
                sectionId: 'skills',
            });
        }

        const checksTotal = 12;
        const base = mockScenario.ats === 'poor' ? 46 : mockScenario.ats === 'average' ? 74 : 98;
        const score = Math.max(10, base - issues.length * 6);

        const result: AtsResultDto = {
            score,
            checksTotal,
            checksPassed: Math.max(0, checksTotal - issues.length),
            issues,
            suggestions: [
                { id: 'verbs', message: 'Open each bullet with a verb and close it with a number.' },
                { id: 'keywords', message: 'Mirror the exact wording of the job ad in your skills section.' },
                { id: 'one-column', message: 'Keep a single column if the employer is a large enterprise.' },
            ],
            checkedAt: nowIso(),
        };

        return HttpResponse.json(result);
    }),
];
