import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    input,
    numberAttribute,
    output,
    signal,
} from '@angular/core';

import { ElvAlertComponent } from '../elv-alert/elv-alert.component';
import { ElvEmptyStateComponent } from '../elv-empty-state/elv-empty-state.component';

/** Why a file was turned away. Enough for the caller to log or re-message. */
export type ElvDropzoneRejectReason = 'type' | 'size' | 'count' | 'disabled';

export interface ElvDropzoneRejection {
    file: File;
    reason: ElvDropzoneRejectReason;
    message: string;
}

/**
 * ELEVATOR — the file dropzone.
 *
 * Drag-and-drop or click-to-browse, with format and size checked before
 * anything reaches the caller. Idle state is an `elv-empty-state`, errors are
 * an `elv-alert` — this component owns behaviour, not a second look.
 *
 * Two details that matter:
 *
 *   • The real `<input type="file">` covers the whole surface and stays in the
 *     tab order. Every keyboard and AT affordance is the browser's; there is
 *     no `role="button"` re-implementation to get subtly wrong.
 *
 *   • Drag depth is COUNTED, not toggled. `dragleave` fires when the pointer
 *     crosses onto a child element, so a boolean flag flickers the styling on
 *     every internal boundary. Counting enter/leave pairs is the fix.
 *
 * ```html
 * <elv-dropzone
 *   [accept]="['.pdf', '.docx', 'image/*']"
 *   [maxSizeMb]="10"
 *   idleTitle="DROP YOUR CV"
 *   idleText="PDF, DOCX, PNG or JPG · up to 10 MB"
 *   (accepted)="onFiles($event)" />
 * ```
 */
@Component({
    selector: 'elv-dropzone',
    standalone: true,
    imports: [ElvEmptyStateComponent, ElvAlertComponent],
    templateUrl: './elv-dropzone.component.html',
    styleUrl: './elv-dropzone.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'elv-dropzone',
        '[class.is-dragging]': 'dragging()',
        '[class.is-disabled]': 'disabled()',
        '[class.is-busy]': 'busy()',
    },
})
export class ElvDropzoneComponent {
    /**
     * Extensions (`.pdf`) and/or MIME patterns (`image/*`). Also fed straight
     * to the native input's `accept`, so the OS picker filters the same way.
     */
    readonly accept = input<readonly string[]>([]);

    readonly maxSizeMb = input(10, { transform: numberAttribute });
    readonly multiple = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });

    /** Hides the drop surface — for while the caller processes the file. */
    readonly busy = input(false, { transform: booleanAttribute });

    // ── Idle copy (rendered through elv-empty-state) ──────────────────
    readonly idleIcon = input('pi-cloud-upload');
    readonly idleEyebrow = input('');
    readonly idleTitle = input('Drop a file here');
    readonly idleText = input('or click to browse');
    readonly actionTitle = input('');

    readonly ariaLabel = input('Upload a file');

    readonly accepted = output<File[]>();
    readonly rejected = output<ElvDropzoneRejection[]>();

    protected readonly dragging = signal(false);
    protected readonly error = signal('');

    /** `accept` for the native input — same list, comma-joined. */
    protected readonly acceptAttr = computed(() => {
        const list = this.accept();
        return list.length ? list.join(',') : null;
    });

    /**
     * dragenter/dragleave fire per element, not per zone. A depth counter is
     * the only way the highlight survives the pointer crossing a child.
     */
    private depth = 0;

    protected onDragEnter(event: DragEvent): void {
        event.preventDefault();
        if (this.inert()) {
            return;
        }
        this.depth += 1;
        this.dragging.set(true);
    }

    protected onDragOver(event: DragEvent): void {
        // Without this the browser navigates to the dropped file.
        event.preventDefault();
        if (event.dataTransfer && !this.inert()) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.depth = Math.max(0, this.depth - 1);
        if (this.depth === 0) {
            this.dragging.set(false);
        }
    }

    protected onDrop(event: DragEvent): void {
        event.preventDefault();
        this.depth = 0;
        this.dragging.set(false);
        if (this.inert()) {
            return;
        }
        this.ingest(Array.from(event.dataTransfer?.files ?? []));
    }

    protected onPick(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.ingest(Array.from(input.files ?? []));
        // Let the same file be chosen again after a remove/retry.
        input.value = '';
    }

    protected dismissError(): void {
        this.error.set('');
    }

    private inert(): boolean {
        return this.disabled() || this.busy();
    }

    private ingest(files: File[]): void {
        if (!files.length) {
            return;
        }

        const limit = this.multiple() ? files.length : 1;
        const ok: File[] = [];
        const bad: ElvDropzoneRejection[] = [];

        files.forEach((file, index) => {
            if (index >= limit) {
                bad.push({ file, reason: 'count', message: `Only ${limit} file can be uploaded at a time.` });
                return;
            }
            if (!this.typeAllowed(file)) {
                bad.push({
                    file,
                    reason: 'type',
                    message: `${file.name} is not a supported format.`,
                });
                return;
            }
            if (file.size > this.maxSizeMb() * 1024 * 1024) {
                bad.push({
                    file,
                    reason: 'size',
                    message: `${file.name} is over the ${this.maxSizeMb()} MB limit.`,
                });
                return;
            }
            ok.push(file);
        });

        // One message, not a stack of them — the first problem is the one
        // the user needs to act on.
        this.error.set(bad.length ? bad[0].message : '');

        if (bad.length) {
            this.rejected.emit(bad);
        }
        if (ok.length) {
            this.accepted.emit(ok);
        }
    }

    /** Empty `accept` means everything is allowed. */
    private typeAllowed(file: File): boolean {
        const rules = this.accept();
        if (!rules.length) {
            return true;
        }

        const name = file.name.toLowerCase();
        const mime = file.type.toLowerCase();

        return rules.some((raw) => {
            const rule = raw.trim().toLowerCase();
            if (!rule) {
                return false;
            }
            if (rule.startsWith('.')) {
                return name.endsWith(rule);
            }
            if (rule.endsWith('/*')) {
                return mime.startsWith(rule.slice(0, -1));
            }
            return mime === rule;
        });
    }
}
