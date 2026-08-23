import { defaultCvDesign } from '../models/cv-design.model';
import { CV_DESIGN_LIMITS } from '../models/cv-design.model';
import { CV_TEMPLATES, applyTemplate, findTemplate } from './cv-templates';

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

    it('never ships a default the Design sliders cannot represent', () => {
        for (const template of CV_TEMPLATES) {
            const design = applyTemplate(defaultCvDesign(), template.id);

            expect(design.marginMm)
                .withContext(`${template.id} margin`)
                .toBeGreaterThanOrEqual(CV_DESIGN_LIMITS.marginMm.min);
            expect(design.marginMm).toBeLessThanOrEqual(CV_DESIGN_LIMITS.marginMm.max);
            expect(design.sectionGapMm)
                .withContext(`${template.id} section gap`)
                .toBeGreaterThanOrEqual(CV_DESIGN_LIMITS.sectionGapMm.min);
            expect(design.fontScale).toBeGreaterThanOrEqual(CV_DESIGN_LIMITS.fontScale.min);
            expect(design.columns).toBeGreaterThan(0);
        }
    });

    it('gives every template a unique id and a real font family', () => {
        const ids = CV_TEMPLATES.map((template) => template.id);

        expect(new Set(ids).size).toBe(ids.length);
        for (const template of CV_TEMPLATES) {
            // A family NAME, never one of the retired enum ids.
            expect(['sans', 'serif', 'mono', 'grotesk']).not.toContain(template.defaults.fontFamily as string);
        }
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
