import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChecklistService } from './services/checklist.service';
import { Checklist, ChecklistItem } from './models/checklist.model';
import { PilotService } from './services/pilot.service';
import { Pilot, FlightMission } from './models/pilot.model';
import { FormsModule } from '@angular/forms';
import { WeatherService, MetarBriefing } from './services/weather.service';
import { from } from 'rxjs';


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
  showRadioDrawer = false;
  showDebriefModal: boolean = false;
  showLogbookModal: boolean = false;
  flightLogs: any[] = [];
  engineStartTime: Date | null = null;
  engineStopTime: Date | null = null;
  debriefDurationHours: number = 0.8;
  debriefTakeoffs: number = 1;
  debriefLandings: number = 1;
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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching checklists:', err);
        this.errorMessage = 'Unable to connect to FlyRight backend API.';
        this.isLoading = false;
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
    destinationTowered: false
  };

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
