import { Injectable } from '@angular/core';
import faaQuestionsData from '../../assets/data/faa-questions.json';


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

 private readonly QUESTION_BANK: Flashcard[] = faaQuestionsData as Flashcard[];

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

    if (dailyCards.length > 0) {
      this.saveSession(newSession);
    }
    return newSession;
  }

  saveSession(state: DailyDeckState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[FlashcardService] Failed to cache daily session', e);
    }
  }

  resetSession(newRandomDeck: boolean = true): DailyDeckState {
    const todayKey = this.getTodayDateKey();
    const seed = newRandomDeck ? `${todayKey}-${Date.now()}` : todayKey;
    const dailyCards = this.selectTenDailyCards(seed);

    const freshSession: DailyDeckState = {
      dateKey: todayKey,
      cards: dailyCards,
      currentIndex: 0,
      answers: {},
      score: 0,
      completed: false
    };

    this.saveSession(freshSession);
    return freshSession;
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
