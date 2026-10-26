import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightLoadingComponent } from './flight-loading.component';

describe('FlightLoadingComponent', () => {
  let component: FlightLoadingComponent;
  let fixture: ComponentFixture<FlightLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightLoadingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FlightLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
