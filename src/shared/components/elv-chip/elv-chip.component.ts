import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-elv-chip',
  standalone: true,
  imports: [],
  templateUrl: './elv-chip.component.html',
  styleUrl: './elv-chip.component.scss',
})
export class ElvChipComponent {
  @Input() title = '';
  @Input() icon = '';                                   // e.g. 'pi-bolt'  (NOT 'pi pi-bolt')
  @Input() customClass = '';
  @Input() corner: 'notch' | 'round' | 'sharp' = 'notch';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'primary' | 'ghost' = 'ghost';
  @Input() ariaLabel = '';

  get classes(): string {
    return [
      'elv-chip',
      `elv-chip--${this.variant}`,
      `elv-chip--${this.size}`,
      `elv-chip--${this.corner}`,
      this.customClass,
    ].filter(Boolean).join(' ');
  }
}