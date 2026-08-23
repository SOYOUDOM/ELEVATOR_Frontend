import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { map } from 'rxjs/operators';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvEmptyStateComponent } from '@shared/components/elv-empty-state/elv-empty-state.component';
import { ElvSkeletonComponent } from '@shared/components/elv-skeleton/elv-skeleton.component';

import { PanelResizeDirective } from '@app/cv/directives/panel-resize.directive';
import { CvEditorStore } from '@app/cv/state/cv-editor.store';
import { CvSelectionStore } from '@app/cv/state/cv-selection.store';
import { type RailItemId, WorkspaceUiStore } from '@app/cv/state/workspace-ui.store';

import { CareerTimelineComponent } from './components/career-timeline/career-timeline.component';
import { CvBuilderComponent } from './components/cv-builder/cv-builder.component';
import { CvInspectorComponent } from './components/cv-inspector/cv-inspector.component';
import { CvPreviewComponent } from './components/cv-preview/cv-preview.component';
import { CvTopbarComponent } from './components/cv-topbar/cv-topbar.component';

/**
 * ELEVATOR — the Create workspace.
 *
 * Four regions around one document: rail, builder, preview, inspector, with the
 * Career Timeline underneath. The document is the focus; everything else is
 * chrome that supports it, which is why the panels are hairline-bordered dark
 * surfaces and the page in the middle is the only bright thing on screen.
 *
 * The three stores are provided HERE, not in root. An editing session owns its
 * document, its selection and its panel sizes, and all three should die when
 * the user leaves — a stale selection pointing at a CV you closed is a bug
 * waiting for its moment.
 *
 * No `position: fixed` anywhere in this layout. The app shell's .route-shell
 * keeps a transform after its boot animation, and a transformed ancestor
 * becomes the containing block for fixed children — the same trap documented on
 * the Get Started page. Explicit heights and grid, throughout.
 */
@Component({
    selector: 'app-create',
    standalone: true,
    templateUrl: './create.component.html',
    styleUrl: './create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [CvEditorStore, CvSelectionStore, WorkspaceUiStore],
    imports: [
        RouterLink,
        ElvAlertComponent,
        ElvButtonComponent,
        ElvEmptyStateComponent,
        ElvSkeletonComponent,
        PanelResizeDirective,
        CvTopbarComponent,
        CvBuilderComponent,
        CvPreviewComponent,
        CvInspectorComponent,
        CareerTimelineComponent,
    ],
})
export class CreateComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);

    readonly editor = inject(CvEditorStore);
    readonly selection = inject(CvSelectionStore);
    readonly ui = inject(WorkspaceUiStore);

    /** Clean preview: the document with no editor affordances, on screen. */
    readonly cleanPreview = signal(false);

    readonly rail: { id: RailItemId; label: string; icon: string }[] = [
        { id: 'build', label: 'Build', icon: 'pi-pencil' },
        { id: 'template', label: 'Template', icon: 'pi-clone' },
        { id: 'design', label: 'Design', icon: 'pi-palette' },
        { id: 'ai', label: 'AI Tools', icon: 'pi-sparkles' },
        { id: 'ats', label: 'ATS Score', icon: 'pi-shield' },
        { id: 'settings', label: 'Settings', icon: 'pi-cog' },
    ];

    readonly cvId = signal<string | null>(null);
    readonly status = this.editor.status;
    readonly loadError = this.editor.loadError;

    /** Zoom is a display transform. It never reaches the document's own sizes. */
    readonly zoomScale = computed(() => this.ui.previewZoom() / 100);

    constructor() {
        this.route.paramMap
            .pipe(
                map((params) => params.get('cvId')),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((cvId) => {
                this.cvId.set(cvId);
                if (cvId) {
                    this.editor.load(cvId);
                }
            });
    }

    selectRail(id: RailItemId): void {
        this.ui.setRail(id);
        if (id === 'ai' || id === 'ats') {
            this.document.getElementById(`insp-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    reload(): void {
        const id = this.cvId();
        if (id) {
            this.editor.load(id);
        }
    }

    toggleClean(): void {
        this.cleanPreview.update((clean) => !clean);
    }

    /**
     * Export is the browser's own print-to-PDF against styles/_print.scss.
     * There is no export endpoint because there is nothing for a server to do
     * that the page cannot: the document already renders at real page
     * dimensions in millimetres, and the print sheet drops every piece of
     * editor chrome. Adding an API here would be an API to maintain for nothing.
     *
     * The pending patch is flushed first so the PDF matches what the server
     * holds. saveNow() completes immediately when nothing is queued, and its
     * failures are already handled inside the store, so `complete` is the one
     * hook needed here.
     */
    exportCv(): void {
        this.editor.saveNow().subscribe({ complete: () => this.document.defaultView?.print() });
    }

    saveToProfile(): void {
        this.editor.saveToProfile();
    }
}
