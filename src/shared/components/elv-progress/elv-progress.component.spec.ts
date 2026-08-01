import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvProgressComponent } from './elv-progress.component';

describe('ElvProgressComponent', () => {
    let component: ElvProgressComponent;
    let fixture: ComponentFixture<ElvProgressComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ElvProgressComponent],
            providers: [provideExperimentalZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ElvProgressComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('scales the value against max', () => {
        component.value = 3;
        component.max = 12;
        expect(component.percent).toBe(25);
    });

    it('clamps out-of-range values and guards a zero max', () => {
        component.value = 500;
        expect(component.percent).toBe(100);

        component.value = -20;
        expect(component.percent).toBe(0);

        component.value = 50;
        component.max = 0;
        expect(component.percent).toBe(0);
    });

    it('prefers valueText over the computed percentage', () => {
        component.value = 25;
        expect(component.displayValue).toBe('25%');

        component.valueText = '3 of 12';
        expect(component.displayValue).toBe('3 of 12');
    });

    it('empties the ring arc at 0% and fills it at 100%', () => {
        component.value = 0;
        expect(component.ringDashOffset).toBeCloseTo(component.ringCircumference, 5);

        component.value = 100;
        expect(component.ringDashOffset).toBeCloseTo(0, 5);
    });
});
