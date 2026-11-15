import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLanguagePack,
  listAvailableLanguagePacks,
  toSignPackBundle,
} from './packs/packRegistry';
import { tokens } from './ui/tokens';
import { AppHeader } from './ui/components/AppHeader';
import { MobileBottomNav } from './ui/MobileBottomNav';
import { SetupScreen } from './ui/screens/Setup';
import { HomeScreen } from './ui/screens/Home';
import { ProgressScreen } from './ui/screens/Progress';
import { LearnScreen } from './ui/screens/Learn';
import { CheckScreen } from './ui/screens/Check';
import { DebouncedSpeechCoach } from './ui/speechCoach';
import { logPracticeAttempt } from './storage/db';
import type { EvaluationResult, FingerName, LandmarkSource } from './engine';
import type { LessonSignStatus } from './ui/components/LessonPath';
import type { AppMode } from './ui/components/ModeTabs';
import type { CameraDeviceInfo } from './ui/components/CameraMenu';

const DevMockBridge = import.meta.env.DEV
  ? React.lazy(() => import('./dev/DevMockBridge').then((m) => ({ default: m.DevMockBridge })))
  : () => null;

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

  // Section 19: Responsive breakpoints (< 700px phone, 700-1099px tablet, >= 1100px desktop)
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 1200;
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 700;
  const isTablet = windowWidth >= 700 && windowWidth < 1100;
  const isTouch = isMobile || isTablet;

  // Section 11: Setup & Permission states
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('asl_camera_setup_done') === '1';
  });
  const [isCameraBlocked, setIsCameraBlocked] = useState<boolean>(false);

  // App mode: Section 12 specifies Home is shown on first launch after setup, and when wordmark is clicked.
  const [mode, setMode] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'learn';
    const setupDone = window.localStorage.getItem('asl_camera_setup_done') === '1';
    return setupDone ? 'home' : 'learn';
  });

  // Controls: Voice is optional and off by default (Section 17)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [showReference, setShowReference] = useState<boolean>(false);

  // Section 25: Camera picker & device state
  const [cameras, setCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('asl_selected_camera_id');
  });
  const [cameraChangedNotice, setCameraChangedNotice] = useState<string | null>(null);
  const [isCameraDisconnected, setIsCameraDisconnected] = useState<boolean>(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState<boolean>(false);

  // Step 3: Dev Mock Mode state
  const [mockLandmarkSource, setMockLandmarkSource] = useState<LandmarkSource | null>(null);
  const [isMockActive, setIsMockActive] = useState<boolean>(false);

  const updateCameras = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const cameraList: CameraDeviceInfo[] = videoDevices.map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1}`,
      }));
      setCameras(cameraList);

      const storedId = window.localStorage.getItem('asl_selected_camera_id');
      if (cameraList.length > 0) {
        if (storedId) {
          const found = cameraList.find((c) => c.deviceId === storedId);
          if (found) {
            setSelectedCameraId(storedId);
          } else {
            // It is no longer plugged in: fall back to default (Section 25)
            const defaultCam = cameraList[0];
            setSelectedCameraId(defaultCam.deviceId);
            window.localStorage.setItem('asl_selected_camera_id', defaultCam.deviceId);
            setCameraChangedNotice(`Switched to ${defaultCam.label || 'Camera 1'}.`);
          }
        } else {
          setSelectedCameraId(cameraList[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
    }
  }, []);

  useEffect(() => {
    updateCameras();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', updateCameras);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', updateCameras);
      };
    }
  }, [updateCameras]);

  const handleSelectCamera = useCallback((deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('asl_selected_camera_id', deviceId);
    }
    setCameraEnabled(true);
    setIsCameraDisconnected(false);
    setCameraChangedNotice(null);
  }, []);

  const handleCameraDisconnected = useCallback(() => {
    setIsCameraDisconnected(true);
    setEvaluation(null);
  }, []);

  const handleChooseCamera = useCallback(() => {
    updateCameras();
    if (cameras.length > 1) {
      setCameraMenuOpen(true);
    } else if (cameras.length === 1) {
      handleSelectCamera(cameras[0].deviceId);
    }
  }, [cameras, updateCameras, handleSelectCamera]);

  // Evaluation state
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Learn Mode State
  const lessons = useMemo(
    () => loadedPack.curriculum.lessons ?? [],
    [loadedPack]
  );
  const [currentLessonIdx, setCurrentLessonIdx] = useState<number>(0);
  const currentLesson = lessons[currentLessonIdx] ?? lessons[0];
  const requiredHolds = currentLesson?.requiredSuccessfulHolds ?? 3;

  const [lessonSignIdx, setLessonSignIdx] = useState<number>(0);
  const [completedHolds, setCompletedHolds] = useState<number>(0);
  const [completedSignsInLesson, setCompletedSignsInLesson] = useState<
    Set<string>
  >(new Set());

  // Section 9: Lesson complete state
  const [isLessonComplete, setIsLessonComplete] = useState<boolean>(false);
  const [mostAdjustedFinger, setMostAdjustedFinger] = useState<string | null>(
    null
  );

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

  // Next sign in current lesson or next lesson
  const nextSign = useMemo(() => {
    if (!currentLesson) return null;
    if (lessonSignIdx + 1 < currentLesson.signs.length) {
      return currentLesson.signs[lessonSignIdx + 1];
    }
    if (currentLessonIdx + 1 < lessons.length) {
      return lessons[currentLessonIdx + 1].signs[0];
    }
    return null;
  }, [currentLesson, lessonSignIdx, currentLessonIdx, lessons]);

  const isLastLesson =
    currentLessonIdx === lessons.length - 1 &&
    lessonSignIdx === (currentLesson?.signs.length ?? 0) - 1;

  // Reference entry for target sign
  const referenceEntry = useMemo(
    () => loadedPack.reference.signs[currentTargetSign],
    [loadedPack, currentTargetSign]
  );

  // Speech coach (Section 21: reads only current text, once per change, never every frame)
  const speechCoachRef = useRef<DebouncedSpeechCoach>(
    new DebouncedSpeechCoach(4000)
  );

  // Attempt telemetry tracking for logging
  const attemptStartTimeRef = useRef<number>(performance.now());
  const fingerMistakesRef = useRef<Partial<Record<FingerName, number>>>({});
  const holdAlreadyHandledRef = useRef<boolean>(false);

  // Screen reader live status message
  const [srMessage, setSrMessage] = useState<string>('');

  // Voice & Screen reader updates (Section 21)
  useEffect(() => {
    if (!evaluation || !cameraEnabled) return;

    let announce = '';
    if (evaluation.status === 'unable_to_evaluate') {
      announce = 'Show your hand to the camera.';
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
  }, [evaluation, cameraEnabled, voiceEnabled, loadedPack]);

  // Handle hold completion and Section 9 Lesson Complete flow
  useEffect(() => {
    if (!evaluation || !cameraEnabled || isLessonComplete) return;

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

      const fingerLabel =
        topFailingFinger === 'pinky'
          ? 'little'
          : topFailingFinger;
      setMostAdjustedFinger(fingerLabel);

      // Log attempt to IndexedDB (Rule 4: Mock results must never be saved to progress storage)
      if (!isMockActive) {
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
      }

      if (mode === 'learn') {
        const nextHolds = completedHolds + 1;
        setCompletedHolds(nextHolds);

        if (nextHolds >= requiredHolds) {
          // Section 9: Enter Lesson complete view
          setIsLessonComplete(true);
        } else {
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
    cameraEnabled,
    isLessonComplete,
    mode,
    completedHolds,
    requiredHolds,
    currentTargetSign,
    availableSigns,
    loadedPack,
  ]);

  // Section 9 actions: Continue to next sign / practice again
  const handleContinueLesson = useCallback(() => {
    if (isLastLesson && !nextSign) {
      setMode('check');
      setIsLessonComplete(false);
      setCompletedHolds(0);
      return;
    }

    setCompletedSignsInLesson((prev) => new Set(prev).add(currentTargetSign));
    setIsLessonComplete(false);
    setCompletedHolds(0);
    holdAlreadyHandledRef.current = false;
    attemptStartTimeRef.current = performance.now();
    fingerMistakesRef.current = {};

    if (currentLesson && lessonSignIdx + 1 < currentLesson.signs.length) {
      setLessonSignIdx((prev) => prev + 1);
    } else if (currentLessonIdx + 1 < lessons.length) {
      setCurrentLessonIdx((prev) => prev + 1);
      setLessonSignIdx(0);
      setCompletedSignsInLesson(new Set());
    }
  }, [
    isLastLesson,
    nextSign,
    currentTargetSign,
    currentLesson,
    lessonSignIdx,
    currentLessonIdx,
    lessons.length,
  ]);

  const handlePracticeAgain = useCallback(() => {
    setIsLessonComplete(false);
    setCompletedHolds(0);
    holdAlreadyHandledRef.current = false;
    attemptStartTimeRef.current = performance.now();
    fingerMistakesRef.current = {};
  }, []);

  // Keyboard shortcuts (Section 24: Ctrl+1 Check, Ctrl+2 Learn, Ctrl+3 Progress, Ctrl+Shift+V Voice, Ctrl+Shift+K Camera)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      if (!e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          setMode('check');
        } else if (e.key === '2') {
          e.preventDefault();
          setMode('learn');
        } else if (e.key === '3') {
          e.preventDefault();
          setMode('progress');
        }
      } else {
        if (e.key === 'V' || e.key === 'v') {
          e.preventDefault();
          setVoiceEnabled((prev) => !prev);
        } else if (e.key === 'K' || e.key === 'k') {
          e.preventDefault();
          setCameraEnabled((prev) => !prev);
        }
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
      if (isLessonComplete && idx === lessonSignIdx + 1) {
        return { sign, state: 'unlocked_next' as const };
      }
      if (idx === lessonSignIdx) {
        return {
          sign,
          state: isLessonComplete ? ('done' as const) : ('current' as const),
        };
      }
      return { sign, state: 'locked' as const };
    });
  }, [currentLesson, completedSignsInLesson, lessonSignIdx, isLessonComplete]);

  const handleSelectLessonSign = useCallback((sign: string) => {
    if (!currentLesson) return;
    const idx = currentLesson.signs.indexOf(sign);
    if (idx !== -1) {
      setLessonSignIdx(idx);
      setCompletedHolds(0);
      setIsLessonComplete(false);
      holdAlreadyHandledRef.current = false;
      attemptStartTimeRef.current = performance.now();
      fingerMistakesRef.current = {};
    }
  }, [currentLesson]);

  const handleStartSetup = () => {
    setHasCompletedSetup(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('asl_camera_setup_done', '1');
    }
    setMode('home');
  };

  const handleOpenCheckOnSign = (sign: string) => {
    const idx = availableSigns.indexOf(sign);
    if (idx !== -1) {
      setCheckSignIdx(idx);
    }
    setMode('check');
  };

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
      {/* Accessible live region for screen readers (Section 23 item 8) */}
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
        cameras={cameras}
        selectedCameraId={selectedCameraId}
        onSelectCamera={handleSelectCamera}
        cameraMenuOpen={cameraMenuOpen}
        onCameraMenuOpenChange={setCameraMenuOpen}
        onWordmarkClick={() => setMode('home')}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      {/* Main Content Area */}
      <main
        style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: isMobile ? '16px' : tokens.spacing.pagePadding,
          paddingBottom: isMobile ? '80px' : tokens.spacing.pagePadding,
          boxSizing: 'border-box',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Section 11: Setup & Permission denied cards */}
        {!hasCompletedSetup ? (
          <SetupScreen
            isBlocked={isCameraBlocked}
            onStart={handleStartSetup}
            onRetryPermission={() => setIsCameraBlocked(false)}
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onSelectCamera={handleSelectCamera}
            isTouch={isTouch}
          />
        ) : isCameraBlocked ? (
          <SetupScreen
            isBlocked={true}
            onStart={handleStartSetup}
            onRetryPermission={() => setIsCameraBlocked(false)}
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onSelectCamera={handleSelectCamera}
            isTouch={isTouch}
          />
        ) : mode === 'home' ? (
          /* Section 12: Home Screen / Mode Picker */
          <HomeScreen
            onSelectLearn={() => setMode('learn')}
            onSelectCheck={() => setMode('check')}
            inProgressLesson={
              currentLesson
                ? {
                    lessonNumber: currentLessonIdx + 1,
                    totalLessons: lessons.length,
                    sign: currentTargetSign,
                  }
                : null
            }
            onContinueInProgress={() => setMode('learn')}
            isTouch={isTouch}
          />
        ) : mode === 'progress' ? (
          /* Section 10: Progress Screen */
          <ProgressScreen
            curriculumPack={loadedPack.curriculum}
            onStartLearn={() => setMode('learn')}
            onPracticeSign={handleOpenCheckOnSign}
            isTouch={isTouch}
          />
        ) : mode === 'check' ? (
          /* Check Screen */
          <CheckScreen
            cameraEnabled={cameraEnabled}
            onToggleCamera={() => setCameraEnabled(true)}
            currentTargetSign={currentTargetSign}
            pack={signPackBundle}
            referenceEntry={referenceEntry}
            feedbackPack={loadedPack.feedback}
            evaluation={evaluation}
            onEvaluationChange={setEvaluation}
            showReference={showReference}
            onToggleReference={() => setShowReference((r) => !r)}
            isMobile={isMobile}
            isTablet={isTablet}
            selectedCameraId={selectedCameraId}
            landmarkSource={mockLandmarkSource}
            isCameraDisconnected={isCameraDisconnected}
            onChooseCamera={handleChooseCamera}
            cameraChangedNotice={cameraChangedNotice}
            onCameraDisconnected={handleCameraDisconnected}
          />
        ) : (
          /* Learn Screen */
          <LearnScreen
            cameraEnabled={cameraEnabled}
            onToggleCamera={() => setCameraEnabled(true)}
            currentTargetSign={currentTargetSign}
            pack={signPackBundle}
            referenceEntry={referenceEntry}
            feedbackPack={loadedPack.feedback}
            evaluation={evaluation}
            onEvaluationChange={setEvaluation}
            showReference={showReference}
            onToggleReference={() => setShowReference((r) => !r)}
            currentLessonNumber={currentLessonIdx + 1}
            totalLessons={lessons.length}
            lessonSigns={lessonSigns}
            onSelectSign={handleSelectLessonSign}
            completedHolds={completedHolds}
            requiredHolds={requiredHolds}
            isLessonComplete={isLessonComplete}
            nextSign={nextSign}
            isLastLesson={isLastLesson}
            mostAdjustedFinger={mostAdjustedFinger}
            onContinueLesson={handleContinueLesson}
            onPracticeAgain={handlePracticeAgain}
            isMobile={isMobile}
            isTablet={isTablet}
            selectedCameraId={selectedCameraId}
            landmarkSource={mockLandmarkSource}
            isCameraDisconnected={isCameraDisconnected}
            onChooseCamera={handleChooseCamera}
            cameraChangedNotice={cameraChangedNotice}
            onCameraDisconnected={handleCameraDisconnected}
          />
        )}
      </main>

      {/* Footer (Desktop & Tablet only) */}
      {!isMobile && (
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
      )}

      {/* Section 13: Mobile Bottom Bar Navigation */}
      {isMobile && hasCompletedSetup && !isCameraBlocked && (
        <MobileBottomNav mode={mode} onModeChange={(next) => setMode(next)} />
      )}

      {/* Dev-only Mock Mode Panel (Rule 3: Gated on import.meta.env.DEV) */}
      {import.meta.env.DEV && (
        <React.Suspense fallback={null}>
          <DevMockBridge
            currentTargetSign={currentTargetSign}
            onMockSourceChange={setMockLandmarkSource}
            onMockActiveChange={setIsMockActive}
          />
        </React.Suspense>
      )}
    </div>
  );
}
