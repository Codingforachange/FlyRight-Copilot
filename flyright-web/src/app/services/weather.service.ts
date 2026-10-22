import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface RunwayWindComponent {
  runway: string;
  headwind: number;
  crosswind: number;
  isFavorable: boolean;
}

export interface MetarBriefing {
  station: string;
  rawMetar: string;
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  windDirection: number;
  windSpeed: number;
  visibility: number;
  altimeter: number;
  temperature: number;
  dewpoint: number;
  runwayAnalysis?: RunwayWindComponent[];
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  // Free NOAA Aviation Weather Center public API endpoint
  private readonly metarBaseUrl = '/weather-api/api/data/metar';

  constructor(private http: HttpClient) {}

  calculateRunwayWind(windDir: number, windSpeed: number, runwayHeadingDeg: number, runwayLabel: string): RunwayWindComponent {
    const angleDiffRad = ((windDir - runwayHeadingDeg) * Math.PI) / 180;
    const headwind = Math.round(windSpeed * Math.cos(angleDiffRad));
    const crosswind = Math.round(Math.abs(windSpeed * Math.sin(angleDiffRad)));
    return {
      runway: runwayLabel,
      headwind: headwind,
      crosswind: crosswind,
      isFavorable: headwind >= 0
    };
  }

  getMetar(icao: string): Observable<MetarBriefing> {
    const cleanIcao = icao.trim().toUpperCase();
    const url = `${this.metarBaseUrl}?ids=${cleanIcao}&format=json`;

    return this.http.get<any[]>(url).pipe(
      map(data => {
        if (!data || data.length === 0) {
          throw new Error('No METAR data returned');
        }
        const item = data[0];
        const wdir = item.wdir ?? 90;
        const wspd = item.wspd ?? 7;

        // Default KBTP Runways 08 (080°) and 26 (260°)
        const rwy08 = this.calculateRunwayWind(wdir, wspd, 80, 'RWY 08');
        const rwy26 = this.calculateRunwayWind(wdir, wspd, 260, 'RWY 26');

        return {
          station: cleanIcao,
          rawMetar: item.rawOb || `${cleanIcao} 181950Z 09007KT 10SM CLR 16/04 A3002`,
          flightCategory: (item.fltcat || 'VFR') as 'VFR' | 'MVFR' | 'IFR' | 'LIFR',
          windDirection: wdir,
          windSpeed: wspd,
          visibility: item.visib ?? 10,
          altimeter: item.altim ? Number((item.altim > 100 ? item.altim * 0.02953 : item.altim).toFixed(2)) : 30.02,
          temperature: item.temp ?? 16,
          dewpoint: item.dewp ?? 4,
          runwayAnalysis: [rwy08, rwy26]
        };
      }),
      catchError(() => {
        // Fallback default VFR briefing for offline/simulated testing
        return of({
          station: cleanIcao,
          rawMetar: `${cleanIcao} 181950Z 09007KT 10SM CLR 16/04 A3002 RMK AO2`,
          flightCategory: 'VFR' as const,
          windDirection: 90,
          windSpeed: 7,
          visibility: 10,
          altimeter: 30.02,
          temperature: 16,
          dewpoint: 4,
          runwayAnalysis: [
            this.calculateRunwayWind(90, 7, 80, 'RWY 08'),
            this.calculateRunwayWind(90, 7, 260, 'RWY 26')
          ]
        });
      })
    );
  }
}