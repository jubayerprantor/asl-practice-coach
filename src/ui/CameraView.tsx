import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type {
  CameraPermissionState,
  LatestHandFrame,
} from './trackingTypes';

// Standard 21-point MediaPipe hand skeleton connections
const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // Pinky & palm base
];

interface CameraViewProps {
  /** Target inference rate in frames per second (default: 30 FPS) */
  targetFps?: number;
  /** Optional ref exposed to parent/engine consumers without triggering re-renders */
  externalFrameRef?: React.MutableRefObject<LatestHandFrame>;
}

export function CameraView({
  targetFps = 30,
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

  // Draw landmarks & connections onto canvas matching video intrinsic dimensions
  const drawOverlay = useCallback((result: HandLandmarkerResult | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    if (
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const landmarks = result?.landmarks?.[0];
    if (!landmarks || landmarks.length === 0) return;

    // Draw bone connections
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) continue;

      ctx.beginPath();
      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
      ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
      ctx.stroke();
    }

    // Draw 21 landmark joints
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const x = pt.x * canvas.width;
      const y = pt.y * canvas.height;

      ctx.beginPath();
      ctx.arc(x, y, i === 0 ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#f59e0b' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }
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

          drawOverlay(result);

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
  }, [cameraEnabled, targetFps, drawOverlay, activeFrameRef]);

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
