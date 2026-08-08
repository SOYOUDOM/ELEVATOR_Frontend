import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvAvatarComponent } from './elv-avatar.component';

describe('ElvAvatarComponent', () => {
    let component: ElvAvatarComponent;
    let fixture: ComponentFixture<ElvAvatarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvAvatarComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvAvatarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('derives initials from the first and last word', () => {
        component.name = 'Ada Lovelace';
        expect(component.resolvedInitials).toBe('AL');

        component.name = 'Ada Byron King Lovelace';
        expect(component.resolvedInitials).toBe('AL');

        component.name = 'Ada';
        expect(component.resolvedInitials).toBe('A');

        component.name = '   ';
        expect(component.resolvedInitials).toBe('');
    });

    it('lets explicit initials win, capped at two characters', () => {
        component.name = 'Ada Lovelace';
        component.initials = 'ada';
        expect(component.resolvedInitials).toBe('AD');
    });

    it('falls back to initials when the image fails to load', () => {
        component.image = '/missing.png';
        component.name = 'Ada Lovelace';
        expect(component.showImage).toBeTrue();

        component.onImageError();

        expect(component.showImage).toBeFalse();
        expect(component.resolvedInitials).toBe('AL');
    });

    it('shows the icon only when there is no image and no initials', () => {
        expect(component.showIcon).toBeTrue();

        component.name = 'Ada Lovelace';
        expect(component.showIcon).toBeFalse();
    });

    it('derives a stable colour per name and yields to an explicit accent', () => {
        component.autoColor = true;
        component.name = 'Ada Lovelace';

        const first = component.autoAccent;
        expect(first).toMatch(/^hsl\(/);
        expect(component.autoAccent).toBe(first);
        expect(component.resolvedAccent).toBe(first);

        component.accentColor = '#ff5b8a';
        expect(component.resolvedAccent).toBe('#ff5b8a');
    });

    it('emits only when interactive', () => {
        const spy = jasmine.createSpy('clicked');
        component.clicked.subscribe(spy);

        component.onActivate(new Event('click'));
        expect(spy).not.toHaveBeenCalled();

        component.interactive = true;
        component.onActivate(new Event('click'));
        expect(spy).toHaveBeenCalled();
    });

    it('drops the img role when there is nothing to label it with', () => {
        expect(component.hostRole).toBeNull();

        component.name = 'Ada Lovelace';
        expect(component.hostRole).toBe('img');

        component.interactive = true;
        expect(component.hostRole).toBe('button');
    });
});
