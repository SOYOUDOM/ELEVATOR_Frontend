import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvCardComponent } from './elv-card.component';

describe('ElvCardComponent', () => {
  let component: ElvCardComponent;
  let fixture: ComponentFixture<ElvCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElvCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElvCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
