import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvChipComponent } from './elv-chip.component';

describe('ElvChipComponent', () => {
  let component: ElvChipComponent;
  let fixture: ComponentFixture<ElvChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElvChipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElvChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
