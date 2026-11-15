import { describe, expect, it } from 'vitest';
import {
  buildAdaptivePracticeQueue,
  computeSignProgress,
  type AttemptSummaryInput,
} from '../src/engine';

describe('Leitner Spaced Repetition Scheduler (/src/engine/leitner.ts)', () => {
  const signs = ['A', 'B', 'V'];

  it('promotes signs on clean success and demotes struggled signs to Box 1', () => {
    const attempts: AttemptSummaryInput[] = [
      // 'A' succeeds twice cleanly -> Box 3
      {
        sign: 'A',
        success: true,
        timeToSuccessMs: 1400,
        mostCommonFailingFinger: null,
        fingerErrorCounts: {},
        completedAt: '2026-11-15T10:00:00.000Z',
      },
      {
        sign: 'A',
        success: true,
        timeToSuccessMs: 1300,
        mostCommonFailingFinger: null,
        fingerErrorCounts: {},
        completedAt: '2026-11-15T10:05:00.000Z',
      },
      // 'V' succeeds once, then fails -> demoted back to Box 1
      {
        sign: 'V',
        success: true,
        timeToSuccessMs: 1800,
        mostCommonFailingFinger: null,
        fingerErrorCounts: {},
        completedAt: '2026-11-15T10:01:00.000Z',
      },
      {
        sign: 'V',
        success: false,
        timeToSuccessMs: null,
        mostCommonFailingFinger: 'ring',
        fingerErrorCounts: { ring: 32 },
        completedAt: '2026-11-15T10:06:00.000Z',
      },
    ];

    const nowMs = Date.parse('2026-11-15T10:07:00.000Z');
    const stats = computeSignProgress(signs, attempts, nowMs);
    const bySign = Object.fromEntries(stats.map((s) => [s.sign, s]));

    expect(bySign.A.leitnerBox).toBe(3);
    expect(bySign.A.accuracyPct).toBe(100);
    expect(bySign.A.avgTimeToSuccessMs).toBe(1350);

    expect(bySign.V.leitnerBox).toBe(1);
    expect(bySign.V.accuracyPct).toBe(50);
    expect(bySign.V.topMistakeFinger).toBe('ring');

    // Adaptive queue surfaces struggled 'V' and unpracticed 'B' ahead of mastered 'A'
    const queue = buildAdaptivePracticeQueue(stats, 3);
    expect(queue[0].sign).toBe('V');
    expect(queue[queue.length - 1].sign).toBe('A');
  });
});
