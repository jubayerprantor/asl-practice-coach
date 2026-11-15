import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAdaptivePracticeQueue,
  computeSignProgress,
  type EvaluationResult,
  type FingerName,
  type SignPackBundle,
  type SignProgressStats,
} from '../engine';
import type { FeedbackPackFile } from '../packs/schema';
import {
  clearAllPracticeData,
  getAllPracticeAttempts,
  logPracticeAttempt,
  type PracticeAttemptRecord,
} from '../storage/db';
import { CameraView } from './CameraView';
import { FeedbackPanel } from './FeedbackPanel';

interface ProgressDashboardProps {
  pack: SignPackBundle;
  feedbackPack: FeedbackPackFile;
}

const FINGER_ORDER: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

function computeTopFinger(
  counts: Partial<Record<FingerName, number>>
): FingerName | null {
  let best: FingerName | null = null;
  let max = 0;
  for (const f of FINGER_ORDER) {
    const c = counts[f] ?? 0;
    if (c > max) {
      max = c;
      best = f;
    }
  }
  return best;
}

export function ProgressDashboard({
  pack,
  feedbackPack,
}: ProgressDashboardProps) {
  const availableSigns = useMemo(
    () => Object.keys(pack.thresholds.signs ?? {}).sort(),
    [pack]
  );

  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [adaptiveActive, setAdaptiveActive] = useState<boolean>(false);
  const [adaptiveSign, setAdaptiveSign] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const attemptStartRef = useRef<number>(performance.now());
  const fingerErrorsRef = useRef<Partial<Record<FingerName, number>>>({});
  const loggedRef = useRef<boolean>(false);

  const reloadAttempts = useCallback(async () => {
    try {
      const all = await getAllPracticeAttempts();
      setAttempts(all);
    } catch {
      setAttempts([]);
    }
  }, []);

  useEffect(() => {
    reloadAttempts();
  }, [reloadAttempts]);

  const progressStats: SignProgressStats[] = useMemo(
    () => computeSignProgress(availableSigns, attempts),
    [availableSigns, attempts]
  );

  const adaptiveQueue = useMemo(
    () => buildAdaptivePracticeQueue(progressStats, 5),
    [progressStats]
  );

  const startAdaptiveSession = () => {
    const first = adaptiveQueue[0]?.sign ?? availableSigns[0] ?? null;
    if (!first) return;
    setAdaptiveActive(true);
    setAdaptiveSign(first);
    setEvaluation(null);
    attemptStartRef.current = performance.now();
    fingerErrorsRef.current = {};
    loggedRef.current = false;
  };

  const handleAdaptiveEval = useCallback(
    async (res: EvaluationResult) => {
      setEvaluation(res);
      if (!adaptiveSign || loggedRef.current) return;

      if (res.status === 'needs_correction') {
        for (const f of FINGER_ORDER) {
          if (!res.fingers[f].passed) {
            fingerErrorsRef.current[f] =
              (fingerErrorsRef.current[f] ?? 0) + 1;
          }
        }
      }

      if (res.status === 'correct' && res.hold.completed) {
        loggedRef.current = true;
        const elapsed = Math.max(
          res.hold.requiredHoldMs,
          Math.round(performance.now() - attemptStartRef.current)
        );
        const counts = { ...fingerErrorsRef.current };

        try {
          await logPracticeAttempt({
            mode: 'check',
            language: pack.thresholds.language,
            sign: adaptiveSign,
            success: true,
            timeToSuccessMs: elapsed,
            durationMs: elapsed,
            mostCommonFailingFinger: computeTopFinger(counts),
            fingerErrorCounts: counts,
            completedAt: new Date().toISOString(),
          });
          await reloadAttempts();
        } catch {
          // Ignore storage error
        }

        // Advance to the next highest-priority sign in the updated Leitner ranking
        const updatedStats = computeSignProgress(availableSigns, [
          ...attempts,
          {
            sign: adaptiveSign,
            success: true,
            timeToSuccessMs: elapsed,
            mostCommonFailingFinger: computeTopFinger(counts),
            fingerErrorCounts: counts,
            completedAt: new Date().toISOString(),
          },
        ]);
        const nextQueue = buildAdaptivePracticeQueue(updatedStats, 5);
        const nextCandidate =
          nextQueue.find((s) => s.sign !== adaptiveSign)?.sign ??
          nextQueue[0]?.sign ??
          adaptiveSign;

        setAdaptiveSign(nextCandidate);
        setEvaluation(null);
        attemptStartRef.current = performance.now();
        fingerErrorsRef.current = {};
        loggedRef.current = false;
      }
    },
    [adaptiveSign, pack.thresholds.language, reloadAttempts, availableSigns, attempts]
  );

  const handleDeleteAllData = async () => {
    try {
      await clearAllPracticeData();
      setAttempts([]);
      setConfirmDeleteOpen(false);
      setAdaptiveActive(false);
      setStatusMessage('All local practice history has been permanently deleted.');
    } catch {
      setStatusMessage('Unable to clear local storage in this browser.');
    }
  };

  const totalAttempts = attempts.length;
  const totalSuccesses = attempts.filter((a) => a.success).length;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;
  const practicedSignsCount = progressStats.filter((s) => s.attempts > 0).length;

  return (
    <section
      aria-label="Progress and adaptive practice"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1040px',
      }}
    >
      {/* Clear Framing Disclaimer (Rule 11 / Proposal §4.5) */}
      <div
        role="note"
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          color: '#334155',
          fontSize: '0.9rem',
        }}
      >
        <strong>Note on Progress Scores:</strong> These scores measure geometric
        alignment against this app's provisional handshape checks,{' '}
        <strong>not ASL fluency</strong>. All records are stored locally in your
        browser's IndexedDB.
      </div>

      {/* Summary KPIs + Adaptive Practice Launcher */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Signs Practiced</span>
          <strong style={statValueStyle}>
            {practicedSignsCount} / {availableSigns.length}
          </strong>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Check Pass Rate</span>
          <strong style={statValueStyle}>{overallAccuracy}%</strong>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Total Logged Attempts</span>
          <strong style={statValueStyle}>{totalAttempts}</strong>
        </div>

        <div
          style={{
            ...statCardStyle,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() =>
              adaptiveActive ? setAdaptiveActive(false) : startAdaptiveSession()
            }
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: adaptiveActive ? '#dc2626' : '#0284c7',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            {adaptiveActive
              ? 'Stop Adaptive Practice'
              : '▶ Start Adaptive Practice'}
          </button>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
            Focus queue:{' '}
            {adaptiveQueue
              .slice(0, 4)
              .map((s) => s.sign)
              .join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Active Adaptive Practice Session */}
      {adaptiveActive && adaptiveSign && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            border: '2px solid #0284c7',
            backgroundColor: '#f0f9ff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: '1.15rem', color: '#0369a1' }}>
              Adaptive Focus Sign: {adaptiveSign}
            </strong>
            <span style={{ fontSize: '0.85rem', color: '#334155' }}>
              Leitner Box{' '}
              {progressStats.find((s) => s.sign === adaptiveSign)?.leitnerBox ?? 1}{' '}
              of 5
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            <CameraView
              targetSign={adaptiveSign}
              pack={pack}
              onEvaluationChange={handleAdaptiveEval}
            />
            <FeedbackPanel
              evaluation={evaluation}
              feedbackPack={feedbackPack}
            />
          </div>
        </div>
      )}

      {/* Per-Sign Breakdown Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
              <th style={thStyle}>Sign</th>
              <th style={thStyle}>Leitner Box</th>
              <th style={thStyle}>Attempts</th>
              <th style={thStyle}>Pass Rate</th>
              <th style={thStyle}>Avg Response</th>
              <th style={thStyle}>Recent Finger Mistakes</th>
            </tr>
          </thead>
          <tbody>
            {progressStats.map((row) => (
              <tr
                key={row.sign}
                style={{ borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ ...tdStyle, fontWeight: 700 }}>{row.sign}</td>
                <td style={tdStyle}>
                  Box {row.leitnerBox} / 5{' '}
                  {row.isDueNow ? (
                    <span style={{ color: '#c2410c', fontSize: '0.78rem' }}>
                      (Due)
                    </span>
                  ) : null}
                </td>
                <td style={tdStyle}>
                  {row.successes} / {row.attempts}
                </td>
                <td style={tdStyle}>
                  {row.attempts > 0 ? `${row.accuracyPct}%` : '—'}
                </td>
                <td style={tdStyle}>
                  {row.avgTimeToSuccessMs !== null
                    ? `${(row.avgTimeToSuccessMs / 1000).toFixed(1)}s`
                    : '—'}
                </td>
                <td style={tdStyle}>
                  {row.recentMistakes.length > 0
                    ? row.recentMistakes.join(', ')
                    : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete My Data Control */}
      <div
        style={{
          marginTop: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {statusMessage && (
          <span role="status" style={{ color: '#047857', fontWeight: 600 }}>
            {statusMessage}
          </span>
        )}

        {!confirmDeleteOpen ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #dc2626',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete My Data
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', color: '#b91c1c', fontWeight: 600 }}>
              Permanently erase all local progress in IndexedDB?
            </span>
            <button
              type="button"
              onClick={handleDeleteAllData}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Yes, Delete Everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #64748b',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const statCardStyle: React.CSSProperties = {
  padding: '0.9rem 1rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#64748b',
  fontWeight: 600,
};

const statValueStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  color: '#0f172a',
};

const thStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
};
