/** Re-exports so the pane components import one file, not five. */
export { readiness, documentNotes, lineNotes, machineReadBack, suggestedSkills,
  titleIdeas, spans, gaps, formatRange, durationText, fromMonths, toMonths,
  countWords, bulletFlag } from '../compositor.analysis';
export type { Fill, DocNote, LineNote, Span, Gap, Readiness } from '../compositor.analysis';

import { Section, SectionItem, itemLabel } from '../compositor.models';

export function itemLabelOf(sec: Section, i: number): string {
  const it: SectionItem | undefined = sec.items[i];
  return it ? itemLabel(sec.type, it) : '';
}
