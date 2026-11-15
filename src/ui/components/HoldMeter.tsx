import { tokens } from '../tokens';
import type { HoldTimerSnapshot } from '../../engine/evaluateTypes';

interface HoldMeterProps {
  hold: HoldTimerSnapshot | null;
  cameraEnabled?: boolean;
}

export function HoldMeter({ hold, cameraEnabled = true }: HoldMeterProps) {
  const isHolding = cameraEnabled ? (hold?.isHolding ?? false) : false;
  const progress = cameraEnabled ? (hold?.progress ?? 0) : 0;
  const heldMs = cameraEnabled ? (hold?.heldMs ?? 0) : 0;
  const requiredMs = hold?.requiredHoldMs ?? 1200;

  const valueText = isHolding
    ? `${(heldMs / 1000).toFixed(1)} / ${(requiredMs / 1000).toFixed(1)} s`
    : 'Paused';

  const fillPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: tokens.colors.ink,
          }}
        >
          Hold steady
        </span>
        <span
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
          }}
        >
          {valueText}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Hold steady progress"
        style={{
          height: tokens.shape.holdMeterHeight,
          borderRadius: tokens.shape.radiusPill,
          backgroundColor: tokens.colors.border,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${fillPercent}%`,
            backgroundColor: tokens.colors.ink,
            transition: 'width 80ms ease-out',
            borderRadius: tokens.shape.radiusPill,
          }}
        />
      </div>
    </div>
  );
}
