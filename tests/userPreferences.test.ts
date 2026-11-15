import { describe, expect, it, beforeEach } from 'vitest';
import {
  getLocalDateString,
  loadUserPreferences,
  recordHoldCompletion,
  saveDifficulty,
  saveFontScale,
  saveHighContrast,
  type StreakData,
} from '../src/services/userPreferences';

describe('User Preferences & Streak Tracking Service', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          mockStorage = {};
        },
      },
    };
  });

  it('generates consistent YYYY-MM-DD local date strings', () => {
    const d = new Date(2026, 10, 15); // Nov 15, 2026
    expect(getLocalDateString(d)).toBe('2026-11-15');
  });

  it('loads default preferences when localStorage is empty', () => {
    const prefs = loadUserPreferences();
    expect(prefs.difficulty).toBe('standard');
    expect(prefs.highContrast).toBe(false);
    expect(prefs.fontScale).toBe('standard');
    expect(prefs.streak.currentStreak).toBe(0);
    expect(prefs.streak.totalHoldsCompleted).toBe(0);
  });

  it('persists and reloads difficulty, contrast, and font scale settings', () => {
    saveDifficulty('advanced');
    saveHighContrast(true);
    saveFontScale('large');

    const loaded = loadUserPreferences();
    expect(loaded.difficulty).toBe('advanced');
    expect(loaded.highContrast).toBe(true);
    expect(loaded.fontScale).toBe('large');
  });

  it('initiates a new streak on first practice day', () => {
    const initial: StreakData = {
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      totalHoldsCompleted: 0,
    };

    const day1 = new Date(2026, 10, 15);
    const updated = recordHoldCompletion(initial, day1);

    expect(updated.currentStreak).toBe(1);
    expect(updated.bestStreak).toBe(1);
    expect(updated.lastActiveDate).toBe('2026-11-15');
    expect(updated.totalHoldsCompleted).toBe(1);
  });

  it('increments hold count without advancing streak when practiced multiple times on same day', () => {
    const initial: StreakData = {
      currentStreak: 3,
      bestStreak: 5,
      lastActiveDate: '2026-11-15',
      totalHoldsCompleted: 10,
    };

    const sameDay = new Date(2026, 10, 15);
    const updated = recordHoldCompletion(initial, sameDay);

    expect(updated.currentStreak).toBe(3);
    expect(updated.bestStreak).toBe(5);
    expect(updated.totalHoldsCompleted).toBe(11);
  });

  it('advances streak and updates best streak on consecutive days', () => {
    const day1Data: StreakData = {
      currentStreak: 2,
      bestStreak: 2,
      lastActiveDate: '2026-11-14',
      totalHoldsCompleted: 8,
    };

    const day2 = new Date(2026, 10, 15);
    const day2Data = recordHoldCompletion(day1Data, day2);

    expect(day2Data.currentStreak).toBe(3);
    expect(day2Data.bestStreak).toBe(3);
    expect(day2Data.lastActiveDate).toBe('2026-11-15');
    expect(day2Data.totalHoldsCompleted).toBe(9);
  });

  it('resets streak to 1 when a day is skipped, while keeping best streak', () => {
    const oldData: StreakData = {
      currentStreak: 5,
      bestStreak: 7,
      lastActiveDate: '2026-11-10', // 5 days ago
      totalHoldsCompleted: 20,
    };

    const today = new Date(2026, 10, 15);
    const updated = recordHoldCompletion(oldData, today);

    expect(updated.currentStreak).toBe(1);
    expect(updated.bestStreak).toBe(7); // best streak preserved
    expect(updated.lastActiveDate).toBe('2026-11-15');
    expect(updated.totalHoldsCompleted).toBe(21);
  });
});
