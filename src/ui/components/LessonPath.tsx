import { tokens } from '../tokens';
import { CheckIcon, LockIcon } from '../icons';

export interface LessonSignStatus {
  sign: string;
  state: 'done' | 'current' | 'locked' | 'unlocked_next';
}

interface LessonPathProps {
  currentLessonNumber: number;
  totalLessons: number;
  signs: LessonSignStatus[];
  onSelectSign?: (sign: string) => void;
}

export function LessonPath({
  currentLessonNumber,
  totalLessons,
  signs,
  onSelectSign,
}: LessonPathProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
      }}
    >
      <div
        style={{
          ...tokens.typography.sectionLabel,
          color: tokens.colors.mutedText,
        }}
      >
        LESSON {currentLessonNumber} OF {totalLessons}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {signs.map(({ sign, state }) => {
          const isDone = state === 'done';
          const isCurrent = state === 'current';
          const isLocked = state === 'locked';
          const isUnlockedNext = state === 'unlocked_next';

          return (
            <button
              key={sign}
              type="button"
              disabled={isLocked}
              onClick={() => onSelectSign?.(sign)}
              aria-label={`Sign ${sign}, ${state}`}
              style={{
                height: tokens.shape.chipHeight,
                padding: '0 10px',
                borderRadius: tokens.shape.radiusChip,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '13px',
                fontWeight: isCurrent ? 700 : 600,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                backgroundColor: isCurrent
                  ? tokens.colors.ink
                  : isDone
                  ? tokens.colors.chipNeutral
                  : 'transparent',
                color: isCurrent
                  ? '#FFFFFF'
                  : isLocked
                  ? tokens.colors.mutedText
                  : tokens.colors.ink,
                border: isUnlockedNext
                  ? `1.5px solid ${tokens.colors.ink}`
                  : isLocked
                  ? `1px dashed ${tokens.colors.lockedOutline}`
                  : isDone
                  ? `1px solid ${tokens.colors.border}`
                  : 'none',
              }}
            >
              {isDone && <CheckIcon size={14} color={tokens.colors.ink} />}
              {isLocked && <LockIcon size={14} color={tokens.colors.mutedText} />}
              <span>{sign}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
