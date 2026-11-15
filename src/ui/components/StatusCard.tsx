import { tokens } from '../tokens';
import { InfoCircleIcon } from '../icons';

interface StatusCardProps {
  reason: string | null;
  customMessage?: string;
  onRetry?: () => void;
  actionText?: string;
  onAction?: () => void;
  isTouch?: boolean;
}

interface StatusDetails {
  title: string;
  message: string;
  showButton?: boolean;
  buttonLabel?: string;
}

function getStatusDetails(reason: string | null, customMessage?: string): StatusDetails {
  switch (reason) {
    case 'tracking_failed':
    case 'hand_tracking_missing':
      return {
        title: 'Hand tracking files are missing',
        message: 'Reinstall the app.',
        showButton: false,
      };
    case 'camera_changed':
      return {
        title: 'Your camera changed',
        message: customMessage || 'Switched to the default camera.',
        showButton: false,
      };
    case 'camera_disconnected':
      return {
        title: 'Camera disconnected',
        message: 'Choose a camera.',
        showButton: true,
        buttonLabel: 'Choose a camera',
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

export function StatusCard({
  reason,
  customMessage,
  onRetry,
  actionText,
  onAction,
  isTouch = false,
}: StatusCardProps) {
  const details = getStatusDetails(reason, customMessage);
  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

  const handleButtonClick = onAction || onRetry;
  const buttonLabel = actionText || details.buttonLabel || 'Try again';

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
          {details.title}
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
          }}
        >
          {details.message}
        </div>
        {(details.showButton || onAction || (details.showButton && onRetry)) && handleButtonClick && (
          <button
            type="button"
            onClick={handleButtonClick}
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
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
