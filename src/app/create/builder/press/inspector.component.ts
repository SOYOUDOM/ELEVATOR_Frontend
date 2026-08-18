/**
 * THE INSPECTOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Three tabs, one rule: it shows only what is selected, and nothing else.
 *
 *   CONTENT — the fields of the selected block.
 *   TYPE    — real typesetting controls, not four canned presets, with the
 *             measure read back in characters as you drag.
 *   CHECK   — every finding, plus the document as a parser sees it.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvSegComponent, ElvSegOption } from '@shared/components/elv-seg/elv-seg.component';
import { CvBuilderStore } from '../cv-builder.store';
import {
  EducationItem, ExperienceItem, LayoutName, MarginName, ProjectItem,
  SECTION_KINDS, SkillGroup, SummaryItem,
} from '../cv-builder.models';
import {
  DocNote, Fill, documentNotes, machineReadBack, readiness, suggestedSkills, titleIdeas,
} from '../cv-builder.analysis';
import { contentBox } from '../cv-builder.paginate';
import { FontChoice, LocalFontsService } from './local-fonts.service';

@Component({
  selector: 'elv-cv-inspector',
  standalone: true,
  imports: [FormsModule, ElvButtonComponent, ElvSegComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspector.component.html',
})
export class InspectorComponent {
  private readonly store = inject(CvBuilderStore);

  readonly fill = input.required<Fill>();
  readonly autoFit = output<void>();

  readonly doc = this.store.doc;
  readonly ui = this.store.ui;
  readonly sel = this.store.sel;

  readonly section = computed(() => this.store.sectionById(this.sel().sec));
  readonly item = computed(() => {
    const s = this.section();
    const i = this.sel().item;
    return s && i != null ? s.items[i] : undefined;
  });

  readonly kindLabel = computed(() => {
    if (this.sel().sec === 'profile') return 'HEADER';
    const s = this.section();
    return s ? SECTION_KINDS[s.type].tag : '';
  });

  readonly notes = computed<DocNote[]>(() => documentNotes(this.doc(), this.fill()));
  readonly ready = computed(() => readiness(this.doc(), this.fill()));
  readonly readback = computed(() => machineReadBack(this.doc()));
  readonly skillIdeas = computed(() => suggestedSkills(this.doc()));
  readonly roleIdeas = computed(() => titleIdeas(this.doc().profile.role));

  /** Characters per line at the current setting — the number that decides
      whether the measure is comfortable, reported rather than guessed. */
  readonly measure = computed(() => {
    const d = this.doc();
    const w = contentBox(d).w * (d.design.layout === 'split' ? 0.66 : 1);
    return Math.round(w / (d.design.size * 0.5));
  });

  readonly measureVerdict = computed(() => {
    const m = this.measure();
    if (m < 45) return `Measure is about ${m} characters — 45 to 85 is comfortable. This line is short; a narrower margin or larger type would help.`;
    if (m > 85) return `Measure is about ${m} characters — 45 to 85 is comfortable. This line is long; a wider margin would help.`;
    return `Measure is about ${m} characters, which is inside the comfortable 45–85.`;
  });

  readonly tabs: ElvSegOption<'content' | 'type' | 'check'>[] = [
    { value: 'content', label: 'CONTENT', title: 'The fields of what is selected' },
    { value: 'type', label: 'TYPE', title: 'Typesetting' },
    { value: 'check', label: 'CHECK', title: 'Findings' },
  ];

  readonly layouts: Array<[LayoutName, string]> = [
    ['classic', 'Classic'], ['rule', 'Ruled'], ['quiet', 'Quiet'],
    ['centred', 'Centred'], ['split', 'Two column'],
  ];
  readonly margins: Array<[MarginName, string]> = [['tight', 'Tight'], ['normal', 'Normal'], ['roomy', 'Roomy']];
  readonly accents = ['#0089b8', '#c4126f', '#0d7a55', '#a8690a', '#5b53d8', '#2b2f36'];

  tab(v: 'content' | 'type' | 'check'): void { this.store.patchUi({ tab: v }); }

  /* ── the faces ────────────────────────────────────────────────────────────
     The two bundled faces are always the first two rows. The reader's own
     fonts are appended only if they ask for them and the machine agrees —
     see LocalFontsService for why that is a click and not a page load. */

  readonly fonts = inject(LocalFontsService);
  readonly fontList = this.fonts.all;
  readonly fontState = this.fonts.state;
  readonly fontFilter = signal('');

  readonly shownFonts = computed<FontChoice[]>(() => {
    const q = this.fontFilter().trim().toLowerCase();
    const all = this.fontList();
    return q ? all.filter((f) => f.label.toLowerCase().includes(q)) : all;
  });

  loadLocalFonts(): void { void this.fonts.load(); }

  setFont(value: string): void {
    this.store.edit('design', (d) => { d.design.font = value; });
  }

  /* ── field writes ─────────────────────────────────────────────────────── */

  setProfile(key: keyof typeof this.doc extends never ? never : string, value: string): void {
    this.store.edit('edit', (d) => { (d.profile as unknown as Record<string, string>)[key] = value; });
  }

  setField(key: string, value: unknown): void {
    const secId = this.sel().sec;
    const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('edit', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (s) (s.items[i] as unknown as Record<string, unknown>)[key] = value;
    });
  }

  setBullet(j: number, value: string): void {
    const secId = this.sel().sec;
    const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('edit', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (s) (s.items[i] as ExperienceItem).bullets[j] = value;
    });
  }

  addBullet(): void {
    const secId = this.sel().sec; const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('bullet', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (s) (s.items[i] as ExperienceItem).bullets.push('');
    });
  }

  removeBullet(j: number): void {
    const secId = this.sel().sec; const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('bullet', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      if (!s) return;
      const b = (s.items[i] as ExperienceItem).bullets;
      b.splice(j, 1);
      if (!b.length) b.push('');
    });
  }

  addSkill(value: string, input: HTMLInputElement): void {
    const v = value.trim();
    if (!v) return;
    const secId = this.sel().sec; const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('skill', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      const g = s?.items[i] as SkillGroup | undefined;
      if (g && !g.list.some((x) => x.toLowerCase() === v.toLowerCase())) g.list.push(v);
    });
    input.value = '';
  }

  removeSkill(j: number): void {
    const secId = this.sel().sec; const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.edit('skill', (d) => {
      const s = d.sections.find((x) => x.id === secId);
      (s?.items[i] as SkillGroup | undefined)?.list.splice(j, 1);
    });
  }

  /* ── design writes ────────────────────────────────────────────────────── */

  setDesign<K extends keyof ReturnType<typeof this.doc>['design']>(
    key: K, value: ReturnType<typeof this.doc>['design'][K],
  ): void {
    this.store.edit('design', (d) => { d.design[key] = value; });
  }

  setNum(key: 'size' | 'leading' | 'gap', raw: string): void {
    this.store.edit('design', (d) => { d.design[key] = +raw; });
  }

  removeItem(): void {
    const secId = this.sel().sec; const i = this.sel().item;
    if (!secId || i == null) return;
    this.store.removeItem(secId, i);
  }

  act(note: DocNote): void {
    if (note.action.fit) { this.autoFit.emit(); return; }
    if (note.action.lines) { this.tab('check'); return; }
    if (note.action.go === 'design') { this.tab('type'); return; }
    if (note.action.go) this.store.select(note.action.go);
  }

  /* narrow casts for the template — the item's shape follows its section */
  asExp = (v: unknown) => v as ExperienceItem;
  asEdu = (v: unknown) => v as EducationItem;
  asProj = (v: unknown) => v as ProjectItem;
  asSkills = (v: unknown) => v as SkillGroup;
  asSummary = (v: unknown) => v as SummaryItem;
}
