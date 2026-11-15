import { tokens } from '../tokens';
import { InfoCircleIcon } from '../icons';

interface StatusCardProps {
  reason: string | null;
  onRetry?: () => void;
  isTouch?: boolean;
}

interface StatusDetails {
  title: string;
  message: string;
  showRetry?: boolean;
}

function getStatusDetails(reason: string | null): StatusDetails {
  switch (reason) {
    case 'tracking_failed':
      return {
        title: "Hand tracking couldn't load",
        message: 'Check your connection and try again.',
        showRetry: true,
      };
    case 'two_hands_detected':
      return {
        title: "Can't check this yet",
        message: 'Use one hand for now.',
      };
    case 'slow_camera':
      return {
        title: "Can't check this yet",
        message: 'Camera is running slowly. Try closing other tabs.',
      };
    case 'turn_palm_toward_camera':
      return {
        title: "Can't check this yet",
        message: 'Turn your palm toward the camera.',
      };
    case 'hand_moving_too_fast':
      return {
        title: "Can't check this yet",
        message: 'Hold still for a moment.',
      };
    case 'low_detection_confidence':
      return {
        title: "Can't check this yet",
        message: 'Move into better lighting.',
      };
    case 'hand_too_far':
      return {
        title: "Can't check this yet",
        message: 'Move closer to the camera.',
      };
    case 'hand_too_close':
      return {
        title: "Can't check this yet",
        message: 'Move slightly back from the camera.',
      };
    case 'hand_out_of_frame':
      return {
        title: "Can't check this yet",
        message: 'Bring your whole hand into view.',
      };
    case 'no_hand_detected':
    default:
      return {
        title: "Can't check this yet",
        message: 'Show your hand to the camera.',
      };
  }
}

export function StatusCard({ reason, onRetry, isTouch = false }: StatusCardProps) {
  const { title, message, showRetry } = getStatusDetails(reason);
  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

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
        <InfoCircleIcon size={22} color={tokens.colors.ink} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: tokens.colors.ink,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
          }}
        >
          {message}
        </div>
        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary"
            style={{
              height: btnHeight,
              padding: '0 16px',
              borderRadius: tokens.shape.radiusControl,
              fontSize: '13px',
              fontWeight: 600,
              alignSelf: 'flex-start',
              marginTop: '6px',
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
