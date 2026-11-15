import { useRef, useState } from 'react';
import { tokens } from '../tokens';
import { CameraIcon, MuteIcon, SettingsIcon, VolumeIcon } from '../icons';
import { ModeTabs, type AppMode } from './ModeTabs';
import { CameraMenu, type CameraDeviceInfo } from './CameraMenu';

interface AppHeaderProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  cameras?: CameraDeviceInfo[];
  selectedCameraId?: string | null;
  onSelectCamera?: (deviceId: string) => void;
  cameraMenuOpen?: boolean;
  onCameraMenuOpenChange?: (open: boolean) => void;
  onWordmarkClick?: () => void;
  isMobile?: boolean;
  isTablet?: boolean;
  streakCount?: number;
  onOpenSettings?: () => void;
  settingsButtonRef?: React.Ref<HTMLButtonElement>;
}

export function AppHeader({
  mode,
  onModeChange,
  voiceEnabled,
  onToggleVoice,
  cameraEnabled,
  onToggleCamera,
  cameras = [],
  selectedCameraId = null,
  onSelectCamera,
  cameraMenuOpen: externalMenuOpen,
  onCameraMenuOpenChange,
  onWordmarkClick,
  isMobile = false,
  isTablet = false,
  streakCount,
  onOpenSettings,
  settingsButtonRef,
}: AppHeaderProps) {
  const touchHeight = isMobile || isTablet ? tokens.shape.mobileTouchTarget : tokens.shape.buttonHeight;
  const [internalMenuOpen, setInternalMenuOpen] = useState<boolean>(false);
  const cameraMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;
  const setCameraMenuOpen = (open: boolean) => {
    setInternalMenuOpen(open);
    onCameraMenuOpenChange?.(open);
  };
  const cameraBtnRef = useRef<HTMLButtonElement>(null);

  const hasMultipleCameras = cameras.length > 1;

  const handleCameraClick = () => {
    if (hasMultipleCameras) {
      setCameraMenuOpen(!cameraMenuOpen);
    } else {
      onToggleCamera();
    }
  };

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
      {/* Wordmark & Brand Symbol (Section 12: Clicked navigates to home/mode picker) */}
      <button
        type="button"
        onClick={onWordmarkClick}
        aria-label="ASL Practice Coach home"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: onWordmarkClick ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <img
          src="/branding/symbol-color.svg"
          alt=""
          width={28}
          height={28}
          style={{ display: 'block', flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: tokens.typography.fontFamily,
            ...tokens.typography.wordmark,
            color: tokens.colors.ink,
          }}
        >
          ASL Practice Coach
        </span>
      </button>

      {/* Mode Tabs (hidden on mobile, rendered in bottom bar instead) */}
      {!isMobile && (
        <ModeTabs mode={mode} onModeChange={onModeChange} />
      )}

      {/* Action Toggles (Section 14, 17, 19, 24: Tooltips with Ctrl shortcuts) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          aria-label={`Voice hints ${voiceEnabled ? 'On' : 'Off'}`}
          title="Voice hints (Ctrl+Shift+V)"
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

        {/* Camera Toggle or Camera Picker Menu (Section 25) */}
        <div style={{ position: 'relative' }}>
          <button
            ref={cameraBtnRef}
            type="button"
            onClick={handleCameraClick}
            aria-pressed={cameraEnabled}
            aria-haspopup={hasMultipleCameras ? 'menu' : undefined}
            aria-expanded={hasMultipleCameras ? cameraMenuOpen : undefined}
            aria-label={`Camera ${cameraEnabled ? 'On' : 'Off'}`}
            title="Camera (Ctrl+Shift+K)"
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

          {hasMultipleCameras && (
            <CameraMenu
              open={cameraMenuOpen}
              cameras={cameras}
              selectedDeviceId={selectedCameraId}
              cameraEnabled={cameraEnabled}
              onSelectCamera={(id) => {
                onSelectCamera?.(id);
                setCameraMenuOpen(false);
              }}
              onTurnOffCamera={() => {
                onToggleCamera();
                setCameraMenuOpen(false);
              }}
              onClose={() => setCameraMenuOpen(false)}
              triggerRef={cameraBtnRef}
            />
          )}
        </div>

        {/* Streak Counter Badge */}
        {streakCount !== undefined && (
          <div
            role="status"
            aria-label={`Current practice streak: ${streakCount} day${streakCount === 1 ? '' : 's'}`}
            title={`Current practice streak: ${streakCount} day${streakCount === 1 ? '' : 's'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: isMobile ? '0 8px' : '0 10px',
              height: touchHeight,
              borderRadius: tokens.shape.radiusControl,
              backgroundColor: tokens.colors.chipNeutral,
              border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
              fontSize: tokens.typography.statusText.fontSize,
              fontWeight: 600,
              color: streakCount > 0 ? '#E65100' : tokens.colors.mutedText,
              userSelect: 'none',
            }}
          >
            <span aria-hidden="true">🔥</span>
            <span>{streakCount}</span>
          </div>
        )}

        {/* Settings Dialog Trigger Button */}
        {onOpenSettings && (
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
            className="btn-outlined"
            style={{
              height: touchHeight,
              minWidth: isMobile ? touchHeight : undefined,
              borderRadius: tokens.shape.radiusControl,
              padding: isMobile ? '0' : '0 12px',
              fontSize: tokens.typography.statusText.fontSize,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <SettingsIcon size={isMobile ? 18 : 16} color={tokens.colors.ink} />
            {!isMobile && <span>Settings</span>}
          </button>
        )}
      </div>
    </header>
  );
}
