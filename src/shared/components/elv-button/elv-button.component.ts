import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-elv-button',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, RippleModule], // pRipple did nothing before
  templateUrl: './elv-button.component.html',
  styleUrl: './elv-button.component.scss',
})
export class ElvButtonComponent {
  @Input() title = '';
  @Input() icon = '';                                   // e.g. 'pi-bolt'  (NOT 'pi pi-bolt')
  @Input() variant: 'primary' | 'ghost' = 'ghost';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() corner: 'notch' | 'round' | 'sharp' = 'notch';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() customClass = '';
  @Input() url = '';                                    // internal route or external href
  @Input() ariaLabel = '';

  @Output() clicked = new EventEmitter<MouseEvent>();   // replaces the action() input

  get isExternal(): boolean { return /^https?:\/\//.test(this.url); }

  get classes(): string[] {
    return [
      'elv-btn',
      `elv-btn-${this.variant}`,
      `elv-btn--${this.size}`,
      `elv-btn--${this.corner}`,
      this.disabled ? 'elv-btn--disabled' : '',
      this.customClass,
    ].filter(Boolean);
  }

  onClick(e: MouseEvent) {
    if (this.disabled) { e.preventDefault(); e.stopPropagation(); return; }
    this.clicked.emit(e);
  }
}