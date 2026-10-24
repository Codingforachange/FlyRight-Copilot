import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChecklistService } from './services/checklist.service';
import { Checklist, ChecklistItem } from './models/checklist.model';
import { PilotService } from './services/pilot.service';
import { Pilot, FlightMission } from './models/pilot.model';
import { FormsModule } from '@angular/forms';
import { WeatherService, MetarBriefing } from './services/weather.service';
import { from } from 'rxjs';

import * as L from 'leaflet';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'FlyRight Copilot';
  checklists: Checklist[] = [];
  activeChecklistIndex: number = 0;
  isLoading = false;
  errorMessage = '';
  isAudioMuted = false;
  isListening = false;
  recognition: any = null;
  synth: SpeechSynthesis | null = null;
  currentMetar: MetarBriefing | null = null;
  isLoadingWeather = false;
  activeCockpitView: 'CHECKLIST' | 'NAV_MAP' = 'CHECKLIST';
  showRadioDrawer = false;
  showDebriefModal: boolean = false;
  showLogbookModal: boolean = false;
  flightLogs: any[] = [];
  engineStartTime: Date | null = null;
  engineStopTime: Date | null = null;
  debriefDurationHours: number = 0.8;
  debriefTakeoffs: number = 1;
  debriefLandings: number = 1;
  selectedRunwayLength: number = 4001;
  private briefingMap: L.Map | null = null;
  private cockpitNavMap: L.Map | null = null;
  private aircraftMarker: L.Marker | null = null;
  isSimTracking: boolean = false;
  simProgressIndex: number = 0;
  private simIntervalId: any = null;
  simTelemetry = {
    groundSpeedKts: 105,
    altitudeFt: 3000,
    headingDeg: 168,
    distRemainingNm: 27.2,
    eteMin: 15
  };
  showApproachCommsDrawer: boolean = false;
  isDiverting: boolean = false;
  activeAirspaceAlert: string | null = null;
  private activeDiversionVector: L.Polyline | null = null;

  initBriefingMap(): void {
    if (this.briefingMap) {
      this.briefingMap.remove();
      this.briefingMap = null;
    }

    const lat = 40.7767;
    const lng = -79.9494;

    this.briefingMap = L.map('briefingMap', {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.briefingMap);

    const rwyLine = L.polyline([
      [40.7785, -79.9575],
      [40.7750, -79.9410]
    ], {
      color: '#38bdf8',
      weight: 6,
      opacity: 0.95
    }).addTo(this.briefingMap);

    rwyLine.bindTooltip('RWY 08/26 (4,001 ft)', { permanent: true, direction: 'top' });

    const trafficPattern = L.polygon([
      [40.7785, -79.9575],
      [40.7850, -79.9575],
      [40.7850, -79.9410],
      [40.7750, -79.9410]
    ], {
      color: '#f59e0b',
      dashArray: '6, 6',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.12
    }).addTo(this.briefingMap);

    trafficPattern.bindTooltip('Standard Left Traffic (1,000 ft AGL)', { direction: 'center' });

    setTimeout(() => {
      this.briefingMap?.invalidateSize();
    }, 200);
  }
  initCockpitNavMap(): void {
    if (this.cockpitNavMap) {
      this.cockpitNavMap.remove();
      this.cockpitNavMap = null;
    }

    setTimeout(() => {
      const el = document.getElementById('cockpitNavMap');
      if (!el) return;

      // Centered between Butler (KBTP) and Allegheny County (KAGC)
      this.cockpitNavMap = L.map('cockpitNavMap', {
        attributionControl: false,
        zoomControl: true
      }).setView([40.5600, -79.9400], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(this.cockpitNavMap);

      // Core Aerodrome Coordinates
      const kbtpCoords: [number, number] = [40.7767, -79.9494]; // Butler Co Regional
      const kagcCoords: [number, number] = [40.3544, -79.9302]; // Allegheny Co
      const kbviCoords: [number, number] = [40.7725, -80.3914]; // Beaver Co Alternate

      // Visual Reference Points (VRPs) along corridor
      const vrp1Coords: [number, number] = [40.6400, -79.8800]; // Route 28 Corridor
      const vrp2Coords: [number, number] = [40.4850, -79.8700]; // Allegheny River Crossing

      // Active Cross-Country Route Corridor (Cyan dashed)
      const xcRoute = [kbtpCoords, vrp1Coords, vrp2Coords, kagcCoords];
      L.polyline(xcRoute, {
        color: '#0284c7',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9
      }).addTo(this.cockpitNavMap);

      // Departure: KBTP
      L.circleMarker(kbtpCoords, { radius: 8, color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.95 })
        .addTo(this.cockpitNavMap)
        .bindTooltip('DEP: KBTP (Butler Co)', { permanent: true, direction: 'top' });

      // Visual Reference Points (VRPs) with Leg Telemetry
      L.circleMarker(vrp1Coords, { radius: 7, color: '#e879f9', fillColor: '#c084fc', fillOpacity: 0.95 })
        .addTo(this.cockpitNavMap)
        .bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #7e22ce; font-size: 13px;">VRP 1: PA Route 28 Corridor</strong><br/>
            <b>Track:</b> 168° Magnetic &bull; 9.2 NM from KBTP<br/>
            <b>Target Alt:</b> 3,000 ft MSL<br/>
            <b>Visual Cue:</b> Expressway cloverleaf intersection
          </div>
        `);

      L.circleMarker(vrp2Coords, { radius: 7, color: '#e879f9', fillColor: '#c084fc', fillOpacity: 0.95 })
        .addTo(this.cockpitNavMap)
        .bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #7e22ce; font-size: 13px;">VRP 2: Allegheny River Crossing</strong><br/>
            <b>Track:</b> 175° Magnetic &bull; 10.1 NM from VRP 1<br/>
            <b>Target Alt:</b> 3,000 ft MSL<br/>
            <b>Visual Cue:</b> Highland Park Dam & lock structure
          </div>
        `);

      // Destination: KAGC
      L.circleMarker(kagcCoords, { radius: 8, color: '#4ade80', fillColor: '#16a34a', fillOpacity: 0.95 })
        .addTo(this.cockpitNavMap)
        .bindTooltip('DEST: KAGC (Allegheny Co)', { permanent: true, direction: 'bottom' });

      // Class D Airspace Boundary (5 NM radius around KAGC ~ 9,260 meters)
      L.circle(kagcCoords, {
        radius: 9260,
        color: '#38bdf8',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#0284c7',
        fillOpacity: 0.08
      }).addTo(this.cockpitNavMap)
        .bindTooltip('KAGC CLASS D SURFACE AREA (CEILING 3,800 MSL)', { permanent: false, direction: 'top' });

      // Tactical Emergency Diversion Leg: KBVI (Amber dashed)
      if (this.missionForm.alternateIcao || this.missionForm.flightType === 'CROSS_COUNTRY') {
        L.polyline([kbtpCoords, kbviCoords], {
          color: '#f59e0b',
          weight: 3,
          dashArray: '6, 10',
          opacity: 0.8
        }).addTo(this.cockpitNavMap);

        L.circleMarker(kbviCoords, { radius: 7, color: '#f59e0b', fillColor: '#d97706', fillOpacity: 0.9 })
          .addTo(this.cockpitNavMap)
          .bindTooltip(`ALT DIVERSION: ${this.missionForm.alternateIcao || 'KBVI'}`, { permanent: true, direction: 'left' });
      }

      setTimeout(() => {
        this.cockpitNavMap?.invalidateSize();
        this.initAircraftMarker();
      }, 250);
    }, 100);
  }
  initAircraftMarker(): void {
    if (!this.cockpitNavMap) return;

    const startPos: [number, number] = [40.7767, -79.9494]; // KBTP
    const planeIcon = L.divIcon({
      className: 'aircraft-nav-icon',
      html: `
        <div style="transform: rotate(${this.simTelemetry.headingDeg}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#38bdf8">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (this.aircraftMarker) {
      this.aircraftMarker.remove();
    }
    this.aircraftMarker = L.marker(startPos, { icon: planeIcon }).addTo(this.cockpitNavMap);
  }

  toggleSimFlight(): void {
    this.isSimTracking = !this.isSimTracking;
    if (this.isSimTracking) {
      const defaultFlightPoints: [number, number, number, number, number, number][] = [
        // lat, lng, trk, alt, distRemaining, eteMin
        [40.7767, -79.9494, 168, 1200, 27.2, 16], // KBTP Climb
        [40.7083, -79.9147, 168, 2500, 22.8, 13],
        [40.6400, -79.8800, 175, 3000, 18.0, 10], // VRP 1
        [40.5625, -79.8750, 175, 3000, 13.5, 8],
        [40.4850, -79.8700, 198, 2800, 8.2, 5], // VRP 2
        [40.4197, -79.9001, 198, 2400, 4.1, 2],
        [40.3544, -79.9302, 198, 1250, 0.0, 0] // KAGC Approach
      ];

      this.simIntervalId = setInterval(() => {
        let current: [number, number, number, number, number, number];

        if (!this.isDiverting) {
          if (this.simProgressIndex < defaultFlightPoints.length - 1) {
            this.simProgressIndex++;
          } else {
            this.simProgressIndex = 0;
          }
          current = defaultFlightPoints[this.simProgressIndex];
        } else {
          // Tactical Divert in progress: step coordinates toward KBVI (40.7725, -80.3914)
          const targetLat = 40.7725;
          const targetLng = -80.3914;
          const currentPos = this.aircraftMarker ? this.aircraftMarker.getLatLng() : { lat: 40.6400, lng: -79.8800 };

          const nextLat = currentPos.lat + (targetLat - currentPos.lat) * 0.25;
          const nextLng = currentPos.lng + (targetLng - currentPos.lng) * 0.25;

          // Estimate distance remaining to KBVI in NM (approx 60nm per degree)
          const dLat = (targetLat - nextLat) * 60;
          const dLng = (targetLng - nextLng) * 45;
          const distNm = Math.max(0, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10);
          const eteMin = Math.round((distNm / (this.simTelemetry.groundSpeedKts || 105)) * 60);

          current = [nextLat, nextLng, 275, 2600, distNm, eteMin];
        }

        const newCoords: [number, number] = [current[0], current[1]];
        this.simTelemetry.headingDeg = current[2];
        this.simTelemetry.altitudeFt = current[3];
        this.simTelemetry.distRemainingNm = current[4];
        this.simTelemetry.eteMin = current[5];

        // Airspace Proximity Detection
        if (this.isDiverting) {
          if (this.simTelemetry.distRemainingNm <= 8 && this.simTelemetry.distRemainingNm > 0) {
            this.activeAirspaceAlert = 'ADVISORY: Approaching KBVI CTAF 123.00 &bull; Monitor Pattern & Winds';
          } else {
            this.activeAirspaceAlert = null;
          }
        } else {
          if (this.simTelemetry.distRemainingNm <= 8 && this.simTelemetry.distRemainingNm > 0) {
            this.activeAirspaceAlert = 'ALERT: Entering KAGC Class D Airspace &bull; Contact Tower on 121.10';
          } else {
            this.activeAirspaceAlert = null;
          }
        }

        if (this.aircraftMarker && this.cockpitNavMap) {
          this.aircraftMarker.setLatLng(newCoords);
          const iconEl = this.aircraftMarker.getElement();
          if (iconEl) {
            const inner = iconEl.querySelector('div');
            if (inner) inner.style.transform = `rotate(${this.simTelemetry.headingDeg}deg)`;
          }

          if (this.isDiverting && this.activeDiversionVector) {
            const kbviCoords: [number, number] = [40.7725, -80.3914];
            this.activeDiversionVector.setLatLngs([newCoords, kbviCoords]);
          }
        }
      }, 3000);
    } else {
      clearInterval(this.simIntervalId);
    }
  }

  toggleApproachComms(): void {
    this.showApproachCommsDrawer = !this.showApproachCommsDrawer;
  }

  executeDiversion(): void {
    if (!this.cockpitNavMap || !this.aircraftMarker) return;
    this.isDiverting = !this.isDiverting;

    const kbviCoords: [number, number] = [40.7725, -80.3914]; // Beaver Co
    const currentPos = this.aircraftMarker.getLatLng();

    if (this.isDiverting) {
      if (this.activeDiversionVector) {
        this.activeDiversionVector.remove();
      }
      this.activeDiversionVector = L.polyline([[currentPos.lat, currentPos.lng], kbviCoords], {
        color: '#f97316',
        weight: 4,
        dashArray: '4, 8',
        opacity: 0.95
      }).addTo(this.cockpitNavMap);

      this.activeDiversionVector.bindTooltip('DIRECT DIVERSION TO KBVI', {
        permanent: true,
        direction: 'center',
        className: 'divert-nav-tooltip'
      }).openTooltip();

      // Immediately reorient aircraft heading toward KBVI (west-northwest ~275°)
      this.simTelemetry.headingDeg = 275;
      const iconEl = this.aircraftMarker.getElement();
      if (iconEl) {
        const inner = iconEl.querySelector('div');
        if (inner) inner.style.transform = `rotate(275deg)`;
      }
    } else {
      if (this.activeDiversionVector) {
        this.activeDiversionVector.remove();
        this.activeDiversionVector = null;
      }
    }
  }

  switchCockpitView(view: 'CHECKLIST' | 'NAV_MAP'): void {
    this.activeCockpitView = view;
    if (view === 'NAV_MAP') {
      this.initCockpitNavMap();
    }
  }
  updateAirportVisuals(icao: string): void {
    const code = (icao || '').toUpperCase().trim();
    if (code === 'KBTP') {
      this.selectedRunwayLength = 4001;
      if (this.briefingMap) {
        this.briefingMap.setView([40.7767, -79.9494], 14);
      }
    } else if (code === 'KAGC') {
      this.selectedRunwayLength = 6501;
      if (this.briefingMap) {
        this.briefingMap.setView([40.3544, -79.9298], 14);
      }
    } else {
      this.selectedRunwayLength = 3500;
    }
  }
  radioScripts = [
    {
      phase: 'ENGINE START & TAXI',
      type: 'NON_TOWERED',
      cue: 'Butler Traffic, Skyhawk 734SP, taxiing from transient parking to Runway 08 via Alpha, Butler.'
    },
    {
      phase: 'ENGINE START & TAXI',
      type: 'TOWERED',
      cue: 'Butler Ground, Skyhawk 734SP, ready to taxi Runway 08, with Information Alpha.'
    },
    {
      phase: 'RUNWAY DEPARTURE',
      type: 'NON_TOWERED',
      cue: 'Butler Traffic, Skyhawk 734SP, departing Runway 08, remaining in the pattern, Butler.'
    },
    {
      phase: 'RUNWAY DEPARTURE',
      type: 'TOWERED',
      cue: 'Butler Tower, Skyhawk 734SP, holding short Runway 08, ready for departure.'
    }
  ];

  constructor(
    private checklistService: ChecklistService,
    private pilotService: PilotService,
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initSpeechEngine();
    const savedPilot = localStorage.getItem('flyright_pilot');
    if (savedPilot) {
      try{
        this.currentPilot = JSON.parse(savedPilot);
        this.showMissionModal = true;
        setTimeout(() => {
          this.initBriefingMap();
        }, 300);
      } catch (e) {
        localStorage.removeItem('flyright_pilot');
        this.showAuthModal = true;
      }
    }
    else {
      this.showAuthModal = true;
    }
  }

  fetchWeatherBriefing(icao: string): void {
    if (!icao) return;
    this.isLoadingWeather = true;
    this.weatherService.getMetar(icao).subscribe({
      next: (data) => {
        this.currentMetar = data;
        this.isLoadingWeather = false;
      },
      error: () => {
        this.isLoadingWeather = false;
      }
    });
  }

  formatRunwayWind(rwy: any): string {
    if (!rwy) return '';
    return rwy.headwind >= 0
      ? `${rwy.headwind} kt HW`
      : `${Math.abs(rwy.headwind)} kt TW`;
  }

  initSpeechEngine(): void {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;

        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.trim().toLowerCase();
          this.handleVoiceResponse(transcript);
        };

         this.recognition.onend = () => {
      // If voice mode is active, seamlessly restart listening instead of dropping off
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already running
        }
      }
    };

        this.recognition.onerror = () => {
          this.isListening = false;
        };
      }
    }
  }

  startVoiceChallenge(): void {
    if (this.isListening) {
      if (this.recognition) this.recognition.stop();
      this.isListening = false;
      return;
    }

    const currentChecklist = this.checklists[this.activeChecklistIndex];
    if (!currentChecklist) return;

    const nextPendingItem = currentChecklist.items.find(i => !i.isCompleted);
    if (!nextPendingItem) {
      this.speakCue('All items in this phase are complete.');
      return;
    }

    // Announce challenge cue (e.g., "Documents and Equipment")
    this.speakCue(nextPendingItem.challenge);

    // Turn on speech-to-text listener after callout finishes
    setTimeout(() => {
      if (this.recognition && !this.isListening) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (e) {
          console.warn('Speech recognition start error:', e);
        }
      }
    }, 1200);
  }

   handleVoiceResponse(transcript: string): void {
    const currentChecklist = this.checklists[this.activeChecklistIndex];
    if (!currentChecklist) return;

    const activeItem = currentChecklist.items.find(i => !i.isCompleted);
    if (!activeItem) return;

    const expectedResponse = (activeItem.response || '').toLowerCase().trim();
    let cleanTranscript = transcript.toLowerCase().trim();

    // Spoken aliases: knots -> kias, spelled out numbers -> digits
    cleanTranscript = cleanTranscript
      .replace(/\bknots\b/g, 'kias')
      .replace(/\bseven hundred\b/g, '700');

    // 1. Direct or partial phrase matches
    const matchesExplicit = cleanTranscript.includes(expectedResponse) || expectedResponse.includes(cleanTranscript);

    // 2. Altitude & Crosswind tolerance (e.g. 700, 1000, agl, minimum)
    const isAltCheck = expectedResponse.includes('700') || expectedResponse.includes('1000') || expectedResponse.includes('agl');
    const matchesAlt = isAltCheck && (
      cleanTranscript.includes('700') || 
      cleanTranscript.includes('1000') || 
      cleanTranscript.includes('thousand') ||
      cleanTranscript.includes('agl') || 
      cleanTranscript.includes('minimum')
    );

    // 3. Airspeed & Rotation tolerance (e.g. 55, 65, 74, kias, knots, alive, rotate)
    const isAirspeedCheck = expectedResponse.includes('kias') || expectedResponse.includes('alive');
    const matchesAirspeed = isAirspeedCheck && (
      cleanTranscript.includes('kias') || 
      cleanTranscript.includes('knot') || 
      cleanTranscript.includes('knots') ||
      cleanTranscript.includes('alive') ||
      cleanTranscript.includes('55') ||
      cleanTranscript.includes('74') ||
      cleanTranscript.includes('65') ||
      cleanTranscript.includes('rotate')
    );

    // 4. Engine, Throttle & Gauge tolerance (e.g. full open, full power, green)
    const isEngineOrThrottle = expectedResponse.includes('open') || expectedResponse.includes('green');
    const matchesEngineOrThrottle = isEngineOrThrottle && (
      cleanTranscript.includes('full') ||
      cleanTranscript.includes('open') ||
      cleanTranscript.includes('power') ||
      cleanTranscript.includes('up') ||
      cleanTranscript.includes('green')
    );

    // 5. Pattern & Landing specific tolerance (e.g. flaps, carb heat, mains, retract, clear)
    const isPatternOrLanding = 
      expectedResponse.includes('flaps') || 
      expectedResponse.includes('carb') || 
      expectedResponse.includes('mains') || 
      expectedResponse.includes('retract') || 
      expectedResponse.includes('clear') ||
      expectedResponse.includes('required');
    const matchesPatternOrLanding = isPatternOrLanding && (
      cleanTranscript.includes('flaps') ||
      cleanTranscript.includes('carb') ||
      cleanTranscript.includes('heat') ||
      cleanTranscript.includes('mains') ||
      cleanTranscript.includes('main') ||
      cleanTranscript.includes('first') ||
      cleanTranscript.includes('retract') ||
      cleanTranscript.includes('clear') ||
      cleanTranscript.includes('required')
    );

    // 6. Flexible phonetic aliases for common fuel/mixture words
    const matchesBoth = cleanTranscript.includes('both') || 
                        cleanTranscript.includes('boat') || 
                        cleanTranscript.includes('bow') || 
                        cleanTranscript.includes('bolth');

    const matchesAviationAffirmative = 
      cleanTranscript.includes('check') || 
      cleanTranscript.includes('checked') || 
      cleanTranscript.includes('set') || 
      cleanTranscript.includes('inspect') || 
      cleanTranscript.includes('inspected') || 
      cleanTranscript.includes('verified') || 
      cleanTranscript.includes('on') || 
      cleanTranscript.includes('off') || 
      matchesBoth ||
      cleanTranscript.includes('rich') ||
      cleanTranscript.includes('lean') ||
      cleanTranscript.includes('full rich');

    if (matchesExplicit || matchesAlt || matchesAirspeed || matchesEngineOrThrottle || matchesPatternOrLanding || matchesAviationAffirmative) {
      // 1. Immediately kill the mic so FlyRight does NOT hear its own confirmation
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }
      this.isListening = false;

      // 2. Mark item complete and repaint UI
      this.toggleItem(activeItem);
      this.cdr.detectChanges();
      this.speakCue(`${activeItem.response}, checked.`);

      // 3. Wait for FlyRight to finish speaking before re-opening the mic for the next prompt
      setTimeout(() => {
        this.startVoiceChallenge();
      }, 1800);
    } else {
      // Stay silent; keep listening
      if (this.recognition && !this.isListening) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (e) {}
      }
    }
  }

    speakChallenge(item: any): void {
    if (this.isAudioMuted || !this.synth) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(item.challenge);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.listenForResponse(item);
    };

    this.synth.speak(utterance);
  }

  listenForResponse(item: any): void {
    if (!this.recognition || this.isListening) return;
    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
    }
  }

  handlePilotSpokenResponse(spoken: string): void {
    const currentPhase = this.checklists[this.activeChecklistIndex];
    if (!currentPhase) return;

    const pendingItem = currentPhase.items.find((i: any) => !i.isCompleted);
    if (!pendingItem) return;

    const expected = (pendingItem.response || '').toLowerCase();

    if (
      spoken.includes(expected) ||
      spoken.includes('check') ||
      spoken.includes('set') ||
      spoken.includes('on') ||
      spoken.includes('both') ||
      spoken.includes('verified')
    ) {
      this.toggleItem(pendingItem);

      setTimeout(() => {
        const nextItem = currentPhase.items.find((i: any) => !i.isCompleted);
        if (nextItem) {
          this.speakChallenge(nextItem);
        }
      }, 500);
    }
  }

    startChecklistVoiceRun(): void {
    const currentPhase = this.checklists[this.activeChecklistIndex];
    if (!currentPhase || !currentPhase.items) return;

    // Find the first uncompleted check item in the current active phase
    const nextItem = currentPhase.items.find((i: any) => !i.isCompleted);
    if (nextItem) {
      this.speakChallenge(nextItem);
    }
  }

    submitAuth(): void {
    this.authError = '';
    if (this.authMode === 'register') {
      if (!this.pilotForm.name || !this.pilotForm.email) {
        this.authError = 'Please provide both pilot name and email.';
        return;
      }
      this.pilotService.registerPilot(this.pilotForm).subscribe({
        next: (pilot) => {
          this.currentPilot = pilot;
          localStorage.setItem('flyright_pilot', JSON.stringify(pilot));
          this.showAuthModal = false;
          this.showMissionModal = true;
        },
        error: (err) => {
          this.authError = err.error?.message || 'Registration failed. Try signing in.';
        }
      });
    } else {
      if (!this.pilotForm.email) {
        this.authError = 'Please enter your registered email.';
        return;
      }
      this.pilotService.loginPilot(this.pilotForm.email).subscribe({
        next: (pilot) => {
          this.currentPilot = pilot;
          localStorage.setItem('flyright_pilot', JSON.stringify(pilot));
          this.showAuthModal = false;
          this.showMissionModal = true;
        },
        error: (err) => {
          this.authError = err.error?.message || 'Pilot not found. Please register.';
        }
      });
    }
  }

  confirmMission(): void {
    if (!this.currentPilot?.id) return;
    this.missionForm.pilot = this.currentPilot;

    const selectedCode = this.missionForm.aircraftModelCode || 'C172S';
    if (this.aircraftSpeeds[selectedCode]) {
      this.currentVspeeds = { ...this.aircraftSpeeds[selectedCode] };
    }

    this.pilotService.createMission(this.missionForm).subscribe({
      next: () => {
        this.showMissionModal = false;
        this.onBoardingCompleted = true;
        this.loadChecklist(this.missionForm.aircraftModelCode);
        this.fetchWeatherBriefing(this.missionForm.departureIcao);
      },
      error: (err) => {
        console.error('Mission creation failed', err);
        // Fallback to offline initialization
        this.showMissionModal = false;
        this.onBoardingCompleted = true;
        this.loadChecklist(this.missionForm.aircraftModelCode);
      }
    });
  }

  loadChecklist(modelCode: string): void {
    this.isLoading = true;
    this.checklistService.getChecklistsByModel(modelCode).subscribe({
      next: (data) => {
        this.checklists = data;
        this.errorMessage = '';
        this.isLoading = false;
      },
      error: (err) => {
        console.warn(`Checklists for ${modelCode} not found, falling back to C172S standard:`, err);
        if (modelCode !== 'C172S') {
          this.loadChecklist('C172S');
        } else {
          this.errorMessage = 'Unable to connect to FlyRight backend API.';
          this.isLoading = false;
        }
      }
    });
  }

  toggleItem(item: any): void {
    item.isCompleted = !item.isCompleted;

    // Cockpit audio callout when checked
    if (item.isCompleted && !this.isAudioMuted && this.synth) {
      const responseCue = item.response ? `${item.challenge}, ${item.response}` : item.challenge;
      const utterance = new SpeechSynthesisUtterance(responseCue);
      utterance.rate = 1.05;
      this.synth.speak(utterance);
    }

    // Persist status change to PostgreSQL backend
    if (item.id) {
      this.checklistService.toggleItemStatus(item.id).subscribe({
        error: (err) => console.error('Database update failed:', err)
      });
    }
  }

  nextPhase(): void {
    if (this.activeChecklistIndex < this.checklists.length - 1) {
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }
      this.isListening = false;
      if (this.synth) {
        this.synth.cancel();
      }

      this.activeChecklistIndex++;
      this.cdr.detectChanges();

      const nextTitle = this.checklists[this.activeChecklistIndex].title;
      this.speakCue(`Starting ${nextTitle}`);
    } 
    else {
      this.speakCue('All flight phases complete. Initiating mission debrief.');
      this.engineStopTime = new Date();
      if (this.engineStartTime) {
        const diffMs = this.engineStopTime.getTime() - this.engineStartTime.getTime();
        const rawHours = diffMs / (1000 * 60 * 60);
        this.debriefDurationHours = Math.max(0.1, Math.round(rawHours * 10) / 10);
      }
      this.showDebriefModal = true;
      this.cdr.detectChanges();
    }
  }

  closeDebrief(): void {
    const flightRecord = {
      pilotName: 'Mike Pelino',
      aircraftTail: 'N734SP',
      flightProfile: 'Local Traffic Pattern',
      departureIcao: 'KBTP',
      compliancePercentage: 100,
      totalDurationHours: this.debriefDurationHours,
      takeoffsCount: this.debriefTakeoffs,
      landingsCount: this.debriefLandings
    };
    

    this.pilotService.saveFlightLog(flightRecord).subscribe({
      next: (saved) => {
        console.log('Flight log successfully persisted to flyright_db:', saved);
        this.showDebriefModal = false;
        this.resetAll();
      },
      error: (err) => {
        console.error('Failed to persist flight log:', err);
        // Fallback so the pilot is never locked out of resetting
        this.showDebriefModal = false;
        this.resetAll();
      }
    });
  }

  openLogbook(): void {
    this.pilotService.getFlightLogs().subscribe({
      next: (logs) => {
        this.flightLogs = logs;
        this.showLogbookModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flight logs from database:', err);
      }
    });
  }

  closeLogbook(): void {
    this.showLogbookModal = false;
  }

  selectPhase(index: number): void {
    if (index >= 2 && !this.engineStartTime) {
      this.engineStartTime = new Date();
    }
    this.activeChecklistIndex = index;
  }

  toggleAudio(): void {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.isAudioMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      this.speakCue('Audio enabled');
    }
  }

  speakCue(text: string): void {
    if (this.isAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }


  isCurrentPhaseComplete(): boolean {
    const current = this.checklists[this.activeChecklistIndex];
    return current && current.items ? current.items.every(item => item.isCompleted) : false;
  }

  // Endowed Progress: give users a baseline completion jump once onboarded
  // Pilot Onboarding State
  showOnboardingModal = false;
  onBoardingCompleted = false;
  readonly ONBOARDING_WEIGHT = 10; //10% instant baseline boost
  pilotCallsign = 'N734SP';
  pilotName = '';
  pilotEmail = '';
  trainingStage = 'Student Pilot'

    // Master Radio Phraseology Repository
    // Dynamic Master Radio Repository
  get allRadioCalls() {
    const icao = this.missionForm?.departureIcao || 'KBTP';
    const tail = this.missionForm?.tailNumber || 'N734SP';

    return [
      // Non-Towered / CTAF
      {
        situation: 'CTAF Taxi Out',
        frequency: '122.80 MHz (CTAF)',
        airspaceType: 'NON_TOWERED',
        pilotTransmission: () =>
          `${icao} Traffic, Skyhawk ${tail}, taxiing to Runway 08 via Alpha, ${icao} Traffic.`,
        atcResponse: '(No ATC - Listen for inbound & taxiing traffic)',
        readback: 'Maintain visual scan and announce crossing runways.'
      },
      {
        situation: 'CTAF Departure / Takeoff',
        frequency: '122.80 MHz (CTAF)',
        airspaceType: 'NON_TOWERED',
        pilotTransmission: () =>
          `${icao} Traffic, Skyhawk ${tail}, departing Runway 08, remaining in the closed pattern, ${icao}.`,
        atcResponse: '(Self-Announce Traffic Broadcast)',
        readback: 'Broadcast crosswind, downwind, base, and final turns.'
      },
      {
        situation: 'CTAF Pattern Downwind',
        frequency: '122.80 MHz (CTAF)',
        airspaceType: 'NON_TOWERED',
        pilotTransmission: () =>
          `${icao} Traffic, Skyhawk ${tail}, midfield left downwind Runway 08, touch and go, ${icao}.`,
        atcResponse: '(Self-Announce Traffic Broadcast)',
        readback: 'Report turning final with aircraft intentions.'
      },

      // Towered / Class D/C/B Airspace
      {
        situation: 'Ground Taxi Clearance',
        frequency: '121.90 MHz (Ground)',
        airspaceType: 'TOWERED',
        pilotTransmission: () =>
          `${icao} Ground, Skyhawk ${tail}, at transient ramp with Information Bravo, ready to taxi, VFR pattern.`,
        atcResponse: `Skyhawk ${tail}, ${icao} Ground, taxi to Runway 08 via Taxiway Alpha, hold short Runway 08.`,
        readback: `Taxi to Runway 08 via Alpha, hold short Runway 08, Skyhawk ${tail}.`
      },
      {
        situation: 'Tower Takeoff Clearance',
        frequency: '118.50 MHz (Tower)',
        airspaceType: 'TOWERED',
        pilotTransmission: () =>
          `${icao} Tower, Skyhawk ${tail}, holding short Runway 08, ready for takeoff.`,
        atcResponse: `Skyhawk ${tail}, wind 090 at 7, Runway 08 cleared for takeoff, make left closed traffic.`,
        readback: `Cleared for takeoff Runway 08, left closed traffic, Skyhawk ${tail}.`
      },
      {
        situation: 'Tower Inbound / Pattern Call',
        frequency: '118.50 MHz (Tower)',
        airspaceType: 'TOWERED',
        pilotTransmission: () =>
          `${icao} Tower, Skyhawk ${tail}, left downwind Runway 08.`,
        atcResponse: `Skyhawk ${tail}, number 2 following a Cherokee on 1-mile final, cleared touch and go Runway 08.`,
        readback: `Number 2, traffic in sight, cleared touch and go Runway 08, Skyhawk ${tail}.`
      }
    ];
  }

  // Dynamic filter based on dispatched airspace
  get activeRadioCalls() {
    const targetType = this.missionForm?.departureTowered ? 'TOWERED' : 'NON_TOWERED';
    return this.allRadioCalls.filter(call => call.airspaceType === targetType);
  }

   toggleRadioDrawer(): void {
    this.showRadioDrawer = !this.showRadioDrawer;
  }

  playTransmissionAudio(transmission: string): void {
    this.speakCue(transmission);
  }

  get currentPhaseProgress(): number {
    if (!this.checklists || this.checklists.length ===0) return 0;
    const current = this.checklists[this.activeChecklistIndex];
    if (!current?.items || current.items.length === 0) return 0;

    const completed = current.items.filter(item => item.isCompleted).length;
    const itemPercentage = (completed / current.items.length) * (100 - (this.onBoardingCompleted ? this.ONBOARDING_WEIGHT : 0));
    const baseBoost = this.onBoardingCompleted ? this.ONBOARDING_WEIGHT : 0;

    return Math.round(baseBoost + itemPercentage);
  }

  get needleRotation(): number {
    // 0% -> -90deg, 50% -> 0de, 100% -> +90deg
    return -90 + (this.currentPhaseProgress / 100) * 180;
  }

  get strokeOffset(): number {
    //Arc cicumference for r=70 over 180 deg is ~220
    const arcLength = 220;
    return arcLength - (arcLength * (this.currentPhaseProgress / 100));
  }

  get completedCount(): number {
    if (!this.checklists || !this.checklists[this.activeChecklistIndex]) return 0;
    const current = this.checklists[this.activeChecklistIndex];
    return current?.items ? current.items.filter(i => i.isCompleted).length : 0;
  }

  get totalCount(): number {
    if (!this.checklists || !this.checklists[this.activeChecklistIndex]) return 0;
    const current = this.checklists[this.activeChecklistIndex];
    return current?.items ? current.items.length : 0;
  }

   // Subscription / Auth & Mission State
  currentPilot: Pilot | null = null;
  authMode: 'register' | 'login' = 'register';
  authError = '';

  pilotForm: Pilot = {
    name: '',
    email: '',
    experienceStage: 'Student Pilot (Pre-Solo / Checkride Prep)'
  };

  missionForm: FlightMission = {
    aircraftModelCode: 'C172S',
    tailNumber: 'N734SP',
    flightType: 'PATTERN',
    departureIcao: 'KBTP',
    destinationIcao: '',
    departureTowered: false,
    destinationTowered: false,
    alternateIcao: ''
  };

  aircraftSpeeds: Record<string, { vr: number; vx: number; vy: number; vfe: number; name: string }> = {
    'C172S': { vr: 55, vx: 62, vy: 74, vfe: 85, name: 'Cessna 172S Skyhawk' },
    'C152': { vr: 50, vx: 55, vy: 67, vfe: 85, name: 'Cessna 152' },
    'PA28-140': { vr: 55, vx: 64, vy: 74, vfe: 100, name: 'Piper PA-28-140 Cherokee' },
    'PA28-160': { vr: 55, vx: 64, vy: 75, vfe: 100, name: 'Piper PA-28-160 Cherokee' },
    'PA28-180': { vr: 55, vx: 64, vy: 76, vfe: 102, name: 'Piper PA-28-180 Archer' }
  };

  currentVspeeds = { vr: 55, vx: 62, vy: 74, vfe: 85 };

  showAuthModal = false;
  showMissionModal = false;

  completeOnboarding(callsignInput: string, nameInput: string, emailInput: string, stageInput: string): void {
    this.pilotCallsign = callsignInput.trim().toUpperCase() || 'N734SP';
    this.pilotName = nameInput.trim() || 'Pilot in Command';
    this.pilotEmail = emailInput.trim();
    this.trainingStage = stageInput;
    this.onBoardingCompleted = true;
    this.showOnboardingModal = false;

    localStorage.setItem('flyright_onboarded', 'true');
    localStorage.setItem('flyright_callsign', this.pilotCallsign);
    localStorage.setItem('flyright_pilot', this.pilotName);
    localStorage.setItem('flyright_email', this.pilotEmail);
    localStorage.setItem('flyright_stage', this.trainingStage);

    this.speakCue(`Welcome aboard, ${this.pilotName}. Pre-flight checklist initialized for Skyhawk ${this.pilotCallsign}.`);
  }

  resetAll(): void {
    this.checklistService.resetChecklist('C172S').subscribe({
      next: () => {
        this.checklists.forEach(cl => cl.items?.forEach(i => i.isCompleted = false));
        this.activeChecklistIndex = 0;
        this.speakCue('Checklist reset.');
      },
      error: (err) => console.error('Failed to reset checklist:', err)
    });
  }
}
