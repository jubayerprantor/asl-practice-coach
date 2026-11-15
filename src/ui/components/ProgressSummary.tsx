import { tokens } from '../tokens';

interface ProgressSummaryProps {
  signsPracticed: number;
  practiceAccuracyPercent: number;
  sessions: number;
}

export function ProgressSummary({
  signsPracticed,
  practiceAccuracyPercent,
  sessions,
}: ProgressSummaryProps) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.shape.radiusCard,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        padding: '24px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div
          style={{
            ...tokens.typography.figureLarge,
            color: tokens.colors.ink,
          }}
        >
          {signsPracticed}
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
            marginTop: '4px',
          }}
        >
          signs practiced
        </div>
      </div>

      <div>
        <div
          style={{
            ...tokens.typography.figureLarge,
            color: tokens.colors.ink,
          }}
        >
          {practiceAccuracyPercent}%
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
            marginTop: '4px',
          }}
        >
          practice accuracy
        </div>
      </div>

      <div>
        <div
          style={{
            ...tokens.typography.figureLarge,
            color: tokens.colors.ink,
          }}
        >
          {sessions}
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
            marginTop: '4px',
          }}
        >
          sessions
        </div>
      </div>
    </div>
  );
}
