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
} from '../engine';
import type { SignReferenceEntry } from '../packs/schema';
import { tokens } from './tokens';

interface CameraPanelProps {
  cameraEnabled: boolean;
  targetSign: string | null;
  pack: SignPackBundle;
  referenceEntry?: SignReferenceEntry;
  showReferenceInset?: boolean;
  onEvaluationChange?: (result: EvaluationResult) => void;
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
  pinky: 'Little', // Guideline: "five rows (Thumb, Index, Middle, Ring, Little)"
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
  onEvaluationChange,
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

  const [handState, setHandState] = useState<{
    detected: boolean;
    handedness: AnatomicalHandedness | null;
    statusText: string;
    isPassing: boolean;
  }>({
    detected: false,
    handedness: null,
    statusText: 'Camera ready',
    isPassing: false,
  });

  // 1. Initialize MediaPipe HandLandmarker once
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      } catch (err) {
        console.error('Failed to initialize HandLandmarker:', err);
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
  }, []);

  // Reset evaluator when sign changes
  useEffect(() => {
    evaluatorRef.current.reset();
    smootherRef.current.reset();
    lastEmittedEvalRef.current = null;
  }, [targetSign]);

  // 2. Camera feed & throttled detection loop
  useEffect(() => {
    let active = true;

    function stop() {
      if (rafIdRef.current !== null) {
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
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHandState({
        detected: false,
        handedness: null,
        statusText: 'Camera is off',
        isPassing: false,
      });
      smootherRef.current.reset();
      evaluatorRef.current.reset();
      lastEmittedEvalRef.current = null;
    }

    if (!cameraEnabled) {
      stop();
      return;
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
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
                landmarks: smoothed,
                handedness: anatomicalHand ?? 'Right',
                mediaPipeScore: category?.score ?? 0,
                timestampMs: now,
              },
              targetSign,
              pack
            );

            const prev = lastEmittedEvalRef.current;
            const changed =
              !prev ||
              prev.status !== currentEval.status ||
              prev.unableReason !== currentEval.unableReason ||
              prev.topIssue?.ruleId !== currentEval.topIssue?.ruleId ||
              prev.hold.completed !== currentEval.hold.completed;

            if (changed || now - lastEvalEmitTimeRef.current >= 100) {
              lastEmittedEvalRef.current = currentEval;
              lastEvalEmitTimeRef.current = now;
              onEvaluationChange?.(currentEval);
            }
          }

          // Compute top-left status chip
          if (!detectedLandmarks) {
            setHandState({
              detected: false,
              handedness: null,
              statusText: 'No hand detected',
              isPassing: false,
            });
          } else if (currentEval?.status === 'unable_to_evaluate') {
            let reasonText = "Can't check this yet";
            if (currentEval.unableReason === 'hand_too_far') {
              reasonText = 'Hand too small in frame';
            } else if (currentEval.unableReason === 'hand_too_close') {
              reasonText = 'Hand too close to camera';
            } else if (currentEval.unableReason === 'hand_out_of_frame') {
              reasonText = 'Hand out of frame';
            } else if (currentEval.unableReason === 'turn_palm_toward_camera') {
              reasonText = 'Turn palm toward camera';
            } else if (currentEval.unableReason === 'hand_moving_too_fast') {
              reasonText = 'Hold hand steady';
            } else if (currentEval.unableReason === 'low_detection_confidence') {
              reasonText = 'Low tracking confidence';
            }
            setHandState({
              detected: true,
              handedness: anatomicalHand,
              statusText: reasonText,
              isPassing: false,
            });
          } else {
            setHandState({
              detected: true,
              handedness: anatomicalHand,
              statusText: `${anatomicalHand ?? 'Hand'} detected`,
              isPassing: currentEval?.status === 'correct',
            });
          }

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
              drawOverlay(ctx, canvas.width, canvas.height, detectedLandmarks, currentEval);
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
  }, [cameraEnabled, targetSign, pack, onEvaluationChange]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '600px',
        backgroundColor: tokens.colors.cameraSurface,
        borderRadius: tokens.shape.radiusPanel,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
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
            backgroundColor: handState.isPassing
              ? tokens.colors.overlayPassing
              : 'transparent',
            border: handState.isPassing
              ? 'none'
              : `1.5px solid ${
                  handState.detected
                    ? tokens.colors.overlayNeedsAttention
                    : tokens.colors.overlayNeutral
                }`,
            display: 'inline-block',
          }}
        />
        <span>
          {handState.isPassing
            ? 'Passing'
            : handState.detected
            ? 'Needs attention'
            : 'Searching for hand'}
        </span>
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
            gap: '12px',
          }}
        >
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
              style={{
                height: tokens.shape.buttonHeight,
                padding: '0 16px',
                borderRadius: tokens.shape.radiusControl,
                border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.ink,
                fontSize: tokens.typography.statusText.fontSize,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Turn camera on
            </button>
          )}
        </div>
      )}

      {/* Learn Mode: ReferenceInset at bottom-left */}
      {showReferenceInset && referenceEntry && referenceEntry.canonicalLandmarks && (
        <ReferenceInset
          landmarks={referenceEntry.canonicalLandmarks}
        />
      )}
    </div>
  );
}

/**
 * Draws the clean 21-landmark skeleton overlay strictly matching Section 4:
 * - Passing fingers: solid line in overlayPassing (#5EE0C0).
 * - Fingers needing attention: dashed line in overlayNeedsAttention (#FFB020) + upright text label next to fingertip.
 * - Not-checked state (unable_to_evaluate): whole skeleton neutral gray (#8A9096), no labels.
 * - Joint dots white; fingertips slightly larger.
 */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: readonly Vec3[] | null,
  evaluation: EvaluationResult | null
) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 21) return;

  const isEvaluable =
    evaluation !== null && evaluation.status !== 'unable_to_evaluate';

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
    const isPassing = isEvaluable ? Boolean(fingerRes?.passed) : false;

    let strokeColor: string = tokens.colors.overlayNeutral;
    let dashed = false;

    if (isEvaluable) {
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
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash(dashed ? [6, 6] : []);

    for (const [a, b] of FINGER_BONES[finger]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
      ctx.stroke();
    }
    ctx.restore();

    // If needing attention, draw fingertip text label (e.g. "Index")
    if (isEvaluable && !isPassing) {
      const tipIdx = FINGERTIP_INDICES[finger];
      const tipPt = landmarks[tipIdx];
      const tipX = tipPt.x * width;
      const tipY = tipPt.y * height;

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.scale(-1, 1); // Counter-flip for CSS scaleX(-1) mirror

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

  // 3. Joint dots (white; fingertips slightly larger)
  for (let idx = 0; idx < 21; idx++) {
    const pt = landmarks[idx];
    const isFingertip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
    const radius = isFingertip ? 5 : idx === 0 ? 4 : 3;

    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}

/**
 * Small light card on bottom-left of camera panel (Learn mode only)
 */
function ReferenceInset({
  landmarks,
}: {
  landmarks: Array<{ x: number; y: number; z: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || landmarks.length !== 21) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const spanX = Math.max(0.05, maxX - minX);
    const spanY = Math.max(0.05, maxY - minY);
    const pad = 10;
    const scale = Math.min((canvas.width - pad * 2) / spanX, (canvas.height - pad * 2) / spanY);
    const offsetX = (canvas.width - spanX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - spanY * scale) / 2 - minY * scale;

    const toPx = (pt: { x: number; y: number }) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY,
    });

    // Palm bridge
    ctx.strokeStyle = '#5C6166';
    ctx.lineWidth = 1.5;
    for (const [a, b] of PALM_BRIDGES) {
      const pA = toPx(landmarks[a]);
      const pB = toPx(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }

    // Fingers
    (Object.keys(FINGER_BONES) as FingerName[]).forEach((finger) => {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const [a, b] of FINGER_BONES[finger]) {
        const pA = toPx(landmarks[a]);
        const pB = toPx(landmarks[b]);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
    });

    // Joint dots
    landmarks.forEach((pt, idx) => {
      const p = toPx(pt);
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 0 ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#BDBFBA';
      ctx.fill();
    });
  }, [landmarks]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        width: '140px',
        height: '140px',
        zIndex: 10,
        backgroundColor: 'rgba(24, 27, 30, 0.85)',
        borderRadius: '12px',
        padding: '10px',
        border: `1px solid ${tokens.colors.secondaryBody}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: tokens.colors.overlayNeutral,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Reference
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={96}
        style={{
          width: '120px',
          height: '96px',
          display: 'block',
        }}
      />
    </div>
  );
}
