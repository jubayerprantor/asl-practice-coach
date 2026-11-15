import { tokens } from './tokens';
import { InfoCircleIcon } from './icons';
import type { UnableToEvaluateReason } from '../engine/evaluateTypes';

interface StatusCardProps {
  reason: UnableToEvaluateReason | null;
}

function getReasonMessage(reason: UnableToEvaluateReason | null): string {
  switch (reason) {
    case 'turn_palm_toward_camera':
      return 'Turn your palm toward the camera.';
    case 'hand_moving_too_fast':
      return 'Hold still for a moment.';
    case 'low_detection_confidence':
      return 'Move into better lighting.';
    case 'hand_too_far':
    case 'hand_too_close':
    case 'hand_out_of_frame':
    case 'no_hand_detected':
    default:
      return 'Bring your whole hand into view.';
  }
}

export function StatusCard({ reason }: StatusCardProps) {
  const message = getReasonMessage(reason);

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        backgroundColor: tokens.colors.statusCardFill,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.statusCardBorder}`,
        borderRadius: tokens.shape.radiusCard,
        padding: '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
        <InfoCircleIcon size={20} color={tokens.colors.ink} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: tokens.colors.ink,
            lineHeight: 1.3,
          }}
        >
          Can't check this yet
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
