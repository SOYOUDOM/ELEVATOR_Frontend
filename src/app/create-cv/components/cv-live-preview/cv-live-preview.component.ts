import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, signal } from '@angular/core';

import type { CvDraft } from '../../models/cv-draft.model';

export type PreviewDevice = 'desktop' | 'mobile';

/**
 * The live CV preview.
 *
 * Deliberately rendered in the app's own dark theme rather than as a white A4
 * sheet. This panel's job is CONFIDENCE while typing — "your CV is filling
 * up" — and a shrunken sheet at 40% is unreadable at that size. The true A4
 * paper still exists for export; this is the companion, not a replacement.
 *
 * Purely presentational: it takes a draft and renders it. No service, no
 * store, so it can sit beside any floor's form.
 */
@Component({
    selector: 'app-cv-live-preview',
    standalone: true,
    templateUrl: './cv-live-preview.component.html',
    styleUrl: './cv-live-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-live' },
})
export class CvLivePreviewComponent {
    readonly draft = input.required<CvDraft>();

    protected readonly device = signal<PreviewDevice>('desktop');

    protected readonly identity = computed(() => this.draft().identity);

    /** Only roles with something in them — an empty card is noise. */
    protected readonly roles = computed(() =>
        this.draft().experience.filter((e) => e.role || e.company || e.bullets.some((b) => b.text.trim()))
    );

    protected readonly contactLines = computed(() => {
        const id = this.identity();
        return [
            { icon: 'pi pi-map-marker', text: id.location },
            { icon: 'pi pi-envelope', text: id.email },
            { icon: 'pi pi-phone', text: id.phone },
            ...id.links.filter((l) => l.url).map((l) => ({ icon: 'pi pi-globe', text: l.url })),
        ].filter((l) => !!l.text);
    });

    protected readonly initials = computed(() => {
        const name = this.identity().fullName.trim();
        if (!name) {
            return '';
        }
        const parts = name.split(/\s+/);
        return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
    });

    protected setDevice(device: PreviewDevice): void {
        this.device.set(device);
    }

    protected dateRange(start: string, end: string, current: boolean): string {
        const to = current ? 'Present' : end;
        return [start, to].filter(Boolean).join(' — ');
    }

    protected filledBullets(bullets: readonly { id: string; text: string }[]): { id: string; text: string }[] {
        return bullets.filter((b) => b.text.trim());
    }
}
