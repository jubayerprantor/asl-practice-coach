import { tokens } from './tokens';
import { CameraIcon, MuteIcon, VolumeIcon } from './icons';

export type AppMode = 'check' | 'learn' | 'progress';

interface AppHeaderProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
}

export function AppHeader({
  mode,
  onModeChange,
  voiceEnabled,
  onToggleVoice,
  cameraEnabled,
  onToggleCamera,
}: AppHeaderProps) {
  return (
    <header
      style={{
        height: '72px',
        padding: `0 ${tokens.spacing.pagePadding}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        backgroundColor: tokens.colors.ground,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontFamily: tokens.typography.fontFamily,
          ...tokens.typography.wordmark,
          color: tokens.colors.ink,
        }}
      >
        ASL Practice Coach
      </div>

      {/* Mode Tabs */}
      <nav aria-label="Modes">
        <div
          role="tablist"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: tokens.colors.tabTrack,
            borderRadius: tokens.shape.radiusTabTrack,
            padding: '4px',
            gap: '2px',
          }}
        >
          {(['check', 'learn', 'progress'] as const).map((tab) => {
            const isActive = mode === tab;
            const label =
              tab === 'check'
                ? 'Check'
                : tab === 'learn'
                ? 'Learn'
                : 'Progress';

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onModeChange(tab)}
                style={{
                  border: 'none',
                  background: isActive ? tokens.colors.ink : 'transparent',
                  color: isActive ? '#FFFFFF' : tokens.colors.mutedText,
                  borderRadius: tokens.shape.radiusTabInner,
                  padding: '8px 18px',
                  fontSize: tokens.typography.statusText.fontSize,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Action Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          style={{
            height: tokens.shape.buttonHeight,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
            backgroundColor: tokens.colors.surface,
            color: tokens.colors.ink,
            borderRadius: tokens.shape.radiusControl,
            padding: '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {voiceEnabled ? (
            <VolumeIcon size={16} color={tokens.colors.ink} />
          ) : (
            <MuteIcon size={16} color={tokens.colors.mutedText} />
          )}
          <span>Voice: {voiceEnabled ? 'On' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          aria-pressed={cameraEnabled}
          style={{
            height: tokens.shape.buttonHeight,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
            backgroundColor: tokens.colors.surface,
            color: tokens.colors.ink,
            borderRadius: tokens.shape.radiusControl,
            padding: '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CameraIcon size={16} color={cameraEnabled ? tokens.colors.ink : tokens.colors.mutedText} />
          <span>Camera: {cameraEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>
    </header>
  );
}
