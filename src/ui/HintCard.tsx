import { tokens } from './tokens';
import { AlertTriangleIcon, CheckCircleIcon } from './icons';

interface HintCardProps {
  status: 'correct' | 'needs_correction';
  message: string;
}

export function HintCard({ status, message }: HintCardProps) {
  const isCorrect = status === 'correct';

  const backgroundColor = isCorrect
    ? tokens.colors.statusCardFill
    : tokens.colors.hintCardFill;

  const borderColor = isCorrect
    ? tokens.colors.statusCardBorder
    : tokens.colors.hintCardBorder;

  const displayText = isCorrect ? 'Good. Hold that position.' : message;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor,
        border: `${tokens.shape.borderWidth} solid ${borderColor}`,
        borderRadius: tokens.shape.radiusCard,
        padding: '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {isCorrect ? (
          <CheckCircleIcon size={20} color={tokens.colors.ink} />
        ) : (
          <AlertTriangleIcon size={20} color="#A86500" />
        )}
      </div>
      <div
        style={{
          ...tokens.typography.hintText,
          color: tokens.colors.ink,
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
