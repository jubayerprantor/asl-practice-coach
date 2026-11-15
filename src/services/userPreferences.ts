export type DifficultyTier = 'beginner' | 'standard' | 'advanced';
export type FontScale = 'standard' | 'large';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null; // ISO Date YYYY-MM-DD
  totalHoldsCompleted: number;
}

export interface UserPreferences {
  difficulty: DifficultyTier;
  highContrast: boolean;
  fontScale: FontScale;
  streak: StreakData;
}

const STORAGE_KEYS = {
  DIFFICULTY: 'asl_pref_difficulty',
  HIGH_CONTRAST: 'asl_pref_high_contrast',
  FONT_SCALE: 'asl_pref_font_scale',
  STREAK: 'asl_streak_data',
} as const;

export const DIFFICULTY_CONFIG: Record<
  DifficultyTier,
  { label: string; holdMs: number; description: string }
> = {
  beginner: {
    label: 'Beginner',
    holdMs: 1200,
    description: '1.2s hold duration. Ideal for learners building muscle memory.',
  },
  standard: {
    label: 'Standard',
    holdMs: 2000,
    description: '2.0s hold duration. Balanced for consistent accuracy.',
  },
  advanced: {
    label: 'Advanced',
    holdMs: 3000,
    description: '3.0s hold duration. Demands rock-solid pose stability.',
  },
};

export const FONT_SCALE_MAP: Record<FontScale, number> = {
  standard: 1.0,
  large: 1.15,
};

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadUserPreferences(): UserPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      difficulty: 'standard',
      highContrast: false,
      fontScale: 'standard',
      streak: {
        currentStreak: 0,
        bestStreak: 0,
        lastActiveDate: null,
        totalHoldsCompleted: 0,
      },
    };
  }

  const rawDiff = window.localStorage.getItem(STORAGE_KEYS.DIFFICULTY) as DifficultyTier | null;
  const difficulty: DifficultyTier =
    rawDiff && (rawDiff === 'beginner' || rawDiff === 'standard' || rawDiff === 'advanced')
      ? rawDiff
      : 'standard';

  const highContrast = window.localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === '1';

  const rawFont = window.localStorage.getItem(STORAGE_KEYS.FONT_SCALE) as FontScale | null;
  const fontScale: FontScale = rawFont === 'large' ? 'large' : 'standard';

  let streak: StreakData = {
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    totalHoldsCompleted: 0,
  };

  try {
    const rawStreak = window.localStorage.getItem(STORAGE_KEYS.STREAK);
    if (rawStreak) {
      streak = { ...streak, ...JSON.parse(rawStreak) };
    }
  } catch {
    // Ignore corrupted streak data
  }

  return { difficulty, highContrast, fontScale, streak };
}

export function saveUserPreferences(prefs: UserPreferences): void {
  saveDifficulty(prefs.difficulty);
  saveHighContrast(prefs.highContrast);
  saveFontScale(prefs.fontScale);
}

export function loadStreakData(): StreakData {
  return loadUserPreferences().streak;
}

export function saveDifficulty(difficulty: DifficultyTier): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEYS.DIFFICULTY, difficulty);
  }
}

export function saveHighContrast(enabled: boolean): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, enabled ? '1' : '0');
  }
}

export function saveFontScale(scale: FontScale): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEYS.FONT_SCALE, scale);
  }
}

/**
 * Updates practice streak upon completing a valid hold.
 * Preserves local privacy — strictly on-device.
 */
export function recordHoldCompletion(
  currentStreakData: StreakData = loadStreakData(),
  now: Date = new Date()
): StreakData {
  const todayStr = getLocalDateString(now);

  const prevDate = new Date(now);
  prevDate.setDate(prevDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(prevDate);

  let currentStreak = currentStreakData.currentStreak;
  const totalHoldsCompleted = currentStreakData.totalHoldsCompleted + 1;

  if (currentStreakData.lastActiveDate === todayStr) {
    // Already active today; streak maintained
    return {
      ...currentStreakData,
      totalHoldsCompleted,
    };
  }

  if (currentStreakData.lastActiveDate === yesterdayStr) {
    // Consecutive day practice
    currentStreak += 1;
  } else {
    // Streak reset or first practice
    currentStreak = 1;
  }

  const bestStreak = Math.max(currentStreakData.bestStreak, currentStreak);

  const updated: StreakData = {
    currentStreak,
    bestStreak,
    lastActiveDate: todayStr,
    totalHoldsCompleted,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
    } catch {
      // Ignore write failure
    }
  }

  return updated;
}
