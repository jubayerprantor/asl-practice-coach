import type { EvaluationResult } from '../engine';

interface CameraSetupCheckProps {
  evaluation: EvaluationResult | null;
  dismissed: boolean;
  onDismiss: () => void;
  onReopen: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  guidance: string;
  passed: boolean;
}

export function CameraSetupCheck({
  evaluation,
  dismissed,
  onDismiss,
  onReopen,
}: CameraSetupCheckProps) {
  if (dismissed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onReopen}
          style={{
            padding: '0.35rem 0.7rem',
            borderRadius: '6px',
            border: '1px solid #94a3b8',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ? Camera Setup Guide
        </button>
      </div>
    );
  }

  const reason = evaluation?.unableReason ?? null;
  const handDetected = evaluation !== null && reason !== 'no_hand_detected';

  const checks: CheckItem[] = [
    {
      id: 'framing',
      label: 'Hand Inside Frame',
      guidance: 'Keep your wrist and all five fingertips inside the camera box.',
      passed: handDetected && reason !== 'hand_out_of_frame',
    },
    {
      id: 'distance',
      label: 'Comfortable Distance',
      guidance: 'Sit roughly arm’s length from the webcam (not too close or far).',
      passed:
        handDetected &&
        reason !== 'hand_too_far' &&
        reason !== 'hand_too_close',
    },
    {
      id: 'palm',
      label: 'Palm Facing Camera',
      guidance: 'Face your palm toward the lens so fingers do not hide each other.',
      passed: handDetected && reason !== 'turn_palm_toward_camera',
    },
    {
      id: 'lighting',
      label: 'Clear Lighting & Stability',
      guidance: 'Face a front light source (avoid bright windows behind you) and hold steady.',
      passed:
        handDetected &&
        reason !== 'low_detection_confidence' &&
        reason !== 'hand_moving_too_fast',
    },
  ];

  const allReady = checks.every((c) => c.passed);

  return (
    <section
      aria-label="Pre-practice camera setup check"
      style={{
        padding: '0.9rem 1rem',
        borderRadius: '8px',
        backgroundColor: allReady ? '#ecfdf5' : '#f8fafc',
        border: allReady ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
          {allReady
            ? '✓ Camera Framing & Lighting Ready'
            : 'Camera Setup & Framing Check'}
        </strong>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {allReady ? 'Start Practicing (Hide Guide)' : 'Dismiss Guide'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {checks.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '0.55rem 0.7rem',
              borderRadius: '6px',
              backgroundColor: item.passed ? '#d1fae5' : '#ffffff',
              border: item.passed
                ? '1px solid #10b981'
                : '1px solid #cbd5e1',
              fontSize: '0.83rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a' }}>
              {item.passed ? '✓' : '○'} {item.label}
            </div>
            <div style={{ color: '#334155', marginTop: '0.2rem' }}>
              {item.guidance}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
