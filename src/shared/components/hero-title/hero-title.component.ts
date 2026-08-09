import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export type HeroTitleSize = 'sm' | 'md' | 'lg' | 'xl';
export type HeroTitleAlign = 'start' | 'center';
export type HeroTitleLevel = 1 | 2 | 3 | 4;

/**
 * ELEVATOR — the page/section heading.
 *
 * Was an empty scaffold (`<p>hero-title works!</p>`); this gives it the API
 * the product actually needs so page and step headings stop being hand-rolled
 * `<h1>` + `.elv-eyebrow` markup copied between components.
 *
 * The headline splits into three parts so the accent can land mid-sentence
 * without the caller injecting HTML:
 *
 * ```html
 * <app-hero-title
 *   eyebrow="Step 01"
 *   lead="Let's build your"
 *   accent="professional CV"
 *   tail="together."
 *   lede="Create a standout CV in minutes."
 *   size="xl" />
 * ```
 *
 * Note on the known trap: this component never sets `isolation: isolate` on
 * the headline wrapper. Doing so traps glow and reveal effects inside it.
 */
@Component({
    selector: 'app-hero-title',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './hero-title.component.html',
    styleUrl: './hero-title.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'elv-hero-title',
        '[attr.data-size]': 'size()',
        '[attr.data-align]': 'align()',
        '[attr.data-stacked]': 'stacked() ? "true" : null',
    },
})
export class HeroTitleComponent {
    /** Small mono label above the headline. */
    readonly eyebrow = input('');

    /** Headline before the accent run. */
    readonly lead = input('');

    /** The glowing run inside the headline. */
    readonly accent = input('');

    /** Headline after the accent run. */
    readonly tail = input('');

    /** Supporting paragraph under the headline. */
    readonly lede = input('');

    /**
     * Heading rank. A page gets 1; a section inside a page gets 2 or 3.
     * Kept separate from `size` so visual weight and document outline can
     * disagree, which they routinely need to.
     */
    readonly level = input<HeroTitleLevel>(1);

    readonly size = input<HeroTitleSize>('lg');
    readonly align = input<HeroTitleAlign>('start');

    /** Forces each part onto its own line rather than wrapping naturally. */
    readonly stacked = input(false, { transform: booleanAttribute });
}
