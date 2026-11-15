import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EvaluationResult,
  FingerName,
  SignPackBundle,
} from '../engine';
import type {
  CurriculumLesson,
  CurriculumPackFile,
  FeedbackPackFile,
  ReferencePackFile,
} from '../packs/schema';
import {
  getAllPracticeAttempts,
  logPracticeAttempt,
} from '../storage/db';
import { CameraView } from './CameraView';
import { FeedbackPanel } from './FeedbackPanel';
import { ReferenceSkeletonView } from './ReferenceSkeletonView';

interface LearnModeProps {
  pack: SignPackBundle;
  feedbackPack: FeedbackPackFile;
  referencePack: ReferencePackFile;
  curriculumPack: CurriculumPackFile;
}

interface SessionQueueItem {
  sign: string;
  phase: 'review' | 'lesson';
  targetHolds: number;
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
  let top: FingerName | null = null;
  let max = 0;
  for (const f of FINGER_ORDER) {
    const c = counts[f] ?? 0;
    if (c > max) {
      max = c;
      top = f;
    }
  }
  return top;
}

export function LearnMode({
  pack,
  feedbackPack,
  referencePack,
  curriculumPack,
}: LearnModeProps) {
  const lessons = curriculumPack.lessons ?? [];

  // Map sign -> cumulative successful holds from IndexedDB
  const [holdCountsBySign, setHoldCountsBySign] = useState<
    Record<string, number>
  >({});
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(0);
  const [queueIdx, setQueueIdx] = useState<number>(0);
  const [holdsCompletedInStep, setHoldsCompletedInStep] = useState<number>(0);
  const [awaitingReposition, setAwaitingReposition] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const stepStartMsRef = useRef<number>(performance.now());
  const fingerErrorsRef = useRef<Partial<Record<FingerName, number>>>({});
  const holdRecordedForCurrentHoldRef = useRef<boolean>(false);

  const loadProgress = useCallback(async () => {
    try {
      const attempts = await getAllPracticeAttempts();
      const counts: Record<string, number> = {};
      for (const a of attempts) {
        if (a.success) {
          counts[a.sign] = (counts[a.sign] ?? 0) + 1;
        }
      }
      setHoldCountsBySign(counts);
    } catch {
      // Ignore if IndexedDB unavailable
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Determine which lessons are unlocked (Lesson 0 always unlocked; subsequent unlock when prior lesson signs reach N holds)
  const unlockedLessons = useMemo(() => {
    return lessons.map((_, idx) => {
      if (idx === 0) return true;
      const prevLesson = lessons[idx - 1];
      return prevLesson.signs.every(
        (s) => (holdCountsBySign[s] ?? 0) >= prevLesson.requiredSuccessfulHolds
      );
    });
  }, [lessons, holdCountsBySign]);

  const activeLesson: CurriculumLesson | undefined = lessons[activeLessonIdx];

  // Build session queue: warm-up review of up to 2 earlier signs + current lesson signs
  const sessionQueue: SessionQueueItem[] = useMemo(() => {
    if (!activeLesson) return [];
    const earlierSigns = lessons
      .slice(0, activeLessonIdx)
      .flatMap((l) => l.signs)
      .filter((s) => Boolean(pack.thresholds.signs[s]));

    const reviewItems: SessionQueueItem[] = earlierSigns
      .slice(-2)
      .map((sign) => ({
        sign,
        phase: 'review',
        targetHolds: 1,
      }));

    const lessonItems: SessionQueueItem[] = activeLesson.signs
      .filter((s) => Boolean(pack.thresholds.signs[s]))
      .map((sign) => ({
        sign,
        phase: 'lesson',
        targetHolds: activeLesson.requiredSuccessfulHolds,
      }));

    return [...reviewItems, ...lessonItems];
  }, [activeLesson, activeLessonIdx, lessons, pack.thresholds.signs]);

  const currentItem = sessionQueue[queueIdx] ?? null;

  const selectLesson = (idx: number) => {
    if (!unlockedLessons[idx]) return;
    setActiveLessonIdx(idx);
    setQueueIdx(0);
    setHoldsCompletedInStep(0);
    setAwaitingReposition(false);
    setEvaluation(null);
    stepStartMsRef.current = performance.now();
    fingerErrorsRef.current = {};
    holdRecordedForCurrentHoldRef.current = false;
  };

  const advanceToNextQueueItem = useCallback(() => {
    setHoldsCompletedInStep(0);
    setAwaitingReposition(false);
    setEvaluation(null);
    stepStartMsRef.current = performance.now();
    fingerErrorsRef.current = {};
    holdRecordedForCurrentHoldRef.current = false;

    if (queueIdx + 1 < sessionQueue.length) {
      setQueueIdx((prev) => prev + 1);
    } else if (
      activeLessonIdx + 1 < lessons.length &&
      unlockedLessons[activeLessonIdx + 1]
    ) {
      setActiveLessonIdx((prev) => prev + 1);
      setQueueIdx(0);
    }
  }, [queueIdx, sessionQueue.length, activeLessonIdx, lessons.length, unlockedLessons]);

  const handleEvaluationChange = useCallback(
    async (res: EvaluationResult) => {
      setEvaluation(res);
      if (!currentItem) return;

      // Require user to lower/relax hand briefly between repeated holds of the same sign
      if (awaitingReposition) {
        if (res.status !== 'correct') {
          setAwaitingReposition(false);
          holdRecordedForCurrentHoldRef.current = false;
          stepStartMsRef.current = performance.now();
        }
        return;
      }

      if (res.status === 'needs_correction') {
        for (const f of FINGER_ORDER) {
          if (!res.fingers[f].passed) {
            fingerErrorsRef.current[f] =
              (fingerErrorsRef.current[f] ?? 0) + 1;
          }
        }
      }

      if (
        res.status === 'correct' &&
        res.hold.completed &&
        !holdRecordedForCurrentHoldRef.current
      ) {
        holdRecordedForCurrentHoldRef.current = true;
        const elapsedMs = Math.max(
          res.hold.requiredHoldMs,
          Math.round(performance.now() - stepStartMsRef.current)
        );
        const counts = { ...fingerErrorsRef.current };
        fingerErrorsRef.current = {};

        try {
          await logPracticeAttempt({
            mode: 'learn',
            language: pack.thresholds.language,
            sign: currentItem.sign,
            success: true,
            timeToSuccessMs: elapsedMs,
            durationMs: elapsedMs,
            mostCommonFailingFinger: computeMostCommonFailingFinger(counts),
            fingerErrorCounts: counts,
            completedAt: new Date().toISOString(),
          });
          await loadProgress();
        } catch {
          // Non-blocking storage error
        }

        const nextHoldCount = holdsCompletedInStep + 1;
        setHoldsCompletedInStep(nextHoldCount);

        if (nextHoldCount >= currentItem.targetHolds) {
          // Step complete -> move to next sign in session queue
          advanceToNextQueueItem();
        } else {
          // Need another hold on this same sign -> prompt user to relax & repeat
          setAwaitingReposition(true);
        }
      }
    },
    [
      currentItem,
      awaitingReposition,
      holdsCompletedInStep,
      pack.thresholds.language,
      loadProgress,
      advanceToNextQueueItem,
    ]
  );

  if (lessons.length === 0) {
    return (
      <div role="alert" style={{ padding: '1rem', color: '#b91c1c' }}>
        No lessons defined in <code>/src/packs/asl/curriculum.json</code>.
      </div>
    );
  }

  return (
    <section
      aria-label="Learn mode"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1040px',
      }}
    >
      {/* Lesson Selector Bar */}
      <div
        role="tablist"
        aria-label="Curriculum lessons"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        {lessons.map((lesson, idx) => {
          const unlocked = unlockedLessons[idx];
          const isCurrent = idx === activeLessonIdx;
          return (
            <button
              key={lesson.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              disabled={!unlocked}
              onClick={() => selectLesson(idx)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '6px',
                border: isCurrent
                  ? '2px solid #0284c7'
                  : '1px solid #cbd5e1',
                backgroundColor: !unlocked
                  ? '#f1f5f9'
                  : isCurrent
                  ? '#0284c7'
                  : '#ffffff',
                color: !unlocked
                  ? '#94a3b8'
                  : isCurrent
                  ? '#ffffff'
                  : '#0f172a',
                fontWeight: 600,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
            >
              {unlocked ? '' : '🔒 '}
              {lesson.title}
            </button>
          );
        })}
      </div>

      {/* Session Progress Header */}
      {currentItem && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            backgroundColor:
              currentItem.phase === 'review' ? '#fef3c7' : '#e0f2fe',
            border:
              currentItem.phase === 'review'
                ? '1px solid #f59e0b'
                : '1px solid #38bdf8',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: currentItem.phase === 'review' ? '#92400e' : '#0369a1',
              }}
            >
              {currentItem.phase === 'review'
                ? 'Warm-Up Review (Earlier Sign)'
                : `Step ${queueIdx + 1} of ${sessionQueue.length}`}
            </span>
            <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.35rem' }}>
              Practice Sign: <strong>{currentItem.sign}</strong>
            </h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: '1rem' }}>
              Successful Holds: {holdsCompletedInStep} / {currentItem.targetHolds}
            </strong>
            {awaitingReposition && (
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600 }}>
                ✓ Hold 1 complete! Relax your hand briefly, then form "{currentItem.sign}" again.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Split Guided View: Reference Skeleton + Description (Left) | Live Camera + Feedback (Right) */}
      {currentItem && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          <ReferenceSkeletonView
            sign={currentItem.sign}
            entry={referencePack.signs[currentItem.sign]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <CameraView
              targetSign={currentItem.sign}
              pack={pack}
              onEvaluationChange={handleEvaluationChange}
            />
            <FeedbackPanel
              evaluation={evaluation}
              feedbackPack={feedbackPack}
            />
          </div>
        </div>
      )}
    </section>
  );
}
