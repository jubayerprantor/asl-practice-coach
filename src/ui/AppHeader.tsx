import { tokens } from './tokens';
import { CameraIcon, MuteIcon, VolumeIcon } from './icons';

export type AppMode = 'check' | 'learn' | 'progress' | 'home';

interface AppHeaderProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  onWordmarkClick?: () => void;
  isMobile?: boolean;
}

export function AppHeader({
  mode,
  onModeChange,
  voiceEnabled,
  onToggleVoice,
  cameraEnabled,
  onToggleCamera,
  onWordmarkClick,
  isMobile = false,
}: AppHeaderProps) {
  return (
    <header
      style={{
        height: tokens.shape.headerHeight,
        padding: isMobile ? '0 16px' : `0 ${tokens.spacing.pagePadding}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        backgroundColor: tokens.colors.ground,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Wordmark (Section 12: Clicked navigates to home/mode picker) */}
      <button
        type="button"
        onClick={onWordmarkClick}
        aria-label="ASL Practice Coach home"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: onWordmarkClick ? 'pointer' : 'default',
          fontFamily: tokens.typography.fontFamily,
          ...tokens.typography.wordmark,
          color: tokens.colors.ink,
        }}
      >
        ASL Practice Coach
      </button>

      {/* Mode Tabs (hidden on mobile, rendered in bottom bar instead) */}
      {!isMobile && (
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
      )}

      {/* Action Toggles (Mobile: 44px min touch target icon buttons; Desktop: outlined labeled buttons) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          aria-label={`Voice hints ${voiceEnabled ? 'On' : 'Off'}`}
          title={`Voice hints ${voiceEnabled ? 'On' : 'Off'} (Alt+V)`}
          style={{
            height: isMobile ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight,
            minWidth: isMobile ? tokens.shape.mobileTouchTarget : undefined,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
            backgroundColor: tokens.colors.surface,
            color: tokens.colors.ink,
            borderRadius: tokens.shape.radiusControl,
            padding: isMobile ? '0' : '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {voiceEnabled ? (
            <VolumeIcon size={isMobile ? 18 : 16} color={tokens.colors.ink} />
          ) : (
            <MuteIcon size={isMobile ? 18 : 16} color={tokens.colors.mutedText} />
          )}
          {!isMobile && <span>Voice: {voiceEnabled ? 'On' : 'Off'}</span>}
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          aria-pressed={cameraEnabled}
          aria-label={`Camera ${cameraEnabled ? 'On' : 'Off'}`}
          title={`Camera ${cameraEnabled ? 'On' : 'Off'} (Alt+C)`}
          style={{
            height: isMobile ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight,
            minWidth: isMobile ? tokens.shape.mobileTouchTarget : undefined,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
            backgroundColor: tokens.colors.surface,
            color: tokens.colors.ink,
            borderRadius: tokens.shape.radiusControl,
            padding: isMobile ? '0' : '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <CameraIcon
            size={isMobile ? 18 : 16}
            color={cameraEnabled ? tokens.colors.ink : tokens.colors.mutedText}
          />
          {!isMobile && <span>Camera: {cameraEnabled ? 'On' : 'Off'}</span>}
        </button>
      </div>
    </header>
  );
}
