import { Injectable } from '@angular/core';
import faaQuestionsData from '../../assets/data/faa-questions.json';
import { SubscriptionService } from './subscription.service';


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

  constructor(private subService: SubscriptionService) {

  }

  private shuffleCard(card: Flashcard): Flashcard {
  const correctText = card.options[card.correctIndex];
  const shuffledOptions = [...card.options];
  
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  
  return {
    ...card,
    options: shuffledOptions,
    correctIndex: shuffledOptions.indexOf(correctText)
  };
}


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
      cards: dailyCards.map(c => this.shuffleCard(c)),
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

  canStartUnlimitedSession(): boolean {
    return this.subService.isPro$.value;
  }

  resetSession(newRandomDeck: boolean = true): DailyDeckState | null {
    // If attempting an unlimited fresh session without Pro, block and return null
    if (newRandomDeck && !this.subService.isPro$.value) {
      return null;
    }

    const todayKey = this.getTodayDateKey();
    const seed = newRandomDeck ? `${todayKey}-${Date.now()}` : todayKey;
    const dailyCards = this.selectTenDailyCards(seed);

    const freshSession: DailyDeckState = {
      dateKey: todayKey,
      cards: dailyCards.map(c => this.shuffleCard(c)),
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
