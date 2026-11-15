import { tokens } from '../tokens';

interface TargetSignProps {
  sign: string;
  showReference: boolean;
  onToggleReference: () => void;
  isTouch?: boolean;
}

export function TargetSign({
  sign,
  showReference,
  onToggleReference,
  isTouch = false,
}: TargetSignProps) {
  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      <div
        style={{
          ...tokens.typography.sectionLabel,
          color: tokens.colors.mutedText,
        }}
      >
        TARGET SIGN
      </div>
      <div
        style={{
          ...tokens.typography.targetLetter,
          color: tokens.colors.ink,
        }}
        aria-label={`Target sign ${sign}`}
      >
        {sign}
      </div>
      <button
        type="button"
        onClick={onToggleReference}
        aria-pressed={showReference}
        className="btn-outlined"
        style={{
          height: btnHeight,
          padding: '0 16px',
          borderRadius: tokens.shape.radiusButton,
          fontSize: tokens.typography.statusText.fontSize,
          fontWeight: 600,
          marginTop: '4px',
        }}
      >
        {showReference ? 'Hide reference' : 'Show reference'}
      </button>
    </div>
  );
}
