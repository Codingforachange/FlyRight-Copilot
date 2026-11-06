import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs';
import { Pilot, FlightMission } from '../models/pilot.model';

@Injectable({
  providedIn: 'root'
})
export class PilotService {
  private pilotApi = 'http://localhost:8080/api/pilots';
  private missionApi = 'http://localhost:8080/api/missions';

  constructor(private http: HttpClient) {}

  registerPilot(pilot: Pilot): Observable<Pilot> {
    return this.http.post<Pilot>(`${this.pilotApi}/register`, pilot);
  }

  loginPilot(email: string): Observable<Pilot> {
    return this.http.post<Pilot>(`${this.pilotApi}/login`, { email });
  }

  createMission(mission: any): Observable<any> {
    return this.http.post<any>(this.missionApi, mission).pipe(
      catchError(err => {
        console.warn('[Offline Mode] Mission sync to backend bypassed (500). Storing offline.', err.message);
        try {
          const offlineMissions = JSON.parse(localStorage.getItem('flyright_offline_missions') || '[]');
          offlineMissions.push(mission);
          localStorage.setItem('flyright_offline_missions', JSON.stringify(offlineMissions));
        } catch (e) {
          console.warn('[Offline Mode] Storage fallback failed', e);
        }
        return of({ ...mission, id: 'offline_' + Date.now() });
      })
    );
  }

  getPilotMissions(pilotId: number): Observable<FlightMission[]> {
    return this.http.get<FlightMission[]>(`${this.missionApi}/pilot/${pilotId}`);
  }

  saveFlightLog(flightLog: any): Observable<any> {
    return this.http.post<any>('/api/flight-logs', flightLog);
  }

  getFlightLogs(): Observable<any[]> {
    return this.http.get<any[]>('/api/flight-logs');
  }
}