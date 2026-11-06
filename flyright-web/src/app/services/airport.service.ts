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
        airports.forEach((aero: any) => {
        const id = (aero.icao || aero.ident || aero.code || '').toUpperCase().trim();
        if (id) {
          this.aerodromeMap.set(id, aero);
          if (id.startsWith('K') && id.length === 4) {
            this.aerodromeMap.set(id.substring(1), aero);
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

    // 1. Direct match (e.g. 'L18' or 'KMYF')
    if (this.aerodromeMap.has(clean)) {
      return this.aerodromeMap.get(clean)!;
    }

    // 2. Try stripping 'K' (e.g. 'KL18' -> 'L18')
    if (clean.startsWith('K') && this.aerodromeMap.has(clean.substring(1))) {
      return this.aerodromeMap.get(clean.substring(1))!;
    }

    // 3. Try prepending 'K' for 3-letter identifiers (e.g. 'MYF' -> 'KMYF')
    if (clean.length === 3 && this.aerodromeMap.has('K' + clean)) {
      return this.aerodromeMap.get('K' + clean)!;
    }

    // Fallback: If totally missing from offline dataset, default near destination region (Fallbrook L18 coords)
    return {
      icao: clean,
      name: `${clean} Airfield`,
      lat: 33.3544,
      lng: -117.2508,
      elevationFt: 708,
      runwayHeadingDeg: 90,
      runwayLengthFt: 2160
    };
  }


  // FAA Private Pilot Standard: Checkpoints spaced every 10–15 NM
  getCorridorWaypoints(depIcao: string, destIcao: string, dep: AerodromeInfo, dest: AerodromeInfo): CorridorVrp[] {
    const dLat = (dest.lat - dep.lat) * 60;
    const dLng = (dest.lng - dep.lng) * 60 * Math.cos(((dep.lat + dest.lat) / 2) * (Math.PI / 180));
    const totalDistanceNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

    // Calculate Magnetic Track
    const y = Math.sin((dest.lng - dep.lng) * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180);
    const x = Math.cos(dep.lat * Math.PI / 180) * Math.sin(dest.lat * Math.PI / 180) -
              Math.sin(dep.lat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * Math.cos((dest.lng - dep.lng) * Math.PI / 180);
    const trackDeg = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);

    // FAR 91.159 Hemispheric VFR Cruising Rule
    const recommendedAlt = (trackDeg >= 0 && trackDeg <= 179) ? '3,500 / 5,500 FT MSL' : '4,500 / 6,500 FT MSL';

    const legIntervalNm = 12;
    const numCheckpoints = Math.max(1, Math.floor(totalDistanceNm / legIntervalNm));
    const waypoints: CorridorVrp[] = [];

    for (let i = 1; i <= numCheckpoints; i++) {
      const fraction = i / (numCheckpoints + 1);
      const wLat = Number((dep.lat + (dest.lat - dep.lat) * fraction).toFixed(4));
      const wLng = Number((dep.lng + (dest.lng - dep.lng) * fraction).toFixed(4));
      const legDist = Math.round(totalDistanceNm * fraction);
      const remainingNm = totalDistanceNm - legDist;

      waypoints.push({
        coords: [wLat, wLng],
        label: `VFR ${i}: ${legDist} NM`,
        desc: `<b>VFR Checkpoint ${i} (${legDist} NM)</b><br>` +
              `<b>Track:</b> ${trackDeg}° Mag | <b>Target Alt:</b> ${recommendedAlt}<br>` +
              `<b>Dist Remaining:</b> ${remainingNm} NM to dest<br>` +
              `<span style="font-size:10px; color:#94a3b8; font-style:italic;">Visual scan: Cross-check terrain, highways, rail & lakes on sectional</span>`
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
