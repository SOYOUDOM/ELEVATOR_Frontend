import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    inject,
    input,
    numberAttribute,
    output,
    signal,
} from '@angular/core';
import { Observable, isObservable } from 'rxjs';
import { take } from 'rxjs/operators';

import { ElvButtonComponent } from '../elv-button/elv-button.component';

export type ElvAiActionState = 'idle' | 'loading' | 'applied' | 'error';

/** What the trigger runs. Promise or Observable, caller's choice. */
export type ElvAiTask = () => Promise<string> | Observable<string>;

/**
 * ELEVATOR — the inline AI trigger.
 *
 * A small button that owns the one thing every AI affordance in the product
 * needs and keeps getting re-implemented: the state machine.
 *
 *   idle → loading → applied → (back to idle)
 *                  ↘ error
 *
 * The spec's rule is "never leave an AI action in an ambiguous state", so
 * `applied` and `error` both auto-settle back to idle after a beat, and the
 * button reports `loading` to the caller so it can put an `elv-skeleton` over
 * the target field for exactly as long as the work runs.
 *
 * ```html
 * <elv-ai-action
 *   label="REWRITE"
 *   icon="pi pi-sparkles"
 *   [task]="() => ai.rewrite(summary())"
 *   (generated)="summary.set($event)"
 *   (stateChange)="busy.set($event === 'loading')" />
 * ```
 *
 * The component never touches the target field itself — it emits the text and
 * the caller decides what to do with it. That is what lets the same button
 * drive a summary, a bullet row or a cover letter.
 */
@Component({
    selector: 'elv-ai-action',
    standalone: true,
    imports: [ElvButtonComponent],
    templateUrl: './elv-ai-action.component.html',
    styleUrl: './elv-ai-action.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'elv-ai-action',
        '[attr.data-state]': 'state()',
    },
})
export class ElvAiActionComponent {
    readonly label = input('Generate');
    readonly icon = input('pi pi-sparkles');

    /** The work. Leave null to drive the button purely via `(triggered)`. */
    readonly task = input<ElvAiTask | null>(null);

    readonly disabled = input(false, { transform: booleanAttribute });
    readonly size = input<'small' | 'medium'>('small');

    /** Label shown briefly on success. */
    readonly appliedLabel = input('Applied');

    /** How long `applied` / `error` show before settling back, in ms. */
    readonly settleMs = input(1600, { transform: numberAttribute });

    /** The generated text. */
    readonly generated = output<string>();
    readonly failed = output<unknown>();
    readonly stateChange = output<ElvAiActionState>();
    /** Fires on every press, before the task runs. */
    readonly triggered = output<void>();

    protected readonly state = signal<ElvAiActionState>('idle');

    protected readonly isBusy = computed(() => this.state() === 'loading');

    protected readonly shownLabel = computed(() => {
        switch (this.state()) {
            case 'applied':
                return this.appliedLabel();
            case 'error':
                return 'Try again';
            default:
                return this.label();
        }
    });

    protected readonly shownIcon = computed(() => {
        switch (this.state()) {
            case 'applied':
                return 'pi pi-check';
            case 'error':
                return 'pi pi-exclamation-triangle';
            default:
                return this.icon();
        }
    });

    private readonly destroyRef = inject(DestroyRef);
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.destroyRef.onDestroy(() => this.clearTimer());
    }

    protected run(): void {
        if (this.state() === 'loading' || this.disabled()) {
            return;
        }

        this.triggered.emit();

        const task = this.task();
        if (!task) {
            // No task wired — the caller is driving this via (triggered).
            return;
        }

        this.clearTimer();
        this.setState('loading');

        let result: Promise<string> | Observable<string>;
        try {
            result = task();
        } catch (err) {
            this.fail(err);
            return;
        }

        if (isObservable(result)) {
            result.pipe(take(1)).subscribe({
                next: (text) => this.succeed(text),
                error: (err) => this.fail(err),
            });
            return;
        }

        result.then((text) => this.succeed(text)).catch((err) => this.fail(err));
    }

    private succeed(text: string): void {
        this.generated.emit(text);
        this.setState('applied');
        this.settle();
    }

    private fail(err: unknown): void {
        this.failed.emit(err);
        this.setState('error');
        this.settle();
    }

    /** Never leave the button parked on a transient state. */
    private settle(): void {
        this.clearTimer();
        this.timer = setTimeout(() => this.setState('idle'), this.settleMs());
    }

    private setState(next: ElvAiActionState): void {
        this.state.set(next);
        this.stateChange.emit(next);
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
