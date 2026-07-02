import { Component, EventEmitter, Input, Output, HostBinding, input } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RippleModule } from 'primeng/ripple';

export type ElvBtnVariant =
  | 'primary' | 'ghost' | 'outline' | 'solid'
  | 'accent' | 'danger' | 'success' | 'glow' | 'link';
export type ElvBtnSize = 'small' | 'medium' | 'large';
export type ElvBtnCorner = 'notch' | 'round' | 'sharp' | 'pill';

@Component({
  selector: 'app-elv-button',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, RippleModule],
  templateUrl: './elv-button.component.html',
  styleUrl: './elv-button.component.scss',
})
export class ElvButtonComponent {
  @Input() title = '';
  @Input() icon = '';                 // leading primeicon, e.g. 'pi-bolt' (NOT 'pi pi-bolt')
  @Input() iconRight = '';            // trailing primeicon
  @Input() variant: ElvBtnVariant = 'ghost';
  @Input() size: ElvBtnSize = 'medium';
  @Input() corner: ElvBtnCorner = 'notch';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() block = false;             // full-width
  @Input() iconOnly = false;          // square icon button (pass ariaLabel!)
  @Input() brackets = false;          // HUD corner ticks
  @Input() customClass = '';
  @Input() url = '';                  // internal route or external href
  @Input() ariaLabel = '';
  @Input() fillColor: string | null = null;    // override the surface fill
  @Input() accentColor: string | null = null;  // override the accent for this button
  @Input() iconStyle: string | null = null

  @Output() clicked = new EventEmitter<MouseEvent>();

  @HostBinding('class.elv-host-block') get hostBlock() { return this.block; }
  @HostBinding('style.--_accent') get accentVar() { return this.accentColor; }

  get isExternal(): boolean { return /^https?:\/\//.test(this.url); }
  get isDisabled(): boolean { return this.disabled || this.loading; }

  get classes(): string[] {
    return [
      'elv-btn',
      `elv-btn--${this.variant}`,
      `elv-btn--${this.size}`,
      `elv-btn--${this.corner}`,
      this.block ? 'elv-btn--block' : '',
      this.iconOnly ? 'elv-btn--icon' : '',
      this.brackets ? 'elv-btn--brackets' : '',
      this.loading ? 'elv-btn--loading' : '',
      this.disabled ? 'elv-btn--disabled' : '',
      this.customClass,
    ].filter(Boolean);
  }

  onClick(e: MouseEvent) {
    if (this.isDisabled) { e.preventDefault(); e.stopPropagation(); return; }
    this.clicked.emit(e);
  }
}

// Usage

// <!-- VARIANTS (9) -->
// <app-elv-button variant="primary" title="Get started" icon="pi-bolt" />
// <app-elv-button variant="ghost"   title="Cancel" />
// <app-elv-button variant="outline" title="Details" />
// <app-elv-button variant="solid"   title="Filter" />
// <app-elv-button variant="accent"  title="Featured" icon="pi-star" />
// <app-elv-button variant="danger"  title="Delete" icon="pi-trash" (clicked)="remove()" />
// <app-elv-button variant="success" title="Confirm" icon="pi-check" />
// <app-elv-button variant="glow"    title="Build my CV — free" icon="pi-bolt" />
// <app-elv-button variant="link"    title="Learn more" iconRight="pi-arrow-up-right" />

// <!-- SIZES -->
// <app-elv-button variant="primary" size="small"  title="Small" />
// <app-elv-button variant="primary" size="medium" title="Medium" />
// <app-elv-button variant="primary" size="large"  title="Large" />

// <!-- CORNERS -->
// <app-elv-button variant="ghost" corner="notch" title="Notch" />
// <app-elv-button variant="ghost" corner="round" title="Round" />
// <app-elv-button variant="ghost" corner="sharp" title="Sharp" />
// <app-elv-button variant="ghost" corner="pill"  title="Pill" />

// <!-- ICONS: leading / trailing / both -->
// <app-elv-button variant="primary" icon="pi-download" title="Export" />
// <app-elv-button variant="ghost"   title="Next" iconRight="pi-arrow-right" />
// <app-elv-button variant="primary" icon="pi-bolt" iconRight="pi-arrow-right" title="Go" />

// <!-- ICON-ONLY (square — always give ariaLabel) -->
// <app-elv-button variant="ghost"   [iconOnly]="true" icon="pi-cog"   ariaLabel="Settings" />
// <app-elv-button variant="outline" [iconOnly]="true" icon="pi-heart" ariaLabel="Like" corner="round" />
// <app-elv-button variant="accent"  [iconOnly]="true" icon="pi-plus"  ariaLabel="Add" corner="pill" />

// <!-- STATES -->
// <app-elv-button variant="primary" title="Saving…" [loading]="isSaving" (clicked)="save()" />
// <app-elv-button variant="primary" title="Submit"  [disabled]="form.invalid" />

// <!-- LINKS (renders a real <a>) -->
// <app-elv-button variant="ghost" title="Templates" url="/templates" />          <!-- internal routerLink -->
// <app-elv-button variant="link"  title="Docs" url="https://example.com/docs" /> <!-- external, new tab -->

// <!-- FORM SUBMIT -->
// <form (ngSubmit)="onSubmit()">
//   <app-elv-button variant="primary" type="submit" title="Create account" [block]="true" />
// </form>

// <!-- BLOCK (full width) -->
// <app-elv-button variant="primary" [block]="true" title="Continue" icon="pi-arrow-right" />

// <!-- HUD BRACKETS (best with sharp/round) -->
// <app-elv-button variant="ghost" corner="sharp" [brackets]="true" title="Engage" />

// <!-- THEMING per-button -->
// <app-elv-button variant="primary" [fillColor]="'#7c3aed'" title="Purple" />          <!-- fixed fill -->
// <app-elv-button variant="outline" [accentColor]="'#ff5b8a'" title="Pink accent" />    <!-- recolor accent -->

// <!-- CUSTOM CONTENT via projection + extra classes -->
// <app-elv-button variant="ghost" customClass="col-span-2">
//   <img src="/assets/google.svg" style="width:16px"> Continue with Google
// </app-elv-button>

// <!-- “MIX UP” — compose freely -->
// <app-elv-button variant="danger" size="large" corner="pill" icon="pi-power-off"
//                 [block]="true" [loading]="shuttingDown" (clicked)="shutdown()"
//                 title="Shut down" />
// <app-elv-button variant="glow" size="small" corner="round" [brackets]="true"
//                 icon="pi-sparkles" title="AI rewrite" [accentColor]="'#5bffa6'" />
//