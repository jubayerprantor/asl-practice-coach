import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as db from '../src/storage/db';
import { handleHoldCompletion } from '../src/ui/practiceHandler';

describe('Rule 4: Mock Storage Isolation & Lesson State', () => {
  let logSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    logSpy = vi.spyOn(db, 'logPracticeAttempt').mockResolvedValue(1);
  });

  it('strictly skips IndexedDB logPracticeAttempt when mock mode is active', async () => {
    const result = handleHoldCompletion({
      isMockActive: true,
      mode: 'learn',
      language: 'asl',
      sign: 'A',
      attemptStartTimeMs: 1000,
      nowMs: 2200,
      fingerMistakes: { thumb: 2 },
      completedHolds: 0,
      requiredHolds: 3,
    });

    // 1. Result confirms no attempt was dispatched to database
    expect(result.attemptLogged).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();

    // 2. But in-memory hold progression advances for developer UI verification
    expect(result.nextHolds).toBe(1);
    expect(result.isLessonComplete).toBe(false);
    expect(result.mostAdjustedFinger).toBe('thumb');
  });

  it('records practice attempt to IndexedDB when in real mode (mock mode inactive)', async () => {
    const result = handleHoldCompletion({
      isMockActive: false,
      mode: 'learn',
      language: 'asl',
      sign: 'B',
      attemptStartTimeMs: 1000,
      nowMs: 2500,
      fingerMistakes: { index: 3, pinky: 1 },
      completedHolds: 1,
      requiredHolds: 3,
    });

    expect(result.attemptLogged).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'learn',
        language: 'asl',
        sign: 'B',
        success: true,
        durationMs: 1500,
        mostCommonFailingFinger: 'index',
        fingerErrorCounts: { index: 3, pinky: 1 },
      })
    );
    expect(result.nextHolds).toBe(2);
    expect(result.isLessonComplete).toBe(false);
  });

  it('reaches lesson completion on final required hold without writing mock data to IndexedDB', async () => {
    const result = handleHoldCompletion({
      isMockActive: true,
      mode: 'learn',
      language: 'asl',
      sign: 'A',
      attemptStartTimeMs: 1000,
      nowMs: 2000,
      fingerMistakes: {},
      completedHolds: 2,
      requiredHolds: 3,
    });

    // Confirms lesson completion state is triggered for UI dev-testing
    expect(result.isLessonComplete).toBe(true);
    expect(result.nextHolds).toBe(3);

    // And storage remains completely untouched
    expect(result.attemptLogged).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
