import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Checklist, ChecklistItem } from '../models/checklist.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {
  private readonly apiUrl = '/api/checklists';

  private readonly fallbackCatalog: { [key: string]: Checklist[] } = {
    // --- CESSNA 172 SKYHAWK ---
    'C172': [
      {
        id: 1,
        phase: 'PREFLIGHT',
        title: 'Cabin & Pre-Flight Inspection',
        items: [
          { id: 101, itemSequence: 1, challenge: 'AROW Documents', response: 'CHECK ABOARD', isCompleted: false },
          { id: 102, itemSequence: 2, challenge: 'Control Wheel Lock', response: 'REMOVE', isCompleted: false },
          { id: 103, itemSequence: 3, challenge: 'Ignition Switch', response: 'OFF', isCompleted: false },
          { id: 104, itemSequence: 4, challenge: 'Avionics Master', response: 'OFF', isCompleted: false },
          { id: 105, itemSequence: 5, challenge: 'Master Switch', response: 'ON', isCompleted: false },
          { id: 106, itemSequence: 6, challenge: 'Fuel Quantity', response: 'VERIFY GAUGES', isCompleted: false },
          { id: 107, itemSequence: 7, challenge: 'Flaps', response: 'EXTEND 30° FOR INSPECTION', isCompleted: false },
          { id: 108, itemSequence: 8, challenge: 'Pitot Heat & Lights', response: 'TEST & OFF', isCompleted: false },
          { id: 109, itemSequence: 9, challenge: 'Master Switch', response: 'OFF', isCompleted: false }
        ]
      },
      {
        id: 2,
        phase: 'ENGINE_START',
        title: 'Engine Start (IO-360)',
        items: [
          { id: 201, itemSequence: 1, challenge: 'Pre-flight Briefing', response: 'COMPLETE', isCompleted: false },
          { id: 202, itemSequence: 2, challenge: 'Brakes', response: 'TEST & HOLD', isCompleted: false },
          { id: 203, itemSequence: 3, challenge: 'Circuit Breakers', response: 'ALL IN', isCompleted: false },
          { id: 204, itemSequence: 4, challenge: 'Fuel Selector Valve', response: 'BOTH', isCompleted: false },
          { id: 205, itemSequence: 5, challenge: 'Throttle', response: 'OPEN 1/4 INCH', isCompleted: false },
          { id: 206, itemSequence: 6, challenge: 'Mixture', response: 'IDLE CUTOFF', isCompleted: false },
          { id: 207, itemSequence: 7, challenge: 'Beacon Light', response: 'ON', isCompleted: false },
          { id: 208, itemSequence: 8, challenge: 'Aux Fuel Pump', response: 'PRIME TO FUEL FLOW, OFF', isCompleted: false },
          { id: 209, itemSequence: 9, challenge: 'Propeller Area', response: 'CLEAR CALLOUT', isCompleted: false },
          { id: 210, itemSequence: 10, challenge: 'Ignition Switch', response: 'START & ADVANCE MIXTURE', isCompleted: false },
          { id: 211, itemSequence: 11, challenge: 'Oil Pressure', response: 'GREEN WITHIN 30 SEC', isCompleted: false }
        ]
      },
      {
        id: 3,
        phase: 'BEFORE_TAKEOFF',
        title: 'Before Takeoff (Run-Up)',
        items: [
          { id: 301, itemSequence: 1, challenge: 'Parking Brake', response: 'SET', isCompleted: false },
          { id: 302, itemSequence: 2, challenge: 'Flight Controls', response: 'FREE & CORRECT', isCompleted: false },
          { id: 303, itemSequence: 3, challenge: 'Flight Instruments', response: 'CHECK & SET', isCompleted: false },
          { id: 304, itemSequence: 4, challenge: 'Fuel Selector', response: 'BOTH', isCompleted: false },
          { id: 305, itemSequence: 5, challenge: 'Elevator & Rudder Trim', response: 'SET TAKEOFF', isCompleted: false },
          { id: 306, itemSequence: 6, challenge: 'Throttle', response: '1800 RPM', isCompleted: false },
          { id: 307, itemSequence: 7, challenge: 'Magnetos', response: 'CHECK (MAX 150 DROP, 50 DIFF)', isCompleted: false },
          { id: 308, itemSequence: 8, challenge: 'Engine Gauges & Suction', response: 'CHECK GREEN', isCompleted: false },
          { id: 309, itemSequence: 9, challenge: 'Throttle', response: 'IDLE CHECK, THEN 1000 RPM', isCompleted: false },
          { id: 310, itemSequence: 10, challenge: 'Wing Flaps', response: 'SET 0° TO 10°', isCompleted: false }
        ]
      }
    ],

    // --- CESSNA 152 ---
    'C152': [
      {
        id: 4,
        phase: 'PREFLIGHT',
        title: 'Cabin Inspection',
        items: [
          { id: 401, itemSequence: 1, challenge: 'AROW Documents', response: 'IN ORDER', isCompleted: false },
          { id: 402, itemSequence: 2, challenge: 'Control Lock', response: 'REMOVE', isCompleted: false },
          { id: 403, itemSequence: 3, challenge: 'Ignition Switch', response: 'OFF, KEYS REMOVED', isCompleted: false },
          { id: 404, itemSequence: 4, challenge: 'Master Switch', response: 'ON, CHECK FUEL QUANTITY', isCompleted: false },
          { id: 405, itemSequence: 5, challenge: 'Flaps', response: 'EXTEND 30°', isCompleted: false },
          { id: 406, itemSequence: 6, challenge: 'Master Switch', response: 'OFF', isCompleted: false },
          { id: 407, itemSequence: 7, challenge: 'Fuel Shutoff Valve', response: 'ON', isCompleted: false }
        ]
      },
      {
        id: 5,
        phase: 'ENGINE_START',
        title: 'Engine Start (O-235)',
        items: [
          { id: 501, itemSequence: 1, challenge: 'Seats & Belts', response: 'ADJUSTED & LOCKED', isCompleted: false },
          { id: 502, itemSequence: 2, challenge: 'Brakes', response: 'TEST & HOLD', isCompleted: false },
          { id: 503, itemSequence: 3, challenge: 'Carburetor Heat', response: 'COLD', isCompleted: false },
          { id: 504, itemSequence: 4, challenge: 'Mixture', response: 'FULL RICH', isCompleted: false },
          { id: 505, itemSequence: 5, challenge: 'Primer', response: '1 TO 3 STROKES & LOCKED', isCompleted: false },
          { id: 506, itemSequence: 6, challenge: 'Throttle', response: 'OPEN 1/2 INCH', isCompleted: false },
          { id: 507, itemSequence: 7, challenge: 'Beacon Light', response: 'ON', isCompleted: false },
          { id: 508, itemSequence: 8, challenge: 'Propeller Area', response: 'CLEAR', isCompleted: false },
          { id: 509, itemSequence: 9, challenge: 'Ignition Switch', response: 'START', isCompleted: false },
          { id: 510, itemSequence: 10, challenge: 'Oil Pressure', response: 'GREEN WITHIN 30 SEC', isCompleted: false },
          { id: 511, itemSequence: 11, challenge: 'Flaps', response: 'RETRACT 0°', isCompleted: false }
        ]
      },
      {
        id: 6,
        phase: 'BEFORE_TAKEOFF',
        title: 'Before Takeoff (Run-Up)',
        items: [
          { id: 601, itemSequence: 1, challenge: 'Cabin Doors', response: 'LATCHED', isCompleted: false },
          { id: 602, itemSequence: 2, challenge: 'Flight Controls', response: 'FREE & CORRECT', isCompleted: false },
          { id: 603, itemSequence: 3, challenge: 'Altimeter', response: 'SET CURRENT BARO', isCompleted: false },
          { id: 604, itemSequence: 4, challenge: 'Throttle', response: '1700 RPM', isCompleted: false },
          { id: 605, itemSequence: 5, challenge: 'Magnetos', response: 'CHECK (MAX 125 DROP, 50 DIFF)', isCompleted: false },
          { id: 606, itemSequence: 6, challenge: 'Carb Heat', response: 'TEST DROP & RETURN COLD', isCompleted: false },
          { id: 607, itemSequence: 7, challenge: 'Engine Gauges', response: 'CHECK GREEN', isCompleted: false },
          { id: 608, itemSequence: 8, challenge: 'Throttle', response: 'IDLE CHECK, THEN 1000 RPM', isCompleted: false },
          { id: 609, itemSequence: 9, challenge: 'Elevator Trim', response: 'SET TAKEOFF', isCompleted: false }
        ]
      }
    ],

    // --- PIPER CHEROKEE 140 / 160 / 180 ARCHER ---
    'PA28': [
      {
        id: 7,
        phase: 'PREFLIGHT',
        title: 'Preflight Inspection',
        items: [
          { id: 701, itemSequence: 1, challenge: 'AROW Documents', response: 'VERIFIED', isCompleted: false },
          { id: 702, itemSequence: 2, challenge: 'Control Wheel Lock', response: 'REMOVED', isCompleted: false },
          { id: 703, itemSequence: 3, challenge: 'Ignition Switch', response: 'OFF, KEYS ON DASH', isCompleted: false },
          { id: 704, itemSequence: 4, challenge: 'Master Switch', response: 'ON', isCompleted: false },
          { id: 705, itemSequence: 5, challenge: 'Fuel Gauges', response: 'QUANTITY VERIFIED', isCompleted: false },
          { id: 706, itemSequence: 6, challenge: 'Flaps', response: 'EXTEND FULL', isCompleted: false },
          { id: 707, itemSequence: 7, challenge: 'Master Switch', response: 'OFF', isCompleted: false },
          { id: 708, itemSequence: 8, challenge: 'Fuel Selector', response: 'SET FULLEST TANK', isCompleted: false }
        ]
      },
      {
        id: 8,
        phase: 'ENGINE_START',
        title: 'Engine Start',
        items: [
          { id: 801, itemSequence: 1, challenge: 'Brakes', response: 'SET & HOLD', isCompleted: false },
          { id: 802, itemSequence: 2, challenge: 'Carb Heat', response: 'COLD', isCompleted: false },
          { id: 803, itemSequence: 3, challenge: 'Mixture', response: 'FULL RICH', isCompleted: false },
          { id: 804, itemSequence: 4, challenge: 'Primer', response: '2 TO 3 STROKES & LOCKED', isCompleted: false },
          { id: 805, itemSequence: 5, challenge: 'Throttle', response: 'OPEN 1/4 INCH', isCompleted: false },
          { id: 806, itemSequence: 6, challenge: 'Electric Fuel Pump', response: 'ON, CHECK PRESSURE, OFF', isCompleted: false },
          { id: 807, itemSequence: 7, challenge: 'Anti-Collision Light', response: 'ON', isCompleted: false },
          { id: 808, itemSequence: 8, challenge: 'Propeller Area', response: 'CLEAR CALLOUT', isCompleted: false },
          { id: 809, itemSequence: 9, challenge: 'Starter', response: 'ENGAGE', isCompleted: false },
          { id: 810, itemSequence: 10, challenge: 'Oil Pressure', response: 'GREEN WITHIN 30 SEC', isCompleted: false }
        ]
      },
      {
        id: 9,
        phase: 'BEFORE_TAKEOFF',
        title: 'Before Takeoff (Run-Up)',
        items: [
          { id: 901, itemSequence: 1, challenge: 'Flight Controls', response: 'FREE & CORRECT', isCompleted: false },
          { id: 902, itemSequence: 2, challenge: 'Flight Instruments', response: 'CHECK & SET', isCompleted: false },
          { id: 903, itemSequence: 3, challenge: 'Fuel Selector', response: 'PROPER TANK', isCompleted: false },
          { id: 904, itemSequence: 4, challenge: 'Electric Fuel Pump', response: 'ON', isCompleted: false },
          { id: 905, itemSequence: 5, challenge: 'Throttle', response: '2000 RPM', isCompleted: false },
          { id: 906, itemSequence: 6, challenge: 'Magnetos', response: 'CHECK (MAX 175 DROP, 50 DIFF)', isCompleted: false },
          { id: 907, itemSequence: 7, challenge: 'Carb Heat', response: 'TEST DROP & RETURN COLD', isCompleted: false },
          { id: 908, itemSequence: 8, challenge: 'Engine Gauges', response: 'CHECK GREEN', isCompleted: false },
          { id: 909, itemSequence: 9, challenge: 'Throttle', response: 'IDLE CHECK, THEN 1000 RPM', isCompleted: false },
          { id: 910, itemSequence: 10, challenge: 'Flaps', response: 'RETRACT 0° OR SET TAKEOFF', isCompleted: false },
          { id: 911, itemSequence: 11, challenge: 'Stabilator Trim', response: 'SET NEUTRAL / TAKEOFF', isCompleted: false }
        ]
      }
    ]
  };

  constructor(private http: HttpClient) {}

  getChecklistsByModel(modelCode: string): Observable<Checklist[]> {
    return this.http.get<Checklist[]>(`${this.apiUrl}/${modelCode}`).pipe(
      catchError(() => {
        return of(this.getFallbackChecklists(modelCode));
      })
    );
  }

  private getFallbackChecklists(modelCode: string): Checklist[] {
    const code = (modelCode || '').toUpperCase();
    if (code.includes('152')) {
      return JSON.parse(JSON.stringify(this.fallbackCatalog['C152']));
    }
    if (code.includes('PA28') || code.includes('CHEROKEE') || code.includes('ARCHER') || code.includes('140') || code.includes('160') || code.includes('180')) {
      return JSON.parse(JSON.stringify(this.fallbackCatalog['PA28']));
    }
    return JSON.parse(JSON.stringify(this.fallbackCatalog['C172']));
  }

  toggleItemStatus(itemId: number): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.apiUrl}/items/${itemId}`, {}).pipe(
      catchError(() => {
        return of({
          id: itemId,
          itemSequence: 1,
          challenge: '',
          response: '',
          isCompleted: true
        });
      })
    );
  }

  resetChecklist(modelCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset/${modelCode}`, {}).pipe(
      catchError(() => of(void 0))
    );
  }
}