import type { CvDocument } from '@app/cv/models/cv-document.model';
import { defaultCvDesign, defaultCvOptions } from '@app/cv/models/cv-design.model';
import { emptyCvContent } from '@app/cv/models/cv-content.model';

import { SEED_PROFILE_CONTENT } from './profile.fixture';

/**
 * Seed CV documents. Same rule as the profile fixture: data only, no behaviour.
 * Edit these to change what the workspace looks like on a fresh dev session.
 */
export function seedCvs(): CvDocument[] {
    return [
        {
            id: 'cv_seed_support',
            name: 'Application Support — Wing Bank',
            targetRole: 'Senior Application Support Engineer',
            source: 'profile',
            content: structuredClone(SEED_PROFILE_CONTENT),
            design: defaultCvDesign('modern'),
            options: defaultCvOptions(),
            createdAt: new Date('2026-08-02T10:00:00Z').toISOString(),
            updatedAt: new Date('2026-08-19T16:42:00Z').toISOString(),
        },
    ];
}

/** What `POST /api/cvs { source: 'scratch' }` produces — genuinely empty. */
export function blankCv(id: string, name: string): CvDocument {
    const now = new Date().toISOString();
    return {
        id,
        name,
        targetRole: null,
        source: 'scratch',
        content: emptyCvContent(),
        design: defaultCvDesign(),
        options: defaultCvOptions(),
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * What the import extractor "finds". Deliberately WORSE than the profile
 * fixture — missing an end date, a thin summary, no skills groups — because a
 * real extraction is lossy and the review step has to have something to catch.
 */
export function importedContent() {
    const content = structuredClone(SEED_PROFILE_CONTENT);
    content.summary = 'Application support engineer with four years of experience in payments.';
    content.skills = [{ id: 'skl_imported', name: 'Skills', skills: ['Linux', 'Docker', 'SQL', 'Grafana'] }];
    content.certifications = [];
    content.additional = [];
    content.experience = content.experience.map((role) => ({ ...role, location: '' }));
    return content;
}
