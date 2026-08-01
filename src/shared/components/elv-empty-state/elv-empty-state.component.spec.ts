import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvEmptyStateComponent } from './elv-empty-state.component';

describe('ElvEmptyStateComponent', () => {
    let component: ElvEmptyStateComponent;
    let fixture: ComponentFixture<ElvEmptyStateComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvEmptyStateComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvEmptyStateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('resolves skin, frame and icon from the preset', () => {
        component.variant = 'error';
        expect(component.rSkin).toBe('panel');
        expect(component.rFrame).toBe('circle');
        expect(component.rTone).toBe('danger');
        expect(component.resolvedIcon).toBe('pi-exclamation-triangle');
    });

    it('lets explicit axes override the preset', () => {
        component.variant = 'search';
        component.skin = 'glass';
        component.frame = 'square';
        component.icon = 'pi-bolt';

        expect(component.rSkin).toBe('glass');
        expect(component.rFrame).toBe('square');
        expect(component.resolvedIcon).toBe('pi-bolt');
    });

    it('drops the icon entirely when asked', () => {
        component.icon = 'none';
        expect(component.resolvedIcon).toBe('');
    });

    it('emits the built-in action', () => {
        const spy = jasmine.createSpy('action');
        component.action.subscribe(spy);

        component.onAction(new Event('click'));

        expect(spy).toHaveBeenCalled();
    });
});
