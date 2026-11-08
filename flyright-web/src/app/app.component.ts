import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChecklistService } from './services/checklist.service';
import { Checklist, ChecklistItem } from './models/checklist.model';
import { PilotService } from './services/pilot.service';
import { Pilot, FlightMission } from './models/pilot.model';
import { FormsModule } from '@angular/forms';
import { WeatherService, MetarBriefing } from './services/weather.service';
import { FlightLoadingComponent } from './components/flight-loading/flight-loading.component';
import { PilotLoginComponent } from './components/pilot-login/pilot-login.component';
import { AirportService } from './services/airport.service';
import { FlashcardService,DailyDeckState,Flashcard } from './services/flashcard.service';
import { PaywallComponent } from './components/paywall/paywall.component';
import { SubscriptionService } from './services/subscription.service';
import { from } from 'rxjs';

import * as L from 'leaflet';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, FlightLoadingComponent, PilotLoginComponent, PaywallComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  showFlightLoading: boolean = false;
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
  activeCockpitView: 'CHECKLIST' | 'NAV_MAP' | 'FLASHCARDS' = 'CHECKLIST';
  showRadioDrawer = false;
  showDebriefModal: boolean = false;
  showLogbookModal: boolean = false;
  showPaywallModal: boolean = false;
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
  isFollowCamActive: boolean = true;
  isRadioTransmitting: boolean = false;
  radioReadbackSuccess: boolean | null = null;
  isDiverting: boolean = false;
  activeAirspaceAlert: string | null = null;
  private activeDiversionVector: L.Polyline | null = null;
  dailyDeck: DailyDeckState | null = null;
  selectedFlashcardOption: number | null = null;
  showFlashcardExplanation: boolean = false;

  initBriefingMap(): void {
    const mapEl = document.getElementById('briefingMap');
    if (!mapEl) return;

    if (this.briefingMap) {
      this.briefingMap.remove();
      this.briefingMap = null;
    }

    const defaultIcao = this.missionForm.departureIcao || 'KBTP';
    const dep = this.airportService.getAerodrome(defaultIcao);

    this.briefingMap = (L as any).map('briefingMap', {
      center: [dep.lat, dep.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    (L as any).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(this.briefingMap);

    // Staggered layout invalidation so the modal canvas is visible before vector draw
    setTimeout(() => {
      if (this.briefingMap) {
        this.briefingMap.invalidateSize();
        this.updateAirportVisuals(defaultIcao);
      }
    }, 150);

    setTimeout(() => {
      if (this.briefingMap) {
        this.briefingMap.invalidateSize();
      }
    }, 350);
  }
    initCockpitNavMap(): void {
    if (this.cockpitNavMap) {
      this.cockpitNavMap.remove();
      this.cockpitNavMap = null;
    }

    setTimeout(() => {
      const el = document.getElementById('cockpitNavMap');
      if (!el) return;

      const isPattern = this.missionForm.flightType === 'PATTERN';

      const dep = this.airportService.getAerodrome(this.missionForm.departureIcao || 'KBTP');
      const dest = this.airportService.getAerodrome(this.missionForm.destinationIcao || dep.icao);
      const alt = this.missionForm.alternateIcao ? this.airportService.getAerodrome(this.missionForm.alternateIcao) : null;

      const depCoords: [number, number] = [dep.lat, dep.lng];
      const destCoords: [number, number] = [dest.lat, dest.lng];

      const mapCenter: [number, number] = isPattern
        ? depCoords
        : [((dep.lat + dest.lat) / 2), ((dep.lng + dest.lng) / 2)];
      const initialZoom = isPattern ? 13 : 10;

      this.cockpitNavMap = (L as any).map('cockpitNavMap', {
        attributionControl: false,
        zoomControl: true
      }).setView(mapCenter, initialZoom);

      (L as any).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(this.cockpitNavMap);

      // Departure Aerodrome Marker
      (L as any).circleMarker(depCoords, { radius: 8, color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.95 })
        .addTo(this.cockpitNavMap)
        .bindTooltip(`DEP: ${dep.icao} - ${dep.name}`, { permanent: true, direction: 'top' });

      if (isPattern) {
        // Draw standard traffic pattern circuit
        const patternBox = this.airportService.calculateTrafficPattern(dep.lat, dep.lng, dep.runwayHeadingDeg);
        (L as any).polyline(patternBox, {
          color: '#38bdf8',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.9
        }).addTo(this.cockpitNavMap)
          .bindTooltip(`${dep.icao} Left Pattern (1,000 ft AGL)`, { permanent: false, direction: 'top' });
      } else {
         // Dynamic visual waypoints for the corridor
      const waypoints = this.airportService.getCorridorWaypoints(dep.icao, dest.icao, dep, dest);

      const xcRoute = [depCoords, ...waypoints.map(w => w.coords), destCoords];
      (L as any).polyline(xcRoute, {
        color: '#0284c7',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9
      }).addTo(this.cockpitNavMap);

      waypoints.forEach(wp => {
        (L as any).circleMarker(wp.coords, { radius: 7, color: '#e879f9', fillColor: '#c084fc', fillOpacity: 0.95 })
          .addTo(this.cockpitNavMap)
          .bindPopup(`<strong>${wp.label}</strong><br>${wp.desc}`);
      });

        // Destination Aerodrome Marker
        (L as any).circleMarker(destCoords, { radius: 8, color: '#4ade80', fillColor: '#16a34a', fillOpacity: 0.95 })
          .addTo(this.cockpitNavMap)
          .bindTooltip(`DEST: ${dest.icao} - ${dest.name}`, { permanent: true, direction: 'bottom' });

        // Destination Airspace Ring (5 NM Class D)
        (L as any).circle(destCoords, {
          radius: 9260,
          color: '#38bdf8',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#0284c7',
          fillOpacity: 0.08
        }).addTo(this.cockpitNavMap);

        // Tactical Emergency Diversion Leg
        if (alt) {
          const altCoords: [number, number] = [alt.lat, alt.lng];
          (L as any).polyline([depCoords, altCoords], {
            color: '#f59e0b',
            weight: 3,
            dashArray: '6, 10',
            opacity: 0.8
          }).addTo(this.cockpitNavMap);

          (L as any).circleMarker(altCoords, { radius: 7, color: '#f59e0b', fillColor: '#d97706', fillOpacity: 0.9 })
            .addTo(this.cockpitNavMap)
            .bindTooltip(`ALT DIVERSION: ${alt.icao} - ${alt.name}`, { permanent: true, direction: 'left' });
        }
      }

      setTimeout(() => {
        this.cockpitNavMap?.invalidateSize();
        this.initAircraftMarker();
      }, 250);
    }, 100);
  }
   initAircraftMarker(): void {
    if (!this.cockpitNavMap) return;

    const dep = this.airportService.getAerodrome(this.missionForm.departureIcao || 'KBTP');
    const startPos: [number, number] = [dep.lat, dep.lng];

    const planeIcon = (L as any).divIcon({
      className: 'aircraft-nav-icon',
      html: `
        <div style="transform: rotate(${dep.runwayHeadingDeg}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.8));">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#38bdf8">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = (this as any).aircraftMarker;
    if (marker) {
      marker.setLatLng(startPos);
      marker.setIcon(planeIcon);
    } else {
      (this as any).aircraftMarker = (L as any).marker(startPos, { icon: planeIcon }).addTo(this.cockpitNavMap);
    }
  }

  toggleSimFlight(): void {
    this.isSimTracking = !this.isSimTracking;
    if (this.isSimTracking) {
      const dep = this.airportService.getAerodrome(this.missionForm.departureIcao || 'KBTP');
      const isPattern = this.missionForm.flightType === 'PATTERN';
      const dest = isPattern ? dep : this.airportService.getAerodrome(this.missionForm.destinationIcao || dep.icao);
      const alt = this.missionForm.alternateIcao ? this.airportService.getAerodrome(this.missionForm.alternateIcao) : null;

      // Dynamically generate smooth flight waypoints along the active route
      const steps = 10;
      const defaultFlightPoints: number[][] = [];
      const dLat = (dest.lat - dep.lat) * 60;
      const dLng = (dest.lng - dep.lng) * 60 * Math.cos(((dep.lat + dest.lat) / 2) * (Math.PI / 180));
      const totalDistNm = Math.max(5, Math.round(Math.sqrt(dLat * dLat + dLng * dLng)));

      // Calculate bearing/track
      const y = Math.sin((dest.lng - dep.lng) * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180);
      const x = Math.cos(dep.lat * Math.PI / 180) * Math.sin(dest.lat * Math.PI / 180) -
                Math.sin(dep.lat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * Math.cos((dest.lng - dep.lng) * Math.PI / 180);
      const trk = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);

      for (let s = 0; s <= steps; s++) {
        const fraction = s / steps;
        const pLat = dep.lat + (dest.lat - dep.lat) * fraction;
        const pLng = dep.lng + (dest.lng - dep.lng) * fraction;
        const remainingNm = Math.round(totalDistNm * (1 - fraction));
        const eteMin = Math.round((remainingNm / 105) * 60);
        const altFt = s === 0 ? dep.elevationFt : (s === steps ? dest.elevationFt : Math.max(3500, dep.elevationFt + 2500));
        defaultFlightPoints.push([pLat, pLng, trk, altFt, remainingNm, eteMin]);
      }

      this.simIntervalId = setInterval(() => {
        if (!this.isDiverting) {
          if (this.simProgressIndex < defaultFlightPoints.length - 1) {
            this.simProgressIndex++;
          } else {
            this.simProgressIndex = 0;
          }
          const current = defaultFlightPoints[this.simProgressIndex];
          this.updateSimPosition(current, dest.icao);
        } else if (alt) {
          // Tactical divert in progress toward chosen alternate
          const currentPos = this.aircraftMarker ? this.aircraftMarker.getLatLng() : { lat: dep.lat, lng: dep.lng };
          const nextLat = currentPos.lat + (alt.lat - currentPos.lat) * 0.25;
          const nextLng = currentPos.lng + (alt.lng - currentPos.lng) * 0.25;
          const distNm = Math.round(Math.hypot((alt.lat - nextLat) * 60, (alt.lng - nextLng) * 45));
          const eteMin = Math.round((distNm / 105) * 60);
          this.updateSimPosition([nextLat, nextLng, 275, 2600, distNm, eteMin], alt.icao);
        }
      }, 3000);
    } else {
      clearInterval(this.simIntervalId);
    }
  }

  private updateSimPosition(current: number[], targetIcao: string): void {
    const newCoords: [number, number] = [current[0], current[1]];
    const heading = current[2];

    this.simTelemetry.headingDeg = heading;
    this.simTelemetry.altitudeFt = current[3];
    this.simTelemetry.distRemainingNm = current[4];
    this.simTelemetry.eteMin = current[5];

    if (this.simTelemetry.distRemainingNm <= 0.5) {
      clearInterval(this.simIntervalId);
      this.isSimTracking = false;
      this.activeAirspaceAlert = null;
      this.speakAlert(`Touchdown confirmed at ${targetIcao}. Welcome to the ramp.`);
      this.completeMissionFlight(targetIcao);
      return;
    }

    const destIcao = this.missionForm?.destinationIcao || 'KAKR';
    const activeTarget = (targetIcao && targetIcao.trim().length > 0) ? targetIcao : destIcao;

    if (this.simTelemetry.distRemainingNm <= 10 && this.simTelemetry.distRemainingNm > 0.5) {
      const alertMsg = `ADVISORY: Approaching ${activeTarget} Airspace (${this.simTelemetry.distRemainingNm} NM). Monitor CTAF / Tower.`;
      if (!this.activeAirspaceAlert) {
        this.activeAirspaceAlert = alertMsg;
        (this as any).showApproachCommsDrawer = true;
        this.speakAlert(`Approaching ${activeTarget} airspace, ten miles out. Contact tower.`);
      }
    } else if (this.simTelemetry.distRemainingNm <= 0.5) {
      this.activeAirspaceAlert = null;
    }

    if (this.aircraftMarker && this.cockpitNavMap) {
      this.aircraftMarker.setLatLng(newCoords);
      const iconEl = this.aircraftMarker.getElement();
      if (iconEl) {
        const inner = iconEl.querySelector('div');
        if (inner) inner.style.transform = `rotate(${heading}deg)`;
      }
      if (this.isFollowCamActive) {
        this.cockpitNavMap.panTo(newCoords, { animate: true, duration: 1 });
      }
    }
  }

  get activeApproachBriefing() {
    const isDiv = !!(this as any).isDiverting;
    const targetIcao = isDiv
      ? (this.missionForm?.alternateIcao || 'KBVI')
      : (this.missionForm?.destinationIcao || 'KAKR');

    const aerodrome: any = this.airportService.getAerodrome(targetIcao);
    const facilityName = aerodrome?.name || targetIcao;
    const tail = this.missionForm?.tailNumber || 'Skyhawk 734SP';
    const isTowered = aerodrome?.towered ?? (targetIcao === 'KAKR' || targetIcao === 'KBTP');
    const airspaceClass = isTowered ? 'Class D' : 'Class G / CTAF';
    const facilityTitle = isTowered ? `${facilityName} Tower` : `${facilityName} Traffic`;

    const script = isTowered
      ? `"${facilityTitle}, ${tail}, 10 miles out, inbound for full stop landing with Information [Current ATIS]."`
      : `"${facilityTitle}, ${tail}, 10 miles out, inbound for full stop landing, ${facilityName}."`;

    const title = `${targetIcao} ${airspaceClass.toUpperCase()} ENTRY CALL`;

    return {
      title,
      script,
      targetIcao,
      facilityName: facilityName.toLowerCase(),
      isTowered
    };
  }

  toggleApproachComms(): void {
    this.showApproachCommsDrawer = !this.showApproachCommsDrawer;
  }

  toggleFollowCam(): void {
    this.isFollowCamActive = !this.isFollowCamActive;
    if (this.isFollowCamActive && this.aircraftMarker && this.cockpitNavMap) {
      this.cockpitNavMap.panTo(this.aircraftMarker.getLatLng(), { animate: true, duration: 1 });
    }
  }

  speakAlert(text: string): void {
    if (this.isAudioMuted || !this.synth) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech alert unavailable', e);
    }
  }

  practiceRadioCall(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isRadioTransmitting) return;

    this.isRadioTransmitting = true;
    this.radioReadbackSuccess = null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      this.isRadioTransmitting = false;

     const brief = this.activeApproachBriefing;
        const targetWord = brief.targetIcao.toLowerCase().replace('k', '');
        const matched = transcript.includes('skyhawk') || 
                        transcript.includes('734sp') || 
                        transcript.includes(targetWord) || 
                        (brief.isTowered ? transcript.includes('tower') : transcript.includes('traffic'));

      this.radioReadbackSuccess = matched;

      if (matched) {
        this.speakAlert('Transmission acknowledged. Readback correct.');
      } else {
        this.speakAlert('Transmission unreadable. Say again with station callsign.');
      }
    };

    recognition.onerror = () => {
      this.isRadioTransmitting = false;
      this.radioReadbackSuccess = false;
    };

    recognition.onend = () => {
      this.isRadioTransmitting = false;
    };

    recognition.start();
  }

  completeMissionFlight(arrivalAirport: string): void {
    this.engineStopTime = new Date();
    this.debriefDurationHours = this.debriefDurationHours || 0.8;
    this.debriefLandings = 1;
    this.debriefTakeoffs = 1;
    this.showDebriefModal = true;
  }

  saveDebriefToLogbook(): void {
    const arrivalIcao = this.isDiverting 
      ? (this.missionForm.alternateIcao || 'KBVI') 
      : (this.missionForm.destinationIcao || 'KAGC');

    const logEntry = {
      completedAt: new Date().toISOString(),
      aircraftTail: this.missionForm.tailNumber || 'N734SP',
      departureIcao: `${this.missionForm.departureIcao || 'KBTP'} ➔ ${arrivalIcao}`,
      flightProfile: this.isDiverting ? 'Tactical Divert (KBVI)' : 'Cross Country (KAGC)',
      totalDurationHours: this.debriefDurationHours || 0.8,
      takeoffsCount: this.debriefTakeoffs || 1,
      landingsCount: this.debriefLandings || 1,
      compliancePercentage: 100
    };

    // Read existing persisted local logs, prepend this flight, then save
    let localLogs: any[] = [];
    const saved = localStorage.getItem('flyright_flight_logs');
    if (saved) {
      try {
        localLogs = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    localLogs.unshift(logEntry);
    localStorage.setItem('flyright_flight_logs', JSON.stringify(localLogs));

    this.flightLogs = [...localLogs, ...(this.flightLogs || [])];
    this.showDebriefModal = false;
    this.speakAlert('Flight successfully logged to electronic logbook.');
  }

  closeDebriefModal(): void {
    this.showDebriefModal = false;
  }

  calculateWindCorrection(groundTrack: number, tasKts: number = 105): { wcaDeg: number; headingDeg: number } {
    if (!this.currentMetar || !this.currentMetar.windSpeed) {
      return { wcaDeg: 0, headingDeg: groundTrack };
    }

    const windDir = (this.currentMetar as any).windDirection ?? (this.currentMetar as any).windDir ?? 20;
    const windSpeed = (this.currentMetar as any).windSpeed ?? 4;

    // Angle between wind direction and aircraft track
    const angleDiffRad = ((windDir - groundTrack) * Math.PI) / 180;
    const crosswind = windSpeed * Math.sin(angleDiffRad);

    // Wind Correction Angle (asin of crosswind / true airspeed)
    const ratio = Math.max(-1, Math.min(1, crosswind / (tasKts || 105)));
    const wcaDeg = Math.round((Math.asin(ratio) * 180) / Math.PI);

    // Heading = Course + WCA (normalized 0-359)
    const headingDeg = (Math.round(groundTrack + wcaDeg) + 360) % 360;

    return { wcaDeg, headingDeg };
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
      const divertWca = this.calculateWindCorrection(275, this.simTelemetry.groundSpeedKts || 105);
      this.simTelemetry.headingDeg = divertWca.headingDeg;
      const iconEl = this.aircraftMarker.getElement();
      if (iconEl) {
        const inner = iconEl.querySelector('div');
        if (inner) inner.style.transform = `rotate(${divertWca.headingDeg}deg)`;
      }
    } else {
      if (this.activeDiversionVector) {
        this.activeDiversionVector.remove();
        this.activeDiversionVector = null;
      }
    }
  }

 editFlightBriefing(): void {
  this.showMissionModal = true;

  if (this.briefingMap) {
    try {
      this.briefingMap.remove();
    } catch (e) {
      // Map instance already detached
    }
    this.briefingMap = null;
  }

  // Allow the Angular modal DOM element to mount
  setTimeout(() => {
    this.initBriefingMap();

    // Force Leaflet to calculate container pixel bounds, then draw vector layers
    setTimeout(() => {
      if (this.briefingMap) {
        this.briefingMap.invalidateSize();
      }
      if (this.missionForm && this.missionForm.departureIcao) {
        this.updateAirportVisuals(this.missionForm.departureIcao);
      }
    }, 150);
  }, 250);
}

  switchCockpitView(view: 'CHECKLIST' | 'NAV_MAP' | 'FLASHCARDS'): void {
    if (view === 'NAV_MAP' && !this.subService.isPro$.value) {
      this.openPaywall();
      return;
    }
    this.activeCockpitView = view;
    if (view === 'NAV_MAP') {
      this.initCockpitNavMap();
    }
  }
  updateAirportVisuals(icao: string): void {
    if (!icao || icao.trim().length < 3) return;

    const code = icao.trim().toUpperCase();
    const aero = this.airportService.getAerodrome(code);

    this.selectedRunwayLength = aero.runwayLengthFt;

    if (this.briefingMap) {
      // Re-center directly on selected field
      this.briefingMap.setView([aero.lat, aero.lng], 14);

      // Clean out previous layers
      if ((this as any).briefingOverlayGroup) {
  try {
    (this as any).briefingOverlayGroup.clearLayers();
    (this as any).briefingOverlayGroup.remove();
  } catch (e) {}
}
(this as any).briefingOverlayGroup = (L as any).layerGroup().addTo(this.briefingMap);

      // Convert runway feet length to lat/lng offsets based on true compass heading
      const lengthInNm = aero.runwayLengthFt / 6076.12;
      const degLatSpan = (lengthInNm / 60);
      const degLngSpan = (lengthInNm / 60) / Math.max(0.1, Math.cos((aero.lat * Math.PI) / 180));

      const headingRad = (aero.runwayHeadingDeg * Math.PI) / 180;
      const dLat = (degLatSpan / 2) * Math.cos(headingRad);
      const dLng = (degLngSpan / 2) * Math.sin(headingRad);

      const rwyCoords: [number, number][] = [
        [aero.lat - dLat, aero.lng - dLng],
        [aero.lat + dLat, aero.lng + dLng]
      ];

      const rwyNum = Math.max(1, Math.round(aero.runwayHeadingDeg / 10)).toString().padStart(2, '0');
      const recipNum = Math.max(1, Math.round(((aero.runwayHeadingDeg + 180) % 360) / 10)).toString().padStart(2, '0');

      // 1. Draw bold primary runway centerline
      (L as any).polyline(rwyCoords, {
        color: '#38bdf8',
        weight: 6,
        opacity: 0.95
      }).addTo((this as any).briefingOverlayGroup)
        .bindTooltip(`RWY ${rwyNum}/${recipNum} (${aero.runwayLengthFt.toLocaleString()} ft)`, {
          permanent: true,
          direction: 'top'
        });

      // 2. Draw traffic pattern box oriented to runway
      const patternBox = this.airportService.calculateTrafficPattern(aero.lat, aero.lng, aero.runwayHeadingDeg);
      (L as any).polygon(patternBox, {
        color: '#0ea5e9',
        dashArray: '6, 6',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 0.12
      }).addTo((this as any).briefingOverlayGroup)
        .bindTooltip(`Standard Left Traffic (${(aero.elevationFt + 1000).toLocaleString()} ft MSL)`, {
          direction: 'center'
        });

      // Settle layout
      setTimeout(() => {
        this.briefingMap?.invalidateSize();
      }, 50);
    }
  }

  radioScripts: Array<{ phase: string; type: string; cue: string }> = [];

  generateDynamicRadioScripts(): void {
    const depIcao = this.missionForm.departureIcao || 'KBTP';
    const dep = this.airportService.getAerodrome(depIcao);
    const tail = this.missionForm.tailNumber || 'Skyhawk 734SP';
    const isPattern = this.missionForm.flightType === 'PATTERN';
    const destIcao = this.missionForm.destinationIcao || depIcao;
    const dest = this.airportService.getAerodrome(destIcao);
    // Resolve dynamic FAA ARTCC based on coordinates across all 50 states
    let centerFacility = 'Regional Center';
    if (dep && dep.lng !== undefined && dep.lat !== undefined) {
      if (dep.lat > 50) {
        centerFacility = 'Anchorage Center'; // Alaska
      } else if (dep.lat < 23 && dep.lng < -150) {
        centerFacility = 'Honolulu Center'; // Hawaii
      } else if (dep.lng < -115) {
        centerFacility = (dep.lat > 42) ? 'Seattle Center' : 'Los Angeles Center'; // Pacific NW vs SW
      } else if (dep.lng < -104) {
        centerFacility = (dep.lat > 41) ? 'Salt Lake Center' : 'Albuquerque Center'; // Intermountain West
      } else if (dep.lng < -94) {
        centerFacility = (dep.lat < 34) ? 'Houston Center' : 'Denver Center'; // Texas Gulf vs High Plains
      } else if (dep.lng < -84) {
        centerFacility = (dep.lat < 33) ? 'Houston Center' : 'Kansas City Center'; // Deep South vs Midwest
      } else if (dep.lng < -77) {
        centerFacility = (dep.lat < 32) ? 'Jacksonville Center' : 'Cleveland Center'; // FL/GA vs Great Lakes/PA
      } else {
        centerFacility = (dep.lat > 38) ? 'Boston Center' : (dep.lat > 36 ? 'New York Center' : 'Washington Center');
      }
    }

    const rwyNum = Math.max(1, Math.round(dep.runwayHeadingDeg / 10)).toString().padStart(2, '0');

    this.radioScripts = [
      {
        phase: 'ENGINE START & TAXI',
        type: 'DEPARTURE',
        cue: `${dep.name} Ground / Traffic, ${tail}, at transient parking, taxiing to Runway ${rwyNum} with Information Alpha.`
      },
      {
        phase: 'RUNWAY DEPARTURE',
        type: 'DEPARTURE',
        cue: `${dep.name} Tower / Traffic, ${tail}, holding short Runway ${rwyNum}, ready for departure.`
      }
    ];

    if (isPattern) {
      this.radioScripts.push(
        {
          phase: 'PATTERN DOWNWIND',
          type: 'PATTERN',
          cue: `${dep.name} Traffic, ${tail}, midfield left downwind Runway ${rwyNum}.`
        },
        {
          phase: 'FINAL APPROACH',
          type: 'PATTERN',
          cue: `${dep.name} Traffic, ${tail}, turning final Runway ${rwyNum}, touch and go.`
        }
      );
    } else {
      const destRwy = Math.max(1, Math.round(dest.runwayHeadingDeg / 10)).toString().padStart(2, '0');
      this.radioScripts.push(
        {
          phase: 'EN-ROUTE CRUISE',
          type: 'EN-ROUTE',
          cue: `${centerFacility}, ${tail}, level at 4,500 en-route to ${dest.icao}, VFR flight following.`
        },
        {
          phase: 'INBOUND (10 NM OUT)',
          type: 'DESTINATION',
          cue: `${dest.name} Tower / Traffic, ${tail}, 10 miles outbound, inbound for full-stop landing with Information Bravo.`
        },
        {
          phase: 'PATTERN ENTRY',
          type: 'DESTINATION',
          cue: `${dest.name} Traffic, ${tail}, entering 45-degree midfield left downwind Runway ${destRwy}.`
        },
        {
          phase: 'FINAL CLEARANCE',
          type: 'DESTINATION',
          cue: `${dest.name} Tower / Traffic, ${tail}, turning 2-mile final Runway ${destRwy}, gear down and locked.`
        },
        {
          phase: 'CLEAR OF ACTIVE',
          type: 'DESTINATION',
          cue: `${dest.name} Ground / Traffic, ${tail}, clear of active runway, taxiing to ramp.`
        }
      );
    }
  }

   openPaywall(): void {
    this.showPaywallModal = true;
  }

  constructor(
    private checklistService: ChecklistService,
    public pilotService: PilotService,
    public airportService: AirportService,
    private weatherService: WeatherService,
    public cdr: ChangeDetectorRef,
    public flashcardService: FlashcardService,
    public subService: SubscriptionService
  ) {}

  ngOnInit(): void {
    this.dailyDeck = this.flashcardService.getDailySession();
    this.airportService.initDatabase().subscribe();
    this.initSpeechEngine();
    const savedLogs = localStorage.getItem('flyright_flight_logs');
    if (savedLogs) {
      try {
        this.flightLogs = JSON.parse(savedLogs);
      } catch (e) {
        console.error('Failed to parse flight logs', e);
      }
    }
    const savedPilot = localStorage.getItem('flyright_pilot');
    if (savedPilot) {
      try {
        this.currentPilot = JSON.parse(savedPilot);
        this.airportService.initDatabase().subscribe(() => {
          this.showMissionModal = true;
          setTimeout(() => {
            this.initBriefingMap();
          }, 250);
        });
      } catch (e) {
        localStorage.removeItem('flyright_pilot');
        this.showAuthModal = true;
      }
    } else {
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

  onPilotAuthenticated(authData: { pilotName: string; email: string }): void {
    this.currentPilot = {
      name: authData.pilotName,
      email: authData.email
    } as any;

    try {
      localStorage.setItem('flyright_pilot', JSON.stringify(this.currentPilot));
    } catch (e) {
      console.warn('Could not cache pilot session', e);
    }

    // Wait until 20,412 aerodromes are in memory before displaying modal
    this.airportService.initDatabase().subscribe(() => {
      (this as any).showAuthModal = false;
      (this as any).showMissionModal = true;
      if ('showOnboardingModal' in this) (this as any).showOnboardingModal = true;

      setTimeout(() => {
        this.initBriefingMap();
      }, 300);
    });
  }
  confirmMission(): void {
    if (!this.currentPilot) return;
    this.missionForm.pilot = this.currentPilot;

    const selectedCode = this.missionForm.aircraftModelCode || 'C172S';
    if ((this as any).aircraftSpeeds && (this as any).aircraftSpeeds[selectedCode]) {
      (this as any).currentVspeeds = { ...(this as any).aircraftSpeeds[selectedCode] };
    }

    // 1. Generate real ATC scripts matching active departure and destination
    this.generateDynamicRadioScripts();

    // 2. Refresh cockpit nav map & aircraft marker to start runway
    if (this.cockpitNavMap) {
      this.initAircraftMarker();
    }

    // 3. Cache mission locally so app never depends on backend connectivity
    try {
      localStorage.setItem('flyright_active_mission', JSON.stringify(this.missionForm));
    } catch (e) {
      console.warn('Could not cache mission locally', e);
    }

    // 4. Transition UI to loading screen
    this.showMissionModal = false;
    this.showFlightLoading = true;

    setTimeout(() => {
      this.showFlightLoading = false;
      (this as any).onboardingCompleted = true;
      if ('isOnboardingComplete' in this) (this as any).isOnboardingComplete = true;

      this.cdr.detectChanges();
    }, 14000);

    this.loadChecklist(this.missionForm.aircraftModelCode);
    this.fetchWeatherBriefing(this.missionForm.departureIcao);

    // 5. Offline-first safe mission persistence
    try {
      this.pilotService.createMission(this.missionForm).subscribe({
        next: () => console.log('[FlyRight] Mission synced successfully.'),
        error: () => {
          console.warn('[FlyRight] Offline mode active: local mission cached.');
        }
      });
    } catch (e) {
      // Prevent unhandled exception
    }
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
    // 1. Load any local simulation logs from localStorage
    let localLogs: any[] = [];
    const saved = localStorage.getItem('flyright_flight_logs');
    if (saved) {
      try {
        localLogs = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Fetch backend logs and merge local logs on top
    this.pilotService.getFlightLogs().subscribe({
      next: (logs) => {
        // Local entries take precedence at the top, followed by database logs
        this.flightLogs = [...localLogs, ...(logs || [])];
        this.showLogbookModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flight logs from database:', err);
        // Fallback to local logs if offline or backend is unreachable
        this.flightLogs = localLogs;
        this.showLogbookModal = true;
        this.cdr.detectChanges();
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
    const depIcao = this.missionForm?.departureIcao || 'KBTP';
    const dep = this.airportService.getAerodrome(depIcao);
    const tail = this.missionForm?.tailNumber || 'Skyhawk 734SP';
    const isPattern = this.missionForm?.flightType === 'PATTERN';
    const destIcao = this.missionForm?.destinationIcao || depIcao;
    const dest = this.airportService.getAerodrome(destIcao);
    const altIcao = this.missionForm?.alternateIcao || 'KBVI';
    const alt = this.airportService.getAerodrome(altIcao);

    const depRwy = Math.max(1, Math.round(dep.runwayHeadingDeg / 10)).toString().padStart(2, '0');
    const destRwy = Math.max(1, Math.round(dest.runwayHeadingDeg / 10)).toString().padStart(2, '0');
    const altRwy = Math.max(1, Math.round(alt.runwayHeadingDeg / 10)).toString().padStart(2, '0');

    const depTowered = !!this.missionForm?.departureTowered;
    const destTowered = !!this.missionForm?.destinationTowered;

    const calls: any[] = [];

    // --- 1. DEPARTURE CALLS ---
    if (depTowered) {
      calls.push(
        {
          situation: 'Ground Taxi Clearance',
          frequency: '121.90 MHz (Ground)',
          airspaceType: 'TOWERED',
          category: 'DEPARTURE',
          pilotTransmission: () => `${dep.name} Ground, ${tail}, at transient ramp with Information Alpha, ready to taxi, VFR departure Runway ${depRwy}.`,
          atcResponse: `${tail}, ${dep.name} Ground, taxi to Runway ${depRwy} via Alpha, hold short Runway ${depRwy}.`,
          readback: `Taxi to Runway ${depRwy} via Alpha, hold short Runway ${depRwy}, ${tail}.`
        },
        {
          situation: 'Tower Takeoff Clearance',
          frequency: '128.50 MHz (Tower)',
          airspaceType: 'TOWERED',
          category: 'DEPARTURE',
          pilotTransmission: () => `${dep.name} Tower, ${tail}, holding short Runway ${depRwy}, ready for departure.`,
          atcResponse: `${tail}, wind calm, Runway ${depRwy} cleared for takeoff, fly runway heading.`,
          readback: `Runway ${depRwy} cleared for takeoff, ${tail}.`
        }
      );
    } else {
      calls.push(
        {
          situation: 'CTAF Taxi Out',
          frequency: '122.80 MHz (CTAF)',
          airspaceType: 'NON_TOWERED',
          category: 'DEPARTURE',
          pilotTransmission: () => `${dep.name} Traffic, ${tail}, taxiing to Runway ${depRwy} via Alpha, ${dep.name} Traffic.`,
          atcResponse: '(No ATC - Self-announce intentions & monitor CTAF)',
          readback: 'Maintain visual scan and announce crossing runways.'
        },
        {
          situation: 'CTAF Departure / Takeoff',
          frequency: '122.80 MHz (CTAF)',
          airspaceType: 'NON_TOWERED',
          category: 'DEPARTURE',
          pilotTransmission: () => `${dep.name} Traffic, ${tail}, departing Runway ${depRwy}${isPattern ? ', remaining in closed pattern' : ', departing to the northwest'}, ${dep.name}.`,
          atcResponse: '(Self-Announce Traffic Broadcast)',
          readback: 'Broadcast crosswind, downwind, base, and final turns.'
        }
      );
    }

    // --- 2. LOCAL PATTERN OR CROSS COUNTRY ---
    if (isPattern) {
      if (depTowered) {
        calls.push({
          situation: 'Tower Inbound / Pattern Call',
          frequency: '128.50 MHz (Tower)',
          airspaceType: 'TOWERED',
          category: 'PATTERN',
          pilotTransmission: () => `${dep.name} Tower, ${tail}, left downwind Runway ${depRwy}.`,
          atcResponse: `${tail}, number 2 following a Cherokee on 1-mile final, cleared touch and go Runway ${depRwy}.`,
          readback: `Number 2, cleared touch and go Runway ${depRwy}, ${tail}.`
        });
      } else {
        calls.push({
          situation: 'CTAF Pattern Downwind',
          frequency: '122.80 MHz (CTAF)',
          airspaceType: 'NON_TOWERED',
          category: 'PATTERN',
          pilotTransmission: () => `${dep.name} Traffic, ${tail}, midfield left downwind Runway ${depRwy}, touch and go, ${dep.name}.`,
          atcResponse: '(Self-Announce Traffic Broadcast)',
          readback: 'Report turning final with aircraft intentions.'
        });
      }
    } else {
      // Cross-Country En-Route Cruise
    let centerFacility = 'Regional Center';
    if (dep && dep.lng !== undefined && dep.lat !== undefined) {
      if (dep.lat > 50) {
        centerFacility = 'Anchorage Center';
      } else if (dep.lat < 23 && dep.lng < -150) {
        centerFacility = 'Honolulu Center';
      } else if (dep.lng < -115) {
        centerFacility = (dep.lat > 42) ? 'Seattle Center' : 'Los Angeles Center';
      } else if (dep.lng < -104) {
        centerFacility = (dep.lat > 41) ? 'Salt Lake Center' : 'Albuquerque Center';
      } else if (dep.lng < -94) {
        centerFacility = (dep.lat < 34) ? 'Houston Center' : 'Denver Center';
      } else if (dep.lng < -84) {
        centerFacility = (dep.lat < 33) ? 'Houston Center' : 'Kansas City Center';
      } else if (dep.lng < -77) {
        centerFacility = (dep.lat < 32) ? 'Jacksonville Center' : 'Cleveland Center';
      } else {
        centerFacility = (dep.lat > 38) ? 'Boston Center' : (dep.lat > 36 ? 'New York Center' : 'Washington Center');
      }
    }

    calls.push({
      situation: 'En-Route VFR Flight Following',
      frequency: '124.75 MHz (Center / Approach)',
      airspaceType: 'ENROUTE',
      category: 'CRUISE',
      pilotTransmission: () => `${centerFacility}, ${tail}, 15 miles northwest of ${dep.icao}, level 4,500, request VFR flight following to ${dest.icao}.`,
        atcResponse: `${tail}, squawk 4321 and ident. Altimeter 30.12, radar contact.`,
        readback: `Squawk 4321, ${tail}.`
      });

      // Destination Inbound
      if (destTowered) {
        calls.push(
          {
            situation: `Inbound Call (10 NM Out to ${dest.icao})`,
            frequency: '120.10 MHz (Tower)',
            airspaceType: 'DESTINATION',
            category: 'DESTINATION',
            pilotTransmission: () => `${dest.name} Tower, ${tail}, 10 miles southeast at 3,500 with Information Bravo, inbound for full stop landing.`,
            atcResponse: `${tail}, ${dest.name} Tower, enter midfield left downwind Runway ${destRwy}. Report 2-mile final.`,
            readback: `Enter midfield left downwind Runway ${destRwy}, report 2-mile final, ${tail}.`
          },
          {
            situation: 'Tower Final Clearance',
            frequency: '120.10 MHz (Tower)',
            airspaceType: 'DESTINATION',
            category: 'DESTINATION',
            pilotTransmission: () => `${dest.name} Tower, ${tail}, 2-mile final Runway ${destRwy}, gear down.`,
            atcResponse: `${tail}, wind calm, Runway ${destRwy} cleared to land.`,
            readback: `Cleared to land Runway ${destRwy}, ${tail}.`
          }
        );
      } else {
        calls.push(
          {
            situation: `CTAF Inbound (10 NM Out to ${dest.icao})`,
            frequency: '122.80 MHz (CTAF)',
            airspaceType: 'DESTINATION',
            category: 'DESTINATION',
            pilotTransmission: () => `${dest.name} Traffic, ${tail}, 10 miles southeast, 3,500 descending, inbound for landing Runway ${destRwy}, ${dest.name}.`,
            atcResponse: '(Self-Announce Traffic Broadcast - Listen for active pattern traffic)',
            readback: 'Maintain visual separation and announce 45-degree pattern entry.'
          },
          {
            situation: 'CTAF Final Approach',
            frequency: '122.80 MHz (CTAF)',
            airspaceType: 'DESTINATION',
            category: 'DESTINATION',
            pilotTransmission: () => `${dest.name} Traffic, ${tail}, turning final Runway ${destRwy}, full stop, ${dest.name}.`,
            atcResponse: '(Self-Announce Traffic Broadcast)',
            readback: 'Announce clear of active runway once off centerline.'
          }
        );
      }

      // Standby Tactical Diversion (Emergency / Alternate)
      calls.push({
        situation: `Tactical Diversion Standby (${alt.icao})`,
        frequency: '123.00 MHz (CTAF / Tower)',
        airspaceType: 'DIVERT',
        category: 'DIVERT',
        pilotTransmission: () => `${alt.name} Traffic, ${tail}, diverting inbound due to weather/precautionary, 8 miles out, descending for Runway ${altRwy}, ${alt.name}.`,
        atcResponse: '(Monitor CTAF/Tower frequency & announce visual intentions)',
        readback: 'Broadcast position, altitude, and intent on active frequency.'
      });
    }

    return calls;
  }

  get activeRadioCalls() {
    // Return all applicable phase calls for the mission flight type
    return this.allRadioCalls;
  }


   toggleRadioDrawer(): void {
    this.showRadioDrawer = !this.showRadioDrawer;
  }

  playTransmissionAudio(transmission: string): void {
    this.speakCue(transmission);
  }

  get currentPhaseProgress(): number {
    if (!this.checklists || this.checklists.length === 0) return 10;
    const current = this.checklists[this.activeChecklistIndex];
    if (!current?.items || current.items.length === 0) return 10;

    const completed = current.items.filter((item: any) => item.isCompleted).length;
    const baseBoost = 10;
    const itemPercentage = (completed / current.items.length) * 90;

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
    // 1. Reset checklists via service
    this.checklistService.resetChecklist('C172S').subscribe({
      next: () => {
        this.checklists?.forEach(cl => cl.items?.forEach(i => i.isCompleted = false));
        this.activeChecklistIndex = 0;
      },
      error: (err) => console.error('Failed to reset checklist:', err)
    });

    // 2. Stop active flight simulation loop
    if ((this as any).simIntervalId) {
      clearInterval((this as any).simIntervalId);
      (this as any).simIntervalId = null;
    }
    this.isSimTracking = false;
    this.isDiverting = false;
    (this as any).activeAirspaceAlert = null;
    (this as any).showApproachCommsDrawer = false;

    // 3. Remove tactical diversion vector if drawn
    if (this.activeDiversionVector && this.cockpitNavMap) {
      this.activeDiversionVector.remove();
      this.activeDiversionVector = null;
    }

    // 4. Reset telemetry to departure baseline
    this.simTelemetry = {
      groundSpeedKts: 105,
      altitudeFt: 3000,
      headingDeg: 175,
      distRemainingNm: 27.2,
      eteMin: 15
    };

    // 5. Reposition aircraft icon back to Butler (KBTP)
    if (this.aircraftMarker && this.cockpitNavMap) {
      const departureCoords: [number, number] = [40.7767, -79.9494];
      this.aircraftMarker.setLatLng(departureCoords);
      this.cockpitNavMap.panTo(departureCoords);

      const iconEl = this.aircraftMarker.getElement();
      if (iconEl) {
        const inner = iconEl.querySelector('div');
        if (inner) {
          inner.style.transform = 'rotate(175deg)';
        }
      }
    }

    this.speakCue('Aircraft systems and checklists reset.');
  }

  selectFlashcardAnswer(index: number): void {
    if (!this.dailyDeck || this.showFlashcardExplanation) return;
    const current = this.dailyDeck.cards[this.dailyDeck.currentIndex];
    const isCorrect = index === current.correctIndex;

    this.selectedFlashcardOption = index;
    this.showFlashcardExplanation = true;
    this.dailyDeck.answers[current.id] = { selectedIndex: index, isCorrect };

    if (isCorrect) {
      this.dailyDeck.score++;
    }
    this.flashcardService.saveSession(this.dailyDeck);
  }

  nextFlashcard(): void {
    if (!this.dailyDeck) return;
    if (this.dailyDeck.currentIndex < this.dailyDeck.cards.length - 1) {
      this.dailyDeck.currentIndex++;
      this.selectedFlashcardOption = null;
      this.showFlashcardExplanation = false;
    } else {
      this.dailyDeck.completed = true;
    }
    this.flashcardService.saveSession(this.dailyDeck);
  }

   resetDailyCards(): void {
    const freshDeck = this.flashcardService.resetSession(true);
    if (!freshDeck) {
      this.openPaywall();
      return;
    }
    this.dailyDeck = freshDeck;
    this.selectedFlashcardOption = null;
    this.showFlashcardExplanation = false;
  }
}
