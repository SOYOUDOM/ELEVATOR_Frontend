import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    numberAttribute,
    output,
    signal,
    untracked,
} from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvChipComponent } from '@shared/components/elv-chip/elv-chip.component';
import { ElvProgressComponent } from '@shared/components/elv-progress/elv-progress.component';

/**
 * The export gate.
 *
 * Built inside the feature rather than in `@shared` on purpose: this is the
 * business model, not a reusable widget, and putting it in the shared library
 * would invite it to be dropped in front of things that should stay free.
 *
 * Two deliberate rules about being honest with the user:
 *
 *   • The countdown is stated up front and the button says exactly what
 *     happens next. No fake "loading" that is really a timer.
 *
 *   • Dismissing is always possible. A modal you cannot close is a dark
 *     pattern; the user simply does not get the unlock if they leave.
 *
 * The unlock is emitted, never applied here — the editor records it on the
 * draft so it survives a refresh and nobody has to watch twice.
 */
@Component({
    selector: 'app-ad-gate',
    standalone: true,
    imports: [ElvButtonComponent, ElvProgressComponent, ElvChipComponent],
    templateUrl: './ad-gate.component.html',
    styleUrl: './ad-gate.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'elv-adgate' },
})
export class AdGateComponent {
    readonly open = input(false, { transform: booleanAttribute });
    readonly seconds = input(8, { transform: numberAttribute });

    readonly completed = output<void>();
    readonly dismissed = output<void>();

    protected readonly remaining = signal(0);
    protected readonly running = signal(false);

    protected readonly done = computed(() => this.running() && this.remaining() <= 0);

    protected readonly percent = computed(() => {
        const total = this.seconds();
        return total <= 0 ? 100 : Math.round(((total - this.remaining()) / total) * 100);
    });

    private readonly destroyRef = inject(DestroyRef);
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        effect(() => {
            const isOpen = this.open();
            untracked(() => (isOpen ? this.start() : this.stop()));
        });

        this.destroyRef.onDestroy(() => this.stop());
    }

    protected onBackdrop(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.dismiss();
        }
    }

    protected onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.dismiss();
        }
    }

    protected dismiss(): void {
        this.stop();
        this.dismissed.emit();
    }

    protected unlock(): void {
        if (!this.done()) {
            return;
        }
        this.stop();
        this.completed.emit();
    }

    private start(): void {
        this.stop();
        this.remaining.set(this.seconds());
        this.running.set(true);

        this.timer = setInterval(() => {
            this.remaining.update((n) => Math.max(0, n - 1));
            if (this.remaining() <= 0) {
                this.clearTimer();
            }
        }, 1000);
    }

    private stop(): void {
        this.clearTimer();
        this.running.set(false);
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
