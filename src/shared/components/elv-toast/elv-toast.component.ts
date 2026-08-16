/** The host. Mount once, near the root of a feature; the service fills it. */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ElvToast, ElvToastService } from './elv-toast.service';

@Component({
  selector: 'app-elv-toasts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="elv-toasts" aria-live="polite">
      @for (t of toasts.items(); track t.id) {
        <div class="elv-toast" [class.elv-toast--warn]="t.tone === 'warn'"
             [class.elv-toast--bad]="t.tone === 'bad'">
          <span class="elv-toast__dot"></span>
          <span class="elv-toast__text">{{ t.text }}</span>
          @if (t.action) {
            <button type="button" (click)="toasts.run(t)">{{ t.action.label }}</button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './elv-toast.component.scss',
})
export class ElvToastsComponent {
  readonly toasts = inject(ElvToastService);
  protected trackId = (_: number, t: ElvToast) => t.id;
}
