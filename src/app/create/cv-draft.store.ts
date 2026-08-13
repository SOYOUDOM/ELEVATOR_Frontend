import { Injectable, computed, signal } from '@angular/core';

import {
    BasicInfo,
    CvDraft,
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    REQUIRED_BASIC,
    RegionCode,
    SkillGroup,
    SummaryTone,
    TemplateId,
    emptyDraft,
    emptyEducation,
    emptyExperience,
    emptyProject,
    regionOf,
} from './cv.models';

/**
 * ELEVATOR — the CV draft store.
 *
 * One signal holding one object, plus computed readouts. Under the app's
 * zoneless bootstrap that is the whole change-detection story: every write
 * below schedules its own update, so no component needs markForCheck and
 * OnPush costs nothing.
 *
 * Provided at the `create` route so the draft lives exactly as long as the
 * flow does — leaving the wizard drops it, which is the behaviour we want
 * until the backend can persist it (see CvApiService.saveDraft).
 *
 * Deliberately NOT a Reactive Form. Every floor writes into the same nine-ish
 * shapes; a FormGroup layered on top would mean two sources of truth for the
 * same strings and a sync problem at every step boundary.
 */
@Injectable()
export class CvDraftStore {
    /* eslint-disable @typescript-eslint/member-ordering --
       The private field below is read DURING the initialisation of the public
       members that follow it, so it genuinely has to be declared first. The
       ordering rule cannot express that dependency, and re-enabling it after
       the field does not help: the rule reports on the PUBLIC members, not on
       the private one. Scoped to this class only. */
    private readonly _draft = signal<CvDraft>(emptyDraft());
    readonly draft = this._draft.asReadonly();

    /* ── Slices ───────────────────────────────────────────────── */
    readonly basic = computed(() => this._draft().basic);
    readonly photo = computed(() => this._draft().photo);
    readonly experience = computed(() => this._draft().experience);
    readonly education = computed(() => this._draft().education);
    readonly projects = computed(() => this._draft().projects);
    readonly skills = computed(() => this._draft().skills);
    readonly summary = computed(() => this._draft().summary);
    readonly template = computed(() => this._draft().template);
    readonly source = computed(() => this._draft().source);
    readonly guessed = computed(() => this._draft().guessed);

    readonly region = computed(() => regionOf(this._draft().template.region));

    /* ── Derived state ────────────────────────────────────────── */
    readonly skillCount = computed(() => Object.values(this._draft().skills).reduce((n, list) => n + list.length, 0));

    readonly basicFilled = computed(() => Object.values(this._draft().basic).filter((v) => v.trim()).length);

    readonly missingRequired = computed(() => {
        const b = this._draft().basic;
        return REQUIRED_BASIC.filter((k) => !b[k].trim());
    });

    /**
     * Whether a photo will actually be printed. The region only sets the
     * DEFAULT for `include` — overriding it is the visitor's call, and the
     * review floor warns rather than silently dropping the photo.
     */
    readonly photoOnCv = computed(() => {
        const p = this._draft().photo;
        return p.include && !!(p.renderedSrc || p.src);
    });

    /** Shipping a photo into a market that rejects them. */
    readonly photoRisk = computed(() => this.photoOnCv() && !this.region().photo);

    /** What the sheet should actually draw. */
    readonly photoSrc = computed(() => {
        const p = this._draft().photo;
        return p.renderedSrc || p.src;
    });

    /** Per-floor completion. Keyed by route path so the shaft can read it directly. */
    readonly done = computed<Record<string, boolean>>(() => {
        const d = this._draft();
        return {
            lobby: !!d.source,
            'basic-info': REQUIRED_BASIC.every((k) => d.basic[k].trim().length > 0),
            portrait: !!d.photo.src,
            experience: d.experience.some((e) => e.title.trim() && e.company.trim()),
            education: d.education.some((e) => e.degree.trim() && e.school.trim()),
            skills: this.skillCount() >= 4,
            projects: d.projects.some((p) => p.name.trim()),
            summary: d.summary.text.trim().length >= 40,
            template: true,
            review: false,
        };
    });

    /* ── Writes ───────────────────────────────────────────────── */

    /** Every mutation funnels through here so `guessed` clearing is never missed. */

    setSource(source: 'import' | 'scratch'): void {
        this.patch((d) => ({ ...d, source }));
    }

    /** Replaces the whole draft — used by the import path. */
    load(draft: CvDraft): void {
        this._draft.set(draft);
    }

    reset(): void {
        this._draft.set(emptyDraft());
    }

    setBasic<K extends keyof BasicInfo>(key: K, value: string): void {
        this.patch((d) => ({
            ...d,
            basic: { ...d.basic, [key]: value },
            guessed: this.vouch(d, `basic.${key}`),
        }));
    }

    /* experience ------------------------------------------------ */
    addExperience(): void {
        this.patch((d) => ({ ...d, experience: [...d.experience, emptyExperience()] }));
    }
    removeExperience(i: number): void {
        this.patch((d) => ({ ...d, experience: d.experience.filter((_, n) => n !== i) }));
    }
    setExperience<K extends keyof ExperienceEntry>(i: number, key: K, value: ExperienceEntry[K]): void {
        this.patch((d) => ({
            ...d,
            experience: d.experience.map((e, n) => (n === i ? { ...e, [key]: value } : e)),
            guessed: this.vouch(d, `experience.${i}.${String(key)}`),
        }));
    }
    addBullet(i: number): void {
        this.patch((d) => ({
            ...d,
            experience: d.experience.map((e, n) => (n === i ? { ...e, bullets: [...e.bullets, ''] } : e)),
        }));
    }
    removeBullet(i: number, j: number): void {
        this.patch((d) => ({
            ...d,
            experience: d.experience.map((e, n) =>
                n === i ? { ...e, bullets: e.bullets.filter((_, m) => m !== j) } : e
            ),
        }));
    }
    setBullet(i: number, j: number, value: string): void {
        this.patch((d) => ({
            ...d,
            experience: d.experience.map((e, n) =>
                n === i ? { ...e, bullets: e.bullets.map((b, m) => (m === j ? value : b)) } : e
            ),
        }));
    }

    /* education ------------------------------------------------- */
    addEducation(): void {
        this.patch((d) => ({ ...d, education: [...d.education, emptyEducation()] }));
    }
    removeEducation(i: number): void {
        this.patch((d) => ({ ...d, education: d.education.filter((_, n) => n !== i) }));
    }
    setEducation<K extends keyof EducationEntry>(i: number, key: K, value: string): void {
        this.patch((d) => ({
            ...d,
            education: d.education.map((e, n) => (n === i ? { ...e, [key]: value } : e)),
            guessed: this.vouch(d, `education.${i}.${String(key)}`),
        }));
    }

    /* projects -------------------------------------------------- */
    addProject(): void {
        this.patch((d) => ({ ...d, projects: [...d.projects, emptyProject()] }));
    }
    removeProject(i: number): void {
        this.patch((d) => ({ ...d, projects: d.projects.filter((_, n) => n !== i) }));
    }
    setProject<K extends keyof ProjectEntry>(i: number, key: K, value: string): void {
        this.patch((d) => ({
            ...d,
            projects: d.projects.map((p, n) => (n === i ? { ...p, [key]: value } : p)),
        }));
    }

    /* skills ---------------------------------------------------- */
    addSkill(group: SkillGroup, skill: string): void {
        const value = skill.trim();
        if (!value) {
            return;
        }
        this.patch((d) =>
            d.skills[group].includes(value)
                ? d
                : { ...d, skills: { ...d.skills, [group]: [...d.skills[group], value] } }
        );
    }
    removeSkill(group: SkillGroup, i: number): void {
        this.patch((d) => ({
            ...d,
            skills: { ...d.skills, [group]: d.skills[group].filter((_, n) => n !== i) },
        }));
    }

    /* summary / template ---------------------------------------- */
    setSummary(text: string): void {
        this.patch((d) => ({ ...d, summary: { ...d.summary, text } }));
    }
    setTone(tone: SummaryTone): void {
        this.patch((d) => ({ ...d, summary: { ...d.summary, tone } }));
    }
    setTemplate(id: TemplateId): void {
        this.patch((d) => ({ ...d, template: { ...d.template, id } }));
    }
    setAccent(accent: string): void {
        this.patch((d) => ({ ...d, template: { ...d.template, accent } }));
    }
    /** Changing region re-defaults the photo toggle; the portrait floor can override. */
    setRegion(region: RegionCode): void {
        this.patch((d) => ({
            ...d,
            template: { ...d.template, region },
            photo: { ...d.photo, include: regionOf(region).photo },
        }));
    }

    /* photo ----------------------------------------------------- */
    setPhotoSrc(src: string): void {
        this.patch((d) => ({ ...d, photo: { ...d.photo, src, renderedSrc: '' } }));
    }
    clearPhoto(): void {
        this.patch((d) => ({ ...d, photo: { ...d.photo, src: '', renderedSrc: '' } }));
    }
    toggleOp(op: keyof CvDraft['photo']['ops']): void {
        this.patch((d) => ({
            ...d,
            // A changed operation invalidates the render — the shown result must
            // never disagree with the boxes that are ticked.
            photo: { ...d.photo, ops: { ...d.photo.ops, [op]: !d.photo.ops[op] }, renderedSrc: '' },
        }));
    }
    togglePhotoInclude(): void {
        this.patch((d) => ({ ...d, photo: { ...d.photo, include: !d.photo.include } }));
    }
    applyRender(url: string, renders: number): void {
        this.patch((d) => ({ ...d, photo: { ...d.photo, renderedSrc: url, renders } }));
    }

    /* ── Internals ────────────────────────────────────────────
       Below the public writers: the lint config orders private
       members last. ─────────────────────────────────────────── */

    /** Every mutation funnels through here so `guessed` clearing is never missed. */
    private patch(fn: (d: CvDraft) => CvDraft): void {
        this._draft.update(fn);
    }

    /** Touching a guessed field is the visitor vouching for it. */
    private vouch(d: CvDraft, path: string): string[] {
        return d.guessed.includes(path) ? d.guessed.filter((g) => g !== path) : d.guessed;
    }
}
