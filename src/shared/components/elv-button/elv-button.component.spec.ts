import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElvButtonComponent } from './elv-button.component';

describe('ElvButtonComponent', () => {
  let component: ElvButtonComponent;
  let fixture: ComponentFixture<ElvButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElvButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElvButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
