import {
  EnvironmentProviders, InjectionToken, makeEnvironmentProviders,
} from '@angular/core';
import type { ValidationErrors } from '@angular/forms';
import type { ElvFieldDefaults } from './elv-field.types';

export const ELV_FIELD_DEFAULT_CONFIG: ElvFieldDefaults = {
  density: 'default',
  corner: 'soft',
  labelMode: 'stacked',
  validateOn: 'touched',
  showSuccess: true,
  shake: true,
};

export const ELV_FIELD_DEFAULTS = new InjectionToken<ElvFieldDefaults>(
  'ELV_FIELD_DEFAULTS',
  { providedIn: 'root', factory: () => ELV_FIELD_DEFAULT_CONFIG },
);

export interface ElvErrorContext { label: string; }

/** Return null to fall through to the built-in resolver. */
export type ElvErrorResolver =
  (errors: ValidationErrors, ctx: ElvErrorContext) => string | null;

/** Messages say how to fix it, not just that it broke. */
export const ELV_DEFAULT_ERRORS: ElvErrorResolver = (errors, ctx) => {
  const label = ctx.label || 'This field';

  if (typeof errors['message'] === 'string') return errors['message'];
  if (typeof errors['serverError'] === 'string') return errors['serverError'];

  if (errors['required']) return `${label} is required.`;
  if (errors['email']) return 'Add the part after the @ — for example, you@company.com.';

  if (errors['minlength']) {
    const n = errors['minlength'].requiredLength - errors['minlength'].actualLength;
    return `${n} more character${n === 1 ? '' : 's'} needed.`;
  }
  if (errors['maxlength'])
    return `Keep this to ${errors['maxlength'].requiredLength} characters or fewer.`;

  if (errors['min']) return `Must be at least ${errors['min'].min}.`;
  if (errors['max']) return `Must be no more than ${errors['max'].max}.`;
  if (errors['pattern']) return `${label} isn’t in the expected format.`;

  const key = Object.keys(errors)[0];
  return key ? `${label} is invalid (${key}).` : `${label} is invalid.`;
};

export const ELV_ERROR_RESOLVER = new InjectionToken<ElvErrorResolver>(
  'ELV_ERROR_RESOLVER',
  { providedIn: 'root', factory: () => ELV_DEFAULT_ERRORS },
);

export function provideElvField(config: {
  defaults?: Partial<ElvFieldDefaults>;
  errors?: ElvErrorResolver;
} = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ELV_FIELD_DEFAULTS,
      useValue: { ...ELV_FIELD_DEFAULT_CONFIG, ...config.defaults } },
    { provide: ELV_ERROR_RESOLVER, useValue: config.errors ?? ELV_DEFAULT_ERRORS },
  ]);
}