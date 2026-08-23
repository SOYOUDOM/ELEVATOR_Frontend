import { type CvContent, cloneCvContent, emptyCvContent } from './cv-content.model';

/**
 * ELEVATOR — the reusable PROFESSIONAL PROFILE.
 *
 * The master copy of a person's career. A CV is made FROM it by snapshot, never
 * BY REFERENCE — see cvContentFromProfile(). Retitling a role on one CV must
 * not rewrite the profile, so the two never share an object.
 *
 * Writing back to the profile is always an explicit, user-initiated action
 * ("Save these changes to my profile"). Autosave never touches it.
 */
export interface ProfessionalProfile {
    id: string;
    /** Same shape as a CV's content — that is the point: one normalized model. */
    content: CvContent;
    updatedAt: string;
}

export function emptyProfessionalProfile(id: string): ProfessionalProfile {
    return { id, content: emptyCvContent(), updatedAt: new Date().toISOString() };
}

/**
 * Snapshot of the profile's content, safe to hand to a new CV. structuredClone
 * (inside cloneCvContent) is the guarantee — a shallow spread would still share
 * every experience record.
 */
export function cvContentFromProfile(profile: ProfessionalProfile): CvContent {
    return cloneCvContent(profile.content);
}
