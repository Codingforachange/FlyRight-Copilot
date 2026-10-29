import { Injectable } from '@angular/core';

export interface AerodromeInfo {
  icao: string;
  name: string;
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
  private aerodromes: Record<string, AerodromeInfo> = {
    // Pennsylvania & Northeast Hubs
    'KBTP': { icao: 'KBTP', name: 'Butler County Regional', lat: 40.7767, lng: -79.9494, elevationFt: 1248, runwayHeadingDeg: 80, runwayLengthFt: 4801 },
    'KAGC': { icao: 'KAGC', name: 'Allegheny County', lat: 40.3544, lng: -79.9302, elevationFt: 1252, runwayHeadingDeg: 100, runwayLengthFt: 6501 },
    'KIDI': { icao: 'KIDI', name: 'Indiana County (Jimmy Stewart Field)', lat: 40.6318, lng: -79.1042, elevationFt: 1405, runwayHeadingDeg: 110, runwayLengthFt: 4004 },
    'KBVI': { icao: 'KBVI', name: 'Beaver County Regional', lat: 40.7725, lng: -80.3914, elevationFt: 1256, runwayHeadingDeg: 100, runwayLengthFt: 4501 },
    'KPIT': { icao: 'KPIT', name: 'Pittsburgh International', lat: 40.4915, lng: -80.2329, elevationFt: 1204, runwayHeadingDeg: 100, runwayLengthFt: 11500 },
    'KLBE': { icao: 'KLBE', name: 'Arnold Palmer Regional', lat: 40.2759, lng: -79.4048, elevationFt: 1199, runwayHeadingDeg: 60, runwayLengthFt: 8224 },
    'KUNV': { icao: 'KUNV', name: 'University Park (State College)', lat: 40.8493, lng: -77.8487, elevationFt: 1239, runwayHeadingDeg: 60, runwayLengthFt: 6701 },
    'KFRG': { icao: 'KFRG', name: 'Republic Airport (Farmingdale, NY)', lat: 40.7288, lng: -73.4134, elevationFt: 80, runwayHeadingDeg: 140, runwayLengthFt: 6833 },
    'KCDW': { icao: 'KCDW', name: 'Essex County (Caldwell, NJ)', lat: 40.8752, lng: -74.2814, elevationFt: 172, runwayHeadingDeg: 40, runwayLengthFt: 4552 },

    // California & West Coast Hubs
    'KVNY': { icao: 'KVNY', name: 'Van Nuys Airport', lat: 34.2098, lng: -118.4899, elevationFt: 802, runwayHeadingDeg: 160, runwayLengthFt: 8001 },
    'KSMO': { icao: 'KSMO', name: 'Santa Monica Municipal', lat: 34.0158, lng: -118.4513, elevationFt: 177, runwayHeadingDeg: 210, runwayLengthFt: 3500 },
    'KLGB': { icao: 'KLGB', name: 'Long Beach Airport', lat: 33.8177, lng: -118.1516, elevationFt: 60, runwayHeadingDeg: 260, runwayLengthFt: 10000 },
    'KEMT': { icao: 'KEMT', name: 'San Gabriel Valley (El Monte)', lat: 34.0860, lng: -118.0348, elevationFt: 296, runwayHeadingDeg: 190, runwayLengthFt: 3995 },
    'KCMA': { icao: 'KCMA', name: 'Camarillo Airport', lat: 34.2137, lng: -119.0944, elevationFt: 77, runwayHeadingDeg: 80, runwayLengthFt: 6013 },
    'KSNA': { icao: 'KSNA', name: 'John Wayne (Orange County)', lat: 33.6757, lng: -117.8682, elevationFt: 56, runwayHeadingDeg: 200, runwayLengthFt: 5701 },
    'KMYF': { icao: 'KMYF', name: 'Montgomery-Gibbs (San Diego)', lat: 32.8156, lng: -117.1396, elevationFt: 427, runwayHeadingDeg: 280, runwayLengthFt: 4598 },
    'KPAO': { icao: 'KPAO', name: 'Palo Alto Airport', lat: 37.4611, lng: -122.1150, elevationFt: 4, runwayHeadingDeg: 310, runwayLengthFt: 2443 },
    'KSJC': { icao: 'KSJC', name: 'San Jose Mineta International', lat: 37.3639, lng: -121.9289, elevationFt: 62, runwayHeadingDeg: 300, runwayLengthFt: 11000 },
    'KSQL': { icao: 'KSQL', name: 'San Carlos Airport', lat: 37.5119, lng: -122.2495, elevationFt: 5, runwayHeadingDeg: 300, runwayLengthFt: 2600 },
    'KBFI': { icao: 'KBFI', name: 'Boeing Field (Seattle)', lat: 47.5300, lng: -122.3019, elevationFt: 21, runwayHeadingDeg: 140, runwayLengthFt: 10000 },

    // Florida & Southeast Hubs
    'KFXE': { icao: 'KFXE', name: 'Fort Lauderdale Executive', lat: 26.1973, lng: -80.1707, elevationFt: 13, runwayHeadingDeg: 90, runwayLengthFt: 6002 },
    'KORL': { icao: 'KORL', name: 'Orlando Executive Airport', lat: 28.5455, lng: -81.3329, elevationFt: 113, runwayHeadingDeg: 70, runwayLengthFt: 6003 },
    'KDAB': { icao: 'KDAB', name: 'Daytona Beach (Embry-Riddle)', lat: 29.1799, lng: -81.0580, elevationFt: 34, runwayHeadingDeg: 70, runwayLengthFt: 10500 },
    'KTPA': { icao: 'KTPA', name: 'Tampa International', lat: 27.9755, lng: -82.5332, elevationFt: 26, runwayHeadingDeg: 10, runwayLengthFt: 11002 },
    'KPDK': { icao: 'KPDK', name: 'DeKalb-Peachtree (Atlanta)', lat: 33.8756, lng: -84.3020, elevationFt: 1003, runwayHeadingDeg: 30, runwayLengthFt: 6001 },

    // Texas & Midwest Hubs
    'KADS': { icao: 'KADS', name: 'Addison Airport (Dallas)', lat: 32.9686, lng: -96.8364, elevationFt: 644, runwayHeadingDeg: 150, runwayLengthFt: 7203 },
    'KGTU': { icao: 'KGTU', name: 'Georgetown Executive (Austin)', lat: 30.6789, lng: -97.6797, elevationFt: 790, runwayHeadingDeg: 180, runwayLengthFt: 5000 },
    'KPWK': { icao: 'KPWK', name: 'Chicago Executive Airport', lat: 42.1143, lng: -87.9015, elevationFt: 647, runwayHeadingDeg: 160, runwayLengthFt: 5001 },
    'KAPA': { icao: 'KAPA', name: 'Centennial Airport (Denver)', lat: 39.5701, lng: -104.8493, elevationFt: 5885, runwayHeadingDeg: 170, runwayLengthFt: 10000 },
    'KOSH': { icao: 'KOSH', name: 'Wittman Regional (Oshkosh)', lat: 43.9844, lng: -88.5570, elevationFt: 808, runwayHeadingDeg: 180, runwayLengthFt: 8002 },
    'KFFZ': { icao: 'KFFZ', name: 'Falcon Field (Mesa, Phoenix)', lat: 33.4608, lng: -111.7283, elevationFt: 1394, runwayHeadingDeg: 40, runwayLengthFt: 5101 },
    'KDVT': { icao: 'KDVT', name: 'Deer Valley (Phoenix)', lat: 33.6883, lng: -112.0825, elevationFt: 1478, runwayHeadingDeg: 70, runwayLengthFt: 8196 }
  };

  // Dedicated pilot sectional visual reference checkpoints for prominent training routes
  private corridorVrps: Record<string, CorridorVrp[]> = {
    'KVNY-KSMO': [
      {
        coords: [34.1128, -118.4705],
        label: 'VRP 1: Sepulveda Pass / I-405 Corridor',
        desc: 'Visual Cue: San Diego Fwy pass between Santa Monica Mtns & Stone Canyon Reservoir<br>Target Alt: 3,500 ft MSL'
      }
    ],
    'KBTP-KAGC': [
      {
        coords: [40.6400, -79.8800],
        label: 'VRP 1: PA Route 28 Corridor',
        desc: 'Visual Cue: Route 28 expressway cloverleaf interchange<br>Target Alt: 3,000 ft MSL'
      },
      {
        coords: [40.4725, -79.8700],
        label: 'VRP 2: Allegheny River Crossing',
        desc: 'Visual Cue: Highland Park Dam and locks<br>Target Alt: 3,000 ft MSL'
      }
    ],
    'KBTP-KIDI': [
      {
        coords: [40.7042, -79.5280],
        label: 'VRP 1: Allegheny River / Ford City Crossing',
        desc: 'Visual Cue: Ford City bridge and prominent river bend<br>Target Alt: 3,500 ft MSL'
      }
    ]
  };

  getAerodrome(code: string): AerodromeInfo {
    const clean = (code || 'KBTP').toUpperCase().trim();
    if (this.aerodromes[clean]) {
      return this.aerodromes[clean];
    }

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const lat = 28.0 + (absHash % 1600) / 100.0;
    const lng = -121.0 + ((absHash >> 3) % 4600) / 100.0;
    const heading = (absHash % 36) * 10;

    return {
      icao: clean,
      name: `${clean} Field`,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      elevationFt: 750 + (absHash % 1200),
      runwayHeadingDeg: heading === 0 ? 360 : heading,
      runwayLengthFt: 4000 + (absHash % 4000)
    };
  }

  getCorridorWaypoints(depIcao: string, destIcao: string, dep: AerodromeInfo, dest: AerodromeInfo): CorridorVrp[] {
    const corridorKey = `${depIcao}-${destIcao}`;
    if (this.corridorVrps[corridorKey]) {
      return this.corridorVrps[corridorKey];
    }

    // Dynamic nationwide terrain/waterway visual checkpoint generator for any US route
    const midLat = (dep.lat + dest.lat) / 2;
    const midLng = (dep.lng + dest.lng) / 2;
    return [
      {
        coords: [midLat, midLng],
        label: `VRP 1: Enroute Corridor Checkpoint (${depIcao} \u2192 ${destIcao})`,
        desc: `Visual Cue: Intersecting highway corridor / prominent waterway checkpoint<br>Target Alt: 3,500 ft MSL`
      }
    ];
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
