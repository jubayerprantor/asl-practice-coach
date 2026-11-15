import type { FingerName } from '../engine';
import { logPracticeAttempt } from '../storage/db';

export interface HandleHoldCompletionOptions {
  isMockActive: boolean;
  mode: 'learn' | 'check';
  language: string;
  sign: string;
  attemptStartTimeMs: number;
  nowMs?: number;
  fingerMistakes: Partial<Record<FingerName, number>>;
  completedHolds: number;
  requiredHolds: number;
}

export interface HoldCompletionResult {
  mostAdjustedFinger: string | null;
  topFailingFinger: FingerName | null;
  durationMs: number;
  attemptLogged: boolean;
  nextHolds: number;
  isLessonComplete: boolean;
}

/**
 * Handles evaluation hold completion: determines top failing finger, logs
 * practice attempt to IndexedDB (strictly skipped during mock mode), and
 * calculates next hold counts and lesson completion.
 */
export function handleHoldCompletion(
  options: HandleHoldCompletionOptions
): HoldCompletionResult {
  const {
    isMockActive,
    mode,
    language,
    sign,
    attemptStartTimeMs,
    nowMs = performance.now(),
    fingerMistakes,
    completedHolds,
    requiredHolds,
  } = options;

  // Determine most common failing finger
  let maxErrors = 0;
  let topFailingFinger: FingerName | null = null;
  for (const [f, count] of Object.entries(fingerMistakes)) {
    if (count && count > maxErrors) {
      maxErrors = count;
      topFailingFinger = f as FingerName;
    }
  }

  const fingerLabel = topFailingFinger === 'pinky' ? 'little' : topFailingFinger;
  const durationMs = Math.round(nowMs - attemptStartTimeMs);

  let attemptLogged = false;
  // Rule 4: Mock results must never be saved to progress storage
  if (!isMockActive) {
    attemptLogged = true;
    logPracticeAttempt({
      mode: mode === 'learn' ? 'learn' : 'check',
      language,
      sign,
      success: true,
      timeToSuccessMs: durationMs,
      durationMs,
      mostCommonFailingFinger: topFailingFinger,
      fingerErrorCounts: { ...fingerMistakes },
      completedAt: new Date().toISOString(),
    }).catch((err) => console.warn('Failed to log attempt:', err));
  }

  let nextHolds = completedHolds;
  let isLessonComplete = false;

  if (mode === 'learn') {
    nextHolds = completedHolds + 1;
    if (nextHolds >= requiredHolds) {
      isLessonComplete = true;
    }
  }

  return {
    mostAdjustedFinger: fingerLabel,
    topFailingFinger,
    durationMs,
    attemptLogged,
    nextHolds,
    isLessonComplete,
  };
}
