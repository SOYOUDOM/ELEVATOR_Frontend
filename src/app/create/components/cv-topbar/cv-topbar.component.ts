import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvFieldComponent } from '@shared/components/elv-field';
import { ElvWordmarkComponent } from '@shared/components/elv-wordmark/elv-wordmark.component';

import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { WORKSPACE_LIMITS, WorkspaceUiStore } from '@app/cv/state/workspace-ui.store';

/**
 * ELEVATOR — the workspace toolbar.
 *
 * This is the workspace's ONLY bar. The site header — wordmark plus the
 * marketing nav — is hidden in workspace mode, because an editor has no use for
 * "Templates / About / Login" and the approved concept shows one bar, not two.
 * The wordmark here is the shared elv-wordmark the header itself mounts, so
 * there is still exactly one definition of the mark.
 *
 * The save indicator never lies. It reports the store's actual state, including
 * "Save failed", and offers the retry rather than quietly showing a tick.
 */
@Component({
    selector: 'app-cv-topbar',
    standalone: true,
    templateUrl: './cv-topbar.component.html',
    styleUrl: './cv-topbar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ElvButtonComponent, ElvFieldComponent, ElvWordmarkComponent],
    host: { class: 'tb' },
})
export class CvTopbarComponent {
    private readonly editor = inject(CvEditorStore);
    readonly ui = inject(WorkspaceUiStore);

    readonly cleanPreview = input(false);

    readonly toggleClean = output<void>();
    readonly exportCv = output<void>();
    readonly saveToProfile = output<void>();

    readonly zoomLimits = WORKSPACE_LIMITS.previewZoom;
    readonly document = this.editor.document;
    readonly profileSaveState = this.editor.profileSaveState;

    /** One label and one icon for every save state, including the ugly one. */
    readonly save = computed(() => {
        switch (this.editor.saveState()) {
            case 'saving':
                return { icon: 'pi-cloud-upload', label: 'Saving…', tone: 'busy' as const };
            case 'saved':
                return { icon: 'pi-check-circle', label: `Saved ${this.ago()}`, tone: 'ok' as const };
            case 'dirty':
                return { icon: 'pi-circle', label: 'Unsaved changes', tone: 'busy' as const };
            case 'error':
                return { icon: 'pi-exclamation-triangle', label: 'Save failed', tone: 'bad' as const };
            default:
                return { icon: 'pi-circle', label: 'Up to date', tone: 'idle' as const };
        }
    });

    readonly saveErrorMessage = computed(() => this.editor.saveError()?.message ?? '');

    setName(value: string | number | null): void {
        this.editor.setName(String(value ?? ''));
    }

    retry(): void {
        this.editor.retrySave();
    }

    private ago(): string {
        const at = this.editor.savedAt();
        if (!at) {
            return '';
        }
        const seconds = Math.round((Date.now() - at.getTime()) / 1000);
        if (seconds < 45) {
            return 'just now';
        }
        const minutes = Math.round(seconds / 60);
        return `${minutes}m ago`;
    }
}
