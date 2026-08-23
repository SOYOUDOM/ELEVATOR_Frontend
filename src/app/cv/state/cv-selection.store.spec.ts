import { CvSelectionStore } from './cv-selection.store';

/**
 * The single selection the builder, the preview and the timeline all read.
 */
describe('CvSelectionStore', () => {
    let store: CvSelectionStore;

    beforeEach(() => {
        store = new CvSelectionStore();
    });

    it('reports a field selection as being within its record and its section', () => {
        store.select({ sectionId: 'experience', recordId: 'exp_1', fieldId: 'company' });

        expect(store.isSelected({ sectionId: 'experience', recordId: 'exp_1', fieldId: 'company' })).toBeTrue();
        expect(store.isWithin({ sectionId: 'experience', recordId: 'exp_1' })).toBeTrue();
        expect(store.isWithin({ sectionId: 'experience' })).toBeTrue();
        expect(store.isWithin({ sectionId: 'experience', recordId: 'exp_2' })).toBeFalse();
        expect(store.isWithin({ sectionId: 'education' })).toBeFalse();
    });

    it('raises a fresh focus request even when the same field is picked twice', () => {
        store.select({ sectionId: 'summary', fieldId: 'summary' });
        const first = store.focusRequest()?.token ?? -1;

        store.select({ sectionId: 'summary', fieldId: 'summary' });

        expect(store.focusRequest()?.token ?? -1).toBeGreaterThan(first);
    });

    it('selects without stealing focus when asked not to', () => {
        store.select({ sectionId: 'skills', recordId: 'skl_1' }, false);

        expect(store.recordId()).toBe('skl_1');
        expect(store.focusRequest()).toBeNull();
    });

    it('drops the hover only when the pointer leaves the hovered scope', () => {
        store.setHovered({ sectionId: 'projects', recordId: 'prj_1', fieldId: 'name' });

        expect(store.isHoveredWithin({ sectionId: 'projects', recordId: 'prj_1' })).toBeTrue();
        expect(store.isHoveredWithin({ sectionId: 'projects', recordId: 'prj_2' })).toBeFalse();
    });
});
