import { Component, EventEmitter, Input, Output } from '@angular/core';

/* ── Composable axes ──────────────────────────────────────────── */
export type ElvChipSkin =
  | 'soft'      // faint fill + hairline border (the classic chip)
  | 'outline'   // border only, transparent fill
  | 'solid'     // filled surface
  | 'accent'    // accent-tinted (the old "primary")
  | 'glass'     // translucent + backdrop blur
  | 'plain';    // no fill, no border, no padding — icon + text only

export type ElvChipSize    = 'small' | 'medium' | 'large';
export type ElvChipCorner  = 'notch' | 'round' | 'pill' | 'sharp';
export type ElvChipFrame   = 'none' | 'circle' | 'round' | 'square';  // shape drawn around the icon
export type ElvChipIconPos = 'start' | 'end';
export type ElvChipAlign   = 'start' | 'center' | 'end';

/* ── Presets (variant) ────────────────────────────────────────── */
export type ElvChipVariant =
  | 'badge'     // classic one-line chip (default)
  | 'ghost'     // alias of badge — kept for back-compat
  | 'primary'   // accent-tinted — kept for back-compat
  | 'outline'
  | 'solid'
  | 'glass'
  | 'feature'   // pill chip + circular framed icon + title/description (picture 1)
  | 'bare';     // no box, plain icon + title/description (picture 2)

interface PresetDef {
  skin?: ElvChipSkin;
  corner?: ElvChipCorner;
  frame?: ElvChipFrame;
}

const PRESETS: Record<ElvChipVariant, PresetDef> = {
  badge:   { skin: 'soft',    corner: 'notch', frame: 'none'   },
  ghost:   { skin: 'soft',    corner: 'notch', frame: 'none'   },
  primary: { skin: 'accent',  corner: 'notch', frame: 'none'   },
  outline: { skin: 'outline', corner: 'notch', frame: 'none'   },
  solid:   { skin: 'solid',   corner: 'round', frame: 'none'   },
  glass:   { skin: 'glass',   corner: 'round', frame: 'none'   },
  feature: { skin: 'soft',    corner: 'pill',  frame: 'circle' },
  bare:    { skin: 'plain',   corner: 'sharp', frame: 'none'   },
};

@Component({
  selector: 'app-elv-chip',
  standalone: true,
  imports: [],
  templateUrl: './elv-chip.component.html',
  styleUrl: './elv-chip.component.scss',
})
export class ElvChipComponent {
  /** Preset that pre-sets skin + corner + icon-frame for a common case. */
  @Input() variant: ElvChipVariant = 'badge';

  /* Composable axes — any of these overrides the preset. */
  @Input() skin?: ElvChipSkin;
  @Input() corner?: ElvChipCorner;
  @Input() frame?: ElvChipFrame;          // icon frame shape (none = bare glyph)
  @Input() size: ElvChipSize = 'medium';
  @Input() iconPos: ElvChipIconPos = 'start';
  @Input() align: ElvChipAlign = 'start';

  /* Content. `icon` is the FULL icon class — library-agnostic.
     PrimeIcons:   'pi pi-bolt'        FontAwesome: 'fa-solid fa-rocket' */
  @Input() icon = '';
  @Input() title = '';
  @Input() description = '';

  /* Behaviour / theming. */
  @Input() interactive = false;
  @Input() accentColor = '';              // per-chip accent override (any CSS color)
  @Input() ariaLabel = '';
  @Input() customClass = '';

  /** Fires on click / Enter / Space when [interactive]="true". */
  @Output() clicked = new EventEmitter<Event>();

  private get preset(): PresetDef { return PRESETS[this.variant] ?? {}; }
  get rSkin(): ElvChipSkin   { return this.skin   ?? this.preset.skin   ?? 'soft';  }
  get rCorner(): ElvChipCorner { return this.corner ?? this.preset.corner ?? 'notch'; }
  get rFrame(): ElvChipFrame { return this.frame  ?? this.preset.frame  ?? 'none';  }

  get hasText(): boolean { return !!this.title || !!this.description; }
  /** Icon-only chips need an explicit label; otherwise the text is the label. */
  get resolvedAriaLabel(): string | null { return this.ariaLabel || null; }

  get classes(): string {
    return [
      'elv-chip',
      `elv-chip--${this.rSkin}`,
      `elv-chip--${this.size}`,
      `elv-chip--${this.rCorner}`,
      `elv-chip--frame-${this.rFrame}`,
      `elv-chip--icon-${this.iconPos}`,
      `elv-chip--align-${this.align}`,
      this.description ? 'elv-chip--has-desc' : '',
      this.interactive ? 'elv-chip--interactive' : '',
      this.customClass,
    ].filter(Boolean).join(' ');
  }

  onActivate(e: Event): void {
    if (this.interactive) this.clicked.emit(e);
  }

  onKeydown(e: KeyboardEvent): void {
    if (this.interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.clicked.emit(e);
    }
  }
}