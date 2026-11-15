import { tokens } from '../tokens';

export interface PracticeAgainItem {
  sign: string;
  failingFingerText: string;
}

interface PracticeAgainListProps {
  items: PracticeAgainItem[];
  onPractice: (sign: string) => void;
  isTouch?: boolean;
}

export function PracticeAgainList({
  items,
  onPractice,
  isTouch = false,
}: PracticeAgainListProps) {
  if (items.length === 0) return null;

  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

  return (
    <div
      style={{
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.shape.radiusCard,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: tokens.colors.ink,
        }}
      >
        Practice again
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item, idx) => (
          <div
            key={item.sign}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom:
                idx === items.length - 1
                  ? 'none'
                  : `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span
                style={{
                  ...tokens.typography.letterMedium,
                  color: tokens.colors.ink,
                }}
              >
                {item.sign}
              </span>
              <span
                style={{
                  ...tokens.typography.body,
                  color: tokens.colors.mutedText,
                }}
              >
                {item.failingFingerText}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onPractice(item.sign)}
              className="btn-outlined"
              style={{
                height: btnHeight,
                padding: '0 16px',
                borderRadius: tokens.shape.radiusControl,
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Practice
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
