import { useCallback, useEffect, useRef, useState } from 'react';
import {
  distanceVec3,
  normalizeHand,
  type AnatomicalHandedness,
  type Vec3,
} from '../engine';
import type { LandmarkSample } from '../data/schema';
import { cameraService } from '../services/camera';
import { handTrackingService } from '../services/handTracking';
import type { LatestHandFrame } from '../ui/trackingTypes';
import {
  buildRealHumanDatasetExport,
  clearAllRecordedClips,
  deleteRecordedClip,
  getAllRecordedClips,
  saveRecordedClip,
  type RecordedClipRecord,
} from './recorderDb';

const TARGET_STABLE_FRAMES = 30;
const MAX_INTERFRAME_DRIFT_NORM = 0.06;
const MIN_CAPTURE_CONFIDENCE = 0.75;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function LandmarkRecorder() {
  const [participantId, setParticipantId] = useState<string>('P01');
  const [label, setLabel] = useState<string>('A');
  const [hand, setHand] = useState<AnatomicalHandedness>('Right');
  const [intendedError, setIntendedError] = useState<string>('');
  const [consentChecked, setConsentChecked] = useState<boolean>(false);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [capturedCount, setCapturedCount] = useState<number>(0);
  const [captureHint, setCaptureHint] = useState<string>(
    'Confirm consent and enter anonymous Participant ID to begin.'
  );
  const [clips, setClips] = useState<RecordedClipRecord[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<LatestHandFrame>({
    landmarks: null,
    worldLandmarks: null,
    rawHandedness: null,
    anatomicalHandedness: null,
    score: 0,
    timestampMs: 0,
  });

  const bufferRef = useRef<LandmarkSample[]>([]);
  const prevNormRef = useRef<Vec3[] | null>(null);
  const lastSeenTimestampRef = useRef<number>(0);

  // Subscribe to singleton CameraService and HandTrackingService
  useEffect(() => {
    let active = true;
    cameraService.start().catch(() => {});
    handTrackingService.start();

    const unsubStream = cameraService.subscribeStream((stream) => {
      if (!active) return;
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        if (stream) {
          videoRef.current.play().catch(() => {});
        }
      }
    });

    const unsubLandmarks = handTrackingService.subscribe((frame) => {
      if (!active) return;
      frameRef.current = {
        landmarks: frame.landmarks ? [...frame.landmarks] : null,
        worldLandmarks: frame.worldLandmarks ? [...frame.worldLandmarks] : null,
        rawHandedness: frame.handedness === 'Right' ? 'Left' : frame.handedness === 'Left' ? 'Right' : null,
        anatomicalHandedness: frame.handedness ?? null,
        score: frame.confidence ?? 0,
        timestampMs: frame.timestampMs ?? performance.now(),
      };
    });

    return () => {
      active = false;
      unsubStream();
      unsubLandmarks();
      handTrackingService.stop();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const refreshClips = useCallback(async () => {
    try {
      const all = await getAllRecordedClips();
      setClips(all);
    } catch {
      setClips([]);
    }
  }, []);

  useEffect(() => {
    refreshClips();
  }, [refreshClips]);

  // Poll frameRef while recording until 30 stable landmark frames are collected
  useEffect(() => {
    if (!isRecording) return;

    const cleanPid = participantId.trim() || 'ANON';
    const cleanLabel = label.trim().toUpperCase() || 'A';
    const cleanError = intendedError.trim() || null;
    const clipId = `${cleanPid}_${cleanLabel}_${hand}_${Date.now()}`;

    bufferRef.current = [];
    prevNormRef.current = null;
    lastSeenTimestampRef.current = 0;
    setCapturedCount(0);

    const intervalId = window.setInterval(async () => {
      const frame = frameRef.current;
      if (
        !frame.landmarks ||
        frame.landmarks.length !== 21 ||
        frame.timestampMs === lastSeenTimestampRef.current
      ) {
        return;
      }
      lastSeenTimestampRef.current = frame.timestampMs;

      if (frame.score < MIN_CAPTURE_CONFIDENCE) {
        setCaptureHint('Waiting for higher MediaPipe tracking confidence...');
        return;
      }

      if (
        frame.anatomicalHandedness &&
        frame.anatomicalHandedness !== hand
      ) {
        setCaptureHint(
          `Detected ${frame.anatomicalHandedness} hand — switch Hand setting or raise your ${hand} hand.`
        );
        return;
      }

      const norm = normalizeHand(frame.landmarks, hand);
      if (prevNormRef.current) {
        let drift = 0;
        for (let i = 0; i < 21; i++) {
          drift += distanceVec3(norm[i], prevNormRef.current[i]);
        }
        drift /= 21;
        if (drift > MAX_INTERFRAME_DRIFT_NORM) {
          setCaptureHint('Hold hand steady to capture stable frames...');
          prevNormRef.current = norm;
          return;
        }
      }
      prevNormRef.current = norm;

      const idx = bufferRef.current.length + 1;
      bufferRef.current.push({
        id: `real-human:${clipId}:${String(idx).padStart(2, '0')}`,
        label: cleanLabel,
        sourceDataset: 'real-human-test-set',
        subjectId: cleanPid,
        handedness: hand,
        confidence: Number(frame.score.toFixed(4)),
        landmarks: frame.landmarks.map((pt) => ({
          x: Number(pt.x.toFixed(6)),
          y: Number(pt.y.toFixed(6)),
          z: Number(pt.z.toFixed(6)),
        })),
        intendedError: cleanError,
        clipId,
      });

      setCapturedCount(bufferRef.current.length);
      setCaptureHint(
        `Capturing stable landmark frames (${bufferRef.current.length}/${TARGET_STABLE_FRAMES})...`
      );

      if (bufferRef.current.length >= TARGET_STABLE_FRAMES) {
        window.clearInterval(intervalId);
        setIsRecording(false);

        const completedClip: RecordedClipRecord = {
          clipId,
          participantId: cleanPid,
          label: cleanLabel,
          handedness: hand,
          intendedError: cleanError,
          recordedAt: new Date().toISOString(),
          samples: [...bufferRef.current],
        };

        await saveRecordedClip(completedClip);
        await refreshClips();
        setCaptureHint(
          `✓ Saved 30 landmark frames for "${cleanLabel}" (${cleanPid}, ${hand}${
            cleanError ? `, error: ${cleanError}` : ''
          }).`
        );
      }
    }, 33);

    return () => window.clearInterval(intervalId);
  }, [isRecording, participantId, label, hand, intendedError, refreshClips]);

  const handleExportJson = () => {
    const payload = buildRealHumanDatasetExport(clips);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `real-human-landmarks-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="Real-human landmark test recorder"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '960px',
      }}
    >
      {/* Privacy & Protocol Notice */}
      <div
        role="note"
        style={{
          padding: '0.9rem 1rem',
          borderRadius: '8px',
          backgroundColor: '#fefce8',
          border: '1.5px solid #eab308',
          color: '#713f12',
          fontSize: '0.9rem',
        }}
      >
        <strong>Landmarks-Only Research Recorder (No Video Saved):</strong>{' '}
        This tool extracts 21-point hand coordinates locally in IndexedDB and
        never saves or transmits webcam video or images. Review{' '}
        <code>/docs/test-protocol.md</code> and verify IRB / institutional
        approval before collecting data from participants.
      </div>

      {/* Consent Confirmation */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
        />
        Participant has reviewed the protocol and provided informed consent
        (anonymous ID only).
      </label>

      {/* Metadata Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
        }}
      >
        <label style={fieldLabelStyle}>
          <span>Anonymous Participant ID</span>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="e.g., P01"
            style={inputStyle}
          />
        </label>

        <label style={fieldLabelStyle}>
          <span>Target Sign Label</span>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
          >
            {LETTERS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldLabelStyle}>
          <span>Signing Hand</span>
          <select
            value={hand}
            onChange={(e) => setHand(e.target.value as AnatomicalHandedness)}
            style={inputStyle}
          >
            <option value="Right">Right</option>
            <option value="Left">Left</option>
          </select>
        </label>

        <label style={fieldLabelStyle}>
          <span>Intended Error (Optional)</span>
          <input
            type="text"
            value={intendedError}
            onChange={(e) => setIntendedError(e.target.value)}
            placeholder="Leave blank if correct, e.g. ring_extended"
            style={inputStyle}
          />
        </label>
      </div>

      {/* Record Trigger + Progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          disabled={!consentChecked || isRecording || !participantId.trim()}
          onClick={() => setIsRecording(true)}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: !consentChecked
              ? '#94a3b8'
              : isRecording
              ? '#d97706'
              : '#0284c7',
            color: '#ffffff',
            fontWeight: 700,
            cursor:
              !consentChecked || isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          {isRecording
            ? `Recording (${capturedCount}/${TARGET_STABLE_FRAMES})...`
            : 'Record 30 Stable Frames'}
        </button>

        {isRecording && (
          <button
            type="button"
            onClick={() => setIsRecording(false)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #dc2626',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}

        <span role="status" style={{ fontSize: '0.9rem', color: '#334155' }}>
          {captureHint}
        </span>
      </div>

      {/* Live Camera Feed */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          aspectRatio: '4 / 3',
          backgroundColor: '#16181A',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            transform: 'scaleX(-1)',
          }}
        />
      </div>

      {/* Recorded Clips Summary & JSON Export */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <strong>
            Recorded Clips in Local IndexedDB: {clips.length} (
            {clips.length * TARGET_STABLE_FRAMES} frames)
          </strong>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              disabled={clips.length === 0}
              onClick={handleExportJson}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: clips.length === 0 ? '#94a3b8' : '#047857',
                color: '#ffffff',
                fontWeight: 700,
                cursor: clips.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Export Landmarks JSON
            </button>

            <button
              type="button"
              disabled={clips.length === 0}
              onClick={async () => {
                await clearAllRecordedClips();
                await refreshClips();
              }}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #dc2626',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                fontWeight: 600,
                cursor: clips.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Clear All Clips
            </button>
          </div>
        </div>

        {clips.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.86rem' }}>
            {clips.map((c) => (
              <li
                key={c.clipId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.25rem 0',
                }}
              >
                <span>
                  <strong>{c.participantId}</strong> • Sign{' '}
                  <strong>{c.label}</strong> ({c.handedness})
                  {c.intendedError ? ` — Intended error: "${c.intendedError}"` : ' — Clean target'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteRecordedClip(c.clipId);
                    await refreshClips();
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: '#334155',
};

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.6rem',
  borderRadius: '6px',
  border: '1px solid #94a3b8',
  fontSize: '0.92rem',
};
