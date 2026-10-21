import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  createMission(mission: FlightMission): Observable<FlightMission> {
    return this.http.post<FlightMission>(this.missionApi, mission);
  }

  getPilotMissions(pilotId: number): Observable<FlightMission[]> {
    return this.http.get<FlightMission[]>(`${this.missionApi}/pilot/${pilotId}`);
  }
}