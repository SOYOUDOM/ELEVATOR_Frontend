import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvToggleComponent } from '@shared/components/elv-toggle/elv-toggle.component';

import type { CvSectionId } from '@app/cv/models/cv-content.model';
import {
    CV_DESIGN_LIMITS,
    type CvDateStylePref,
    type CvFontWeight,
    type CvHeaderAlign,
    type CvSectionStyle,
    type CvTextTransform,
} from '@app/cv/models/cv-design.model';
import { CV_FONT_PRESETS, type CvFontOption, normalizeFontFamily, resolveFontStack } from '@app/cv/models/cv-fonts';
import { LocalFontsService } from '@app/cv/state/local-fonts.service';
import { CV_SECTIONS, sectionSpec } from '@app/cv/schema/cv-section-schema';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { type InspectorTab, WorkspaceUiStore } from '@app/cv/state/workspace-ui.store';
import { CV_TEMPLATES, findTemplate } from '@app/cv/templates/cv-templates';

import { CvAiToolsComponent } from '../cv-ai-tools/cv-ai-tools.component';
import { CvAtsPanelComponent } from '../cv-ats-panel/cv-ats-panel.component';

/**
 * ELEVATOR — the inspector.
 *
 * Document-level controls: which template, how it looks, how it reads. Every
 * write goes through CvEditorStore.updateDesign / updateOptions, which means
 * every one of them is a `design` or `options` branch in the PATCH — and none
 * of them can accidentally land in `content`.
 *
 * The colour and size controls are native inputs. There is no elv-slider or
 * elv-color in the shared library, and inventing two generic components to be
 * used in one panel would be the wrong trade; if a second consumer appears,
 * that is the moment to promote them.
 */
@Component({
    selector: 'app-cv-inspector',
    standalone: true,
    templateUrl: './cv-inspector.component.html',
    styleUrl: './cv-inspector.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvFieldComponent, ElvToggleComponent, CvAiToolsComponent, CvAtsPanelComponent],
    host: { class: 'insp' },
})
export class CvInspectorComponent {
    private readonly editor = inject(CvEditorStore);
    readonly ui = inject(WorkspaceUiStore);

    readonly limits = CV_DESIGN_LIMITS;
    readonly templates = CV_TEMPLATES;
    readonly design = this.editor.design;
    readonly options = this.editor.options;

    readonly tabs: { id: InspectorTab; label: string; icon: string }[] = [
        { id: 'template', label: 'Template', icon: 'pi-table' },
        { id: 'design', label: 'Design', icon: 'pi-palette' },
        { id: 'options', label: 'Options', icon: 'pi-sliders-h' },
    ];

    readonly localFonts = inject(LocalFontsService);

    /**
     * Which typography the controls below are editing: the document, or one
     * section's override. One set of controls with a scope switch, rather than
     * a second copy of every control nested under each section.
     */
    readonly scope = signal<'document' | CvSectionId>('document');

    readonly scopeOptions = computed(() => [
        { id: 'document' as const, label: 'Whole document' },
        ...CV_SECTIONS.map((spec) => ({ id: spec.id, label: spec.label })),
    ]);

    readonly editingSection = computed<CvSectionId | null>(() => {
        const scope = this.scope();
        return scope === 'document' ? null : scope;
    });

    /** The override actually stored for the section in scope, if any. */
    readonly sectionStyle = computed<CvSectionStyle>(() => {
        const section = this.editingSection();
        return (section && this.design()?.sectionStyles?.[section]) || {};
    });

    readonly hasSectionOverrides = computed(() => Object.keys(this.sectionStyle()).length > 0);

    /**
     * What the controls show. In section scope an unset value displays the
     * document's, so the panel always reflects what is on the page rather than
     * a blank.
     */
    readonly shownFont = computed(() =>
        normalizeFontFamily(this.sectionStyle().fontFamily ?? this.design()?.fontFamily)
    );
    readonly shownScale = computed(() =>
        this.editingSection() ? (this.sectionStyle().fontScale ?? 1) : (this.design()?.fontScale ?? 1)
    );
    readonly shownLineHeight = computed(() => this.sectionStyle().lineHeight ?? this.design()?.lineHeight ?? 1.4);
    readonly scaleLimits = computed(() =>
        this.editingSection() ? CV_DESIGN_LIMITS.sectionScale : CV_DESIGN_LIMITS.fontScale
    );

    /**
     * Curated presets plus whatever the machine reported, in one list the
     * <select> renders as three <optgroup>s. The user's current font is added
     * even when it is neither — a CV written on another computer must not
     * silently lose its typeface just because this machine has not been asked
     * for its font list.
     */
    readonly fontGroups = computed<{ label: string; options: CvFontOption[] }[]>(() => {
        const current = this.shownFont();
        const presets = [...CV_FONT_PRESETS];
        const local = this.localFonts.families().map<CvFontOption>((family) => ({
            id: family,
            label: family,
            group: 'local',
            stack: resolveFontStack(family),
        }));

        const known = new Set([...presets, ...local].map((option) => option.id));
        const orphan: CvFontOption[] = known.has(current)
            ? []
            : [
                  {
                      id: current,
                      label: `${current} (from this CV)`,
                      group: 'document',
                      stack: resolveFontStack(current),
                  },
              ];

        return [
            { label: 'Document fonts', options: [...orphan, ...presets.filter((o) => o.group === 'document')] },
            { label: 'ELEVATOR fonts', options: presets.filter((o) => o.group === 'elevator') },
            { label: 'From this computer', options: local },
        ].filter((group) => group.options.length > 0);
    });

    readonly dateStyles: { id: CvDateStylePref; label: string }[] = [
        { id: 'short', label: 'Mar 2023' },
        { id: 'long', label: 'March 2023' },
        { id: 'numeric', label: '03/2023' },
    ];

    readonly activeTemplate = computed(() => findTemplate(this.design()?.templateId ?? ''));

    constructor() {
        // Measurement scan: no prompt, no permission, ~1ms. Doing it here means
        // the picker already lists the machine's fonts the first time it opens.
        this.localFonts.scan();
    }

    /** Section order and visibility, in the user's current order. */
    readonly sectionRows = computed(() => {
        const design = this.design();
        if (!design) {
            return [];
        }
        const known = CV_SECTIONS.map((spec) => spec.id);
        const ordered = [
            ...design.sectionOrder.filter((id) => known.includes(id)),
            ...known.filter((id) => !design.sectionOrder.includes(id)),
        ];
        return ordered
            .filter((id) => id !== 'personal')
            .map((id) => ({
                id,
                label: sectionSpec(id).label,
                icon: sectionSpec(id).icon,
                visible: !design.hiddenSections.includes(id),
            }));
    });

    setTab(tab: InspectorTab): void {
        this.ui.inspectorTab.set(tab);
    }

    setTemplate(templateId: string): void {
        this.editor.setTemplate(templateId);
    }

    setColor(key: 'accentColor' | 'textColor' | 'pageColor', event: Event): void {
        this.editor.updateDesign({ [key]: (event.target as HTMLInputElement).value });
    }

    setNumber(key: 'fontScale' | 'lineHeight' | 'marginMm' | 'sectionGapMm', event: Event): void {
        this.editor.updateDesign({ [key]: Number((event.target as HTMLInputElement).value) });
    }

    setScope(event: Event): void {
        this.scope.set((event.target as HTMLSelectElement).value as 'document' | CvSectionId);
    }

    setFont(event: Event): void {
        this.applyTypography({ fontFamily: (event.target as HTMLSelectElement).value });
    }

    /** Any family name at all — the detector only knows the names it probes for. */
    setCustomFont(value: string): void {
        const family = value.trim();
        if (family) {
            this.applyTypography({ fontFamily: family });
        }
    }

    setScale(event: Event): void {
        this.applyTypography({ fontScale: Number((event.target as HTMLInputElement).value) });
    }

    setLineHeight(event: Event): void {
        this.applyTypography({ lineHeight: Number((event.target as HTMLInputElement).value) });
    }

    /** Weight, slant and casing exist per section only — a document-wide bold CV is not a thing. */
    toggleWeight(): void {
        const section = this.editingSection();
        if (section) {
            const next: CvFontWeight | undefined = this.sectionStyle().weight === 'bold' ? undefined : 'bold';
            this.editor.updateSectionStyle(section, { weight: next });
        }
    }

    toggleItalic(): void {
        const section = this.editingSection();
        if (section) {
            this.editor.updateSectionStyle(section, { italic: this.sectionStyle().italic ? undefined : true });
        }
    }

    setTransform(transform: CvTextTransform): void {
        const section = this.editingSection();
        if (section) {
            const current = this.sectionStyle().transform ?? 'none';
            this.editor.updateSectionStyle(section, { transform: current === transform ? undefined : transform });
        }
    }

    resetSection(): void {
        const section = this.editingSection();
        if (section) {
            this.editor.resetSectionStyle(section);
        }
    }

    /** Routes one change to the document or to the section in scope. */
    private applyTypography(patch: { fontFamily?: string; fontScale?: number; lineHeight?: number }): void {
        const section = this.editingSection();
        if (section) {
            this.editor.updateSectionStyle(section, patch);
        } else {
            this.editor.updateDesign(patch);
        }
    }

    /** Must run from the click — the Local Font Access prompt is gesture-gated. */
    loadLocalFonts(): void {
        void this.localFonts.requestFullList();
    }

    fontStackFor(family: string): string {
        return resolveFontStack(family);
    }

    setColumns(columns: 1 | 2): void {
        this.editor.updateDesign({ columns });
    }

    setAlign(headerAlign: CvHeaderAlign): void {
        this.editor.updateDesign({ headerAlign });
    }

    setPhoto(showPhoto: boolean): void {
        this.editor.updateDesign({ showPhoto });
    }

    toggleSection(id: CvSectionId, visible: boolean): void {
        const design = this.design();
        if (!design) {
            return;
        }
        const hidden = new Set(design.hiddenSections);
        if (visible) {
            hidden.delete(id);
        } else {
            hidden.add(id);
        }
        this.editor.updateDesign({ hiddenSections: [...hidden] });
    }

    /** Reorders presentation only — the content arrays never move. */
    moveSection(id: CvSectionId, delta: number): void {
        const design = this.design();
        if (!design) {
            return;
        }
        const order: CvSectionId[] = this.sectionRows().map((row) => row.id);
        const from = order.indexOf(id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= order.length) {
            return;
        }
        order.splice(to, 0, ...order.splice(from, 1));
        this.editor.updateDesign({ sectionOrder: ['personal', ...order] });
    }

    setDateStyle(dateStyle: CvDateStylePref): void {
        this.editor.updateOptions({ dateStyle });
    }

    setOptionFlag(key: 'showContactIcons' | 'showSectionRules' | 'showFooterNote', value: boolean): void {
        this.editor.updateOptions({ [key]: value });
    }

    setPresentLabel(value: string | number | null): void {
        this.editor.updateOptions({ presentLabel: String(value ?? '') });
    }

    setFooterNote(value: string | number | null): void {
        this.editor.updateOptions({ footerNote: String(value ?? '') });
    }

    supportsColumns(count: 1 | 2): boolean {
        return this.activeTemplate().capabilities.columns.includes(count);
    }
}
