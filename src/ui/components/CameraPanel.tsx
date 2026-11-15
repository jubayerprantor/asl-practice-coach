import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  HandLandmarkSmoother,
  SignEvaluatorSession,
  type AnatomicalHandedness,
  type EvaluationResult,
  type FingerName,
  type SignPackBundle,
  type Vec3,
} from '../../engine';
import type { SignReferenceEntry } from '../../packs/schema';
import { tokens } from '../tokens';
import { CameraOffIcon } from '../icons';
import { ReferenceInset } from './ReferenceInset';

export type TrackingStatus = 'loading' | 'ready' | 'error';

interface CameraPanelProps {
  cameraEnabled: boolean;
  targetSign: string | null;
  pack: SignPackBundle;
  referenceEntry?: SignReferenceEntry;
  showReferenceInset?: boolean;
  isLessonComplete?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
  onEvaluationChange?: (result: EvaluationResult) => void;
  onTrackingStatusChange?: (status: TrackingStatus) => void;
  onToggleCamera?: () => void;
}

const FINGER_BONES: Record<FingerName, ReadonlyArray<[number, number]>> = {
  thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
  index: [[0, 5], [5, 6], [6, 7], [7, 8]],
  middle: [[9, 10], [10, 11], [11, 12]],
  ring: [[13, 14], [14, 15], [15, 16]],
  pinky: [[0, 17], [17, 18], [18, 19], [19, 20]],
};

const PALM_BRIDGES: ReadonlyArray<[number, number]> = [
  [5, 9],
  [9, 13],
  [13, 17],
];

const FINGER_LABELS: Record<FingerName, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Little',
};

const FINGERTIP_INDICES: Record<FingerName, number> = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};

export function CameraPanel({
  cameraEnabled,
  targetSign,
  pack,
  referenceEntry,
  showReferenceInset = false,
  isLessonComplete = false,
  isMobile = false,
  isTablet = false,
  onEvaluationChange,
  onTrackingStatusChange,
  onToggleCamera,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  const smootherRef = useRef<HandLandmarkSmoother>(new HandLandmarkSmoother());
  const evaluatorRef = useRef<SignEvaluatorSession>(new SignEvaluatorSession());
  const lastEmittedEvalRef = useRef<EvaluationResult | null>(null);
  const lastEvalEmitTimeRef = useRef<number>(0);

  const lastInferTimeRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // FPS calculation for slow camera detection (Section 16: < 15 FPS for several seconds)
  const fpsWindowRef = useRef<number[]>([]);
  const [isSlowCamera, setIsSlowCamera] = useState<boolean>(false);

  // Tracking initialization state (Section 16: no spinners; determinate bar if progress known)
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('loading');
  const [loadingProgress] = useState<number>(100);

  const [handState, setHandState] = useState<{
    detected: boolean;
    multipleHands: boolean;
    handedness: AnatomicalHandedness | null;
    statusText: string;
    isPassing: boolean;
  }>({
    detected: false,
    multipleHands: false,
    handedness: null,
    statusText: 'Loading hand tracking',
    isPassing: false,
  });

  // 1. Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setTrackingStatus('loading');
        onTrackingStatusChange?.('loading');

        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2, // Support detecting two hands (Section 16)
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setTrackingStatus('ready');
        onTrackingStatusChange?.('ready');
        setHandState((prev) => ({
          ...prev,
          statusText: 'Camera ready',
        }));
      } catch (err) {
        console.error('Failed to initialize HandLandmarker:', err);
        if (!cancelled) {
          setTrackingStatus('error');
          onTrackingStatusChange?.('error');
          setHandState((prev) => ({
            ...prev,
            statusText: "Hand tracking couldn't load",
          }));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [onTrackingStatusChange]);

  // 2. Manage Webcam Stream and Inference Loop
  useEffect(() => {
    let active = true;

    async function stop() {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    if (!cameraEnabled) {
      stop();
      setHandState({
        detected: false,
        multipleHands: false,
        handedness: null,
        statusText: 'Camera is off',
        isPassing: false,
      });
      return;
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        const minIntervalMs = 1000 / 25; // 25 FPS throttle to conserve RAM & CPU

        const processFrame = (now: number) => {
          if (!active) return;
          rafIdRef.current = requestAnimationFrame(processFrame);

          // Track FPS for slow camera detection (Section 16)
          const windowTimes = fpsWindowRef.current;
          windowTimes.push(now);
          if (windowTimes.length > 50) {
            windowTimes.shift();
            const elapsedSec = (now - windowTimes[0]) / 1000;
            const currentFps = windowTimes.length / elapsedSec;
            setIsSlowCamera(currentFps < 15);
          }

          if (now - lastInferTimeRef.current < minIntervalMs) {
            return;
          }

          const landmarker = landmarkerRef.current;
          if (
            !landmarker ||
            video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            return;
          }

          if (video.currentTime === lastVideoTimeRef.current) {
            return;
          }
          lastVideoTimeRef.current = video.currentTime;
          lastInferTimeRef.current = now;

          const result = landmarker.detectForVideo(video, now);
          const handCount = result.landmarks?.length ?? 0;
          const multipleHands = handCount > 1;
          const detectedLandmarks = result.landmarks?.[0] ?? null;
          const category = result.handednesses?.[0]?.[0];

          const rawHand =
            category?.categoryName === 'Left' ||
            category?.categoryName === 'Right'
              ? category.categoryName
              : null;

          const anatomicalHand: AnatomicalHandedness | null =
            rawHand === 'Left' ? 'Right' : rawHand === 'Right' ? 'Left' : null;

          let currentEval: EvaluationResult | null = null;

          if (targetSign && pack) {
            const smoothed = detectedLandmarks
              ? smootherRef.current.filter(detectedLandmarks, now)
              : null;

            if (!detectedLandmarks) {
              smootherRef.current.reset();
            }

            currentEval = evaluatorRef.current.evaluateFrame(
              {
                landmarks: multipleHands ? null : smoothed,
                handedness: anatomicalHand ?? 'Right',
                mediaPipeScore: category?.score ?? 0,
                timestampMs: now,
              },
              targetSign,
              pack
            );

            // Handle two hands edge state (Section 16)
            if (multipleHands && currentEval) {
              currentEval = {
                ...currentEval,
                status: 'unable_to_evaluate',
                unableReason: 'hand_too_close', // overridden in UI to two_hands_detected
              };
            }

            // Emit to parent debounced
            const evalChanged =
              !lastEmittedEvalRef.current ||
              lastEmittedEvalRef.current.status !== currentEval.status ||
              lastEmittedEvalRef.current.topIssue?.ruleId !==
                currentEval.topIssue?.ruleId ||
              Math.abs(
                (lastEmittedEvalRef.current.hold.progress ?? 0) -
                  (currentEval.hold.progress ?? 0)
              ) > 0.05 ||
              currentEval.hold.completed !==
                lastEmittedEvalRef.current.hold.completed;

            const timeSinceEmit = now - lastEvalEmitTimeRef.current;
            if (evalChanged || timeSinceEmit >= 60) {
              lastEmittedEvalRef.current = currentEval;
              lastEvalEmitTimeRef.current = now;
              onEvaluationChange?.(currentEval);
            }
          }

          // Section 16 chip labeling rules:
          let statusText = 'No hand detected';
          if (trackingStatus === 'loading') {
            statusText = 'Loading hand tracking';
          } else if (trackingStatus === 'error') {
            statusText = "Hand tracking couldn't load";
          } else if (isSlowCamera) {
            statusText = 'Slow camera';
          } else if (multipleHands) {
            statusText = 'Two hands detected';
          } else if (detectedLandmarks && anatomicalHand) {
            statusText = `${anatomicalHand} hand detected`;
          }

          setHandState({
            detected: Boolean(detectedLandmarks) && !multipleHands,
            multipleHands,
            handedness: anatomicalHand,
            statusText,
            isPassing: currentEval?.status === 'correct',
          });

          // Draw skeleton on overlay canvas
          const canvas = canvasRef.current;
          if (canvas && video) {
            if (
              video.videoWidth > 0 &&
              video.videoHeight > 0 &&
              (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)
            ) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
              drawOverlay(
                ctx,
                canvas.width,
                canvas.height,
                multipleHands ? null : detectedLandmarks,
                currentEval,
                isLessonComplete
              );
            }
          }
        };

        rafIdRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Camera access error:', err);
      }
    }

    start();

    return () => {
      active = false;
      stop();
    };
  }, [
    cameraEnabled,
    targetSign,
    pack,
    onEvaluationChange,
    trackingStatus,
    isSlowCamera,
    isLessonComplete,
  ]);

  // Section 19: Responsive container dimensions
  let containerHeight: string | undefined = '100%';
  let containerAspectRatio: string | undefined = undefined;
  let containerMaxHeight: string | undefined = undefined;
  let containerMinHeight: string | undefined = '700px';

  if (isMobile) {
    containerHeight = 'auto';
    containerAspectRatio = '3 / 4';
    containerMinHeight = undefined;
  } else if (isTablet) {
    containerHeight = 'auto';
    containerAspectRatio = '4 / 3';
    containerMaxHeight = '60vh';
    containerMinHeight = undefined;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: containerHeight,
        aspectRatio: containerAspectRatio,
        maxHeight: containerMaxHeight,
        minHeight: containerMinHeight,
        backgroundColor: tokens.colors.cameraSurface,
        borderRadius: tokens.shape.radiusPanel,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Loading determinate 4px progress bar (Section 16) */}
      {trackingStatus === 'loading' && (
        <div
          role="progressbar"
          aria-valuenow={loadingProgress}
          aria-label="Loading hand tracking model"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: tokens.colors.secondaryBody,
            zIndex: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${loadingProgress}%`,
              backgroundColor: tokens.colors.overlayPassing,
              transition: 'width 200ms ease',
            }}
          />
        </div>
      )}

      {/* Top-left status chip (top: 16px, left: 16px) */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(22, 24, 26, 0.8)',
          border: `1px solid ${tokens.colors.secondaryBody}`,
          borderRadius: tokens.shape.radiusPill,
          padding: '6px 12px',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              isLessonComplete || handState.isPassing
                ? tokens.colors.overlayPassing
                : 'transparent',
            border:
              isLessonComplete || handState.isPassing
                ? 'none'
                : `1.5px solid ${
                    handState.detected
                      ? tokens.colors.overlayNeedsAttention
                      : tokens.colors.overlayNeutral
                  }`,
            display: 'inline-block',
          }}
        />
        <span>{handState.statusText}</span>
      </div>

      {/* Video & Canvas Container (Mirrored with CSS scaleX(-1)) */}
      {cameraEnabled ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <CameraOffIcon size={32} color={tokens.colors.overlayNeutral} />
          <div
            style={{
              color: tokens.colors.overlayNeutral,
              fontSize: tokens.typography.body.fontSize,
              fontWeight: 500,
            }}
          >
            Camera is off
          </div>
          {onToggleCamera && (
            <button
              type="button"
              onClick={onToggleCamera}
              className="btn-outlined"
              style={{
                height: tokens.shape.buttonHeight,
                padding: '0 18px',
                borderRadius: tokens.shape.radiusControl,
                fontSize: tokens.typography.statusText.fontSize,
                fontWeight: 600,
              }}
            >
              Turn on camera
            </button>
          )}
        </div>
      )}

      {/* Learn Mode: ReferenceInset at bottom-left (hidden when lesson complete, Section 9) */}
      {showReferenceInset &&
        !isLessonComplete &&
        referenceEntry &&
        referenceEntry.canonicalLandmarks && (
          <ReferenceInset landmarks={referenceEntry.canonicalLandmarks} />
        )}
    </div>
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: readonly Vec3[] | null,
  evaluation: EvaluationResult | null,
  isLessonComplete: boolean = false
) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 21) return;

  const isEvaluable =
    isLessonComplete ||
    (evaluation !== null && evaluation.status !== 'unable_to_evaluate');

  // 1. Palm bridge
  ctx.save();
  ctx.strokeStyle = isEvaluable
    ? tokens.colors.overlayPassing
    : tokens.colors.overlayNeutral;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  for (const [a, b] of PALM_BRIDGES) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Fingers
  const fingers: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  for (const finger of fingers) {
    const fingerRes = isEvaluable ? evaluation?.fingers[finger] : null;
    const isPassing = isLessonComplete
      ? true
      : isEvaluable
      ? Boolean(fingerRes?.passed)
      : false;

    let strokeColor: string = tokens.colors.overlayNeutral;
    let dashed = false;

    if (isLessonComplete) {
      strokeColor = tokens.colors.overlayPassing;
      dashed = false;
    } else if (isEvaluable) {
      if (isPassing) {
        strokeColor = tokens.colors.overlayPassing;
        dashed = false;
      } else {
        strokeColor = tokens.colors.overlayNeedsAttention;
        dashed = true;
      }
    }

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash(dashed ? [6, 6] : []);

    for (const [a, b] of FINGER_BONES[finger]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
      ctx.stroke();
    }
    ctx.restore();

    // If needing attention, draw fingertip text label
    if (isEvaluable && !isPassing && !isLessonComplete) {
      const tipIdx = FINGERTIP_INDICES[finger];
      const tipPt = landmarks[tipIdx];
      const tipX = tipPt.x * width;
      const tipY = tipPt.y * height;

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.scale(-1, 1); // Counter-flip for mirrored video

      ctx.font = '600 12px Inter, system-ui, sans-serif';
      const labelText = FINGER_LABELS[finger];
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = 'rgba(24, 27, 30, 0.85)';
      ctx.beginPath();
      ctx.roundRect(8, -12, textWidth + 12, 22, 6);
      ctx.fill();

      ctx.fillStyle = tokens.colors.overlayNeedsAttention;
      ctx.fillText(labelText, 14, 3);
      ctx.restore();
    }
  }

  // 3. Joint dots (3px white circles)
  for (let idx = 0; idx < 21; idx++) {
    const pt = landmarks[idx];
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}
