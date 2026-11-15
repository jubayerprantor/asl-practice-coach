import { tokens } from '../tokens';
import { CheckCircleIcon, DashCircleIcon, TrashIcon } from '../icons';

export interface SignListItem {
  sign: string;
  accuracyText: string;
  attemptsText: string;
  practiced: boolean;
}

interface SignListProps {
  signs: SignListItem[];
  onOpenDeleteDialog: () => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement>;
  isTouch?: boolean;
}

export function SignList({
  signs,
  onOpenDeleteDialog,
  deleteButtonRef,
  isTouch = false,
}: SignListProps) {
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
        All signs
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {signs.map((item, idx) => {
          const isLast = idx === signs.length - 1;

          return (
            <div
              key={item.sign}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: isLast
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
                    fontSize: '18px',
                    fontWeight: 700,
                    color: tokens.colors.ink,
                    width: '24px',
                  }}
                >
                  {item.sign}
                </span>
                <span
                  style={{
                    ...tokens.typography.smallMeta,
                    color: tokens.colors.mutedText,
                  }}
                >
                  {item.accuracyText}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <span
                  style={{
                    ...tokens.typography.smallMeta,
                    color: tokens.colors.mutedText,
                  }}
                >
                  {item.attemptsText}
                </span>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.practiced ? (
                    <CheckCircleIcon size={18} color={tokens.colors.ink} />
                  ) : (
                    <DashCircleIcon size={18} color={tokens.colors.overlayNeutral} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer of the card: outlined "Delete my data" button */}
      <div
        style={{
          borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
          paddingTop: '20px',
          marginTop: '8px',
          display: 'flex',
          justifyContent: 'flex-start',
        }}
      >
        <button
          ref={deleteButtonRef}
          type="button"
          onClick={onOpenDeleteDialog}
          className="btn-outlined"
          style={{
            height: btnHeight,
            padding: '0 16px',
            borderRadius: tokens.shape.radiusControl,
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TrashIcon size={16} color={tokens.colors.mutedText} />
          <span>Delete my data</span>
        </button>
      </div>
    </div>
  );
}
