import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';
import type { ElvFieldDefaults } from './elv-field.types';
import { ELV_BUILTIN_PRESETS, ELV_FIELD_PRESETS, type ElvFieldPresetDef } from './elv-field.presets';

/** Shipped defaults, tuned for the ELEVATOR dark shell. */
export const ELV_FIELD_DEFAULT_CONFIG: ElvFieldDefaults = {
    density: 'default',
    corner: 'soft',
    labelMode: 'stacked',
    validateOn: 'touched',
    showSuccess: true,
    shake: true,
};

export const ELV_FIELD_DEFAULTS = new InjectionToken<ElvFieldDefaults>('ELV_FIELD_DEFAULTS', {
    providedIn: 'root',
    factory: () => ELV_FIELD_DEFAULT_CONFIG,
});

export interface ElvErrorContext {
    /** The field's label, or 'This field' when unlabelled. */
    label: string;
}

/**
 * Turns Angular's ValidationErrors bag into one human sentence.
 * Return null to fall through to the built-in resolver.
 */
export type ElvErrorResolver = (errors: ValidationErrors, ctx: ElvErrorContext) => string | null;

/**
 * Built-in messages. Every one says how to fix the problem, not just that
 * there is one. Covers Angular's stock validators plus the conventional
 * `{ message }` / `{ serverError }` escape hatches.
 */
export const ELV_DEFAULT_ERRORS: ElvErrorResolver = (errors, ctx) => {
    const label = ctx.label || 'This field';

    // Custom and server-side validators win: they already speak human.
    if (typeof errors['message'] === 'string') {
        return errors['message'];
    }
    if (typeof errors['serverError'] === 'string') {
        return errors['serverError'];
    }

    if (errors['required'] || errors['requiredTrue']) {
        return `${label} is required.`;
    }
    if (errors['email']) {
        return 'Add the part after the @ — for example, you@company.com.';
    }

    if (errors['minlength']) {
        const { requiredLength, actualLength } = errors['minlength'];
        const n = requiredLength - actualLength;
        return `${n} more character${n === 1 ? '' : 's'} needed.`;
    }
    if (errors['maxlength']) {
        return `Keep this to ${errors['maxlength'].requiredLength} characters or fewer.`;
    }

    if (errors['min']) {
        return `Must be at least ${errors['min'].min}.`;
    }
    if (errors['max']) {
        return `Must be no more than ${errors['max'].max}.`;
    }
    if (errors['pattern']) {
        return `${label} isn’t in the expected format.`;
    }

    // Unknown key — name it rather than lying with a generic string.
    const key = Object.keys(errors)[0];
    return key ? `${label} is invalid (${key}).` : `${label} is invalid.`;
};

export const ELV_ERROR_RESOLVER = new InjectionToken<ElvErrorResolver>('ELV_ERROR_RESOLVER', {
    providedIn: 'root',
    factory: () => ELV_DEFAULT_ERRORS,
});

export interface ElvFieldProviderConfig {
    defaults?: Partial<ElvFieldDefaults>;
    errors?: ElvErrorResolver;
    /** Merged over the built-ins: same key replaces, new key extends. */
    presets?: Record<string, ElvFieldPresetDef>;
}

/**
 * Set app-wide field defaults once, at bootstrap.
 *
 *   providers: [
 *     provideElvField({
 *       defaults: { density: 'compact', corner: 'sharp' },
 *       presets: {
 *         password: { icon: 'pi-key' },        // tweak a built-in
 *         'cv-headline': { label: 'Headline', maxlength: 60, counter: true },
 *       },
 *     }),
 *   ]
 *
 * Per-instance props always beat presets, which always beat these defaults.
 */
export function provideElvField(config: ElvFieldProviderConfig = {}): EnvironmentProviders {
    // Shallow-merge per key so overriding one property of a built-in preset
    // doesn't wipe the rest of that preset.
    const presets: Record<string, ElvFieldPresetDef> = { ...ELV_BUILTIN_PRESETS };
    for (const [key, def] of Object.entries(config.presets ?? {})) {
        presets[key] = { ...presets[key], ...def };
    }

    return makeEnvironmentProviders([
        {
            provide: ELV_FIELD_DEFAULTS,
            useValue: { ...ELV_FIELD_DEFAULT_CONFIG, ...config.defaults },
        },
        {
            provide: ELV_ERROR_RESOLVER,
            useValue: config.errors ?? ELV_DEFAULT_ERRORS,
        },
        { provide: ELV_FIELD_PRESETS, useValue: presets },
    ]);
}
