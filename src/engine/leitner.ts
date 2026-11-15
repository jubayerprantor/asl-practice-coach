import type { FingerName } from './types';

export interface AttemptSummaryInput {
  sign: string;
  success: boolean;
  timeToSuccessMs: number | null;
  mostCommonFailingFinger: FingerName | null;
  fingerErrorCounts: Partial<Record<FingerName, number>>;
  completedAt: string;
}

export interface SignProgressStats {
  sign: string;
  attempts: number;
  successes: number;
  accuracyPct: number;
  avgTimeToSuccessMs: number | null;
  leitnerBox: 1 | 2 | 3 | 4 | 5;
  nextReviewAtMs: number;
  isDueNow: boolean;
  recentMistakes: FingerName[];
  topMistakeFinger: FingerName | null;
  /** Higher score = higher priority in adaptive practice queue */
  priorityScore: number;
}

/** Review intervals in minutes per Leitner box (Box 1 = immediate, Box 5 = 3 days) */
const BOX_INTERVAL_MINUTES: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 10,
  3: 60,
  4: 720,
  5: 4320,
};

const FINGER_ORDER: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

/**
 * Computes per-sign accuracy, response time, recent mistakes, and Leitner box state
 * from chronological practice attempt logs.
 */
export function computeSignProgress(
  availableSigns: readonly string[],
  attempts: readonly AttemptSummaryInput[],
  nowMs = Date.now()
): SignProgressStats[] {
  const bySign = new Map<string, AttemptSummaryInput[]>();
  for (const sign of availableSigns) {
    bySign.set(sign, []);
  }
  for (const att of attempts) {
    const list = bySign.get(att.sign);
    if (list) {
      list.push(att);
    }
  }

  const results: SignProgressStats[] = [];

  for (const sign of availableSigns) {
    const history = [...(bySign.get(sign) ?? [])].sort((a, b) =>
      a.completedAt.localeCompare(b.completedAt)
    );

    let box: 1 | 2 | 3 | 4 | 5 = 1;
    let lastAttemptMs = 0;
    let successes = 0;
    const successTimes: number[] = [];
    const totalFingerErrors: Partial<Record<FingerName, number>> = {};
    const recentMistakes: FingerName[] = [];

    for (const item of history) {
      const ts = Date.parse(item.completedAt) || nowMs;
      lastAttemptMs = Math.max(lastAttemptMs, ts);

      for (const f of FINGER_ORDER) {
        const errCount = item.fingerErrorCounts[f] ?? 0;
        if (errCount > 0) {
          totalFingerErrors[f] = (totalFingerErrors[f] ?? 0) + errCount;
        }
      }

      if (item.mostCommonFailingFinger) {
        recentMistakes.push(item.mostCommonFailingFinger);
      }

      if (item.success) {
        successes++;
        if (item.timeToSuccessMs !== null) {
          successTimes.push(item.timeToSuccessMs);
        }
        // Promote Leitner box on clean success; hold box if sign required heavy correction
        const hadHeavyStruggle =
          item.mostCommonFailingFinger !== null &&
          (item.fingerErrorCounts[item.mostCommonFailingFinger] ?? 0) >= 25;

        if (!hadHeavyStruggle && box < 5) {
          box = (box + 1) as 1 | 2 | 3 | 4 | 5;
        }
      } else {
        // Demote back to Box 1 on failed/incomplete attempt
        box = 1;
      }
    }

    const totalAttempts = history.length;
    const accuracyPct =
      totalAttempts > 0 ? Math.round((successes / totalAttempts) * 100) : 0;

    const avgTimeToSuccessMs =
      successTimes.length > 0
        ? Math.round(
            successTimes.reduce((a, b) => a + b, 0) / successTimes.length
          )
        : null;

    const intervalMs = BOX_INTERVAL_MINUTES[box] * 60_000;
    const nextReviewAtMs =
      totalAttempts === 0 ? nowMs : lastAttemptMs + intervalMs;
    const isDueNow = totalAttempts === 0 || nowMs >= nextReviewAtMs;

    let topMistakeFinger: FingerName | null = null;
    let maxErr = 0;
    for (const f of FINGER_ORDER) {
      const count = totalFingerErrors[f] ?? 0;
      if (count > maxErr) {
        maxErr = count;
        topMistakeFinger = f;
      }
    }

    // Priority score: unpracticed & Box 1 signs rank highest, followed by due signs & low accuracy
    const boxWeight = (6 - box) * 25;
    const dueBonus = isDueNow ? 20 : 0;
    const errorBonus = totalAttempts > 0 ? (100 - accuracyPct) * 0.3 : 10;
    const priorityScore = Number((boxWeight + dueBonus + errorBonus).toFixed(1));

    results.push({
      sign,
      attempts: totalAttempts,
      successes,
      accuracyPct,
      avgTimeToSuccessMs,
      leitnerBox: box,
      nextReviewAtMs,
      isDueNow,
      recentMistakes: recentMistakes.slice(-5).reverse(),
      topMistakeFinger,
      priorityScore,
    });
  }

  return results.sort(
    (a, b) =>
      b.priorityScore - a.priorityScore || a.sign.localeCompare(b.sign)
  );
}

/**
 * Selects the next N signs for an adaptive practice session,
 * prioritizing Box 1 / struggled signs and interleaving at least one familiar review sign.
 */
export function buildAdaptivePracticeQueue(
  stats: readonly SignProgressStats[],
  queueLength = 6
): SignProgressStats[] {
  if (stats.length === 0) return [];
  const sorted = [...stats].sort(
    (a, b) =>
      b.priorityScore - a.priorityScore || a.sign.localeCompare(b.sign)
  );
  return sorted.slice(0, Math.min(queueLength, sorted.length));
}
