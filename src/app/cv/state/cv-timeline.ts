import {
    type CvDate,
    type CvDateRange,
    formatCvDate,
    fromMonthIndex,
    monthIndex,
    rangeEndFor,
    todayCvDate,
} from '../models/cv-date';
import type { CvContent, CvRecord } from '../models/cv-content.model';
import type {
    TimelineBar,
    TimelineCategory,
    TimelineDomain,
    TimelineEntry,
    TimelineLayout,
    TimelineTick,
} from '../models/cv-timeline.model';
import { CV_SECTIONS, type CvListSection, isListSection } from '../schema/cv-section-schema';

/**
 * ELEVATOR — Career Timeline geometry.
 *
 * Pure functions, no Angular. Two reasons that matters: the layout is computed
 * once per content change in a computed signal instead of being recalculated
 * for every bar on every change-detection pass, and the coordinate maths is
 * testable without a DOM.
 *
 * The coordinate system is a month index (see cv-date.ts) mapped to a
 * percentage of the track. monthAtFraction() is the exact inverse of
 * fractionForMonth(), which is the hook drag-to-edit will need later — a
 * pointer x becomes a fraction becomes a month, with no new geometry to invent.
 */

/** Months of breathing room drawn on each side of the real data. */
const DOMAIN_PADDING_MONTHS = 6;
/** A one-month bar would be invisible; never draw one thinner than this. */
const MIN_BAR_WIDTH_PCT = 1.6;

export function buildTimelineEntries(content: CvContent): TimelineEntry[] {
    const entries: TimelineEntry[] = [];

    for (const spec of CV_SECTIONS) {
        if (!isListSection(spec) || !spec.timeline) {
            continue;
        }
        const listSpec = spec as CvListSection<CvRecord>;
        const timeline = listSpec.timeline;
        if (!timeline) {
            continue;
        }

        for (const record of listSpec.read(content)) {
            entries.push({
                id: `${listSpec.id}:${record.id}`,
                sectionId: listSpec.id,
                recordId: record.id,
                label: listSpec.titleOf(record),
                sublabel: listSpec.subtitleOf(record),
                range: timeline.rangeOf(record),
                category: timeline.category,
            });
        }
    }

    return entries;
}

export function buildTimelineCategories(content: CvContent): TimelineCategory[] {
    const categories: TimelineCategory[] = [];
    const entries = buildTimelineEntries(content);

    for (const spec of CV_SECTIONS) {
        if (!isListSection(spec) || !spec.timeline) {
            continue;
        }
        const timeline = spec.timeline;
        categories.push({
            id: timeline.category,
            sectionId: spec.id,
            label: timeline.label,
            icon: timeline.icon,
            entries: entries.filter((entry) => entry.category === timeline.category),
        });
    }

    return categories;
}

/**
 * The window the timeline draws. Derived entirely from the data — the only
 * hardcoded date in the whole feature is "now", and that is the TODAY marker.
 */
export function timelineDomain(entries: TimelineEntry[], today: CvDate = todayCvDate()): TimelineDomain {
    const points: number[] = [];

    for (const entry of entries) {
        if (entry.range.start) {
            points.push(monthIndex(entry.range.start));
        }
        const end = rangeEndFor(entry.range, today);
        if (end) {
            points.push(monthIndex(end));
        }
    }

    const todayIndex = monthIndex(today);
    if (points.length === 0) {
        // Nothing dated yet: show the five years leading up to now, so the
        // track is a real ruler rather than an empty strip.
        return { startIndex: todayIndex - 54, endIndex: todayIndex + DOMAIN_PADDING_MONTHS };
    }

    const min = Math.min(...points, todayIndex);
    const max = Math.max(...points, todayIndex);

    // Snap outward to whole years so the year labels line up with the ticks.
    const start = startOfYear(min - DOMAIN_PADDING_MONTHS);
    const end = endOfYear(max + DOMAIN_PADDING_MONTHS);
    return { startIndex: start, endIndex: end };
}

export function domainSpan(domain: TimelineDomain): number {
    return Math.max(1, domain.endIndex - domain.startIndex + 1);
}

/** 0-1 position of a month within the domain. Clamped, so a stray date cannot escape the track. */
export function fractionForMonth(domain: TimelineDomain, index: number): number {
    const raw = (index - domain.startIndex) / domainSpan(domain);
    return Math.min(1, Math.max(0, raw));
}

/** Inverse of fractionForMonth — the entry point for drag-to-edit. */
export function monthAtFraction(domain: TimelineDomain, fraction: number): CvDate {
    const clamped = Math.min(1, Math.max(0, fraction));
    const index = Math.round(domain.startIndex + clamped * domainSpan(domain));
    return fromMonthIndex(index);
}

export function layoutBar(domain: TimelineDomain, range: CvDateRange, today: CvDate): Omit<TimelineBar, 'entry'> {
    if (!range.start) {
        return { leftPct: 0, widthPct: MIN_BAR_WIDTH_PCT * 2, undated: true };
    }

    const startIndex = monthIndex(range.start);
    const end = rangeEndFor(range, today);
    const endIndex = Math.max(startIndex, end ? monthIndex(end) : startIndex);

    const left = fractionForMonth(domain, startIndex) * 100;
    const right = fractionForMonth(domain, endIndex + 1) * 100;

    return {
        leftPct: left,
        widthPct: Math.max(MIN_BAR_WIDTH_PCT, right - left),
        undated: false,
    };
}

/**
 * Year ticks always; quarter ticks once the domain is short enough that they
 * do not collide. The threshold is about legibility, not zoom — zoom widens
 * the track in CSS and the same ticks simply spread out.
 */
export function timelineTicks(domain: TimelineDomain): TimelineTick[] {
    const ticks: TimelineTick[] = [];
    const span = domainSpan(domain);
    const withQuarters = span <= 60;

    const firstYear = fromMonthIndex(domain.startIndex).year;
    const lastYear = fromMonthIndex(domain.endIndex).year;

    for (let year = firstYear; year <= lastYear; year++) {
        const january = monthIndex({ year, month: 1 });
        if (january >= domain.startIndex && january <= domain.endIndex) {
            ticks.push({ label: String(year), leftPct: fractionForMonth(domain, january) * 100, major: true });
        }
        if (!withQuarters) {
            continue;
        }
        for (const month of [4, 7, 10]) {
            const index = monthIndex({ year, month });
            if (index >= domain.startIndex && index <= domain.endIndex) {
                ticks.push({
                    label: formatCvDate({ year, month }, 'short').slice(0, 3),
                    leftPct: fractionForMonth(domain, index) * 100,
                    major: false,
                });
            }
        }
    }

    return ticks;
}

export function buildTimelineLayout(content: CvContent, today: CvDate = todayCvDate()): TimelineLayout {
    const categories = buildTimelineCategories(content);
    const entries = categories.flatMap((category) => category.entries);
    const domain = timelineDomain(entries, today);
    const todayIndex = monthIndex(today);

    return {
        domain,
        today,
        ticks: timelineTicks(domain),
        todayPct:
            todayIndex >= domain.startIndex && todayIndex <= domain.endIndex
                ? fractionForMonth(domain, todayIndex) * 100
                : null,
        rows: categories.map((category) => ({
            category,
            bars: category.entries.map((entry) => ({
                entry,
                ...layoutBar(domain, entry.range, today),
            })),
        })),
    };
}

function startOfYear(index: number): number {
    return monthIndex({ year: fromMonthIndex(index).year, month: 1 });
}

function endOfYear(index: number): number {
    return monthIndex({ year: fromMonthIndex(index).year, month: 12 });
}
