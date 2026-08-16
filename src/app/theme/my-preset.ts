/**
 * ELEVATOR — PrimeNG Aura preset
 * ------------------------------------------------------------
 * Mirrors the ELEVATOR design system (see ../styles.css) onto
 * PrimeNG's Aura tokens, so every PrimeNG component picks up:
 *   • mint neon accent  (#5bffa6 family) as `primary`
 *   • cool near-black surfaces (matching --bg-0/--panel/--panel-hi)
 *   • zero border-radius (flat / notched chrome aesthetic)
 *   • mono / display fonts already loaded by the app
 *   • accent-glow focus ring + selection state
 *
 * Apply it once at bootstrap and ALL components inherit it:
 *
 *   import { providePrimeNG } from 'primeng/config';
 *   import { ElevatorPreset } from './theme/elevator-preset';
 *
 *   providers: [
 *     providePrimeNG({
 *       theme: {
 *         preset: ElevatorPreset,
 *         options: {
 *           darkModeSelector: '.dark',   // or 'system' / false
 *           cssLayer: { name: 'primeng', order: 'tailwind-base, primeng, app' }
 *         }
 *       }
 *     })
 *   ]
 * ------------------------------------------------------------ */

import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

import { INVARIANT_TOKENS } from './theme.tokens';
import { BASE_THEME } from './themes';

export const ElevatorPreset = definePreset(Aura, {
  /* ============================================================
     PRIMITIVE — raw scales referenced by `semantic` below.
     Mirrors ELEVATOR's --accent (#5bffa6) and cool slate surfaces.
     ============================================================ */
  primitive: {
    /* mint scale anchored on --accent #5bffa6 */
    mint: {
      50:  '#ecfdf5',
      100: '#d1fae9',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#5bffa6',  /* ← Elevator --accent */
      500: '#34d399',
      600: '#10b981',
      700: '#059669',
      800: '#047857',
      900: '#064e3b',
      950: '#022c22',
    },
    /* slate scale mapped to Elevator surfaces / ink */
    slate: {
      50:  '#f5f7fa',
      100: '#e9eef5',  /* --ink */
      200: '#cbd5e1',
      300: '#aab4c2',  /* --ink-2 */
      400: '#6b7585',  /* --ink-3 */
      500: '#454f5e',  /* --ink-4 */
      600: '#2a3340',
      700: '#1a2230',
      800: '#111824',  /* --panel-hi */
      900: '#0a0e15',  /* --panel */
      950: '#04060a',  /* --bg-0 */
    },
    borderRadius: {
      none: '0',
      xs:   '0',         /* flat / notched language → no radius */
      sm:   '0',
      md:   '0',
      lg:   '0',
      xl:   '0',
    },
    /* ── ELEVATOR tokens ────────────────────────────────────────────────
       Emitted as `--p-elevator-*`. The VALUES are not written here: they
       come from the theme registry, so the compile-time defaults and the
       runtime switcher can never drift apart. Adding a token means adding
       it to `theme.tokens.ts`; adding a palette means adding an object to
       `themes.ts`. Neither one edits this file.

       `BASE_THEME` is what lands on `:root`. `ThemeService` writes the same
       property names onto <html> as inline styles, which outrank `:root`,
       so a theme change needs no stylesheet swap and no `!important`. */
    elevator: {
      ...BASE_THEME,
      ...INVARIANT_TOKENS,
    },
  },

  /* ============================================================
     SEMANTIC — what components actually consume.
     ============================================================ */
  semantic: {
    transitionDuration: '0.25s',
    focusRing: {
      width: '1px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: '0 0 0 4px color-mix(in oklch, {primary.color} 30%, transparent)',
    },
    disabledOpacity: '0.45',
    iconSize: '1rem',
    anchorGutter: '4px',

    primary: {
      50:  '{mint.50}',
      100: '{mint.100}',
      200: '{mint.200}',
      300: '{mint.300}',
      400: '{mint.400}',
      500: '{mint.400}',  /* base = Elevator's exact #5bffa6 */
      600: '{mint.500}',
      700: '{mint.600}',
      800: '{mint.700}',
      900: '{mint.800}',
      950: '{mint.900}',
    },

    formField: {
      paddingX: '0.875rem',
      paddingY: '0.625rem',
      sm:    { fontSize: '0.875rem', paddingX: '0.625rem', paddingY: '0.4375rem' },
      lg:    { fontSize: '1.125rem', paddingX: '1rem',     paddingY: '0.75rem'   },
      borderRadius: '0',
      focusRing: {
        width: '1px',
        style: 'solid',
        color: '{primary.color}',
        offset: '0',
        shadow: '0 0 0 1px {primary.color}, 0 0 22px -4px color-mix(in oklch, {primary.color} 45%, transparent)',
      },
      transitionDuration: '{transition.duration}',
    },

    list: {
      padding: '0.25rem 0.25rem',
      gap: '2px',
      header:  { padding: '0.625rem 1rem 0.5rem 1rem' },
      option:  { padding: '0.625rem 0.875rem', borderRadius: '0' },
      optionGroup: { padding: '0.625rem 0.875rem', fontWeight: '600' },
    },

    content: {
      borderRadius: '0',
    },

    mask: {
      background: 'rgba(4, 6, 10, 0.78)',
      color: '{surface.0}',
      transitionDuration: '0.2s',
    },

    navigation: {
      list:   { padding: '0.25rem 0.25rem', gap: '2px' },
      item:   { padding: '0.625rem 0.875rem', borderRadius: '0', gap: '0.5rem' },
      submenuLabel: { padding: '0.5rem 0.75rem', fontWeight: '600' },
      submenuIcon:  { size: '0.875rem' },
    },

    overlay: {
      select:    { borderRadius: '0', shadow: '0 18px 40px -16px rgba(0,0,0,.6), 0 0 0 1px rgba(150,180,210,.12)' },
      popover:   { borderRadius: '0', padding: '0.75rem',
                   shadow: '0 18px 40px -16px rgba(0,0,0,.6), 0 0 0 1px rgba(150,180,210,.12)' },
      modal:     { borderRadius: '0', padding: '1.25rem',
                   shadow: '0 30px 80px -20px rgba(0,0,0,.7), 0 0 0 1px rgba(150,180,210,.18)' },
      navigation:{ shadow: '0 18px 40px -16px rgba(0,0,0,.6), 0 0 0 1px rgba(150,180,210,.12)' },
    },

    /* ----------------------------------------------------------
       LIGHT SCHEME  — kept paper-light for print/CV preview.
       (The ELEVATOR app itself runs dark; light is for the
        CV document and any printable surfaces.)
       ---------------------------------------------------------- */
    colorScheme: {
      light: {
        /* PrimeNG's primary IS the theme accent, not a colour of its own.
           Referencing the elevator tokens compiles to `var(--p-elevator-…)`,
           so when ThemeService rewrites those variables every PrimeNG
           component re-skins in the same frame as our own CSS. Hard-coding a
           hex here is what makes a theme switch look half-finished. */
        primary: {
          color: '{elevator.accent}',
          contrastColor: '{elevator.accentInk}',
          hoverColor: 'color-mix(in oklch, {elevator.accent} 88%, #ffffff)',
          activeColor: 'color-mix(in oklch, {elevator.accent} 76%, #000000)',
        },
        highlight: {
          background: 'color-mix(in oklch, {primary.color} 22%, transparent)',
          focusBackground: 'color-mix(in oklch, {primary.color} 30%, transparent)',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
        mask: {
          background: 'rgba(10, 14, 21, 0.4)',
          color: '{surface.0}',
        },
        formField: {
          background: '#ffffff',
          disabledBackground: '{surface.100}',
          filledBackground: '{surface.50}',
          filledHoverBackground: '{surface.100}',
          filledFocusBackground: '{surface.0}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '#dc2626',
          color: '{surface.900}',
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.500}',
          floatLabelColor: '{surface.500}',
          floatLabelFocusColor: '{primary.color}',
          floatLabelActiveColor: '{primary.color}',
          floatLabelInvalidColor: '#dc2626',
          iconColor: '{surface.500}',
          shadow: 'none',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.500}',
          hoverMutedColor: '{surface.600}',
        },
        content: {
          background: '{surface.0}',
          hoverBackground: '{surface.50}',
          borderColor: '{surface.200}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}',
        },
        overlay: {
          select:  { background: '{surface.0}', borderColor: '{surface.200}', color: '{text.color}' },
          popover: { background: '{surface.0}', borderColor: '{surface.200}', color: '{text.color}' },
          modal:   { background: '{surface.0}', borderColor: '{surface.200}', color: '{text.color}' },
        },
        list: {
          option: {
            focusBackground: '{surface.100}',
            selectedBackground: 'color-mix(in oklch, {primary.color} 18%, transparent)',
            selectedFocusBackground: 'color-mix(in oklch, {primary.color} 26%, transparent)',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            selectedColor: '{primary.700}',
            selectedFocusColor: '{primary.800}',
            icon:        { color: '{surface.400}', focusColor: '{surface.500}' },
          },
          optionGroup: { background: 'transparent', color: '{text.muted.color}' },
        },
        navigation: {
          item: {
            focusBackground: '{surface.100}',
            activeBackground: 'color-mix(in oklch, {primary.color} 18%, transparent)',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            activeColor: '{primary.700}',
            icon:    { color: '{surface.400}', focusColor: '{surface.500}', activeColor: '{primary.700}' },
          },
          submenuLabel: { background: 'transparent', color: '{text.muted.color}' },
          submenuIcon:  { color: '{surface.400}', focusColor: '{surface.500}', activeColor: '{primary.700}' },
        },
        surface: {
          0: '#ffffff',
          50:  '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },

      /* ----------------------------------------------------------
         DARK SCHEME — the real ELEVATOR look.
         ---------------------------------------------------------- */
      dark: {
        primary: {
          color: '{elevator.accent}',
          contrastColor: '{elevator.accentInk}',
          hoverColor: 'color-mix(in oklch, {elevator.accent} 92%, #ffffff)',
          activeColor: 'color-mix(in oklch, {elevator.accent} 80%, #ffffff)',
        },
        highlight: {
          background: 'color-mix(in oklch, {primary.color} 22%, transparent)',
          focusBackground: 'color-mix(in oklch, {primary.color} 34%, transparent)',
          color: '{primary.color}',
          focusColor: '#ffffff',
        },
        mask: {
          background: 'rgba(4, 6, 10, 0.78)',
          color: '{surface.0}',
        },
        formField: {
          background: 'rgba(255, 255, 255, 0.02)',
          disabledBackground: '{surface.800}',
          filledBackground: 'rgba(255, 255, 255, 0.04)',
          filledHoverBackground: 'rgba(255, 255, 255, 0.06)',
          filledFocusBackground: 'rgba(91, 255, 166, 0.06)',
          borderColor: 'rgba(150, 180, 210, 0.22)',   /* --line-strong */
          hoverBorderColor: 'rgba(150, 180, 210, 0.40)',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '#ff6b81',
          color: '#e9eef5',                            /* --ink */
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.400}',
          floatLabelColor: '{surface.400}',
          floatLabelFocusColor: '{primary.color}',
          floatLabelActiveColor: '{primary.color}',
          floatLabelInvalidColor: '#ff6b81',
          iconColor: '{surface.400}',
          shadow: 'none',
        },
        text: {
          color: '#e9eef5',
          hoverColor: '#ffffff',
          mutedColor: '#aab4c2',
          hoverMutedColor: '#cbd5e1',
        },
        content: {
          background: '{surface.900}',                /* --panel */
          hoverBackground: '{surface.800}',           /* --panel-hi */
          borderColor: 'rgba(150, 180, 210, 0.12)',   /* --line */
          color: '{text.color}',
          hoverColor: '{text.hover.color}',
        },
        overlay: {
          select:  { background: '{surface.900}', borderColor: 'rgba(150,180,210,.18)', color: '{text.color}' },
          popover: { background: '{surface.900}', borderColor: 'rgba(150,180,210,.18)', color: '{text.color}' },
          modal:   { background: '{surface.950}', borderColor: 'rgba(150,180,210,.22)', color: '{text.color}' },
        },
        list: {
          option: {
            focusBackground: 'rgba(255, 255, 255, 0.04)',
            selectedBackground: 'color-mix(in oklch, {primary.color} 18%, transparent)',
            selectedFocusBackground: 'color-mix(in oklch, {primary.color} 28%, transparent)',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            selectedColor: '{primary.color}',
            selectedFocusColor: '#ffffff',
            icon:        { color: '{surface.400}', focusColor: '{surface.300}' },
          },
          optionGroup: { background: 'transparent', color: '{text.muted.color}' },
        },
        navigation: {
          item: {
            focusBackground: 'rgba(255, 255, 255, 0.04)',
            activeBackground: 'color-mix(in oklch, {primary.color} 20%, transparent)',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            activeColor: '{primary.color}',
            icon:    { color: '{surface.400}', focusColor: '{surface.300}', activeColor: '{primary.color}' },
          },
          submenuLabel: { background: 'transparent', color: '{text.muted.color}' },
          submenuIcon:  { color: '{surface.400}', focusColor: '{surface.300}', activeColor: '{primary.color}' },
        },
        surface: {
          0:   '#ffffff',
          50:  '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',   /* #111824 — panel-hi */
          900: '{slate.900}',   /* #0a0e15 — panel    */
          950: '{slate.950}',   /* #04060a — bg-0     */
        },
      },
    },
  },

  /* ============================================================
     COMPONENT OVERRIDES — apply Elevator's component language
     (notched / sharp / mono caps / accent glow) where it differs
     materially from Aura's defaults. Add more here as needed.
     ============================================================ */
  components: {
    button: {
      borderRadius: '0',
      paddingX: '1.25rem',
      paddingY: '0.6875rem',
      gap: '0.625rem',
      label:  { fontWeight: '700' },
      iconOnlyWidth: '2.5rem',
      sm: { fontSize: '0.8125rem', paddingX: '0.875rem', paddingY: '0.5rem' },
      lg: { fontSize: '1rem',     paddingX: '1.5rem',   paddingY: '0.8125rem' },
      raisedShadow: '0 0 22px -4px color-mix(in oklch, {primary.color} 50%, transparent)',
      colorScheme: {
        light: {
          root: { primary: { background: '{primary.color}', hoverBackground: '{primary.hover.color}',
                             activeBackground: '{primary.active.color}', borderColor: '{primary.color}',
                             hoverBorderColor: '{primary.hover.color}', activeBorderColor: '{primary.active.color}',
                             color: '{primary.contrast.color}', hoverColor: '{primary.contrast.color}',
                             activeColor: '{primary.contrast.color}', focusRing: { color: '{primary.color}', shadow: 'none' } } },
        },
        dark: {
          root: { primary: { background: '{primary.color}', hoverBackground: '{primary.hover.color}',
                             activeBackground: '{primary.active.color}', borderColor: '{primary.color}',
                             hoverBorderColor: '{primary.hover.color}', activeBorderColor: '{primary.active.color}',
                             color: '{elevator.accentInk}', hoverColor: '{elevator.accentInk}',
                             activeColor: '{elevator.accentInk}',
                             focusRing: { color: '{primary.color}',
                               shadow: '0 0 0 1px {primary.color}, 0 0 24px -2px color-mix(in oklch, {primary.color} 45%, transparent)' } } },
        },
      },
    },

    inputtext: { borderRadius: '0' },
    select:    { borderRadius: '0' },
    textarea:  { borderRadius: '0' },
    checkbox:  { borderRadius: '0', width: '1.125rem', height: '1.125rem' },
    radiobutton: { width: '1.125rem', height: '1.125rem' },
    togglebutton:{ borderRadius: '0' },
    chip:      { borderRadius: '0' },
    tag:       { borderRadius: '0', fontWeight: '600' },
    badge:     { borderRadius: '0' },
    card:      { borderRadius: '0', shadow: 'none' },
    panel:     { borderRadius: '0' },
    dialog:    { borderRadius: '0' },
    drawer:    { borderRadius: '0' },
    menu:      { borderRadius: '0' },
    menubar:   { borderRadius: '0' },
    tabs:      { borderRadius: '0' },
    accordion: { borderRadius: '0' },
    toast:     { borderRadius: '0' },
    message:   { borderRadius: '0' },
    progressbar: { borderRadius: '0', height: '6px' },
    slider:    { handle: { borderRadius: '0' }, range: { background: '{primary.color}' } },
    tooltip:   { borderRadius: '0' },
    paginator: { borderRadius: '0' },
    table:     { headerCell: { fontWeight: '700' } },
  },
});

export default ElevatorPreset;