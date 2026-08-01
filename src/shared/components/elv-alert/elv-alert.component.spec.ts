import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvAlertComponent } from './elv-alert.component';

describe('ElvAlertComponent', () => {
    let component: ElvAlertComponent;
    let fixture: ComponentFixture<ElvAlertComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvAlertComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvAlertComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('falls back to the tone icon and honours an override', () => {
        component.tone = 'danger';
        expect(component.resolvedIcon).toBe('pi-times-circle');

        component.icon = 'pi-bolt';
        expect(component.resolvedIcon).toBe('pi-bolt');

        component.icon = 'none';
        expect(component.resolvedIcon).toBe('');
    });

    it('uses an assertive role only for danger and warning', () => {
        component.tone = 'danger';
        expect(component.role).toBe('alert');

        component.tone = 'info';
        expect(component.role).toBe('status');
    });

    it('hides itself and emits on dismiss', () => {
        const closed = jasmine.createSpy('closed');
        const visibleChange = jasmine.createSpy('visibleChange');
        component.closed.subscribe(closed);
        component.visibleChange.subscribe(visibleChange);

        component.dismiss();

        expect(component.visible).toBeFalse();
        expect(closed).toHaveBeenCalled();
        expect(visibleChange).toHaveBeenCalledWith(false);
    });
});
