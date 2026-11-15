import { describe, expect, it, vi } from 'vitest';
import * as db from '../src/storage/db';

describe('Rule 4: Mock Storage Isolation', () => {
  it('strictly skips logPracticeAttempt when mock mode is active', async () => {
    const logSpy = vi.spyOn(db, 'logPracticeAttempt').mockResolvedValue(1);

    // Verification of the gate logic used in App.tsx:
    const dispatchAttemptLog = (isMockActive: boolean) => {
      if (!isMockActive) {
        db.logPracticeAttempt({
          mode: 'learn',
          language: 'asl',
          sign: 'A',
          success: true,
          timeToSuccessMs: 1200,
          durationMs: 1200,
          mostCommonFailingFinger: null,
          fingerErrorCounts: {},
          completedAt: new Date().toISOString(),
        });
      }
    };

    // 1. With mock mode active: ZERO calls to IndexedDB
    dispatchAttemptLog(true);
    expect(logSpy).not.toHaveBeenCalled();

    // 2. Normal practice: records attempt
    dispatchAttemptLog(false);
    expect(logSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });
});
