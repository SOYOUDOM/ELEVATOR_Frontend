import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { Stat, StatsComponent } from '@shared/components/stats/stats.component';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import {ElvCardComponent} from '@shared/components/elv-card/elv-card.component';
import {ElvCircuitDirective} from '@shared/directives/elv-circuit.directive';
import {FooterComponent} from '../footer.component';
import {ElvCodeFieldComponent, ElvFieldComponent} from '@shared/components/elv-field';



interface Feature {
  icon: string;
  piIcon: string;
  title: string;
  desc: string;
  image?: string;
}
 

 
interface Step {
  num: string;
  piIcon: string;
  title: string;
  desc: string;
}
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ButtonModule, ChipModule, BadgeModule, RippleModule, StatsComponent,ElvFieldComponent,ElvCodeFieldComponent, RevealDirective, ElvButtonComponent, ElvChipComponent,ElvCardComponent,ElvCircuitDirective],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
strengthTone(): import("@shared/components/ui-input").UiInputTone|null {
throw new Error('Method not implemented.');
}
runSearch($event: KeyboardEvent) {
throw new Error('Method not implemented.');
}
 // ── Typewriter ────────────────────────────────────────────────
  typeWords = ['FUTURE.', 'CAREER.', 'STORY.', 'RISE.'];
  displayWord = '';
  private twIndex = 0;
  private twDeleting = false;
  private twTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly TWS = 95;   // type speed ms
  private readonly TWH = 1400; // hold ms
  @Input() CustomClass = '';
 
  // ── Data ─────────────────────────────────────────────────────
  stats: Stat[] = [
    { value: '$0',  label: 'Forever free'     },
    { value: '98%', label: 'Avg. ATS score'   },
    { value: '12+', label: 'Modern templates' },
    { value: '60S', label: 'From upload to PDF' },
  ];
 
  features: Feature[] = [
    {icon: '01', piIcon: 'pi-camera',      title: 'Photo → Studio Headshot',  desc: 'Drop any selfie. The AI puts you in a sharp suit on a clean studio backdrop — a passport-grade shot, free.' },
    {icon: '02', piIcon: 'pi-sparkles',    title: 'AI Writes With You',        desc: 'Stuck on wording? Generate a summary, expand a bullet, or rewrite your whole CV from an old one in seconds.' },
    {icon: '03', piIcon: 'pi-check-circle',title: 'Grammar & Tone Fixes',     desc: 'Live proofreading catches typos and weak phrasing, then suggests stronger, recruiter-ready language.' },
    {icon: '04', piIcon: 'pi-shield',      title: 'ATS Score & Keywords',     desc: 'Scan against any job in real time. See your match score, missing keywords, and exactly what to fix.' },
    {icon: '05', piIcon: 'pi-table',       title: 'Flexible, Modern Templates',desc: 'Canva-level design freedom that stays parseable. Switch layouts without losing a single word.' },
    {icon: '06', piIcon: 'pi-download',    title: '1-Click Export',            desc: 'Pixel-perfect PDF, every time. Watch one short ad and the export is yours — no card, no paywall.' },
  ];
 
  steps: Step[] = [
    { num: '01', piIcon: 'pi-upload',    title: 'Start fresh or import',      desc: 'Begin blank, pick a template, or paste an old CV and let AI rebuild it.' },
    { num: '02', piIcon: 'pi-sparkles',  title: 'Let AI do the heavy lifting', desc: 'Generate summaries, fix grammar, sharpen bullets, and create your headshot.' },
    { num: '03', piIcon: 'pi-shield',    title: 'Run the ATS check',           desc: 'Paste a job link to see your match score and the exact keywords to add.' },
    { num: '04', piIcon: 'pi-download',  title: 'Export, ad-funded',           desc: 'Watch one short clip and download a perfect PDF. Genuinely free.' },
  ];


chips = [
    {icon: 'fa-sharp fa-light fa-microchip-ai', text: 'AI write for you',  description: 'Smart & Accurate'},
    {icon: 'fa-light fa-hammer-brush', text: 'ATS optimized',  description: 'Score higher'},
    {icon: 'fa-sharp-duotone fa-thin fa-lock-keyhole', text: '100% safe',  description: 'Your data is safe'},
    {icon: 'fa-sharp fa-regular fa-user-hair-long', text: 'STUDIO HEADSHOT', description: 'AI Generated'},
    {icon: 'fa-sharp fa-cloud-arrow-down', text: '1-CLICK EXPORT',  description: 'PDF •̀DOCX'},
]
 
  constructor(private router: Router, private cdr: ChangeDetectorRef) {}
 
  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    // this.tickTypewriter();
  }
 
  ngOnDestroy(): void {
    if (this.twTimer) clearTimeout(this.twTimer);
  }
 
  // // ── Typewriter engine ─────────────────────────────────────────
  // private tickTypewriter(): void {
  //   const full = this.typeWords[this.twIndex % this.typeWords.length];
 
  //   if (!this.twDeleting && this.displayWord === full) {
  //     // Hold, then start deleting
  //     this.twTimer = setTimeout(() => { this.twDeleting = true; this.tickTypewriter(); }, this.TWH);
  //     return;
  //   }
 
  //   if (this.twDeleting && this.displayWord === '') {
  //     // Move to next word
  //     this.twDeleting = false;
  //     this.twIndex++;
  //     this.tickTypewriter();
  //     return;
  //   }
 
  //   const delay = this.twDeleting ? this.TWS / 2 : this.TWS;
  //   this.twTimer = setTimeout(() => {
  //     this.displayWord = this.twDeleting
  //       ? full.slice(0, this.displayWord.length - 1)
  //       : full.slice(0, this.displayWord.length + 1);
  //     this.cdr.markForCheck();
  //     this.tickTypewriter();
  //   }, delay);
  // }
 
  // ── Navigation ────────────────────────────────────────────────
  goCreate():    void { this.router.navigate(['/create']); }
  goTemplates(): void { this.router.navigate(['/templates']); }
  goPhoto():     void { this.router.navigate(['/photo']); }
}
