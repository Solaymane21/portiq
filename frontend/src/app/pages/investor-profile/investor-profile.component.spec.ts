import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestorProfileComponent } from './investor-profile.component';

describe('InvestorProfileComponent', () => {
  let component: InvestorProfileComponent;
  let fixture: ComponentFixture<InvestorProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestorProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvestorProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
