import { tokens } from '../tokens';
import { BookOpenIcon, CheckSquareIcon } from '../icons';

interface HomeScreenProps {
  onSelectLearn: () => void;
  onSelectCheck: () => void;
  inProgressLesson?: {
    lessonNumber: number;
    totalLessons: number;
    sign: string;
  } | null;
  onContinueInProgress?: () => void;
  isTouch?: boolean;
}

export function HomeScreen({
  onSelectLearn,
  onSelectCheck,
  inProgressLesson,
  onContinueInProgress,
}: HomeScreenProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: tokens.shape.maxWidthHome,
        margin: '60px auto 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '36px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          ...tokens.typography.titleLarge,
          color: tokens.colors.ink,
          textAlign: 'center',
        }}
      >
        What do you want to do?
      </div>

      {/* Two large option cards side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: tokens.spacing.gridGap,
          width: '100%',
        }}
      >
        {/* Learn Card */}
        <button
          type="button"
          onClick={onSelectLearn}
          style={{
            backgroundColor: tokens.colors.surface,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            borderRadius: tokens.shape.radiusPanel,
            padding: tokens.spacing.panelPadding,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: tokens.shape.radiusControl,
              backgroundColor: tokens.colors.chipNeutral,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpenIcon size={28} color={tokens.colors.ink} />
          </div>
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: tokens.colors.ink,
                marginBottom: '4px',
              }}
            >
              Learn
            </div>
            <div
              style={{
                ...tokens.typography.smallMeta,
                color: tokens.colors.mutedText,
              }}
            >
              Step-by-step lessons for fingerspelling
            </div>
          </div>
        </button>

        {/* Check Card */}
        <button
          type="button"
          onClick={onSelectCheck}
          style={{
            backgroundColor: tokens.colors.surface,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            borderRadius: tokens.shape.radiusPanel,
            padding: tokens.spacing.panelPadding,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: tokens.shape.radiusControl,
              backgroundColor: tokens.colors.chipNeutral,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckSquareIcon size={28} color={tokens.colors.ink} />
          </div>
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: tokens.colors.ink,
                marginBottom: '4px',
              }}
            >
              Check
            </div>
            <div
              style={{
                ...tokens.typography.smallMeta,
                color: tokens.colors.mutedText,
              }}
            >
              Practice a sign you already know
            </div>
          </div>
        </button>
      </div>

      {/* Below: text link if lesson in progress */}
      {inProgressLesson && (
        <button
          type="button"
          onClick={onContinueInProgress ?? onSelectLearn}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.colors.ink,
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
        >
          Continue lesson {inProgressLesson.lessonNumber} of{' '}
          {inProgressLesson.totalLessons}: {inProgressLesson.sign}
        </button>
      )}
    </div>
  );
}
