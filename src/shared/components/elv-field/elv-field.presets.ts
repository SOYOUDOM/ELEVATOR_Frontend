import { InjectionToken } from '@angular/core';
import type { ElvCorner, ElvDensity, ElvFieldType, ElvLabelMode, ElvSkin } from './elv-field.types';

/**
 * A preset is a bundle of sensible defaults for one KIND of field.
 *
 * Resolution order for every property below is:
 *     explicit input  →  preset  →  provideElvField() default  →  built-in
 *
 * So `<elv-field preset="password" icon="pi-key" />` keeps the whole password
 * bundle and swaps only the icon. Presets never win over something you wrote.
 *
 * Deliberately excluded: `required`, `disabled`, `readonly`, `error`,
 * `warning`, `loading`, `name`, `value`. Those are per-instance facts about
 * your form, not properties of a kind of field.
 */
export interface ElvFieldPresetDef {
    label?: string;
    placeholder?: string;
    hint?: string;
    icon?: string;
    prefix?: string;
    prefixIcon?: string;
    suffix?: string;
    type?: ElvFieldType;
    autocomplete?: string;
    inputmode?: string;
    revealable?: boolean;
    clearable?: boolean;
    copyable?: boolean;
    mono?: boolean;
    numeric?: boolean;
    multiline?: boolean;
    counter?: boolean;
    maxlength?: number;
    rows?: number;
    labelMode?: ElvLabelMode;
    skin?: ElvSkin;
    corner?: ElvCorner;
    density?: ElvDensity;
    height?: string | number;
    kbd?: readonly string[];
}

/** Built-in preset keys. Custom keys registered via provideElvField() also work. */
export type ElvPresetName =
    | 'email'
    | 'password'
    | 'new-password'
    | 'username'
    | 'name'
    | 'search'
    | 'phone'
    | 'url'
    | 'company'
    | 'job-title'
    | 'location'
    | 'amount'
    | 'bio'
    | 'auth-email'
    | 'auth-password';

/** `& {}` keeps IntelliSense on the known keys while still allowing custom ones. */
export type ElvPreset = ElvPresetName | (string & {});

export const ELV_BUILTIN_PRESETS: Record<ElvPresetName, ElvFieldPresetDef> = {
    email: {
        label: 'Email',
        placeholder: 'Enter your email',
        icon: 'pi-envelope',
        type: 'email',
        autocomplete: 'email',
        inputmode: 'email',
    },

    password: {
        label: 'Password',
        placeholder: 'Enter your password',
        icon: 'pi-lock',
        type: 'password',
        autocomplete: 'current-password',
        revealable: true,
    },

    'new-password': {
        label: 'Password',
        placeholder: 'At least 12 characters',
        hint: 'A passphrase beats symbols.',
        icon: 'pi-lock',
        type: 'password',
        autocomplete: 'new-password',
        revealable: true,
    },

    username: {
        label: 'Username',
        placeholder: 'Choose a username',
        icon: 'pi-at',
        autocomplete: 'username',
    },

    name: {
        label: 'Full name',
        placeholder: 'As it appears on your ID',
        icon: 'pi-user',
        autocomplete: 'name',
    },

    search: {
        label: 'Search',
        placeholder: 'Search…',
        icon: 'pi-search',
        type: 'search',
        labelMode: 'hidden',
        corner: 'pill',
        clearable: true,
    },

    phone: {
        label: 'Phone',
        placeholder: '+855 12 000 000',
        icon: 'pi-phone',
        type: 'tel',
        autocomplete: 'tel',
        inputmode: 'tel',
    },

    url: {
        label: 'Website',
        placeholder: 'oudom.design',
        prefix: 'https://',
        prefixIcon: 'pi-globe',
        type: 'url',
        inputmode: 'url',
    },

    company: {
        label: 'Company',
        placeholder: 'Where do you work?',
        icon: 'pi-building',
        autocomplete: 'organization',
    },

    'job-title': {
        label: 'Job title',
        placeholder: 'Senior Product Designer',
        icon: 'pi-briefcase',
        autocomplete: 'organization-title',
    },

    location: {
        label: 'Location',
        placeholder: 'City and country',
        icon: 'pi-map-marker',
        clearable: true,
    },

    amount: {
        label: 'Amount',
        placeholder: '0.00',
        prefix: '$',
        numeric: true,
        inputmode: 'decimal',
    },

    /* ── auth pair ──────────────────────────────────────────────────
       The sign-in look: minimal skin, roomier box, person icon rather
       than an envelope. Same overridability as any other preset. */
    'auth-email': {
        label: 'Email',
        placeholder: 'Enter your email',
        icon: 'pi-user',
        type: 'email',
        autocomplete: 'email',
        inputmode: 'email',
        skin: 'minimal',
        height: 56,
    },

    'auth-password': {
        label: 'Password',
        placeholder: 'Enter your password',
        icon: 'pi-lock',
        type: 'password',
        autocomplete: 'current-password',
        revealable: true,
        skin: 'minimal',
        height: 56,
    },

    bio: {
        label: 'Summary',
        placeholder: 'Three sentences is the sweet spot.',
        multiline: true,
        rows: 3,
        counter: true,
        maxlength: 400,
        labelMode: 'stacked',
    },
};

/**
 * The live preset registry. provideElvField({ presets }) merges custom
 * entries over these — same key replaces, new key extends.
 */
export const ELV_FIELD_PRESETS = new InjectionToken<Record<string, ElvFieldPresetDef>>('ELV_FIELD_PRESETS', {
    providedIn: 'root',
    factory: () => ELV_BUILTIN_PRESETS,
});
