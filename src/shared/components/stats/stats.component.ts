import { Component, Input } from '@angular/core';
import {  CardModule }    from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { CommonModule }  from '@angular/common';
import { PanelModule } from 'primeng/panel';


export interface Stat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-stats',
  imports: [CommonModule, CardModule, DividerModule, PanelModule],
  templateUrl: './stats.component.html',
})
export class StatsComponent {
@Input({required: true}) stats: Stat[] = [];
@Input() corner: 'none' | 'notch' | 'round' = 'notch';
@Input() panelFill: 'glass' | 'solid' | 'outline' = 'glass';
}
