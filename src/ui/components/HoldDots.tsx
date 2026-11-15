import { tokens } from '../tokens';
import { CheckIcon } from '../icons';

interface HoldDotsProps {
  completedHolds: number;
  requiredHolds: number;
}

export function HoldDots({ completedHolds, requiredHolds }: HoldDotsProps) {
  const dots = Array.from({ length: requiredHolds }, (_, i) => i < completedHolds);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {dots.map((filled, idx) => (
          <div
            key={idx}
            style={{
              width: tokens.shape.holdDotSize,
              height: tokens.shape.holdDotSize,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: filled ? tokens.colors.ink : 'transparent',
              border: filled
                ? 'none'
                : `1.5px solid ${tokens.colors.borderStrong}`,
              boxSizing: 'border-box',
            }}
          >
            {filled && <CheckIcon size={14} color="#FFFFFF" />}
          </div>
        ))}
      </div>
      <span
        style={{
          ...tokens.typography.smallMeta,
          color: tokens.colors.mutedText,
        }}
      >
        {completedHolds} of {requiredHolds}
      </span>
    </div>
  );
}
