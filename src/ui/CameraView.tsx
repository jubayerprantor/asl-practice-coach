import { useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import type {
  CameraPermissionState,
  LatestHandFrame,
} from './trackingTypes';
import { drawDiagnosticHandOverlay } from './skeletonRenderer';
import {
  HandLandmarkSmoother,
  SignEvaluatorSession,
  type EvaluationResult,
  type SignPackBundle,
} from '../engine';

interface CameraViewProps {
  /** Target inference rate in frames per second (default: 30 FPS) */
  targetFps?: number;
  targetSign?: string;
  pack?: SignPackBundle;
  onEvaluationChange?: (result: EvaluationResult) => void;
  /** Optional ref exposed to parent/engine consumers without triggering re-renders */
  externalFrameRef?: React.MutableRefObject<LatestHandFrame>;
}

export function CameraView({
  targetFps = 30,
  targetSign,
  pack,
  onEvaluationChange,
  externalFrameRef,
}: CameraViewProps) {
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [fpsDisplay, setFpsDisplay] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Engine evaluation & smoothing refs
  const smootherRef = useRef<HandLandmarkSmoother>(new HandLandmarkSmoother());
  const evaluatorRef = useRef<SignEvaluatorSession>(new SignEvaluatorSession());
  const lastEmittedEvalRef = useRef<EvaluationResult | null>(null);
  const lastEvalEmitTimeRef = useRef<number>(0);

  // Per-frame detection data lives strictly in a ref (never React state)
  const internalFrameRef = useRef<LatestHandFrame>({
    landmarks: null,
    worldLandmarks: null,
    rawHandedness: null,
    anatomicalHandedness: null,
    score: 0,
    timestampMs: 0,
  });
  const activeFrameRef = externalFrameRef ?? internalFrameRef;

  // Timing & FPS tracking refs
  const lastInferTimeRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsWindowStartRef = useRef<number>(performance.now());
  const fpsFrameCountRef = useRef<number>(0);

  // Reset evaluation state on targetSign change
  useEffect(() => {
    evaluatorRef.current.reset();
    smootherRef.current.reset();
    lastEmittedEvalRef.current = null;
  }, [targetSign]);

  // 1. Initialize MediaPipe HandLandmarker once
  useEffect(() => {
    let cancelled = false;

    async function initLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          '/mediapipe/wasm'
        );
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
        setModelReady(true);
      } catch (err) {
        if (!cancelled) {
          setPermissionState('error');
          setErrorMessage(
            err instanceof Error
              ? `Hand tracking model failed to load: ${err.message}`
              : 'Hand tracking model failed to load.'
          );
        }
      }
    }

    initLandmarker();

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // 2. Manage webcam stream lifecycle & throttled detection loop
  useEffect(() => {
    let active = true;

    function stopStream() {
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
      activeFrameRef.current = {
        landmarks: null,
        worldLandmarks: null,
        rawHandedness: null,
        anatomicalHandedness: null,
        score: 0,
        timestampMs: 0,
      };
      setFpsDisplay(0);
      smootherRef.current.reset();
      evaluatorRef.current.reset();
      lastEmittedEvalRef.current = null;
    }

    if (!cameraEnabled) {
      stopStream();
      setPermissionState('idle');
      return;
    }

    async function startCameraAndLoop() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('error');
        setErrorMessage('Webcam API is not supported in this browser.');
        return;
      }

      setPermissionState('requesting');
      setErrorMessage('');

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
        setPermissionState('granted');

        const minFrameIntervalMs = 1000 / targetFps;
        fpsWindowStartRef.current = performance.now();
        fpsFrameCountRef.current = 0;

        const processFrame = (now: number) => {
          if (!active) return;
          rafIdRef.current = requestAnimationFrame(processFrame);

          // Throttle inference rate
          if (now - lastInferTimeRef.current < minFrameIntervalMs) {
            return;
          }

          const landmarker = landmarkerRef.current;
          if (
            !landmarker ||
            video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            return;
          }

          // Only run detection when the video element actually produced a new frame
          if (video.currentTime === lastVideoTimeRef.current) {
            return;
          }
          lastVideoTimeRef.current = video.currentTime;
          lastInferTimeRef.current = now;

          const result = landmarker.detectForVideo(video, now);
          const detectedLandmarks = result.landmarks?.[0] ?? null;
          const detectedWorld = result.worldLandmarks?.[0] ?? null;
          const category = result.handednesses?.[0]?.[0];

          const rawHand =
            category?.categoryName === 'Left' ||
            category?.categoryName === 'Right'
              ? category.categoryName
              : null;

          // Mirrored webcam flips MediaPipe's raw Left/Right classification
          const anatomicalHand =
            rawHand === 'Left'
              ? 'Right'
              : rawHand === 'Right'
              ? 'Left'
              : null;

          activeFrameRef.current = {
            landmarks: detectedLandmarks,
            worldLandmarks: detectedWorld,
            rawHandedness: rawHand,
            anatomicalHandedness: anatomicalHand,
            score: category?.score ?? 0,
            timestampMs: now,
          };

          let latestEval: EvaluationResult | null = null;

          if (targetSign && pack) {
            const smoothedLandmarks = detectedLandmarks
              ? smootherRef.current.filter(detectedLandmarks, now)
              : null;

            if (!detectedLandmarks) {
              smootherRef.current.reset();
            }

            latestEval = evaluatorRef.current.evaluateFrame(
              {
                landmarks: smoothedLandmarks,
                handedness: anatomicalHand ?? 'Right',
                mediaPipeScore: category?.score ?? 0,
                timestampMs: now,
              },
              targetSign,
              pack
            );

            // Notify parent UI only on meaningful state transitions or ~10Hz for hold progress
            const prev = lastEmittedEvalRef.current;
            const stateChanged =
              !prev ||
              prev.status !== latestEval.status ||
              prev.unableReason !== latestEval.unableReason ||
              prev.topIssue?.ruleId !== latestEval.topIssue?.ruleId ||
              prev.hold.completed !== latestEval.hold.completed;

            if (stateChanged || now - lastEvalEmitTimeRef.current >= 100) {
              lastEmittedEvalRef.current = latestEval;
              lastEvalEmitTimeRef.current = now;
              onEvaluationChange?.(latestEval);
            }
          }

          // Render accessible per-finger skeleton overlay
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
              drawDiagnosticHandOverlay(
                ctx,
                canvas.width,
                canvas.height,
                detectedLandmarks,
                latestEval
              );
            }
          }

          // Update FPS readout every 500ms without per-frame React state churn
          fpsFrameCountRef.current += 1;
          const elapsed = now - fpsWindowStartRef.current;
          if (elapsed >= 500) {
            setFpsDisplay(
              Math.round((fpsFrameCountRef.current * 1000) / elapsed)
            );
            fpsWindowStartRef.current = now;
            fpsFrameCountRef.current = 0;
          }
        };

        rafIdRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (!active) return;
        if (
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError')
        ) {
          setPermissionState('denied');
          setErrorMessage(
            'Camera permission was denied. Enable camera access in your browser site settings and turn the camera back on.'
          );
        } else {
          setPermissionState('error');
          setErrorMessage(
            err instanceof Error
              ? `Unable to access webcam: ${err.message}`
              : 'Unable to access webcam.'
          );
        }
      }
    }

    startCameraAndLoop();

    return () => {
      active = false;
      stopStream();
    };
  }, [cameraEnabled, targetFps, targetSign, pack, onEvaluationChange, activeFrameRef]);

  return (
    <section
      aria-label="Webcam hand tracking view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '640px',
      }}
    >
      {/* Top control bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <button
          type="button"
          onClick={() => setCameraEnabled((prev) => !prev)}
          aria-pressed={cameraEnabled}
          style={{
            padding: '0.55rem 1rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: cameraEnabled ? '#dc2626' : '#0284c7',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {cameraEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>

        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
          {modelReady ? 'Tracking model ready' : 'Loading tracking model...'}
        </span>
      </div>

      {/* Mirrored Video + Canvas Stage */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Mirrored container ensures video and canvas never drift */}
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
              display:
                cameraEnabled && permissionState === 'granted'
                  ? 'block'
                  : 'none',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              display:
                cameraEnabled && permissionState === 'granted'
                  ? 'block'
                  : 'none',
            }}
          />
        </div>

        {/* Unmirrored Debug FPS Corner */}
        {cameraEnabled && permissionState === 'granted' && (
          <div
            aria-label="Tracking frame rate"
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          >
            {fpsDisplay} FPS
          </div>
        )}

        {/* Camera Off / Requesting / Permission Denied States */}
        {!cameraEnabled && (
          <div style={overlayMessageStyle}>
            <strong>Camera is off</strong>
            <span>Select "Turn Camera On" to begin local hand tracking.</span>
          </div>
        )}

        {cameraEnabled && permissionState === 'requesting' && (
          <div style={overlayMessageStyle}>
            <strong>Requesting webcam permission...</strong>
            <span>All video stays on your device.</span>
          </div>
        )}

        {cameraEnabled &&
          (permissionState === 'denied' || permissionState === 'error') && (
            <div role="alert" style={overlayMessageStyle}>
              <strong>
                {permissionState === 'denied'
                  ? 'Camera Permission Denied'
                  : 'Camera Unavailable'}
              </strong>
              <span>{errorMessage}</span>
            </div>
          )}
      </div>
    </section>
  );
}

const overlayMessageStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '1.5rem',
  textAlign: 'center',
  color: '#f8fafc',
  backgroundColor: '#0f172a',
};
