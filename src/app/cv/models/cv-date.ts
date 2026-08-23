/**
 * ELEVATOR — CV dates.
 *
 * A CV never means "the 14th". It means "March 2023", and it frequently means
 * "March 2023 until now". So the stored precision is a month, and everything
 * downstream — the timeline geometry, the month inputs, the printed range —
 * derives from that single decision. Nothing in the app invents a day.
 */

/** Month-precision point in time. `month` is 1-12, never 0-11. */
export interface CvDate {
    year: number;
    /** 1 = January … 12 = December. */
    month: number;
}

/** A range on a CV. `end === null` with `isPresent` means "until now". */
export interface CvDateRange {
    start: CvDate | null;
    end: CvDate | null;
    isPresent: boolean;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export type CvDateStyle = 'short' | 'long' | 'numeric' | 'year';

export function cvDate(year: number, month: number): CvDate {
    return { year, month: clampMonth(month) };
}

export function todayCvDate(now: Date = new Date()): CvDate {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Months since year 0. The timeline's whole coordinate system is this number,
 * which is why it is a plain integer and not a Date: arithmetic on it can
 * never drift by a day or a timezone.
 */
export function monthIndex(date: CvDate): number {
    return date.year * 12 + (clampMonth(date.month) - 1);
}

export function fromMonthIndex(index: number): CvDate {
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareCvDate(a: CvDate, b: CvDate): number {
    return monthIndex(a) - monthIndex(b);
}

/** `2024-03` — the value shape of `<input type="month">`. */
export function toMonthInput(date: CvDate | null | undefined): string {
    if (!date) {
        return '';
    }
    return `${String(date.year).padStart(4, '0')}-${String(clampMonth(date.month)).padStart(2, '0')}`;
}

/** Parses `<input type="month">` back. Returns null for '' and for junk. */
export function parseMonthInput(value: string | null | undefined): CvDate | null {
    if (!value) {
        return null;
    }
    const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
        return null;
    }
    return { year, month };
}

export function formatCvDate(date: CvDate | null | undefined, style: CvDateStyle = 'short'): string {
    if (!date) {
        return '';
    }
    const month = clampMonth(date.month);
    switch (style) {
        case 'long':
            return `${MONTHS_LONG[month - 1]} ${date.year}`;
        case 'numeric':
            return `${String(month).padStart(2, '0')}/${date.year}`;
        case 'year':
            return String(date.year);
        default:
            return `${MONTHS_SHORT[month - 1]} ${date.year}`;
    }
}

/**
 * "Mar 2023 – Present". Returns '' when there is nothing to show, so callers
 * can render the result directly without a truthiness dance.
 */
export function formatCvRange(range: CvDateRange, style: CvDateStyle = 'short', presentLabel = 'Present'): string {
    const start = formatCvDate(range.start, style);
    const end = range.isPresent ? presentLabel : formatCvDate(range.end, style);
    if (!start && !end) {
        return '';
    }
    if (!end) {
        return start;
    }
    if (!start) {
        return end;
    }
    return `${start} – ${end}`;
}

/**
 * Effective end of a range for layout purposes: an open-ended role runs to
 * today, which is what makes a "Present" bar reach the TODAY marker.
 */
export function rangeEndFor(range: CvDateRange, now: CvDate = todayCvDate()): CvDate | null {
    if (range.isPresent) {
        return now;
    }
    return range.end ?? range.start;
}

function clampMonth(month: number): number {
    if (!Number.isFinite(month)) {
        return 1;
    }
    return Math.min(12, Math.max(1, Math.round(month)));
}
