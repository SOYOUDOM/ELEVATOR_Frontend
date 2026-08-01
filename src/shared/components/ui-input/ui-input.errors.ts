import { InjectionToken } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';

export interface UiInputErrorContext {
  /** The field's label, or 'This field' when unlabelled. */
  label: string;
}

/**
 * Turns Angular's `ValidationErrors` bag into one human sentence.
 * Return `null` to fall through to the built-in resolver.
 */
export type UiInputErrorResolver = (
  errors: ValidationErrors,
  ctx: UiInputErrorContext,
) => string | null;

/**
 * Built-in messages. Covers Angular's stock validators plus the
 * conventional `{ message: string }` / `{ serverError: string }`
 * escape hatches used by custom + async validators.
 */
export const UI_INPUT_DEFAULT_ERRORS: UiInputErrorResolver = (errors, ctx) => {
  const label = ctx.label || 'This field';

  // Custom + server-side validators win: they already speak human.
  if (typeof errors['message'] === 'string') return errors['message'];
  if (typeof errors['serverError'] === 'string') return errors['serverError'];

  if (errors['required'] || errors['requiredTrue']) return `${label} is required.`;
  if (errors['email']) return 'Enter a valid email address.';

  if (errors['minlength']) {
    const { requiredLength, actualLength } = errors['minlength'];
    return `${requiredLength - actualLength} more character${
      requiredLength - actualLength === 1 ? '' : 's'
    } needed.`;
  }
  if (errors['maxlength']) {
    const { requiredLength } = errors['maxlength'];
    return `Keep this to ${requiredLength} characters or fewer.`;
  }

  if (errors['min']) return `Must be at least ${errors['min'].min}.`;
  if (errors['max']) return `Must be no more than ${errors['max'].max}.`;
  if (errors['pattern']) return `${label} isn’t in the expected format.`;

  // Unknown key — name it rather than lying with a generic string.
  const key = Object.keys(errors)[0];
  return key ? `${label} is invalid (${key}).` : `${label} is invalid.`;
};

export const UI_INPUT_ERROR_RESOLVER = new InjectionToken<UiInputErrorResolver>(
  'UI_INPUT_ERROR_RESOLVER',
  { providedIn: 'root', factory: () => UI_INPUT_DEFAULT_ERRORS },
);