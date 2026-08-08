import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Injector,
    OnDestroy,
    ViewEncapsulation,
    computed,
    DestroyRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AppComponentBase } from '@shared/app-component-base';
import { AppAuthService } from '@shared/auth/app-auth.service';
import { ElevatorHttpConfigurationService } from '@shared/auth/elevator-http-configuration.service';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvCheckboxComponent } from '@shared/components/elv-checkbox';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { HeaderComponent } from '../app/layout/header.component';

/**
 * idle       — waiting for input
 * submitting — request in flight
 * launching  — credentials accepted; the ascent animation is playing and
 *              AppAuthService is already navigating away underneath it
 */
type AuthPhase = 'idle' | 'submitting' | 'launching';

/** Tilt ceiling in degrees. Past ~5° the text starts to look bent. */
const TILT_X = 3.5;
const TILT_Y = 4.5;

@Component({
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    host: { style: 'display:block; min-height:100dvh' },
    imports: [HeaderComponent, RevealDirective, ElvFieldComponent, ReactiveFormsModule, ElvCheckboxComponent, ElvButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent extends AppComponentBase implements OnDestroy {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly auth = inject(AppAuthService);
    private readonly http = inject(ElevatorHttpConfigurationService);
    private readonly destroyRef = inject(DestroyRef);

    // ── form ──────────────────────────────────────────────────────────
    // elv-field is a ControlValueAccessor, so formControlName drives its
    // status lighting, inline messages and error shake with no extra wiring.
    readonly form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
    });

    readonly rememberMe = signal(false);
    readonly phase = signal<AuthPhase>('idle');
    /** Server/transport failure, shown in the card's alert row. */
    readonly authError = signal('');
    /** Non-fatal aside — used for the not-yet-wired social providers. */
    readonly notice = signal('');
    readonly capsLock = signal(false);
    readonly year = new Date().getFullYear();

    /** Reassurance beside the form, not telemetry — every claim is one the
        product already makes on the landing page. */
    readonly perks = [
        { icon: 'pi-bolt', label: 'AI-written bullet points' },
        { icon: 'pi-file-check', label: 'ATS-ready exports' },
        { icon: 'pi-heart', label: 'Free, no card needed' },
    ];

    /** Bumped on every form event so validity-derived computeds re-run. */
    private readonly tick = signal(0);

    /** The submit button lights up only once the form could actually be sent. */
    readonly armed = computed(() => {
        this.tick();
        return this.form.valid && this.phase() === 'idle';
    });

    readonly busy = computed(() => this.phase() !== 'idle');

    // ── view ──────────────────────────────────────────────────────────
    private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
    private readonly cardRef = viewChild<ElementRef<HTMLElement>>('card');

    // ── pointer lighting ──────────────────────────────────────────────
    // Written straight to CSS custom properties inside a rAF: no signal is
    // touched, so a pointer sweep never schedules change detection.
    private frame = 0;
    private pointer: { x: number; y: number } | null = null;
    /** Tilting the card out from under a caret is disorienting — pause it. */
    private editing = false;
    private readonly reducedMotion =
        typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    constructor(injector: Injector) {
        super(injector);

        this.form.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick.update((n) => n + 1));
    }

    ngOnDestroy(): void {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
        }
    }

    showTenantChange(): boolean {
        return abp.multiTenancy.isEnabled;
    }

    // ── interaction ───────────────────────────────────────────────────
    onPointerMove(event: PointerEvent): void {
        if (this.reducedMotion || event.pointerType === 'touch') {
            return;
        }

        this.pointer = { x: event.clientX, y: event.clientY };
        if (this.frame) {
            return;
        }
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            if (this.pointer) {
                this.paint(this.pointer.x, this.pointer.y);
            }
        });
    }

    onPointerLeave(): void {
        this.pointer = null;
        this.rest();
    }

    /** Parallax depth on the left, spotlight + tilt on the right. */
    private paint(x: number, y: number): void {
        const stage = this.stageRef()?.nativeElement;
        if (stage) {
            const r = stage.getBoundingClientRect();
            // −0.5 … 0.5, so each layer just multiplies by its own depth.
            stage.style.setProperty('--elv-px', ((x - r.left) / r.width - 0.5).toFixed(4));
            stage.style.setProperty('--elv-py', ((y - r.top) / r.height - 0.5).toFixed(4));
        }

        const card = this.cardRef()?.nativeElement;
        if (!card) {
            return;
        }
        const r = card.getBoundingClientRect();
        const px = (x - r.left) / r.width;
        const py = (y - r.top) / r.height;
        const over = px >= 0 && px <= 1 && py >= 0 && py <= 1;

        card.style.setProperty('--elv-mx', `${(px * 100).toFixed(2)}%`);
        card.style.setProperty('--elv-my', `${(py * 100).toFixed(2)}%`);
        card.style.setProperty('--elv-lit', over ? '1' : '0');

        const gain = over && !this.editing ? 1 : 0;
        card.style.setProperty('--elv-rx', `${(-(py - 0.5) * 2 * TILT_X * gain).toFixed(3)}deg`);
        card.style.setProperty('--elv-ry', `${((px - 0.5) * 2 * TILT_Y * gain).toFixed(3)}deg`);
    }

    private rest(): void {
        const card = this.cardRef()?.nativeElement;
        if (!card) {
            return;
        }
        card.style.setProperty('--elv-rx', '0deg');
        card.style.setProperty('--elv-ry', '0deg');
        card.style.setProperty('--elv-lit', '0');
    }

    onFieldFocus(): void {
        this.editing = true;
        this.rest();
    }

    onFieldBlur(): void {
        this.editing = false;
    }

    /**
     * Caps Lock is the single most common reason a correct password is
     * rejected, and the browser will not tell you on its own.
     */
    onPasswordKey(event: KeyboardEvent): void {
        this.capsLock.set(event.getModifierState?.('CapsLock') ?? false);
    }

    // ── submit ────────────────────────────────────────────────────────
    submit(): void {
        if (this.busy()) {
            return;
        }

        this.authError.set('');
        this.notice.set('');

        if (this.form.invalid) {
            // Touching every control is what makes elv-field reveal its
            // message and run its shake — validateOn defaults to 'touched'.
            this.form.markAllAsTouched();
            this.tick.update((n) => n + 1);
            this.focusFirstInvalid();
            return;
        }

        this.phase.set('submitting');

        const { email, password } = this.form.getRawValue();
        this.auth.authenticateModel.userNameOrEmailAddress = email.trim();
        this.auth.authenticateModel.password = password;
        this.auth.rememberMe = this.rememberMe();

        // The failure belongs to this form, not to a modal on top of it.
        this.http.claim();

        this.auth.authenticate(
            () => {
                this.http.release();
                // Only reached on success — the error branch has already put
                // the phase back to idle. AppAuthService redirects from here,
                // so 'launching' is the last thing this page renders.
                if (this.phase() === 'submitting') {
                    this.phase.set('launching');
                }
            },
            (error: unknown) => {
                this.phase.set('idle');
                this.authError.set(this.describe(error));
            }
        );
    }

    /**
     * Turns whatever the transport threw into one sentence a person can act on.
     *
     * NSwag wraps every non-2xx in an ApiException whose `message` is the
     * useless constant "An unexpected server error occurred." and whose
     * `response` holds the raw body — so the real ABP reason has to be parsed
     * back out of that string.
     */
    private describe(error: unknown): string {
        const e = error as {
            status?: number;
            message?: string;
            response?: string;
            error?: { error?: { message?: string } };
        } | null;

        const abpMessage = e?.error?.error?.message ?? this.parseAbpMessage(e?.response);
        if (abpMessage) {
            return abpMessage;
        }

        switch (e?.status) {
            case 400:
            case 401:
                return 'That email and password don’t match an account.';
            case 403:
                return 'This account isn’t allowed to sign in. Contact your administrator.';
            case 429:
                return 'Too many attempts. Wait a minute and try again.';
            case 0:
                return 'Can’t reach the sign-in service. Check your connection and try again.';
            default:
                return 'Sign-in failed. Please try again.';
        }
    }

    private parseAbpMessage(body: string | undefined): string {
        if (!body) {
            return '';
        }
        try {
            const parsed = JSON.parse(body) as { error?: { message?: string; details?: string } };
            return parsed?.error?.message ?? '';
        } catch {
            // A proxy or gateway returned HTML — fall through to the status map.
            return '';
        }
    }

    /**
     * Keyed off the FORM, not off elv-field's `is-error` class: that class is
     * written on the next change-detection pass, which has not run yet while
     * submit() is still on the stack.
     */
    private focusFirstInvalid(): void {
        const name = Object.keys(this.form.controls).find((key) => this.form.get(key)?.invalid);
        if (!name) {
            return;
        }
        // Must name the tag: `name="email"` is ALSO a static attribute on the
        // <elv-field> host, which sits earlier in document order and is not
        // focusable — a bare [name=…] selector silently focuses nothing.
        this.cardRef()
            ?.nativeElement.querySelector<HTMLElement>(`input[name="${name}"], textarea[name="${name}"]`)
            ?.focus();
    }

    /**
     * No OAuth provider is wired to the backend yet (there is no
     * ExternalAuthenticate endpoint in the generated proxies) — say so
     * plainly instead of throwing, which is what this used to do.
     */
    onSocial(provider: string): void {
        this.authError.set('');
        this.notice.set(`${provider} sign-in isn’t connected yet — use your email and password for now.`);
    }

    /** Same honesty for the two routes that have no destination yet. */
    onUnavailable(feature: string): void {
        this.authError.set('');
        this.notice.set(`${feature} isn’t available yet. Contact support and we’ll sort it out.`);
    }
}
