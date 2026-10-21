export interface AircraftModel {
    id: number;
    modelCode: string;
    name: string;
    vrSpeedKnots: number;
    vxSpeedKnots: number;
    vySpeedKnots: number;
    vfeSpeedKnots: number;
}

export interface ChecklistItem {
    id: number;
    itemSequence: number;
    challenge: string;
    response: string;
    audioCue?: string;
    isCompleted?: boolean;
}

export interface Checklist {
    id: number;
    phase: string;
    title: string;
    items: ChecklistItem[];
}

export interface RadioCall {
    id?: number;
    situation: string;  // e.g., "Initial Contact - Ground Control (Taxi)"
    frequency: string;  // e.g., "121.70"
    pilotTransmission: string;
    atcResponse: string;
    notes?: string;
}