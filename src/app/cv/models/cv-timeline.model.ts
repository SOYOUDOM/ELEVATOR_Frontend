import type { CvDate, CvDateRange } from './cv-date';
import type { CvSectionId } from './cv-content.model';

/**
 * ELEVATOR — the Career Timeline's normalized record.
 *
 * The timeline does not know what an "experience" is. It is handed a flat list
 * of dated entries that each point back at a real record, which is what lets a
 * new dated section join later without a single new branch in the renderer.
 */
export type TimelineCategoryId = 'experience' | 'education' | 'projects';

export interface TimelineEntry {
    /** `${sectionId}:${recordId}` — stable, and unique across categories. */
    id: string;
    sectionId: CvSectionId;
    recordId: string;
    label: string;
    sublabel: string;
    range: CvDateRange;
    category: TimelineCategoryId;
}

export interface TimelineCategory {
    id: TimelineCategoryId;
    sectionId: CvSectionId;
    label: string;
    /** PrimeIcon name without the `pi ` prefix — matches every other elv-* component. */
    icon: string;
    entries: TimelineEntry[];
}

/** Inclusive month-index window the timeline draws. */
export interface TimelineDomain {
    startIndex: number;
    endIndex: number;
}

/** A laid-out bar: percentages of the track's width, ready for the template. */
export interface TimelineBar {
    entry: TimelineEntry;
    leftPct: number;
    widthPct: number;
    /** True when the entry has no usable dates and is parked at the track start. */
    undated: boolean;
}

export interface TimelineTick {
    label: string;
    leftPct: number;
    major: boolean;
}

export interface TimelineLayout {
    domain: TimelineDomain;
    rows: { category: TimelineCategory; bars: TimelineBar[] }[];
    ticks: TimelineTick[];
    /** Position of the TODAY marker, or null when today sits outside the domain. */
    todayPct: number | null;
    today: CvDate;
}
