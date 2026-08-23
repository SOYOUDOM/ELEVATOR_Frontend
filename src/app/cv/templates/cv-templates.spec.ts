import { defaultCvDesign } from '../models/cv-design.model';
import { applyTemplate, findTemplate } from './cv-templates';

describe('CV templates', () => {
    it('never leaves the design in a state the template cannot render', () => {
        const design = { ...defaultCvDesign('modern'), columns: 2 as const, showPhoto: true };

        const classic = applyTemplate(design, 'classic');

        expect(findTemplate('classic').capabilities.photo).toBeFalse();
        expect(classic.showPhoto).toBeFalse();
        expect(classic.columns).toBe(1);
        expect(classic.templateId).toBe('classic');
    });

    it('falls back to the first template rather than throwing on an unknown id', () => {
        expect(findTemplate('does-not-exist').id).toBe('modern');
    });

    it('touches presentation only — section order and visibility survive', () => {
        const design = {
            ...defaultCvDesign('modern'),
            hiddenSections: ['languages' as const],
            sectionOrder: ['personal' as const, 'skills' as const, 'summary' as const],
        };

        const compact = applyTemplate(design, 'compact');

        expect(compact.hiddenSections).toEqual(['languages']);
        expect(compact.sectionOrder).toEqual(['personal', 'skills', 'summary']);
    });
});
