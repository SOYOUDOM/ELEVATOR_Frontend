import {
  EnvironmentProviders, InjectionToken, makeEnvironmentProviders,
} from '@angular/core';
import type { UiInputDefaults } from './ui-input.types';
import {
  UI_INPUT_DEFAULT_ERRORS, UI_INPUT_ERROR_RESOLVER, UiInputErrorResolver,
} from './ui-input.errors';

/** Shipped defaults, tuned for the ELEVATOR dark shell. */
export const UI_INPUT_DEFAULT_CONFIG: UiInputDefaults = {
  appearance: 'neon',
  size: 'md',
  density: 'default',
  shape: 'notch',
  border: 'auto',
  glow: 'focus',
  tone: 'brand',
  labelMode: 'floating',
  validateOn: 'touched',
  showSuccess: true,
  shake: true,
};

export const UI_INPUT_DEFAULTS = new InjectionToken<UiInputDefaults>(
  'UI_INPUT_DEFAULTS',
  { providedIn: 'root', factory: () => UI_INPUT_DEFAULT_CONFIG },
);

export interface UiInputProviderConfig {
  /** Partial override of the shipped defaults. */
  defaults?: Partial<UiInputDefaults>;
  /** Replace or wrap the validation-message resolver. */
  errors?: UiInputErrorResolver;
}

/**
 * Set app-wide input defaults once, at bootstrap.
 *
 *   providers: [
 *     provideUiInput({ defaults: { appearance: 'aurora', shape: 'notch' } }),
 *   ]
 *
 * Per-instance props always beat these.
 */
export function provideUiInput(
  config: UiInputProviderConfig = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UI_INPUT_DEFAULTS,
      useValue: { ...UI_INPUT_DEFAULT_CONFIG, ...config.defaults },
    },
    {
      provide: UI_INPUT_ERROR_RESOLVER,
      useValue: config.errors ?? UI_INPUT_DEFAULT_ERRORS,
    },
  ]);
}