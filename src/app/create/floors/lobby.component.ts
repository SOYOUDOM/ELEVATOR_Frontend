import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ElvButtonComponent } from '@shared/components/elv-button/elv-button.component';

import { CvApiService } from '../cv-api.service';
import { CvDraftStore } from '../cv-draft.store';
import { FloorFrameComponent } from './floor-frame.component';

/**
 * FLOOR G · the lobby.
 *
 * The entrance choice lives here rather than being asked twice — get-started
 * already offers these doors, and this is the floor where that choice
 * actually does something.
 *
 * After an import the visitor lands on an arrivals summary rather than a
 * pre-filled form. A real parse is never clean, and dumping a rough result
 * into nine fields turns typing into auditing, which is slower and feels
 * worse. So: fill what we are sure about, flag the rest.
 */
@Component({
    selector: 'app-create-lobby',
    standalone: true,
    templateUrl: './lobby.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FloorFrameComponent, ElvButtonComponent],
})
export class LobbyComponent {
    readonly store = inject(CvDraftStore);
    readonly parsing = signal(false);
    readonly failed = signal('');
    readonly dragOver = signal(false);

    readonly arrived = computed(() => this.store.source() === 'import');
    readonly stats = computed(() => {
        const d = this.store.draft();
        return [
            { n: d.experience.length, label: 'Roles', warn: false },
            { n: d.education.length, label: 'Qualifications', warn: false },
            { n: this.store.skillCount(), label: 'Skills', warn: false },
            { n: d.photo.src ? 1 : 0, label: 'Photo', warn: false },
            { n: d.guessed.length, label: 'Need a look', warn: d.guessed.length > 0 },
        ];
    });

    /** No file picker needed to see the flow — the mock parser ignores content. */
    // Declared after the public surface: the lint config wants every
    // public member ahead of the private ones. Nothing here is read
    // during field initialisation, so the order is free.
    private readonly api = inject(CvApiService);
    private readonly router = inject(Router);

    importCv(file?: File): void {
        this.parsing.set(true);
        this.failed.set('');
        const payload = file ?? new File([''], 'cv.pdf', { type: 'application/pdf' });
        this.api.parse(payload).subscribe({
            next: (res) => {
                this.store.load({ ...res.draft, source: 'import', guessed: res.guessed });
                this.parsing.set(false);
            },
            error: () => {
                this.parsing.set(false);
                this.failed.set('We could not read that file. Try a PDF or DOCX, or start from empty.');
            },
        });
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragOver.set(false);
        this.importCv(event.dataTransfer?.files?.[0]);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragOver.set(true);
    }

    fromScratch(): void {
        this.store.reset();
        this.store.setSource('scratch');
        this.router.navigate(['/app/create/basic-info']);
    }

    start(): void {
        this.router.navigate(['/app/create/basic-info']);
    }
}
