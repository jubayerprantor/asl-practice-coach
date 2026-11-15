import { tokens } from '../tokens';
import { CheckCircleIcon, getHintIcon } from '../icons';

interface HintCardProps {
  status: 'correct' | 'needs_correction';
  message: string;
  feedbackKey?: string | null;
}

export function HintCard({ status, message, feedbackKey }: HintCardProps) {
  const isCorrect = status === 'correct';

  const backgroundColor = isCorrect
    ? tokens.colors.statusCardFill
    : tokens.colors.hintCardFill;

  const borderColor = isCorrect
    ? tokens.colors.statusCardBorder
    : tokens.colors.hintCardBorder;

  const displayText = isCorrect ? 'Good. Hold that position.' : message;
  const HintIconComponent = isCorrect ? CheckCircleIcon : getHintIcon(feedbackKey);

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
        <HintIconComponent
          size={22}
          color={isCorrect ? tokens.colors.ink : '#A86500'}
        />
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
