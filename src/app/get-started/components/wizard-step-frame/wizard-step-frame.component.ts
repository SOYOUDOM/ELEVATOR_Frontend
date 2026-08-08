import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

/**
 * The inner panel every wizard step renders into.
 *
 * This exists for a structural reason, not a decorative one. Angular scopes
 * component styles, so a step component cannot inherit the shell's `.gs-*`
 * rules — copy the shell's markup into a step and it silently loses its
 * padding (the trap documented in CLAUDE.md). Putting the heading, the body
 * and the footer nav in one component means that chrome is defined and styled
 * exactly once, and every step gets it by composition:
 *
 * ```html
 * <app-wizard-step-frame
 *   title="Who are you?"
 *   subtitle="Your name and how to reach you"
 *   [showBack]="true"
 *   [showSkip]="true"
 *   (back)="wizard.previous()"
 *   (skip)="wizard.skip()"
 *   (continue)="save()">
 *   …fields…
 * </app-wizard-step-frame>
 * ```
 *
 * The footer is opt-in per flag, so step one (whose cards are their own CTAs)
 * renders the same frame with no nav at all.
 */
@Component({
    selector: 'app-wizard-step-frame',
    standalone: true,
    imports: [ElvButtonComponent],
    templateUrl: './wizard-step-frame.component.html',
    styleUrl: './wizard-step-frame.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'wsf' },
})
export class WizardStepFrameComponent {
    readonly title = input<string>('');
    readonly subtitle = input<string>('');

    /** Centres the heading block. Off gives a left-aligned form header. */
    readonly centered = input(true, { transform: booleanAttribute });

    // ── Footer navigation ─────────────────────────────────────────────
    readonly showBack = input(false, { transform: booleanAttribute });
    readonly showSkip = input(false, { transform: booleanAttribute });
    readonly showContinue = input(false, { transform: booleanAttribute });

    readonly backLabel = input<string>('Back');
    readonly skipLabel = input<string>('Skip this step');
    readonly continueLabel = input<string>('Continue');

    readonly continueDisabled = input(false, { transform: booleanAttribute });

    /** Quiet line above the buttons, e.g. "Everything here is optional." */
    readonly footnote = input<string>('');

    readonly back = output<void>();
    readonly skip = output<void>();
    readonly continue = output<void>();

    protected get hasFooter(): boolean {
        return this.showBack() || this.showSkip() || this.showContinue();
    }
}
