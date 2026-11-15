import { useEffect, useRef, useState } from 'react';
import {
  HandLandmarkSmoother,
  SignEvaluatorSession,
  type AnatomicalHandedness,
  type EvaluationResult,
  type FingerName,
  type LandmarkFrame,
  type LandmarkSource,
  type SignPackBundle,
  type Vec3,
} from '../../engine';
import type { SignReferenceEntry } from '../../packs/schema';
import { tokens } from '../tokens';
import { CameraOffIcon } from '../icons';
import { ReferenceInset } from './ReferenceInset';
import { cameraService } from '../../services/camera';
import { handTrackingService, type HandTrackingStatus } from '../../services/handTracking';

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
  selectedCameraId?: string | null;
  landmarkSource?: LandmarkSource | null;
  isCameraDisconnected?: boolean;
  onEvaluationChange?: (result: EvaluationResult) => void;
  onTrackingStatusChange?: (status: TrackingStatus) => void;
  onCameraDisconnected?: () => void;
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
  selectedCameraId = null,
  landmarkSource = handTrackingService,
  isCameraDisconnected = false,
  onEvaluationChange,
  onTrackingStatusChange,
  onCameraDisconnected,
  onToggleCamera,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const smootherRef = useRef<HandLandmarkSmoother>(new HandLandmarkSmoother());
  const evaluatorRef = useRef<SignEvaluatorSession>(new SignEvaluatorSession());
  const lastEmittedEvalRef = useRef<EvaluationResult | null>(null);
  const lastEvalEmitTimeRef = useRef<number>(0);

  // Tracking initialization state (Section 16: no spinners; determinate bar if progress known)
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('ready');
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

  // Reset evaluator & smoother on targetSign change
  useEffect(() => {
    evaluatorRef.current.reset();
    smootherRef.current.reset();
    lastEmittedEvalRef.current = null;
  }, [targetSign]);

  const activeSource = landmarkSource ?? handTrackingService;

  // 1. Subscribe to HandTrackingService status if available
  useEffect(() => {
    if ('subscribeStatus' in activeSource && typeof (activeSource as any).subscribeStatus === 'function') {
      const unsub = (activeSource as any).subscribeStatus((st: HandTrackingStatus) => {
        const mappedStatus: TrackingStatus = st === 'failed' ? 'error' : st;
        setTrackingStatus(mappedStatus);
        onTrackingStatusChange?.(mappedStatus);
      });
      return unsub;
    } else {
      setTrackingStatus('ready');
      onTrackingStatusChange?.('ready');
    }
  }, [activeSource, onTrackingStatusChange]);

  // 2. Manage CameraService stream attachment
  useEffect(() => {
    if (!cameraEnabled || isCameraDisconnected) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHandState({
        detected: false,
        multipleHands: false,
        handedness: null,
        statusText: isCameraDisconnected ? 'Camera disconnected' : 'Camera is off',
        isPassing: false,
      });
      return;
    }

    // Start or reuse stream from CameraService
    cameraService.start(selectedCameraId ?? undefined).catch(() => {});

    // Attach stream to video element
    const unsubStream = cameraService.subscribeStream((stream) => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        if (stream) {
          videoRef.current.play().catch(() => {});
        }
      }
    });

    const unsubState = cameraService.subscribeState((st) => {
      if (st === 'disconnected') {
        onCameraDisconnected?.();
      }
    });

    return () => {
      unsubStream();
      unsubState();
    };
  }, [cameraEnabled, isCameraDisconnected, selectedCameraId, onCameraDisconnected]);

  // 3. Subscribe to LandmarkSource (draw overlay strictly on incoming result, not rAF loop)
  useEffect(() => {
    if (!cameraEnabled || isCameraDisconnected) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    activeSource.start();

    const handleFrame = (frame: LandmarkFrame) => {
      const now = frame.timestampMs ?? performance.now();
      const canvas = canvasRef.current;

      if (frame.status === 'disconnected') {
        onCameraDisconnected?.();
        setHandState({
          detected: false,
          multipleHands: false,
          handedness: null,
          statusText: 'Camera disconnected',
          isPassing: false,
        });
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      const multipleHands = frame.status === 'two_hands';
      const detectedLandmarks = frame.landmarks;
      const anatomicalHand = frame.handedness ?? 'Right';

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
            handedness: anatomicalHand,
            mediaPipeScore: frame.confidence ?? 0.95,
            timestampMs: now,
          },
          targetSign,
          pack
        );

        if (multipleHands && currentEval) {
          currentEval = {
            ...currentEval,
            status: 'unable_to_evaluate',
            unableReason: 'hand_too_close',
          };
        }

        if (currentEval.hold.completed) {
          evaluatorRef.current.resetHoldTimer();
        }

        // Debounced emit to parent
        const evalChanged =
          !lastEmittedEvalRef.current ||
          lastEmittedEvalRef.current.status !== currentEval.status ||
          lastEmittedEvalRef.current.topIssue?.ruleId !== currentEval.topIssue?.ruleId ||
          Math.abs(
            (lastEmittedEvalRef.current.hold.progress ?? 0) -
              (currentEval.hold.progress ?? 0)
          ) > 0.05 ||
          currentEval.hold.completed !== lastEmittedEvalRef.current.hold.completed;

        const timeSinceEmit = now - lastEvalEmitTimeRef.current;
        if (evalChanged || timeSinceEmit >= 60) {
          lastEmittedEvalRef.current = currentEval;
          lastEvalEmitTimeRef.current = now;
          onEvaluationChange?.(currentEval);
        }
      }

      let statusText = 'No hand detected';
      if (multipleHands) {
        statusText = 'Two hands detected';
      } else if (frame.status === 'low_confidence') {
        statusText = 'Low tracking confidence';
      } else if (frame.status === 'too_far') {
        statusText = 'Hand too far';
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

      // Requirement 5: Draw canvas overlay strictly when a new result arrives
      if (canvas) {
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
        } else if (canvas.width !== 640 || canvas.height !== 480) {
          canvas.width = 640;
          canvas.height = 480;
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

    const unsubscribe = activeSource.subscribe(handleFrame);

    return () => {
      unsubscribe();
      activeSource.stop();
    };
  }, [
    cameraEnabled,
    isCameraDisconnected,
    activeSource,
    targetSign,
    pack,
    isLessonComplete,
    onEvaluationChange,
    onCameraDisconnected,
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
              display: 'block',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              objectFit: 'cover',
            }}
          />
        </div>
      ) : (
        /* Camera Off State */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            textAlign: 'center',
            gap: '12px',
            padding: '24px',
          }}
        >
          <CameraOffIcon size={48} color="currentColor" />
          <p
            style={{
              ...tokens.typography.titleMedium,
              color: '#FFFFFF',
              margin: 0,
            }}
          >
            Camera is off
          </p>
          <button
            type="button"
            onClick={onToggleCamera}
            style={{
              height: tokens.shape.buttonHeight,
              padding: '0 20px',
              backgroundColor: tokens.colors.surface,
              color: tokens.colors.ink,
              border: `1px solid ${tokens.colors.borderStrong}`,
              borderRadius: tokens.shape.radiusControl,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Turn on camera
          </button>
        </div>
      )}

      {/* Reference Inset Card */}
      {showReferenceInset && referenceEntry?.canonicalLandmarks && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 10,
          }}
        >
          <ReferenceInset
            landmarks={referenceEntry.canonicalLandmarks}
          />
        </div>
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
  isLessonComplete = false
): void {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length !== 21) return;

  const isPassing = isLessonComplete || evaluation?.status === 'correct';

  const defaultStroke = isPassing
    ? tokens.colors.overlayPassing
    : tokens.colors.overlayNeutral;

  const defaultDot = isPassing
    ? tokens.colors.overlayPassing
    : '#FFFFFF';

  // 1. Draw Bones
  for (const [finger, bones] of Object.entries(FINGER_BONES)) {
    const fingerEval = evaluation?.fingers[finger as FingerName];
    const fingerFailed = !isPassing && fingerEval && !fingerEval.passed;

    const strokeColor = fingerFailed
      ? tokens.colors.overlayNeedsAttention
      : defaultStroke;

    const isDashed = Boolean(fingerFailed);

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = fingerFailed ? 3 : 2;
    if (isDashed) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }

    for (const [startIdx, endIdx] of bones) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Draw Palm Bridges
  ctx.save();
  ctx.strokeStyle = defaultStroke;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  for (const [startIdx, endIdx] of PALM_BRIDGES) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    if (!p1 || !p2) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Draw Landmark Dots
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!p) continue;

    const isWrist = i === 0;
    const isTip = Object.values(FINGERTIP_INDICES).includes(i);
    const radius = isWrist ? 5 : isTip ? 4 : 3;

    let dotColor: string = defaultDot;
    let strokeColor: string = defaultStroke;

    for (const [finger, tipIdx] of Object.entries(FINGERTIP_INDICES)) {
      if (i === tipIdx) {
        const fingerEval = evaluation?.fingers[finger as FingerName];
        if (!isPassing && fingerEval && !fingerEval.passed) {
          dotColor = tokens.colors.overlayNeedsAttention;
          strokeColor = tokens.colors.overlayNeedsAttention;
        }
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw Attention Callout on Failing Fingertip
  if (!isPassing && evaluation?.topIssue?.finger) {
    const failingFinger = evaluation.topIssue.finger;
    const tipIdx = FINGERTIP_INDICES[failingFinger];
    const tipPoint = landmarks[tipIdx];

    if (tipPoint) {
      const cx = tipPoint.x * width;
      const cy = tipPoint.y * height;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = tokens.colors.overlayNeedsAttention;
      ctx.lineWidth = 2;
      ctx.stroke();

      const label = FINGER_LABELS[failingFinger] ?? failingFinger;
      ctx.font = '600 12px Inter, sans-serif';
      const textMetrics = ctx.measureText(label);
      const padding = 6;
      const bubbleW = textMetrics.width + padding * 2;
      const bubbleH = 22;
      const bx = cx - bubbleW / 2;
      const by = cy - 24;

      ctx.fillStyle = 'rgba(22, 24, 26, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 4);
      ctx.fill();
      ctx.strokeStyle = tokens.colors.overlayNeedsAttention;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, bx + padding, by + 15);
      ctx.restore();
    }
  }
}
