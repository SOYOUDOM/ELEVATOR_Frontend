import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { FxSettingsService } from '@shared/services/fx-settings.service';

@Component({
  selector: 'app-fx-grain',
  standalone: true,
  template: `<canvas #cvs></canvas>`,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      display: block;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class FxGrainComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cvs') cvsRef!: ElementRef<HTMLCanvasElement>;

  private readonly fx = inject(FxSettingsService);
  private ctx!: CanvasRenderingContext2D;
  private raf?: number;
  private last = 0;
  private readonly INTERVAL = 50; // ~20 fps — enough for convincing grain

  ngAfterViewInit(): void {
    this.ctx = this.cvsRef.nativeElement.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', this.resize);
    this.tick();
  }

  private resize = (): void => {
    this.ctx.canvas.width  = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;
  };

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);

    const now = performance.now();
    if (now - this.last < this.INTERVAL) return;
    this.last = now;

    const cvs = this.ctx.canvas;

    if (!this.fx.grainEnabled()) {
      this.ctx.clearRect(0, 0, cvs.width, cvs.height);
      return;
    }

    const img = this.ctx.createImageData(cvs.width, cvs.height);
    const buf = new Uint32Array(img.data.buffer);

    // Each pixel: random grayscale value, fixed alpha ~7%
    // Uint32 in little-endian canvas layout: 0xAA_BB_GG_RR
    for (let i = 0; i < buf.length; i++) {
      const v = (Math.random() * 255) | 0;
      buf[i] = (18 << 24) | (v << 16) | (v << 8) | v;
    }

    this.ctx.putImageData(img, 0, 0);
  };

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
  }
}
