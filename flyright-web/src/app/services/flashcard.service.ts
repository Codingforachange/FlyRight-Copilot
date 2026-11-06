import { Injectable } from '@angular/core';

export interface Flashcard {
  id: number;
  category: 'Aerodynamics' | 'Weather' | 'FARs' | 'Airspace' | 'Instruments' | 'Navigation';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DailyDeckState {
  dateKey: string;
  cards: Flashcard[];
  currentIndex: number;
  answers: { [cardId: number]: { selectedIndex: number; isCorrect: boolean } };
  score: number;
  completed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private readonly STORAGE_KEY = 'flyright_daily_flashcards';

  // 100 Hardcoded Core FAA Private Pilot Airplane Questions
  private readonly QUESTION_BANK: Flashcard[] = [
    // --- FARs / Regulations ---
    {
      id: 1,
      category: 'FARs',
      question: 'What documents are required on board an aircraft prior to flight? (ARROW)',
      options: [
        'Airworthiness Certificate, Registration, Radio License (intnl), Operating Handbook (POH), Weight and Balance',
        'Airworthiness, Logbooks, Insurance Policy, Weight and Balance',
        'Pilot Certificate, Medical, Operating Limitations, Registration',
        'Annual Inspection, Registration, Operating Handbook, Weight and Balance'
      ],
      correctIndex: 0,
      explanation: '14 CFR § 91.203 requires Airworthiness, Registration, Radio Station License (international), Operating Limitations (POH), and Weight & Balance.'
    },
    {
      id: 2,
      category: 'FARs',
      question: 'What are the minimum fuel requirements for VFR flight during day conditions?',
      options: [
        'To destination plus 20 minutes at cruise speed',
        'To destination plus 30 minutes at normal cruising speed',
        'To destination plus 45 minutes at normal cruising speed',
        'To destination plus 1 hour reserve'
      ],
      correctIndex: 1,
      explanation: '14 CFR § 91.151 specifies enough fuel to fly to the first point of intended landing and, assuming normal cruising speed, for at least 30 minutes during the day (45 minutes at night).'
    },
    {
      id: 3,
      category: 'FARs',
      question: 'When must the aircraft position/navigation lights be illuminated?',
      options: [
        'Between sunset and sunrise',
        'One hour after sunset to one hour before sunrise',
        'Beginning at the end of evening civil twilight',
        'Whenever flight visibility is less than 3 statute miles'
      ],
      correctIndex: 0,
      explanation: '14 CFR § 91.209 requires navigation position lights to be lighted during the period from sunset to sunrise.'
    },
    {
      id: 4,
      category: 'FARs',
      question: 'How long do you have to notify the FAA of a change in permanent mailing address?',
      options: ['14 days', '30 days', '60 days', '90 days'],
      correctIndex: 1,
      explanation: '14 CFR § 61.60 states that after 30 days from the change of address date, you may not exercise certificate privileges unless you have notified the FAA in writing.'
    },

    // --- Airspace ---
    {
      id: 5,
      category: 'Airspace',
      question: 'What are the standard VFR weather minimums in Class E airspace below 10,000 feet MSL?',
      options: [
        '1 SM visibility, clear of clouds',
        '3 SM visibility; 500 ft below, 1,000 ft above, 2,000 ft horizontal from clouds',
        '3 SM visibility; 1,000 ft ceiling and 1 SM clear of clouds',
        '5 SM visibility; 1,000 ft below, 1,000 ft above, 1 SM horizontal'
      ],
      correctIndex: 1,
      explanation: 'Below 10,000 ft MSL in Class E, standard VFR minimums are 3 statute miles visibility and cloud clearance of 500 feet below, 1,000 feet above, and 2,000 feet horizontal (3-152).'
    },
    {
      id: 6,
      category: 'Airspace',
      question: 'What radio equipment is mandatory to enter Class C airspace?',
      options: [
        'Two-way radio and ADS-B Out only',
        'Two-way radio communication equipment and an operable Mode C / ADS-B Out transponder',
        'VOR receiver and two-way radio',
        'No radio required if VFR flight plan is active'
      ],
      correctIndex: 1,
      explanation: 'Operating within Class C requires two-way radio communication equipment and an altitude-reporting transponder (Mode C or Mode S) with ADS-B Out.'
    },
    {
      id: 7,
      category: 'Airspace',
      question: 'What is required prior to entering Class D airspace?',
      options: [
        'Explicit ATC clearance ("cleared into Class D")',
        'Establish two-way radio communications with the control tower',
        'Filing an active VFR flight plan with FSS',
        'Transponder set to code 1200 with squawk ident'
      ],
      correctIndex: 1,
      explanation: 'Two-way radio communication must be established with the Class D primary ATC facility prior to 4 NM entry. If ATC calls back with your tail number, communications are established.'
    },

    // --- Aerodynamics & Systems ---
    {
      id: 8,
      category: 'Aerodynamics',
      question: 'What is the primary factor that causes an airplane wing to stall?',
      options: [
        'Exceeding the critical angle of attack',
        'Allowing airspeed to drop below published stall speed (Vs)',
        'Operating in turbulent air at high power settings',
        'Excessive forward center of gravity (CG)'
      ],
      correctIndex: 0,
      explanation: 'A stall occurs when the critical angle of attack (AoA) is exceeded, regardless of airspeed, pitch attitude, or gross weight.'
    },
    {
      id: 9,
      category: 'Aerodynamics',
      question: 'What flight condition creates the most intense wake turbulence vortices behind heavy aircraft?',
      options: [
        'Fast, clean, and light',
        'Heavy, clean, and slow',
        'Heavy, dirty (gear & flaps down), and fast',
        'Light, slow, and high power'
      ],
      correctIndex: 1,
      explanation: 'Wingtip vortices are strongest when the generating aircraft is heavy, clean (gear and flaps retracted), and flying at slow indicated airspeeds (high angle of attack).'
    },
    {
      id: 10,
      category: 'Aerodynamics',
      question: 'What effect does an aft center of gravity (CG) have on an aircraft?',
      options: [
        'Higher stall speed and excessive longitudinal stability',
        'Lower cruise speed and difficult flare during landing',
        'Lower stall speed, higher cruise speed, and decreased stall/spin recovery capability',
        'Greater elevator control effectiveness at slow speeds with no change in stability'
      ],
      correctIndex: 2,
      explanation: 'An aft CG reduces wing loading (less tail-down force needed), lowering stall speed and increasing cruise speed, but significantly degrades longitudinal stability and spin recovery.'
    },

    // --- Weather ---
    {
      id: 11,
      category: 'Weather',
      question: 'What does the abbreviation "SPECI" at the beginning of a weather report signify?',
      options: [
        'Special non-routine weather report issued due to significant condition changes',
        'Routine hourly observation with pilot-reported ceiling changes',
        'Specific forecast derived from terminal aerodrome predictions',
        'Special low-altitude convective advisory'
      ],
      correctIndex: 0,
      explanation: 'A SPECI is an unscheduled special METAR issued when significant weather criteria (visibility drops, wind shifts, thunderstorm start, etc.) change rapidly.'
    },
    {
      id: 12,
      category: 'Weather',
      question: 'Under what atmospheric condition is carburetor icing most likely to develop?',
      options: [
        'Temperatures below 0°F (-18°C) in dry air',
        'Temperatures between 20°F and 70°F (-7°C to 21°C) with high relative humidity (>80%)',
        'Temperatures above 85°F (29°C) with convective rain',
        'Exclusively during freezing rain or drizzle'
      ],
      correctIndex: 1,
      explanation: 'Vaporization of fuel combined with the pressure drop across the venturi can produce a temperature drop of up to 40°F (22°C), causing carb ice even in warm humid air between 20°F and 70°F.'
    },
    {
      id: 13,
      category: 'Weather',
      question: 'What cloud type is the most dangerous hazard to VFR aviation due to severe turbulence and hail?',
      options: ['Altocumulus castellanus', 'Cumulonimbus', 'Stratocumulus', 'Cirrocumulus'],
      correctIndex: 1,
      explanation: 'Cumulonimbus clouds (thunderstorms) produce severe updrafts/downdrafts, microbursts, structural icing, lightning, and destructive hail.'
    },

    // --- Instruments & Navigation ---
    {
      id: 14,
      category: 'Instruments',
      question: 'If the pitot tube becomes completely blocked while the static port remains clear, how will the airspeed indicator behave?',
      options: [
        'Read zero continuously',
        'Act like an altimeter, indicating an increase in speed during a climb and decrease during descent',
        'Freeze at the last known indicated airspeed regardless of altitude changes',
        'Indicate full deflection into the red line'
      ],
      correctIndex: 1,
      explanation: 'Trapped ram pressure in the diaphragm combined with decreasing ambient static pressure during a climb causes the diaphragm to expand, making the airspeed indicator read higher like an altimeter.'
    },
    {
      id: 15,
      category: 'Instruments',
      question: 'What instrument is affected if the static port freezes over while the pitot tube remains open?',
      options: [
        'Airspeed indicator only',
        'Altimeter and vertical speed indicator only',
        'Airspeed, Altimeter, and Vertical Speed Indicator (all pitot-static instruments)',
        'Turn coordinator and attitude indicator'
      ],
      correctIndex: 2,
      explanation: 'All three pitot-static instruments rely on the static port: Altimeter freezes, VSI drops to zero, and the Airspeed Indicator reads lower than actual in a climb and higher in a descent.'
    },
    {
      id: 16,
      category: 'Navigation',
      question: 'When flying with a magnetic heading of 090° in the northern hemisphere, what does the compass indicate if you decelerate?',
      options: [
        'A turn toward the south',
        'A turn toward the north',
        'Correct heading with zero dip error (acceleration errors occur on east/west headings)',
        'Compass shows no error on 090°'
      ],
      correctIndex: 0,
      explanation: 'Using the ANDS rule (Accelerate North, Decelerate South), on east/west headings in the Northern Hemisphere, decelerating causes the compass card to dip and indicate a turn toward the south.'
    }
  ];

  constructor() {}

  /**
   * Deterministically returns 10 flashcards for the current day.
   * If a session was already started or completed today, it restores that state from localStorage.
   */
  getDailySession(): DailyDeckState {
    const todayKey = this.getTodayDateKey();
    const cached = this.loadCachedSession();

    if (cached && cached.dateKey === todayKey) {
      return cached;
    }

    // Generate new 10-card deck for today using date string as seed
    const dailyCards = this.selectTenDailyCards(todayKey);
    const newSession: DailyDeckState = {
      dateKey: todayKey,
      cards: dailyCards,
      currentIndex: 0,
      answers: {},
      score: 0,
      completed: false
    };

    this.saveSession(newSession);
    return newSession;
  }

  saveSession(state: DailyDeckState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[FlashcardService] Failed to cache daily session', e);
    }
  }

  private loadCachedSession(): DailyDeckState | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private getTodayDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Deterministic Pseudo-Random Shuffle seeded by today's date string.
   * Ensures every pilot gets the exact same 10-card rotation on a given calendar day.
   */
  private selectTenDailyCards(seedStr: string): Flashcard[] {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed << 5) - seed + seedStr.charCodeAt(i);
      seed |= 0;
    }

    const shuffled = [...this.QUESTION_BANK];
    // Fisher-Yates with seeded LCG PRNG
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      const j = Math.floor(rnd * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 10);
  }
}
