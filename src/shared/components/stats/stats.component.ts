import { Component, Input } from '@angular/core';

export interface Stat {
  value: string;
  label: string;
  icon?: string;
}

export type ElvStatsSkin    = 'glass' | 'solid' | 'outline' | 'accent' | 'ghost' | 'minimal';
export type ElvStatsSize    = 'small' | 'medium' | 'large';
export type ElvStatsCorner  = 'notch' | 'round' | 'sharp';
export type ElvStatsDivider = 'line' | 'gap' | 'none';
export type ElvStatsLayout  = 'row' | 'grid';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
})
export class StatsComponent {
  @Input({ required: true }) stats: Stat[] = [];

  @Input() skin: ElvStatsSkin       = 'glass';
  @Input() size: ElvStatsSize       = 'medium';
  @Input() corner: ElvStatsCorner   = 'notch';
  @Input() divider: ElvStatsDivider = 'line';
  @Input() layout: ElvStatsLayout   = 'row';

  @Input() label       = '';
  @Input() accentColor = '';
  @Input() valueGlow   = true;
  @Input() customClass = '';

  get classes(): string {
    return [
      'elv-stats',
      `elv-stats--${this.skin}`,
      `elv-stats--${this.size}`,
      `elv-stats--${this.corner}`,
      `elv-stats--divider-${this.divider}`,
      `elv-stats--layout-${this.layout}`,
      this.valueGlow ? 'elv-stats--glow' : '',
      this.customClass,
    ].filter(Boolean).join(' ');
  }
}

// ── Usage ─────────────────────────────────────────────────────────
// Required:
// <app-stats [stats]="[{ value: '98%', label: 'Uptime' }]" />
//
// Skins (glass | solid | outline | accent | ghost | minimal):
// <app-stats [stats]="data" skin="glass" />
// <app-stats [stats]="data" skin="solid" />
// <app-stats [stats]="data" skin="outline" />
// <app-stats [stats]="data" skin="accent" />
// <app-stats [stats]="data" skin="minimal" />
//
// Sizes (small | medium | large):
// <app-stats [stats]="data" size="small" />
// <app-stats [stats]="data" size="large" />
//
// Corners (notch | round | sharp):
// <app-stats [stats]="data" corner="notch" />
// <app-stats [stats]="data" corner="round" />
// <app-stats [stats]="data" corner="sharp" />
//
// Dividers (line | gap | none):
// <app-stats [stats]="data" divider="line" />   // hairline border between items
// <app-stats [stats]="data" divider="gap" />    // spaced sub-cards (best with round/sharp)
// <app-stats [stats]="data" divider="none" />
//
// Layout (row | grid):
// <app-stats [stats]="data" layout="row" />
// <app-stats [stats]="data" layout="grid" />
//
// Optional label header:
// <app-stats [stats]="data" label="KEY METRICS" />
//
// With icons (per stat):
// <app-stats [stats]="[{ value: '12k', label: 'Users', icon: 'pi pi-users' }]" />
//
// Disable glow on values:
// <app-stats [stats]="data" [valueGlow]="false" />
//
// Per-instance accent color override:
// <app-stats [stats]="data" accentColor="#ff5b8a" />
//
// Compose freely:
// <app-stats [stats]="data" skin="solid" size="large" corner="round" divider="gap" label="Stats" />
