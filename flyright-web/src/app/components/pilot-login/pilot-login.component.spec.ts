import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PilotLoginComponent } from './pilot-login.component';

describe('PilotLoginComponent', () => {
  let component: PilotLoginComponent;
  let fixture: ComponentFixture<PilotLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PilotLoginComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PilotLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
