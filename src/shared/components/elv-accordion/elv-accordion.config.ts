import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { ElvAccordionDefaults, ElvAccordionPresetDef, ElvAccordionPresetName } from './elv-accordion.types';

/** Shipped defaults, tuned for the ELEVATOR dark shell. */
export const ELV_ACCORDION_DEFAULT_CONFIG: ElvAccordionDefaults = {
    skin: 'raised',
    density: 'default',
    corner: 'soft',
    multiple: false,
    collapsible: true,
    headingLevel: 3,
    hideIcons: false,
};

export const ELV_ACCORDION_DEFAULTS = new InjectionToken<ElvAccordionDefaults>('ELV_ACCORDION_DEFAULTS', {
    providedIn: 'root',
    factory: () => ELV_ACCORDION_DEFAULT_CONFIG,
});

/**
 * Built-in presets.
 *
 * `cv-section` turns `multiple` on because a CV editor is a checklist — you
 * compare Experience against Skills, so closing one to open the other is the
 * wrong default. The badge it implies is per-panel data (`[badge]="items.length"`),
 * not something a preset can compute; the preset only sets the surface that
 * makes a count read correctly.
 */
export const ELV_ACCORDION_BUILTIN_PRESETS: Record<ElvAccordionPresetName, ElvAccordionPresetDef> = {
    faq: {
        skin: 'minimal',
        density: 'default',
        collapsible: true,
        hideIcons: true,
    },

    settings: {
        skin: 'raised',
        density: 'default',
        corner: 'soft',
    },

    'cv-section': {
        skin: 'raised',
        density: 'roomy',
        multiple: true,
    },
};

/**
 * The live preset registry. provideElvAccordion({ presets }) merges custom
 * entries over these — same key replaces, new key extends.
 */
export const ELV_ACCORDION_PRESETS = new InjectionToken<Record<string, ElvAccordionPresetDef>>(
    'ELV_ACCORDION_PRESETS',
    { providedIn: 'root', factory: () => ELV_ACCORDION_BUILTIN_PRESETS }
);

export interface ElvAccordionProviderConfig {
    defaults?: Partial<ElvAccordionDefaults>;
    /** Merged over the built-ins: same key replaces, new key extends. */
    presets?: Record<string, ElvAccordionPresetDef>;
}

/**
 * Set app-wide accordion defaults once, at bootstrap.
 *
 *   providers: [
 *     provideElvAccordion({
 *       defaults: { density: 'compact', corner: 'sharp' },
 *       presets: {
 *         faq: { density: 'roomy' },                    // tweak a built-in
 *         'cv-preview': { skin: 'minimal', multiple: true },
 *       },
 *     }),
 *   ]
 *
 * Per-instance props always beat presets, which always beat these defaults.
 */
export function provideElvAccordion(config: ElvAccordionProviderConfig = {}): EnvironmentProviders {
    // Shallow-merge per key so overriding one property of a built-in preset
    // doesn't wipe the rest of that preset.
    const presets: Record<string, ElvAccordionPresetDef> = { ...ELV_ACCORDION_BUILTIN_PRESETS };
    for (const [key, def] of Object.entries(config.presets ?? {})) {
        presets[key] = { ...presets[key], ...def };
    }

    return makeEnvironmentProviders([
        {
            provide: ELV_ACCORDION_DEFAULTS,
            useValue: { ...ELV_ACCORDION_DEFAULT_CONFIG, ...config.defaults },
        },
        { provide: ELV_ACCORDION_PRESETS, useValue: presets },
    ]);
}
