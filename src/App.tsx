import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLanguagePack,
  listAvailableLanguagePacks,
  toSignPackBundle,
} from './packs/packRegistry';
import { tokens } from './ui/tokens';
import { AppHeader, type AppMode } from './ui/AppHeader';
import { CameraPanel } from './ui/CameraPanel';
import { CoachPanel } from './ui/CoachPanel';
import { DebouncedSpeechCoach } from './ui/speechCoach';
import { logPracticeAttempt } from './storage/db';
import type { EvaluationResult, FingerName } from './engine';
import type { LessonSignStatus } from './ui/LessonPath';

export default function App() {
  const availablePacks = useMemo(() => listAvailableLanguagePacks(), []);
  const [activePackId] = useState<string>(availablePacks[0]?.id ?? 'asl');
  const loadedPack = useMemo(
    () => getLanguagePack(activePackId),
    [activePackId]
  );
  const signPackBundle = useMemo(
    () => toSignPackBundle(loadedPack),
    [loadedPack]
  );

  // App mode: Learn by default
  const [mode, setMode] = useState<AppMode>('learn');

  // Controls: Voice is optional and off by default
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [showReference, setShowReference] = useState<boolean>(false);

  // Evaluation state
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Learn Mode State
  const lessons = useMemo(
    () => loadedPack.curriculum.lessons ?? [],
    [loadedPack]
  );
  const currentLessonIdx = 0;
  const currentLesson = lessons[currentLessonIdx] ?? lessons[0];
  const requiredHolds = currentLesson?.requiredSuccessfulHolds ?? 2;

  const [lessonSignIdx, setLessonSignIdx] = useState<number>(0);
  const [completedHolds, setCompletedHolds] = useState<number>(0);
  const [completedSignsInLesson, setCompletedSignsInLesson] = useState<
    Set<string>
  >(new Set());

  // Check Mode State
  const availableSigns = useMemo(
    () => Object.keys(signPackBundle.thresholds.signs ?? {}).sort(),
    [signPackBundle]
  );
  const [checkSignIdx, setCheckSignIdx] = useState<number>(0);

  // Target sign derived from active mode
  const currentTargetSign = useMemo(() => {
    if (mode === 'learn') {
      return currentLesson?.signs[lessonSignIdx] ?? 'A';
    }
    return availableSigns[checkSignIdx] ?? 'A';
  }, [mode, currentLesson, lessonSignIdx, availableSigns, checkSignIdx]);

  // Reference entry for target sign
  const referenceEntry = useMemo(
    () => loadedPack.reference.signs[currentTargetSign],
    [loadedPack, currentTargetSign]
  );

  // Speech coach
  const speechCoachRef = useRef<DebouncedSpeechCoach>(
    new DebouncedSpeechCoach(4000)
  );

  // Attempt telemetry tracking for logging
  const attemptStartTimeRef = useRef<number>(performance.now());
  const fingerMistakesRef = useRef<Partial<Record<FingerName, number>>>({});
  const holdAlreadyHandledRef = useRef<boolean>(false);

  // Screen reader live status message
  const [srMessage, setSrMessage] = useState<string>('');

  // Voice & Screen reader updates based on evaluation changes
  useEffect(() => {
    if (!evaluation) return;

    let announce = '';
    if (evaluation.status === 'unable_to_evaluate') {
      announce = "Can't check this yet. Bring your whole hand into view.";
    } else if (evaluation.status === 'correct') {
      announce = 'Good. Hold that position.';
    } else if (evaluation.topIssue) {
      const key = evaluation.topIssue.feedbackKey;
      announce =
        (key && loadedPack.feedback.messages[key]) ||
        `Adjust ${evaluation.topIssue.finger} finger.`;
    }

    setSrMessage(announce);

    if (voiceEnabled && announce) {
      speechCoachRef.current.speak(announce, true);
    }
  }, [evaluation, voiceEnabled, loadedPack]);

  // Handle hold completion and quiet 500ms advance
  useEffect(() => {
    if (!evaluation) return;

    if (evaluation.status === 'needs_correction' && evaluation.topIssue) {
      const finger = evaluation.topIssue.finger;
      fingerMistakesRef.current[finger] =
        (fingerMistakesRef.current[finger] ?? 0) + 1;
    }

    if (evaluation.hold?.completed && !holdAlreadyHandledRef.current) {
      holdAlreadyHandledRef.current = true;

      // Determine most common failing finger
      let maxErrors = 0;
      let topFailingFinger: FingerName | null = null;
      for (const [f, count] of Object.entries(fingerMistakesRef.current)) {
        if (count && count > maxErrors) {
          maxErrors = count;
          topFailingFinger = f as FingerName;
        }
      }

      // Log attempt to IndexedDB
      const durationMs = Math.round(
        performance.now() - attemptStartTimeRef.current
      );
      logPracticeAttempt({
        mode: mode === 'learn' ? 'learn' : 'check',
        language: loadedPack.manifest.id,
        sign: currentTargetSign,
        success: true,
        timeToSuccessMs: durationMs,
        durationMs,
        mostCommonFailingFinger: topFailingFinger,
        fingerErrorCounts: { ...fingerMistakesRef.current },
        completedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Failed to log attempt:', err));

      if (mode === 'learn') {
        const nextHolds = completedHolds + 1;
        setCompletedHolds(nextHolds);

        if (nextHolds >= requiredHolds) {
          // Sign completed: quiet 500ms pause, then advance to next sign
          const timer = setTimeout(() => {
            setCompletedSignsInLesson((prev) =>
              new Set(prev).add(currentTargetSign)
            );
            setCompletedHolds(0);
            holdAlreadyHandledRef.current = false;
            attemptStartTimeRef.current = performance.now();
            fingerMistakesRef.current = {};

            if (lessonSignIdx + 1 < (currentLesson?.signs.length ?? 0)) {
              setLessonSignIdx((prev) => prev + 1);
            }
          }, 500);

          return () => clearTimeout(timer);
        } else {
          // Release gate before accepting next hold
          const timer = setTimeout(() => {
            holdAlreadyHandledRef.current = false;
          }, 400);
          return () => clearTimeout(timer);
        }
      } else {
        // Check mode: quiet 500ms pause before advancing to next sign
        const timer = setTimeout(() => {
          holdAlreadyHandledRef.current = false;
          attemptStartTimeRef.current = performance.now();
          fingerMistakesRef.current = {};
          setCheckSignIdx((prev) => (prev + 1) % availableSigns.length);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [
    evaluation,
    mode,
    completedHolds,
    requiredHolds,
    currentTargetSign,
    currentLesson,
    lessonSignIdx,
    availableSigns,
    loadedPack,
  ]);

  // Keyboard shortcuts (Rule 6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or editable field
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space toggles reference view
      if (e.code === 'Space') {
        e.preventDefault();
        setShowReference((prev) => !prev);
        return;
      }

      if (!e.altKey) return;

      if (e.key === '1') {
        e.preventDefault();
        setMode('learn');
      } else if (e.key === '2') {
        e.preventDefault();
        setMode('check');
      } else if (e.key === '3') {
        e.preventDefault();
        setMode('progress');
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCameraEnabled((prev) => !prev);
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setVoiceEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lesson signs status list for LearnMode LessonPath
  const lessonSigns: LessonSignStatus[] = useMemo(() => {
    if (!currentLesson) return [];
    return currentLesson.signs.map((sign, idx) => {
      if (completedSignsInLesson.has(sign)) {
        return { sign, state: 'done' as const };
      }
      if (idx === lessonSignIdx) {
        return { sign, state: 'current' as const };
      }
      return { sign, state: 'locked' as const };
    });
  }, [currentLesson, completedSignsInLesson, lessonSignIdx]);

  const handleSelectLessonSign = useCallback((sign: string) => {
    if (!currentLesson) return;
    const idx = currentLesson.signs.indexOf(sign);
    if (idx !== -1) {
      setLessonSignIdx(idx);
      setCompletedHolds(0);
      holdAlreadyHandledRef.current = false;
      attemptStartTimeRef.current = performance.now();
      fingerMistakesRef.current = {};
    }
  }, [currentLesson]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.ground,
        color: tokens.colors.ink,
        fontFamily: tokens.typography.fontFamily,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Accessible live region for screen readers (debounced status) */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {srMessage}
      </div>

      {/* Header */}
      <AppHeader
        mode={mode}
        onModeChange={(next) => setMode(next)}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled((v) => !v)}
        cameraEnabled={cameraEnabled}
        onToggleCamera={() => setCameraEnabled((c) => !c)}
      />

      {/* Main Content Area */}
      <main
        style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: tokens.spacing.pagePadding,
          boxSizing: 'border-box',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {mode === 'progress' ? (
          /* Rule 7: Screens not yet designed (do NOT build without asking): Progress screen */
          <div
            style={{
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.shape.radiusCard,
              border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
              padding: '40px',
              maxWidth: '640px',
              margin: '60px auto',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: tokens.colors.ink,
              }}
            >
              Progress Screen
            </div>
            <p
              style={{
                ...tokens.typography.body,
                color: tokens.colors.mutedText,
                margin: 0,
              }}
            >
              Metrics measure alignment against geometric checks, not fluency.
              This screen is pending design specification. Switch to Check or
              Learn mode to practice.
            </p>
            <button
              type="button"
              onClick={() => setMode('learn')}
              style={{
                height: tokens.shape.buttonHeight,
                padding: '0 20px',
                borderRadius: tokens.shape.radiusControl,
                border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                backgroundColor: tokens.colors.ink,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Back to Learn
            </button>
          </div>
        ) : (
          /* Check & Learn modes: Two column layout */
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing.gridGap,
              minHeight: '700px',
              flex: 1,
            }}
          >
            {/* Left Column: CameraPanel */}
            <div
              style={{
                flex: 1,
                minHeight: '700px',
                display: 'flex',
              }}
            >
              <CameraPanel
                cameraEnabled={cameraEnabled}
                targetSign={currentTargetSign}
                pack={signPackBundle}
                referenceEntry={referenceEntry}
                showReferenceInset={mode === 'learn' && showReference}
                onEvaluationChange={setEvaluation}
                onToggleCamera={() => setCameraEnabled(true)}
              />
            </div>

            {/* Right Column: CoachPanel */}
            <CoachPanel
              mode={mode}
              targetSign={currentTargetSign}
              showReference={showReference}
              onToggleReference={() => setShowReference((r) => !r)}
              evaluation={evaluation}
              feedbackPack={loadedPack.feedback}
              currentLessonNumber={currentLessonIdx + 1}
              totalLessons={lessons.length}
              lessonSigns={lessonSigns}
              onSelectSign={handleSelectLessonSign}
              completedHolds={completedHolds}
              requiredHolds={requiredHolds}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '24px 0',
          fontSize: '13px',
          color: tokens.colors.mutedText,
        }}
      >
        Video is processed on this device and never uploaded.
      </footer>
    </div>
  );
}
