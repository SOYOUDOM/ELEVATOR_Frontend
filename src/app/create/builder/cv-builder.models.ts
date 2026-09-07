/**
 * ELEVATOR — the document model
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sections are an ORDERED, reorderable list rather than a fixed sequence of
 * steps. That is the structural claim of this tool: a CV has no correct order
 * of authoring, only a correct order of reading, and this is the latter.
 *
 * Nothing here touches the DOM. Everything is a plain object, which is what
 * makes undo a one-line snapshot and the checks testable without a browser.
 */

export type SectionType = 'summary' | 'experience' | 'education' | 'projects' | 'skills';

export interface SummaryItem { text: string }
export interface ExperienceItem {
  role: string; org: string; place: string;
  from: string; to: string; current: boolean;
  bullets: string[];
}
export interface EducationItem { award: string; org: string; from: string; to: string; note: string }
export interface ProjectItem { name: string; role: string; link: string; from: string; to: string; desc: string }
export interface SkillGroup { group: string; list: string[] }

export type SectionItem = SummaryItem | ExperienceItem | EducationItem | ProjectItem | SkillGroup;

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  items: SectionItem[];
}

export interface ProfileLink { label: string; url: string }

export interface Profile {
  name: string; role: string; email: string; phone: string;
  location: string; photo: string; links: ProfileLink[];
}

export type LayoutName = 'classic' | 'rule' | 'quiet' | 'centred' | 'split';
export type MarginName = 'tight' | 'normal' | 'roomy';

export interface Design {
  layout: LayoutName;
  /**
   * The document's typeface, as a CSS family stack — not an enum. A CV set
   * in Garamond because that is what the writer has is a legitimate CV, and
   * "serif | sans" could not express it. Stored as the stack so the page,
   * the ruler and the print path all read the same string.
   */
  font: string;
  /** True when `font` names a face only this machine has. Drives the warning. */
  fontIsLocal?: boolean;
  /**
   * The document's accent. Deliberately NOT a theme token: this one is the
   * candidate's choice about their own CV, and it has to survive the reader
   * opening it in a different theme — or in print, where there is no theme
   * at all. Every other colour in the product comes from `--p-elevator-*`.
   */
  accent: string;
  size: number;      // px, the document's base
  leading: number;
  gap: number;       // px between sections
  margin: MarginName;
  photo: boolean;
}

export interface CvDoc {
  title: string;
  profile: Profile;
  sections: Section[];
  design: Design;
}

export const SECTION_KINDS: Record<SectionType, { label: string; tag: string; single: boolean }> = {
  summary: { label: 'Summary', tag: 'SUMMARY', single: true },
  experience: { label: 'Experience', tag: 'ROLE', single: false },
  education: { label: 'Education', tag: 'STUDY', single: false },
  projects: { label: 'Projects', tag: 'PROJECT', single: false },
  skills: { label: 'Skills', tag: 'SKILLS', single: false },
};

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export function newItem(type: SectionType): SectionItem {
  switch (type) {
    case 'summary': return { text: '' } as SummaryItem;
    case 'experience': return { role: '', org: '', place: '', from: '', to: '', current: true, bullets: [''] } as ExperienceItem;
    case 'education': return { award: '', org: '', from: '', to: '', note: '' } as EducationItem;
    case 'projects': return { name: '', role: '', link: '', from: '', to: '', desc: '' } as ProjectItem;
    case 'skills': return { group: 'Technical', list: [] } as SkillGroup;
  }
}

export function newSection(type: SectionType): Section {
  return { id: uid(), type, title: SECTION_KINDS[type].label, visible: true, items: [newItem(type)] };
}

export function blankDoc(): CvDoc {
  return {
    title: 'Untitled CV',
    profile: {
      name: '', role: '', email: '', phone: '', location: '', photo: '',
      links: [{ label: 'Portfolio', url: '' }],
    },
    sections: [
      { id: uid(), type: 'summary', title: 'Summary', visible: true, items: [newItem('summary')] },
      { id: uid(), type: 'experience', title: 'Experience', visible: true, items: [] },
      { id: uid(), type: 'projects', title: 'Projects', visible: true, items: [] },
      { id: uid(), type: 'education', title: 'Education', visible: true, items: [] },
      { id: uid(), type: 'skills', title: 'Skills', visible: true, items: [] },
    ],
    design: {
      layout: 'classic',
      font: 'var(--p-elevator-font-serif)',
      accent: '#0089b8',
      size: 10.2,
      leading: 1.42,
      gap: 17,
      margin: 'normal',
      photo: false,
    },
  };
}

/**
 * The sample. Real prose, deliberately imperfect: one bullet opens with
 * "Responsible for", one role has no end date, and there is a genuine
 * eleven-month gap. Every check in this tool has something to find, which is
 * the only honest way to demonstrate that the checks work.
 */
export function sampleDoc(): CvDoc {
  const d = blankDoc();
  d.title = 'Sok Dara — Support Engineer';
  d.profile = {
    name: 'Sok Dara',
    role: 'Application Support Engineer',
    email: 'dara@example.com',
    phone: '+855 12 345 678',
    location: 'Phnom Penh, Cambodia',
    photo: '',
    links: [
      { label: 'Site', url: 'sokdara.dev' },
      { label: 'GitHub', url: 'github.com/sokdara' },
    ],
  };
  const [sum, exp, proj, edu, skl] = d.sections;

  sum.items = [{
    text: 'Application support engineer in Phnom Penh, four years keeping payment systems upright. '
      + 'I own incidents from the first page to the write-up, and I would rather fix the runbook '
      + 'than answer the same ticket twice.',
  } as SummaryItem];

  exp.items = [
    {
      role: 'Application Support Engineer', org: 'Wing Bank', place: 'Phnom Penh',
      from: '2023-03', to: '', current: true,
      bullets: [
        'Cut median ticket resolution from 9h to 5h by rewriting the triage flow and its runbook.',
        'Built a Grafana board that caught three payment outages before the first customer call.',
        'Ran the on-call rota for a team of six and wrote the postmortem template still in use.',
      ],
    } as ExperienceItem,
    {
      role: 'IT Support Analyst', org: 'Smart Axiata', place: 'Phnom Penh',
      from: '2021-07', to: '2022-04', current: false,
      bullets: [
        'First line for 400 staff across two offices; closed roughly 60 tickets a week.',
        'Responsible for handling laptop provisioning for new starters.',
      ],
    } as ExperienceItem,
  ];

  proj.items = [{
    name: 'Triage', role: 'Sole developer', link: 'github.com/sokdara/triage',
    from: '2024-01', to: '2024-06',
    desc: 'A queue router that reads incoming support mail and files it against the right service '
      + 'owner. Runs in production at two companies.',
  } as ProjectItem];

  edu.items = [{
    award: 'BSc Computer Science', org: 'Royal University of Phnom Penh',
    from: '2017-09', to: '2021-06', note: 'Graduated with distinction',
  } as EducationItem];

  skl.items = [
    { group: 'Technical', list: ['SQL', 'Python', 'REST APIs', 'Linux'] } as SkillGroup,
    { group: 'Tools', list: ['Jira', 'Grafana', 'Git', 'Postman'] } as SkillGroup,
    { group: 'Languages', list: ['Khmer — native', 'English — fluent'] } as SkillGroup,
  ];
  return d;
}

/** Whether an item has enough in it to be printed rather than ghosted. */
export function itemHasContent(type: SectionType, it: SectionItem): boolean {
  switch (type) {
    case 'summary': return !!String((it as SummaryItem).text || '').trim();
    case 'experience': return !!((it as ExperienceItem).role || (it as ExperienceItem).org);
    case 'education': return !!((it as EducationItem).award || (it as EducationItem).org);
    case 'projects': return !!(it as ProjectItem).name;
    case 'skills': return !!((it as SkillGroup).list && (it as SkillGroup).list.length);
    default: return false;
  }
}

export function itemLabel(type: SectionType, it: SectionItem): string {
  switch (type) {
    case 'summary': return 'Summary';
    case 'experience': return (it as ExperienceItem).role || (it as ExperienceItem).org || '';
    case 'education': return (it as EducationItem).award || (it as EducationItem).org || '';
    case 'projects': return (it as ProjectItem).name || '';
    case 'skills': return (it as SkillGroup).group || '';
    default: return '';
  }
}
