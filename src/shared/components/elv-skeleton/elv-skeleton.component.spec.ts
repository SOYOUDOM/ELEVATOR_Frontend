import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvSkeletonComponent } from './elv-skeleton.component';

describe('ElvSkeletonComponent', () => {
    let component: ElvSkeletonComponent;
    let fixture: ComponentFixture<ElvSkeletonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvSkeletonComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvSkeletonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('renders one bar per line and one item per count', () => {
        component.lines = 4;
        component.count = 3;
        expect(component.lineItems.length).toBe(4);
        expect(component.items.length).toBe(3);
    });

    it('never renders fewer than one line or one item', () => {
        component.lines = 0;
        component.count = -5;
        expect(component.lineItems.length).toBe(1);
        expect(component.items.length).toBe(1);
    });

    it('renders a bar per repeat', () => {
        fixture.componentRef.setInput('shape', 'line');
        fixture.componentRef.setInput('count', 3);
        fixture.detectChanges();

        const bars = fixture.nativeElement.querySelectorAll('.elv-skeleton__bar');
        expect(bars.length).toBe(3);
    });

    it('marks itself busy for assistive tech', () => {
        const root = fixture.nativeElement.querySelector('.elv-skeleton');
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(root.getAttribute('aria-label')).toBe('Loading');
    });
});
