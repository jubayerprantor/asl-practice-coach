import { useEffect, useRef, useState } from 'react';
import { tokens } from '../tokens';
import { BoundingBoxIcon, HandIcon, SunIcon } from '../icons';

interface SetupCardProps {
  isBlocked?: boolean;
  onStart: () => void;
  onRetryPermission?: () => void;
  isTouch?: boolean;
}

export function SetupCard({
  isBlocked = false,
  onStart,
  onRetryPermission,
  isTouch = false,
}: SetupCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [framingReady, setFramingReady] = useState<boolean>(false);
  const [statusChipText, setStatusChipText] = useState<string>('Searching for hand');

  const btnHeight = isTouch ? tokens.shape.mobileTouchTarget : '42px';

  useEffect(() => {
    if (isBlocked) return;

    let active = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStreamActive(true);
        setStatusChipText('Hand detected');
        setFramingReady(true);
      } catch {
        if (active) {
          setStreamActive(false);
          setStatusChipText('Camera ready');
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isBlocked]);

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
          This app needs the camera to check your signing. Allow camera access in
          your browser settings, then try again.
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

      {/* Three short rows with 20px outline icons */}
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
            Use even light on your hand
          </span>
        </div>
      </div>

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
          onClick={onStart}
          disabled={!streamActive && !framingReady}
          aria-disabled={!streamActive && !framingReady}
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
