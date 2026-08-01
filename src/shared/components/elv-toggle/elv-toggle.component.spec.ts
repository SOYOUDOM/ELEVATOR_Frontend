import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvToggleComponent } from './elv-toggle.component';

describe('ElvToggleComponent', () => {
    let component: ElvToggleComponent;
    let fixture: ComponentFixture<ElvToggleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvToggleComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvToggleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('emits both outputs and the form callback on a user toggle', () => {
        const checkedChange = jasmine.createSpy('checkedChange');
        const changed = jasmine.createSpy('changed');
        const onChange = jasmine.createSpy('onChange');
        component.checkedChange.subscribe(checkedChange);
        component.changed.subscribe(changed);
        component.registerOnChange(onChange);

        component.toggle(true);

        expect(component.checked).toBeTrue();
        expect(checkedChange).toHaveBeenCalledWith(true);
        expect(changed).toHaveBeenCalledWith(true);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('ignores a toggle to the value it already holds', () => {
        const changed = jasmine.createSpy('changed');
        component.changed.subscribe(changed);

        component.toggle(false);

        expect(changed).not.toHaveBeenCalled();
    });

    it('ignores user input while disabled', () => {
        const changed = jasmine.createSpy('changed');
        component.changed.subscribe(changed);
        component.setDisabledState(true);

        component.toggle(true);

        expect(component.checked).toBeFalse();
        expect(changed).not.toHaveBeenCalled();
    });

    it('writes a form value without emitting', () => {
        const changed = jasmine.createSpy('changed');
        component.changed.subscribe(changed);

        component.writeValue(true);

        expect(component.checked).toBeTrue();
        expect(changed).not.toHaveBeenCalled();
    });

    it('marks the control touched on a user toggle', () => {
        const onTouched = jasmine.createSpy('onTouched');
        component.registerOnTouched(onTouched);

        component.toggle(true);

        expect(onTouched).toHaveBeenCalled();
    });

    it('labels itself only when it has no visible text', () => {
        expect(component.resolvedAriaLabel).toBe('Toggle');

        component.label = 'Dark mode';
        expect(component.resolvedAriaLabel).toBeNull();

        component.ariaLabel = 'Toggle dark mode';
        expect(component.resolvedAriaLabel).toBe('Toggle dark mode');
    });

    it('gives every instance a unique input id', () => {
        const other = TestBed.createComponent(ElvToggleComponent).componentInstance;
        expect(other.inputId).not.toBe(component.inputId);
    });

    it('reflects the native checkbox state', () => {
        const input: HTMLInputElement = fixture.nativeElement.querySelector('.elv-toggle__input');

        input.checked = true;
        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(component.checked).toBeTrue();
        expect(fixture.nativeElement.querySelector('.elv-toggle--on')).toBeTruthy();
    });
});
