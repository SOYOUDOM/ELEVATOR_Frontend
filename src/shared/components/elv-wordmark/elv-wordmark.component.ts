import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * ELEVATOR — the wordmark.
 *
 * Extracted from header-left-navbar so the Create workspace can show the brand
 * in its own toolbar WITHOUT a second copy of the markup. One definition, two
 * mounts: change the mark here and both follow.
 *
 * The styling stays where it already lives — `.brand-name` / `.brand-lead` /
 * `.brand-l` are global (styles/_typography.scss) and the boot choreography
 * targets `header-left-navbar .brand-lead` (styles/_boot.scss). Keeping the
 * class names means the header animates exactly as before, and the workspace
 * copy simply sits outside that selector, so it does not replay the intro every
 * time the editor opens.
 */
@Component({
    selector: 'elv-wordmark',
    standalone: true,
    templateUrl: './elv-wordmark.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'elv-wordmark' },
})
export class ElvWordmarkComponent {
    readonly href = input('/app/home');
    /** Height of the logo mark. The wordmark's type scales with `scale`. */
    readonly logoClass = input('h-6 w-auto sm:h-8 md:h-10 lg:h-12');
    readonly scale = input('1.7rem');

    readonly brandLetters = 'LEVATOR'.split('');
}
