import { useEffect, useRef, useState } from 'react';
import { tokens } from '../tokens';
import { BoundingBoxIcon, ClockIcon, HandIcon, SunIcon } from '../icons';
import type { CameraDeviceInfo } from './CameraMenu';
import { cameraService } from '../../services/camera';

interface SetupCardProps {
  isBlocked?: boolean;
  onStart: () => void;
  onRetryPermission?: () => void;
  cameras?: CameraDeviceInfo[];
  selectedCameraId?: string | null;
  onSelectCamera?: (id: string) => void;
  isTouch?: boolean;
}

export function SetupCard({
  isBlocked = false,
  onStart,
  onRetryPermission,
  cameras = [],
  selectedCameraId = null,
  onSelectCamera,
  isTouch = false,
}: SetupCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [framingReady, setFramingReady] = useState<boolean>(false);
  const [statusChipText, setStatusChipText] = useState<string>('Searching for hand');

  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : '42px';

  useEffect(() => {
    if (isBlocked) return;

    let active = true;

    // Start or share stream from CameraService
    cameraService.start(selectedCameraId ?? undefined).catch(() => {});

    const unsubStream = cameraService.subscribeStream((stream) => {
      if (!active) return;
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        if (stream) {
          videoRef.current.play().catch(() => {});
        }
      }
      const hasLiveStream = Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === 'live'));
      setStreamActive(hasLiveStream);
      if (hasLiveStream) {
        setStatusChipText('Hand detected');
        setFramingReady(true);
      } else {
        setStatusChipText('Camera ready');
      }
    });

    return () => {
      active = false;
      unsubStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isBlocked, selectedCameraId]);

  if (isBlocked) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: tokens.shape.maxWidthSetup,
          margin: '40px auto',
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.shape.radiusCard,
          border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
          padding: '32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          textAlign: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            ...tokens.typography.titleMedium,
            color: tokens.colors.ink,
          }}
        >
          Camera is blocked
        </div>
        <p
          style={{
            ...tokens.typography.body,
            color: tokens.colors.mutedText,
            margin: 0,
            maxWidth: '440px',
          }}
        >
          This app needs the camera to check your signing. Allow camera access in{' '}
          {typeof window !== 'undefined' &&
          typeof (window as any).desktopBridge?.openCameraSettings === 'function' ? (
            <button
              type="button"
              onClick={() => (window as any).desktopBridge.openCameraSettings()}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: tokens.colors.ink,
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 600,
              }}
            >
              Windows Settings &gt; Privacy &amp; security &gt; Camera
            </button>
          ) : (
            'Windows Settings > Privacy & security > Camera'
          )}
          , then try again.
        </p>
        <button
          type="button"
          onClick={onRetryPermission ?? onStart}
          className="btn-primary"
          style={{
            height: btnHeight,
            padding: '0 24px',
            borderRadius: tokens.shape.radiusControl,
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: tokens.shape.maxWidthSetup,
        margin: '20px auto',
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.shape.radiusCard,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        padding: '32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div
        style={{
          ...tokens.typography.titleMedium,
          color: tokens.colors.ink,
        }}
      >
        Set up your camera
      </div>

      {/* Quick Setup & Practice Guide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <HandIcon size={20} color={tokens.colors.ink} />
          </div>
          <span style={{ ...tokens.typography.body, color: tokens.colors.ink }}>
            Face your palm toward the camera
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <BoundingBoxIcon size={20} color={tokens.colors.ink} />
          </div>
          <span style={{ ...tokens.typography.body, color: tokens.colors.ink }}>
            Keep your whole hand inside the dashed outline
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <SunIcon size={20} color={tokens.colors.ink} />
          </div>
          <span style={{ ...tokens.typography.body, color: tokens.colors.ink }}>
            Use bright, even light without heavy shadows
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <ClockIcon size={20} color={tokens.colors.ink} />
          </div>
          <span style={{ ...tokens.typography.body, color: tokens.colors.ink }}>
            Hold steady when green to fill the meter and complete each sign
          </span>
        </div>
      </div>

      {/* Camera Picker Select (Section 25: when multiple cameras are found) */}
      {cameras.length > 1 && (
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: tokens.colors.ink,
          }}
        >
          <span>Camera</span>
          <select
            value={selectedCameraId ?? ''}
            onChange={(e) => onSelectCamera?.(e.target.value)}
            style={{
              height: tokens.shape.buttonHeight,
              padding: '0 12px',
              borderRadius: tokens.shape.radiusControl,
              border: `1px solid ${tokens.colors.borderStrong}`,
              backgroundColor: tokens.colors.surface,
              color: tokens.colors.ink,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cameras.map((cam, idx) => (
              <option key={cam.deviceId || idx} value={cam.deviceId}>
                {cam.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Small live preview (mirrored, 4:3, radius 14) with dashed outline */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          maxHeight: '260px',
          backgroundColor: tokens.colors.cameraSurface,
          borderRadius: tokens.shape.radiusCardInner,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Status chip top-left */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(22, 24, 26, 0.8)',
            border: `1px solid ${tokens.colors.secondaryBody}`,
            borderRadius: tokens.shape.radiusPill,
            padding: '4px 10px',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: framingReady
                ? tokens.colors.overlayPassing
                : tokens.colors.overlayNeedsAttention,
              display: 'inline-block',
            }}
          />
          <span>{statusChipText}</span>
        </div>

        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />

        {/* Dashed hand target framing box */}
        <div
          style={{
            position: 'absolute',
            width: '60%',
            height: '75%',
            border: '2px dashed rgba(255, 255, 255, 0.6)',
            borderRadius: tokens.shape.radiusCardInner,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Button and footer text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={async () => {
            if (streamActive) {
              onStart();
            } else {
              try {
                await cameraService.start(selectedCameraId ?? undefined);
              } catch {}
            }
          }}
          className="btn-primary"
          style={{
            height: btnHeight,
            width: '100%',
            borderRadius: tokens.shape.radiusButton,
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          {streamActive ? 'Start' : 'Turn on camera'}
        </button>

        <span
          style={{
            fontSize: '13px',
            color: tokens.colors.mutedText,
            textAlign: 'center',
          }}
        >
          Video is processed on this device and never uploaded.
        </span>
      </div>
    </div>
  );
}
