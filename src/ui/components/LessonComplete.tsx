import { tokens } from '../tokens';
import { CheckCircleIcon } from '../icons';
import { HoldDots } from './HoldDots';

interface LessonCompleteProps {
  targetSign: string;
  requiredHolds: number;
  nextSign?: string | null;
  isLastLesson?: boolean;
  mostAdjustedFinger?: string | null;
  onContinue: () => void;
  onPracticeAgain: () => void;
  isTouch?: boolean;
}

export function LessonComplete({
  targetSign,
  requiredHolds,
  nextSign = null,
  isLastLesson = false,
  mostAdjustedFinger = null,
  onContinue,
  onPracticeAgain,
  isTouch = false,
}: LessonCompleteProps) {
  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : '42px';
  const secBtnHeight = isTouch ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
      }}
    >
      {/* Confirmation card (neutral colors, check-circle icon) */}
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
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          <CheckCircleIcon size={22} color={tokens.colors.ink} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: tokens.colors.ink,
            }}
          >
            {targetSign} complete
          </div>
          <div
            style={{
              ...tokens.typography.smallMeta,
              color: tokens.colors.mutedText,
              lineHeight: 1.4,
            }}
          >
            {`You held it correctly ${requiredHolds} times. ${
              nextSign
                ? `${nextSign} is now unlocked.`
                : 'You finished all signs in this lesson.'
            }`}
          </div>
        </div>
      </div>

      {/* HoldDots show N of N */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <HoldDots
          completedHolds={requiredHolds}
          requiredHolds={requiredHolds}
        />
        {mostAdjustedFinger && (
          <div
            style={{
              fontSize: '12px',
              color: tokens.colors.mutedText,
            }}
          >
            Most adjusted this lesson: {mostAdjustedFinger} finger
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          onClick={onContinue}
          className="btn-primary"
          style={{
            height: btnHeight,
            width: '100%',
            borderRadius: tokens.shape.radiusButton,
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          {isLastLesson && !nextSign
            ? 'Go to Check mode'
            : `Continue to ${nextSign ?? 'next'}`}
        </button>

        <button
          type="button"
          onClick={onPracticeAgain}
          className="btn-outlined"
          style={{
            height: secBtnHeight,
            width: '100%',
            borderRadius: tokens.shape.radiusButton,
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 600,
          }}
        >
          Practice {targetSign} again
        </button>
      </div>
    </div>
  );
}
