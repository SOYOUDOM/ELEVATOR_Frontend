import { monthIndex, todayCvDate } from '../models/cv-date';
import { emptyCvContent } from '../models/cv-content.model';
import type { CvContent } from '../models/cv-content.model';
import {
    buildTimelineLayout,
    domainSpan,
    fractionForMonth,
    layoutBar,
    monthAtFraction,
    timelineDomain,
} from './cv-timeline';

/**
 * The timeline's maths, without a DOM. These are the guarantees the geometry
 * has to keep for drag-to-edit to be a safe addition later.
 */
describe('Career timeline geometry', () => {
    const today = { year: 2026, month: 8 };

    function contentWith(overrides: Partial<CvContent>): CvContent {
        return { ...emptyCvContent(), ...overrides };
    }

    it('derives its window from the data, not from hardcoded years', () => {
        const layout = buildTimelineLayout(
            contentWith({
                education: [
                    {
                        id: 'e1',
                        degree: 'BSc',
                        institution: 'RUPP',
                        location: '',
                        note: '',
                        dates: { start: { year: 2017, month: 9 }, end: { year: 2021, month: 6 }, isPresent: false },
                    },
                ],
            }),
            today
        );

        // Snapped outward to whole years so the ruler labels line up.
        expect(layout.domain.startIndex).toBe(monthIndex({ year: 2017, month: 1 }));
        expect(layout.domain.endIndex).toBe(monthIndex({ year: 2027, month: 12 }));
    });

    it('runs an ongoing role all the way to today', () => {
        const domain = timelineDomain([], today);
        const present = layoutBar(domain, { start: { year: 2023, month: 3 }, end: null, isPresent: true }, today);
        const closed = layoutBar(
            domain,
            { start: { year: 2023, month: 3 }, end: { year: 2024, month: 3 }, isPresent: false },
            today
        );

        expect(present.widthPct).toBeGreaterThan(closed.widthPct);
        expect(present.undated).toBeFalse();
    });

    it('parks an undated record at the start and flags it', () => {
        const domain = timelineDomain([], today);
        const bar = layoutBar(domain, { start: null, end: null, isPresent: false }, today);

        expect(bar.undated).toBeTrue();
        expect(bar.leftPct).toBe(0);
        expect(bar.widthPct).toBeGreaterThan(0);
    });

    it('maps a fraction back to the month it came from', () => {
        const domain = {
            startIndex: monthIndex({ year: 2020, month: 1 }),
            endIndex: monthIndex({ year: 2026, month: 12 }),
        };
        const target = { year: 2023, month: 7 };

        const roundTripped = monthAtFraction(domain, fractionForMonth(domain, monthIndex(target)));

        expect(roundTripped).toEqual(target);
    });

    it('never lets a stray date escape the track', () => {
        const domain = {
            startIndex: monthIndex({ year: 2020, month: 1 }),
            endIndex: monthIndex({ year: 2021, month: 12 }),
        };

        expect(fractionForMonth(domain, monthIndex({ year: 1990, month: 1 }))).toBe(0);
        expect(fractionForMonth(domain, monthIndex({ year: 2050, month: 1 }))).toBe(1);
        expect(domainSpan(domain)).toBe(24);
    });

    it('groups every dated section into its own row', () => {
        const layout = buildTimelineLayout(emptyCvContent(), today);

        expect(layout.rows.map((row) => row.category.id)).toEqual(['experience', 'education', 'projects']);
    });

    it('places a TODAY marker inside the drawn window', () => {
        const layout = buildTimelineLayout(emptyCvContent(), todayCvDate());

        const todayPct = layout.todayPct ?? -1;
        expect(todayPct).toBeGreaterThan(0);
        expect(todayPct).toBeLessThanOrEqual(100);
    });
});
