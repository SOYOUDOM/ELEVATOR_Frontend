import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { ElvCheckboxDefaults, ElvCheckboxPresetDef, ElvCheckboxPresetName } from './elv-checkbox.types';

/** Shipped defaults, tuned for the ELEVATOR dark shell. */
export const ELV_CHECKBOX_DEFAULT_CONFIG: ElvCheckboxDefaults = {
    size: 'md',
    skin: 'raised',
    corner: 'soft',
    tone: 'accent',
    labelPosition: 'end',
    validateOn: 'touched',
};

export const ELV_CHECKBOX_DEFAULTS = new InjectionToken<ElvCheckboxDefaults>('ELV_CHECKBOX_DEFAULTS', {
    providedIn: 'root',
    factory: () => ELV_CHECKBOX_DEFAULT_CONFIG,
});

/**
 * Built-in presets.
 *
 * `terms` carries no label of its own on purpose — it is the projection case.
 * Write the sentence as content so the link is a real anchor:
 *
 *   <elv-checkbox preset="terms">
 *     I agree to the <a href="/terms">Terms</a>
 *   </elv-checkbox>
 */
export const ELV_CHECKBOX_BUILTIN_PRESETS: Record<ElvCheckboxPresetName, ElvCheckboxPresetDef> = {
    terms: {
        required: true,
    },

    'remember-me': {
        label: 'Remember me',
        skin: 'minimal',
    },

    marketing: {
        label: 'Send me product updates',
        hint: 'Roughly one email a month. Unsubscribe anytime.',
    },
};

/**
 * The live preset registry. provideElvCheckbox({ presets }) merges custom
 * entries over these — same key replaces, new key extends.
 */
export const ELV_CHECKBOX_PRESETS = new InjectionToken<Record<string, ElvCheckboxPresetDef>>('ELV_CHECKBOX_PRESETS', {
    providedIn: 'root',
    factory: () => ELV_CHECKBOX_BUILTIN_PRESETS,
});

export interface ElvCheckboxProviderConfig {
    defaults?: Partial<ElvCheckboxDefaults>;
    /** Merged over the built-ins: same key replaces, new key extends. */
    presets?: Record<string, ElvCheckboxPresetDef>;
}

/**
 * Set app-wide checkbox defaults once, at bootstrap.
 *
 *   providers: [
 *     provideElvCheckbox({
 *       defaults: { size: 'sm', corner: 'sharp' },
 *       presets: {
 *         'remember-me': { label: 'Keep me signed in' },  // tweak a built-in
 *         'cv-public':   { label: 'List my CV publicly', hint: 'Indexed by search engines.' },
 *       },
 *     }),
 *   ]
 *
 * Per-instance props always beat presets, which always beat these defaults.
 */
export function provideElvCheckbox(config: ElvCheckboxProviderConfig = {}): EnvironmentProviders {
    // Shallow-merge per key so overriding one property of a built-in preset
    // doesn't wipe the rest of that preset.
    const presets: Record<string, ElvCheckboxPresetDef> = { ...ELV_CHECKBOX_BUILTIN_PRESETS };
    for (const [key, def] of Object.entries(config.presets ?? {})) {
        presets[key] = { ...presets[key], ...def };
    }

    return makeEnvironmentProviders([
        {
            provide: ELV_CHECKBOX_DEFAULTS,
            useValue: { ...ELV_CHECKBOX_DEFAULT_CONFIG, ...config.defaults },
        },
        { provide: ELV_CHECKBOX_PRESETS, useValue: presets },
    ]);
}
