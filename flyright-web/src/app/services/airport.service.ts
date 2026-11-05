import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface AerodromeInfo {
  icao: string;
  name: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  elevationFt: number;
  runwayHeadingDeg: number;
  runwayLengthFt: number;
}

export interface CorridorVrp {
  coords: [number, number];
  label: string;
  desc: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirportService {
  private aerodromeMap = new Map<string, AerodromeInfo>();
  private isLoaded = false;

  constructor(private http: HttpClient) {
    this.initDatabase();
  }

  initDatabase(): Observable<AerodromeInfo[]> {
    if (this.isLoaded) {
      return of(Array.from(this.aerodromeMap.values()));
    }

    return this.http.get<AerodromeInfo[]>('assets/data/us-airports.json').pipe(
      tap(airports => {
        airports.forEach(aero => {
          if (aero.icao) {
            const code = aero.icao.toUpperCase().trim();
            this.aerodromeMap.set(code, aero);

            // Also index without 'K' prefix if 4-letter US ICAO (e.g. KAKR -> AKR)
            if (code.startsWith('K') && code.length === 4) {
              this.aerodromeMap.set(code.substring(1), aero);
            }
          }
        });
        this.isLoaded = true;
        console.log(`[FlyRight Co-Pilot] Offline aerodrome cache loaded: ${this.aerodromeMap.size} identifiers indexed.`);
      }),
      catchError(err => {
        console.warn('[FlyRight Co-Pilot] Offline dataset load error:', err);
        return of([]);
      })
    );
  }

  getAerodrome(code: string): AerodromeInfo {
    if (!code) code = 'KBTP';
    const clean = code.toUpperCase().trim();

    // 1. Direct match
    if (this.aerodromeMap.has(clean)) {
      return this.aerodromeMap.get(clean)!;
    }

    // 2. Try prefixing 'K' for 3-letter inputs (e.g. POV -> KPOV)
    if (clean.length === 3 && this.aerodromeMap.has('K' + clean)) {
      return this.aerodromeMap.get('K' + clean)!;
    }

    // 3. Fallback if code is missing from dataset
    return {
      icao: clean,
      name: `${clean} Airfield`,
      lat: 40.7767,
      lng: -79.9494,
      elevationFt: 1200,
      runwayHeadingDeg: 90,
      runwayLengthFt: 5000
    };
  }

  // FAA Private Pilot Standard: Checkpoints spaced every 10–15 NM
  getCorridorWaypoints(depIcao: string, destIcao: string, dep: AerodromeInfo, dest: AerodromeInfo): CorridorVrp[] {
    const dLat = (dest.lat - dep.lat) * 60;
    const dLng = (dest.lng - dep.lng) * 60 * Math.cos(((dep.lat + dest.lat) / 2) * (Math.PI / 180));
    const totalDistanceNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

    // Space checkpoints ~12 NM apart along the route
    const legIntervalNm = 12;
    const numCheckpoints = Math.max(1, Math.floor(totalDistanceNm / legIntervalNm));
    const waypoints: CorridorVrp[] = [];

    const visualFeatures = [
      'Prominent Highway Interchange / Toll Plaza',
      'Large Reservoir Dam / Distinct Peninsula',
      'Active Rail Siding & Industrial Silos',
      'Radio Transmission Tower Array (Flashing Strobe)',
      'River Bend / Confluence with Bridge',
      'Race Track / High School Stadium Complex',
      'Major Power Transmission Substation',
      'Limestone Quarry Pit / Conveyor Structure'
    ];

    for (let i = 1; i <= numCheckpoints; i++) {
      const fraction = i / (numCheckpoints + 1);
      const wLat = Number((dep.lat + (dest.lat - dep.lat) * fraction).toFixed(4));
      const wLng = Number((dep.lng + (dest.lng - dep.lng) * fraction).toFixed(4));
      const legDist = Math.round(totalDistanceNm * fraction);
      const remainingNm = totalDistanceNm - legDist;
      const feature = visualFeatures[(i - 1) % visualFeatures.length];

      waypoints.push({
        coords: [wLat, wLng],
        label: `VRP ${i}: ${legDist} NM`,
        desc: `<b>Visual Checkpoint ${i}</b><br>` +
              `Ident: ${feature}<br>` +
              `Leg: ${legDist} NM flown | ${remainingNm} NM to dest<br>` +
              `VFR Cruising Guidance: Maintain assigned altitude & compass heading`
      });
    }

    return waypoints;
  }

  calculateTrafficPattern(lat: number, lng: number, runwayHeadingDeg: number = 80): [number, number][] {
    const dLat = 0.012;
    const dLng = 0.016;
    return [
      [lat, lng - dLng],
      [lat + dLat, lng - dLng],
      [lat + dLat, lng + dLng],
      [lat, lng + dLng],
      [lat, lng - dLng]
    ];
  }
}
