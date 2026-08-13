import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ElvFieldComponent } from '@shared/components/elv-field';
import type { ElvValue } from '@shared/components/elv-field';

import { CvDraftStore } from '../cv-draft.store';
import { REGIONS, RegionCode, TemplateId } from '../cv.models';
import { FloorFrameComponent } from './floor-frame.component';

/** FLOOR 08 · template, accent, and where the CV is going. */
@Component({
    selector: 'app-create-template',
    standalone: true,
    templateUrl: './template.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvFieldComponent],
})
export class TemplateComponent {
    readonly store = inject(CvDraftStore);
    readonly regions = REGIONS;
    readonly region = this.store.region;

    readonly templates: { id: TemplateId; name: string; desc: string }[] = [
        { id: 'monolith', name: 'Monolith', desc: 'One column, heavy rules. The safest thing to send to an ATS.' },
        { id: 'shaft', name: 'Shaft', desc: 'Dark sidebar for contact and skills, content on the right.' },
        { id: 'ledger', name: 'Ledger', desc: 'Left-ruled headings, roomy. Reads well printed.' },
        { id: 'beacon', name: 'Beacon', desc: 'Centred masthead. Good when the name is the pitch.' },
    ];

    readonly swatches = ['#ffd35b', '#5bffa6', '#7cc7ff', '#ff8fb1', '#c9a6ff', '#e8e4da'];
    readonly regionOptions = computed(() => REGIONS.map((r) => ({ value: r.code, label: r.name })));

    choose(id: TemplateId): void {
        this.store.setTemplate(id);
    }
    accent(colour: string): void {
        this.store.setAccent(colour);
    }
    setRegion(value: ElvValue): void {
        this.store.setRegion(String(value ?? 'KH') as RegionCode);
    }
}
