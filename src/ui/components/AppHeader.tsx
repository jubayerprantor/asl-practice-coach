import { tokens } from '../tokens';
import { CameraIcon, MuteIcon, VolumeIcon } from '../icons';
import { ModeTabs, type AppMode } from './ModeTabs';

interface AppHeaderProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  onWordmarkClick?: () => void;
  isMobile?: boolean;
  isTablet?: boolean;
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
  isTablet = false,
}: AppHeaderProps) {
  const touchHeight = isMobile || isTablet ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;

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
        <ModeTabs mode={mode} onModeChange={onModeChange} />
      )}

      {/* Action Toggles (Section 14, 17, 19: Touch targets at least 44px on tablet/phone) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          aria-label={`Voice hints ${voiceEnabled ? 'On' : 'Off'}`}
          title={`Voice hints ${voiceEnabled ? 'On' : 'Off'} (Alt+V)`}
          className="btn-outlined"
          style={{
            height: touchHeight,
            minWidth: isMobile ? touchHeight : undefined,
            borderRadius: tokens.shape.radiusControl,
            padding: isMobile ? '0' : '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
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
          className="btn-outlined"
          style={{
            height: touchHeight,
            minWidth: isMobile ? touchHeight : undefined,
            borderRadius: tokens.shape.radiusControl,
            padding: isMobile ? '0' : '0 14px',
            fontSize: tokens.typography.statusText.fontSize,
            fontWeight: 500,
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
