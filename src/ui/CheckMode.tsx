import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EvaluationResult,
  FingerName,
  SignPackBundle,
} from '../engine';
import type {
  FeedbackPackFile,
  ReferencePackFile,
} from '../packs/schema';
import {
  getAllPracticeAttempts,
  logPracticeAttempt,
  type PracticeAttemptRecord,
} from '../storage/db';
import { CameraView } from './CameraView';
import { FeedbackPanel } from './FeedbackPanel';
import { ReferenceHintCard } from './ReferenceHintCard';

interface CheckModeProps {
  pack: SignPackBundle;
  feedbackPack: FeedbackPackFile;
  referencePack: ReferencePackFile;
}

const FINGER_ORDER: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

function computeMostCommonFailingFinger(
  counts: Partial<Record<FingerName, number>>
): FingerName | null {
  let topFinger: FingerName | null = null;
  let topCount = 0;
  for (const f of FINGER_ORDER) {
    const c = counts[f] ?? 0;
    if (c > topCount) {
      topCount = c;
      topFinger = f;
    }
  }
  return topFinger;
}

export function CheckMode({
  pack,
  feedbackPack,
  referencePack,
}: CheckModeProps) {
  const availableSigns = useMemo(
    () => Object.keys(pack.thresholds.signs ?? {}).sort(),
    [pack]
  );

  const [selectedSign, setSelectedSign] = useState<string | null>(
    availableSigns[0] ?? null
  );
  const [showReference, setShowReference] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [completedBanner, setCompletedBanner] = useState<{
    sign: string;
    timeToSuccessSec: number;
    mostCommonFailingFinger: FingerName | null;
  } | null>(null);
  const [recentLogs, setRecentLogs] = useState<PracticeAttemptRecord[]>([]);

  // Per-attempt telemetry tracked in refs so frame updates stay fast
  const attemptStartMsRef = useRef<number>(performance.now());
  const fingerErrorCountsRef = useRef<Partial<Record<FingerName, number>>>({});
  const attemptLoggedRef = useRef<boolean>(false);

  const refreshRecentLogs = useCallback(async () => {
    try {
      const all = await getAllPracticeAttempts();
      setRecentLogs(all.slice(-8).reverse());
    } catch {
      // Ignore if IndexedDB is blocked in private browsing
    }
  }, []);

  useEffect(() => {
    refreshRecentLogs();
  }, [refreshRecentLogs]);

  // Reset attempt tracking whenever user picks a new sign
  const selectSignForCheck = useCallback(
    async (nextSign: string) => {
      // If user switches away from an uncompleted sign after > 1.5s, log an incomplete attempt
      if (
        selectedSign &&
        !attemptLoggedRef.current &&
        performance.now() - attemptStartMsRef.current > 1500
      ) {
        const durationMs = Math.round(
          performance.now() - attemptStartMsRef.current
        );
        const counts = { ...fingerErrorCountsRef.current };
        try {
          await logPracticeAttempt({
            mode: 'check',
            language: pack.thresholds.language,
            sign: selectedSign,
            success: false,
            timeToSuccessMs: null,
            durationMs,
            mostCommonFailingFinger: computeMostCommonFailingFinger(counts),
            fingerErrorCounts: counts,
            completedAt: new Date().toISOString(),
          });
          await refreshRecentLogs();
        } catch {
          // Non-blocking storage error
        }
      }

      setSelectedSign(nextSign);
      setShowReference(false);
      setEvaluation(null);
      setCompletedBanner(null);
      attemptStartMsRef.current = performance.now();
      fingerErrorCountsRef.current = {};
      attemptLoggedRef.current = false;
    },
    [selectedSign, pack.thresholds.language, refreshRecentLogs]
  );

  const handleEvaluationChange = useCallback(
    async (res: EvaluationResult) => {
      setEvaluation(res);

      if (!selectedSign || attemptLoggedRef.current) return;

      // Accumulate per-finger mistake counts only when handshape is evaluable & wrong
      if (res.status === 'needs_correction') {
        for (const f of FINGER_ORDER) {
          if (!res.fingers[f].passed) {
            fingerErrorCountsRef.current[f] =
              (fingerErrorCountsRef.current[f] ?? 0) + 1;
          }
        }
      }

      // Hold timer reached required duration -> log success once
      if (res.status === 'correct' && res.hold.completed) {
        attemptLoggedRef.current = true;
        const elapsedMs = Math.max(
          res.hold.requiredHoldMs,
          Math.round(performance.now() - attemptStartMsRef.current)
        );
        const counts = { ...fingerErrorCountsRef.current };
        const topMistakeFinger = computeMostCommonFailingFinger(counts);

        setCompletedBanner({
          sign: selectedSign,
          timeToSuccessSec: Number((elapsedMs / 1000).toFixed(1)),
          mostCommonFailingFinger: topMistakeFinger,
        });

        try {
          await logPracticeAttempt({
            mode: 'check',
            language: pack.thresholds.language,
            sign: selectedSign,
            success: true,
            timeToSuccessMs: elapsedMs,
            durationMs: elapsedMs,
            mostCommonFailingFinger: topMistakeFinger,
            fingerErrorCounts: counts,
            completedAt: new Date().toISOString(),
          });
          await refreshRecentLogs();
        } catch {
          // Non-blocking storage error
        }
      }
    },
    [selectedSign, pack.thresholds.language, refreshRecentLogs]
  );

  const pickNextSign = useCallback(() => {
    if (availableSigns.length === 0) return;
    const currentIdx = selectedSign ? availableSigns.indexOf(selectedSign) : -1;
    const nextIdx = (currentIdx + 1) % availableSigns.length;
    selectSignForCheck(availableSigns[nextIdx]);
  }, [availableSigns, selectedSign, selectSignForCheck]);

  const masterSignsSet = useMemo(() => {
    const set = new Set<string>();
    for (const log of recentLogs) {
      if (log.success) set.add(log.sign);
    }
    return set;
  }, [recentLogs]);

  if (availableSigns.length === 0) {
    return (
      <div role="alert" style={{ padding: '1rem', color: '#b91c1c' }}>
        No signs found in <code>thresholds.json</code>. Run Step 6 threshold
        derivation first.
      </div>
    );
  }

  return (
    <section
      aria-label="Check mode"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '960px',
      }}
    >
      {/* Sign Selection Grid */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
            Pick a Sign to Check
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
            Hold the sign steady for{' '}
            {(pack.config.holdTimer.defaultHoldMs / 1000).toFixed(1)}s
          </span>
        </div>

        <div
          role="group"
          aria-label="Available signs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
            gap: '0.45rem',
          }}
        >
          {availableSigns.map((sign) => {
            const isSelected = sign === selectedSign;
            const hasSucceeded = masterSignsSet.has(sign);
            return (
              <button
                key={sign}
                type="button"
                onClick={() => selectSignForCheck(sign)}
                aria-pressed={isSelected}
                style={{
                  padding: '0.6rem 0.25rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: isSelected
                    ? '2px solid #0284c7'
                    : '1px solid #cbd5e1',
                  backgroundColor: isSelected
                    ? '#0284c7'
                    : hasSucceeded
                    ? '#ecfdf5'
                    : '#ffffff',
                  color: isSelected
                    ? '#ffffff'
                    : hasSucceeded
                    ? '#065f46'
                    : '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {sign}
                {hasSucceeded ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sign Header + Optional Reference Toggle */}
      {selectedSign && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#475569' }}>
              Target Sign:
            </span>
            <strong style={{ fontSize: '1.75rem', color: '#0f172a' }}>
              {selectedSign}
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowReference((prev) => !prev)}
              aria-expanded={showReference}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: showReference ? '#0f172a' : '#ffffff',
                color: showReference ? '#ffffff' : '#0f172a',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showReference ? 'Hide Reference' : 'Show Reference'}
            </button>

            <button
              type="button"
              onClick={pickNextSign}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next Sign →
            </button>
          </div>
        </div>
      )}

      {/* Optional Reference Hint (hidden by default in Check Mode) */}
      {selectedSign && showReference && (
        <ReferenceHintCard
          sign={selectedSign}
          entry={referencePack.signs[selectedSign]}
        />
      )}

      {/* Success Banner upon completing hold */}
      {completedBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.9rem 1.1rem',
            borderRadius: '8px',
            backgroundColor: '#065f46',
            color: '#ffffff',
            border: '2px solid #10b981',
          }}
        >
          <div>
            <strong style={{ fontSize: '1.1rem' }}>
              ✓ Sign "{completedBanner.sign}" Verified!
            </strong>
            <div style={{ fontSize: '0.88rem', color: '#d1fae5' }}>
              Time to success: {completedBanner.timeToSuccessSec}s
              {completedBanner.mostCommonFailingFinger
                ? ` • Most adjusted finger: ${completedBanner.mostCommonFailingFinger}`
                : ' • Clean first hold'}
            </div>
          </div>

          <button
            type="button"
            onClick={pickNextSign}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#065f46',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Practice Another Sign →
          </button>
        </div>
      )}

      {/* Live Camera + Single-Hint Feedback */}
      {selectedSign && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          <CameraView
            targetSign={selectedSign}
            pack={pack}
            onEvaluationChange={handleEvaluationChange}
          />
          <FeedbackPanel
            evaluation={evaluation}
            feedbackPack={feedbackPack}
          />
        </div>
      )}

      {/* Compact Recent Attempt Log */}
      {recentLogs.length > 0 && (
        <details style={{ fontSize: '0.85rem', color: '#334155' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Recent Check Attempts ({recentLogs.length})
          </summary>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            {recentLogs.map((item) => (
              <li key={item.id ?? item.completedAt}>
                <strong>{item.sign}</strong>:{' '}
                {item.success
                  ? `✓ Passed in ${((item.timeToSuccessMs ?? 0) / 1000).toFixed(1)}s`
                  : 'Incomplete'}
                {item.mostCommonFailingFinger
                  ? ` (top adjustment: ${item.mostCommonFailingFinger})`
                  : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
