import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2,
} from '@angular/core';

// Angular sets this global in dev builds and strips it in production.
// Declaring it here gives TypeScript the type it doesn't ship by default.
declare const ngDevMode: boolean | undefined;

/**
 * ELEVATOR — Circuit Pattern directive
 * Declarative wrapper over _elv-circuit.scss. Import the partial once in
 * your global styles, add this directive to a component's `imports`, done.
 *
 * USAGE
 *   <section elvCircuit>…</section>                       base overlay
 *   <section elvCircuit="beam">…</section>                + hero beam
 *   <button  elvCircuit="hover">…</button>                dim → bright on hover
 *   <div     elvCircuit="page" aria-hidden="true"></div>  whole-site backdrop
 *   <section elvCircuit="beam hover">…</section>          variants combine
 *
 *   Knobs (all optional):
 *   <app-elv-card elvCircuit cktColor="#7AD7FF" [cktOpacity]="0.35" cktCell="90px">
 *
 * ⚠ NOT for notch boxes — put class="elv-circuit-face" on the
 *   .elv-notch-face span instead (see the SCSS partial for why).
 * ⚠ NOT for .headline / hero-weave wrappers — .elv-circuit isolates,
 *   which would trap the .front letters behind the face again.
 */
@Directive({
  selector: '[elvCircuit]',
  standalone: true,
})
export class ElvCircuitDirective implements OnChanges {
  private static readonly VARIANTS = ['page', 'hover', 'beam'] as const;

  /** Space-separated variants: '' | 'page' | 'hover' | 'beam' | 'beam hover' … */
  @Input('elvCircuit') variant = '';

  /** Any CSS color. Defaults to var(--p-elevator-accent). */
  @Input() cktColor?: string;

  /** 0..1 master opacity of the pattern layer. */
  @Input() cktOpacity?: number | string;

  /** Grid cell size, e.g. '90px'. Diagonal spacing follows automatically (÷√2). */
  @Input() cktCell?: string;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly r: Renderer2,
  ) {}

  ngOnChanges(): void {
    const host = this.el.nativeElement;

    this.r.addClass(host, 'elv-circuit');

    // reconcile variant classes (supports dynamic [elvCircuit] bindings)
    for (const v of ElvCircuitDirective.VARIANTS) {
      this.r.removeClass(host, `elv-circuit--${v}`);
    }
    for (const v of this.variant.split(/\s+/).filter(Boolean)) {
      if ((ElvCircuitDirective.VARIANTS as readonly string[]).includes(v)) {
        this.r.addClass(host, `elv-circuit--${v}`);
      } else if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(`[elvCircuit] unknown variant "${v}" — expected one of: ${ElvCircuitDirective.VARIANTS.join(', ')}`);
      }
    }

    // knobs → CSS custom properties (the SCSS engine reads these)
    this.setVar(host, '--elv-ckt-color', this.cktColor);
    this.setVar(
      host,
      '--elv-ckt-opacity',
      this.cktOpacity != null ? String(this.cktOpacity) : undefined,
    );
    this.setVar(host, '--elv-ckt-cell', this.cktCell);
  }

  private setVar(host: HTMLElement, name: string, value?: string): void {
    if (value != null && value !== '') {
      this.r.setStyle(host, name, value, 2 /* RendererStyleFlags2.DashCase */);
      host.style.setProperty(name, value);
    } else {
      host.style.removeProperty(name);
    }
  }
}
