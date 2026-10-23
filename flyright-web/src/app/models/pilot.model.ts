export interface Pilot {
  id?: number;
  name: string;
  email: string;
  experienceStage: string;
  createdAt?: string;
}

export interface FlightMission {
  id?: number;
  pilot?: Pilot;
  aircraftModelCode: string;
  tailNumber: string;
  flightType: 'PATTERN' | 'CROSS_COUNTRY';
  departureIcao: string;
  destinationIcao?: string;
  departureTowered: boolean;
  destinationTowered?: boolean;
  createdAt?: string;
  alternateIcao?: string;
}