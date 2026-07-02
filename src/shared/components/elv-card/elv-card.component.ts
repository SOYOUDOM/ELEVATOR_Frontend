import {
  Component, EventEmitter, HostListener, Input, Output, ViewEncapsulation,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

export type ElvCardSkin =
  | 'panel' | 'outline' | 'ghost' | 'glass' | 'accent' | 'gradient' | 'elevated' | 'solid';
export type ElvCardLayout = 'stack' | 'center' | 'step' | 'split' | 'row';
export type ElvCardCorner = 'notch' | 'round' | 'sharp';
export type ElvCardSize = 'sm' | 'md' | 'lg' | 'none';
export type ElvCardHover = 'none' | 'lift' | 'glow' | 'saber' | 'border';
export type ElvCardVariant =
  | 'panel' | 'feature' | 'step' | 'stat' | 'spotlight' | 'cta' | 'outline'
  | 'ghost' | 'glass' | 'accent' | 'gradient' | 'elevated' | 'media';

interface PresetDef {
  skin?: ElvCardSkin; layout?: ElvCardLayout; hover?: ElvCardHover;
  size?: ElvCardSize; ticks?: boolean; glow?: boolean;
}

const PRESETS: Record<ElvCardVariant, PresetDef> = {
  panel:     { skin: 'panel',    layout: 'stack' },
  feature:   { skin: 'panel',    layout: 'stack',  hover: 'saber', ticks: true },
  step:      { skin: 'panel',    layout: 'step',   hover: 'glow' },
  stat:      { skin: 'ghost',    layout: 'center' },
  spotlight: { skin: 'panel',    layout: 'split',  hover: 'saber', ticks: true, size: 'lg' },
  cta:       { skin: 'accent',   layout: 'center', glow: true,     size: 'lg' },
  outline:   { skin: 'outline',  layout: 'stack' },
  ghost:     { skin: 'ghost',    layout: 'stack' },
  glass:     { skin: 'glass',    layout: 'stack' },
  accent:    { skin: 'accent',   layout: 'stack' },
  gradient:  { skin: 'gradient', layout: 'stack' },
  elevated:  { skin: 'elevated', layout: 'stack',  hover: 'lift' },
  media:     { skin: 'panel',    layout: 'split' },
};

@Component({
  selector: 'app-elv-card',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './elv-card.component.html',
  styleUrl: './elv-card.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
  host: {
    '[class]': 'hostClasses',
    '[style.--_accent]': 'accentColor || null',
    '[attr.role]': 'interactiveRole',
    '[attr.tabindex]': 'interactive && !href ? 0 : null',
    '[attr.aria-label]': 'interactive ? (ariaLabel || title || null) : null',
  },
})
export class ElvCardComponent {
  @Input() variant?: ElvCardVariant;

  @Input() skin?: ElvCardSkin;
  @Input() layout?: ElvCardLayout;
  @Input() corner: ElvCardCorner = 'notch';
  @Input() size?: ElvCardSize;
  @Input() hover?: ElvCardHover;
  @Input() ticks?: boolean;
  @Input() glow?: boolean;
  @Input() titleGlow?: boolean;

  @Input() eyebrow = '';
  @Input() num: string | number | null = null;
  @Input() icon = '';                 // primeicons name, e.g. 'pi-bolt'
  @Input() title = '';
  @Input() subtitle = '';
  @Input() text = '';
  @Input() image = '';
  @Input() imageAlt = '';

  @Input() interactive = false;
  @Input() href = '';
  @Input() routerLinkTo: string | any[] | null = null;
  @Input() ariaLabel = '';

  @Input() accentColor = '';
  @Input() customClass = '';

  @Output() activated = new EventEmitter<Event>();

  private get preset(): PresetDef { return this.variant ? PRESETS[this.variant] : {}; }
  get rSkin(): ElvCardSkin { return this.skin ?? this.preset.skin ?? 'panel'; }
  get rLayout(): ElvCardLayout { return this.layout ?? this.preset.layout ?? 'stack'; }
  get rSize(): ElvCardSize { return this.size ?? this.preset.size ?? 'md'; }
  get rHover(): ElvCardHover { return this.hover ?? this.preset.hover ?? 'none'; }
  get rTicks(): boolean { return this.ticks ?? this.preset.ticks ?? false; }
  get rGlow(): boolean { return this.glow ?? this.preset.glow ?? false; }

  get showHeader(): boolean { return (this.num !== null && this.num !== '') || !!this.icon; }
  get isExternal(): boolean { return /^https?:\/\//i.test(this.href); }
  get interactiveRole(): string | null {
    return this.interactive && !this.href && !this.routerLinkTo ? 'button' : null;
  }

  get hostClasses(): string {
    return [
      'elv-card',
      `elv-card--${this.rSkin}`,
      `elv-card--${this.rLayout}`,
      `elv-card--${this.corner}`,
      `elv-card--${this.rSize}`,
      this.rHover !== 'none' ? `elv-card--hover-${this.rHover}` : '',
      this.rGlow ? 'elv-card--glow' : '',
      this.interactive || this.href || this.routerLinkTo ? 'elv-card--interactive' : '',
      this.customClass,
      this.titleGlow ? 'elv-card--glow-title' : '',
    ].filter(Boolean).join(' ');
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (this.interactive && !this.href && !this.routerLinkTo &&
        (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.activated.emit(e);
    }
  }

  @HostListener('click', ['$event'])
  onClick(e: Event) { if (this.interactive) this.activated.emit(e); }
}




/* ============================================================================
   ElvCard — full usage reference
   <app-elv-card> · selector: app-elv-card
   ============================================================================

   ── 1. PRESETS (variant) ──────────────────────────────────────────────────
   Each preset pre-sets skin + layout + hover/ticks/glow for a common case.
   Any explicit axis input below overrides the preset.

   <app-elv-card variant="panel"     title="Panel"     text="Plain base panel." />
   <app-elv-card variant="feature"   title="Feature"   text="Icon + copy, saber hover, ticks."
                 icon="pi-bolt" num="01" />
   <app-elv-card variant="step"      title="Step"      text="Num left, icon right, divider."
                 [num]="1" icon="pi-upload" />
   <app-elv-card variant="stat"      title="CVs made"  [num]="'9.4k'" />
   <app-elv-card variant="spotlight" title="Spotlight" text="Wide split (media | content)."
                 icon="pi-camera"><div card-media><img src="…"></div></app-elv-card>
   <app-elv-card variant="cta"       title="One upload away" text="Accent + glow, centered."
                 icon="pi-rocket" />
   <app-elv-card variant="outline"   title="Outline"   text="Transparent, strong border." />
   <app-elv-card variant="ghost"     title="Ghost"     text="No border, no fill." />
   <app-elv-card variant="glass"     title="Glass"     text="Translucent + backdrop blur." />
   <app-elv-card variant="accent"    title="Accent"    text="Accent-tinted surface." />
   <app-elv-card variant="gradient"  title="Gradient"  text="Diagonal surface gradient." />
   <app-elv-card variant="elevated"  title="Elevated"  text="Drop shadow, lifts on hover." />
   <app-elv-card variant="media"     title="Media"     text="Split with a media slot."
                 ><div card-media><img src="…"></div></app-elv-card>

   ── 2. COMPOSABLE AXES (use with or without a preset) ─────────────────────

   skin:   panel | outline | ghost | glass | accent | gradient | elevated | solid
   <app-elv-card skin="glass"    title="Glass surface" />
   <app-elv-card skin="gradient" title="Gradient surface" />

   layout: stack | center | step | split | row
   <app-elv-card layout="center" title="Centered content" text="text-align center." />
   <app-elv-card layout="split"  title="Two columns"      ><div card-media>…</div></app-elv-card>
   <app-elv-card layout="row"    title="Media beside copy"><div card-media>…</div></app-elv-card>

   corner: notch | round | sharp        (default: notch)
   <app-elv-card corner="round" title="Rounded" />
   <app-elv-card corner="sharp" title="Square" />

   size:   sm | md | lg | none           (none = zero padding, e.g. media-only)
   <app-elv-card size="sm" title="Tight" />
   <app-elv-card size="lg" title="Roomy" />

   hover:  none | lift | glow | saber | border
   <app-elv-card hover="lift"   title="Lifts up" />
   <app-elv-card hover="glow"   title="Glows" />
   <app-elv-card hover="saber"  title="Light bar sweeps bottom" />
   <app-elv-card hover="border" title="Border lights to accent" />

   ticks:  boolean — decorative corner ticks (top-left + bottom-right)
   <app-elv-card [ticks]="true" title="With ticks" />

   glow:   boolean — ambient radial glow behind content
   <app-elv-card [glow]="true" title="Ambient glow" />

   Compose freely — preset as a base, axes to tweak:
   <app-elv-card variant="feature" corner="round" hover="lift" size="lg"
                 icon="pi-star" title="Custom mix" text="Preset + overrides." />

   ── 3. CONTENT SLOTS ──────────────────────────────────────────────────────

   Structured inputs (styled by the card):
     eyebrow   small mono label above the title
     num       big number / stat (string or number)
     icon      primeicons name — 'pi-bolt'  (NOT 'pi pi-bolt')
     title     heading
     subtitle  secondary line under the title
     text      body paragraph
     image     <img> src rendered into the media slot
     imageAlt  alt text for `image`

   <app-elv-card
     eyebrow="THE TOOLKIT"
     num="03"
     icon="pi-shield"
     title="ATS Score"
     subtitle="Real-time matching"
     text="Scan against any job and see your match score instantly."
     image="/assets/ats.png" imageAlt="ATS score screen" />

   Projection slots (your own markup):
     [card-media]    visual area (top in stack, side in split/row)
     (default)       free-form body, appears after `text`
     [card-actions]  footer row (buttons/chips); auto-hidden if empty

   <app-elv-card title="Custom body">
     <div card-media><img src="/assets/hero.png" alt=""></div>
     <ul><li>Bullet one</li><li>Bullet two</li></ul>   <!-- default slot -->
     <div card-actions>
       <app-elv-button variant="primary" title="Start" (clicked)="go()" />
       <app-elv-chip icon="pi-clock" title="2 min" />
     </div>
   </app-elv-card>

   ── 4. INTERACTIVITY ──────────────────────────────────────────────────────

   Clickable (emits `activated` on click + Enter/Space, role=button, focus ring):
   <app-elv-card [interactive]="true" hover="border"
                 title="Pick me" icon="pi-check"
                 ariaLabel="Select this plan"
                 (activated)="select()" />

   Internal navigation (stretched <a routerLink>, whole card is the link):
   <app-elv-card variant="elevated" title="Templates" icon="pi-th-large"
                 routerLinkTo="/templates" ariaLabel="Browse templates" />
   <app-elv-card title="User 42" routerLinkTo="['/users', 42]" />   <!-- array form -->

   External link (opens new tab, rel=noopener):
   <app-elv-card title="Docs" href="https://example.com/docs" ariaLabel="Open docs" />

   ── 5. THEMING / ESCAPE HATCH ─────────────────────────────────────────────

   accentColor  per-card accent override (any CSS color) — recolors icon,
                ticks, glow, saber, accent skin, hover border:
   <app-elv-card variant="feature" accentColor="#ff5b8a"
                 icon="pi-heart" title="Pink accent" />

   customClass  extra class(es) appended to the host:
   <app-elv-card customClass="col-span-2 my-special-card" title="Wide" />

   ── 6. TYPICAL GRIDS (the card has no outer width — wrap it) ───────────────

   <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
     <app-elv-card *ngFor="let f of features" variant="feature"
                   [icon]="f.piIcon" [num]="f.num" [title]="f.title" [text]="f.desc" />
   </div>

   ── INPUT REFERENCE ───────────────────────────────────────────────────────
   variant?      panel|feature|step|stat|spotlight|cta|outline|ghost|glass|
                 accent|gradient|elevated|media
   skin?         panel|outline|ghost|glass|accent|gradient|elevated|solid
   layout?       stack|center|step|split|row
   corner        notch|round|sharp                    (default 'notch')
   size?         sm|md|lg|none
   hover?        none|lift|glow|saber|border
   ticks?        boolean        glow?        boolean
   eyebrow       string         num          string|number|null
   icon          string         title        string
   subtitle      string         text         string
   image         string         imageAlt     string
   interactive   boolean        href         string (external)
   routerLinkTo  string|any[]   ariaLabel    string
   accentColor   string         customClass  string
   (output) activated  EventEmitter<Event>   — fires on activate when interactive
   ============================================================================ */