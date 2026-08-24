import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { map } from 'rxjs/operators';

import { ElvAlertComponent } from '@shared/components/elv-alert/elv-alert.component';
import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';
import { ElvEmptyStateComponent } from '@shared/components/elv-empty-state/elv-empty-state.component';

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
        { id: 'ats', label: 'ATS', icon: 'pi-shield' },
        { id: 'settings', label: 'Settings', icon: 'pi-cog' },
    ];

    readonly cvId = signal<string | null>(null);
    readonly status = this.editor.status;
    readonly loadError = this.editor.loadError;

    /** Zoom is a display transform. It never reaches the document's own sizes. */
    readonly zoomScale = computed(() => this.ui.effectivePreviewZoom() / 100);

    private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

    /**
     * A4 at 96dpi. The document is laid out in millimetres because it is a
     * page; the stage has to reason about it in pixels to fit it.
     */
    private static readonly PAGE_WIDTH_PX = (210 * 96) / 25.4;
    private static readonly STAGE_PADDING_PX = 56;

    constructor() {
        // WORKSPACE MODE. Set before the first render, cleared on the way out.
        // It hands styles/_workspace.scss three jobs the component itself
        // cannot do from inside emulated encapsulation: lock the document
        // scrollport so the editor can never produce a page-level scrollbar
        // with empty space under it, give the shell chain a definite height,
        // and hide the marketing header the concept does not have.
        const root = this.document.documentElement;
        root.setAttribute('data-workspace', 'on');
        this.destroyRef.onDestroy(() => root.removeAttribute('data-workspace'));

        // Fit-to-stage. The stage only exists once the CV has loaded, which is
        // after the first render — so this watches for the element rather than
        // reaching for it once and finding nothing.
        effect(() => this.watchStage(this.stage()?.nativeElement));

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

    private stageObserver?: ResizeObserver;
    private observedStage?: HTMLElement;

    /**
     * Keeps `fitZoom` in step with the stage's real width. Measured from the
     * element, not the viewport, so it stays right while the side panels are
     * being dragged — which is exactly when a viewport-based number goes wrong.
     */
    private watchStage(host: HTMLElement | undefined): void {
        if (host === this.observedStage || typeof ResizeObserver === 'undefined') {
            return;
        }

        this.stageObserver?.disconnect();
        this.observedStage = host;
        if (!host) {
            return;
        }

        const measure = (width: number) => {
            const usable = Math.max(0, width - CreateComponent.STAGE_PADDING_PX);
            const percent = (usable / CreateComponent.PAGE_WIDTH_PX) * 100;
            // Never blow the page up past 100% just because the stage is wide —
            // "fit" means "all of it visible", not "as big as possible".
            this.ui.fitZoom.set(Math.max(25, Math.min(100, Math.round(percent))));
        };

        measure(host.getBoundingClientRect().width);
        this.stageObserver = new ResizeObserver((entries) => measure(entries[0].contentRect.width));
        this.stageObserver.observe(host);
        this.destroyRef.onDestroy(() => this.stageObserver?.disconnect());
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
