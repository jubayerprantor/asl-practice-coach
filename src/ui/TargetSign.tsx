import { tokens } from './tokens';

interface TargetSignProps {
  sign: string;
  showReference: boolean;
  onToggleReference: () => void;
}

export function TargetSign({
  sign,
  showReference,
  onToggleReference,
}: TargetSignProps) {
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
          marginTop: '4px',
        }}
      >
        {showReference ? 'Hide reference' : 'Show reference'}
      </button>
    </div>
  );
}
