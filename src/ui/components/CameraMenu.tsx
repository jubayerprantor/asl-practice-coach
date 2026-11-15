import { useEffect, useRef, useState } from 'react';
import { tokens } from '../tokens';
import { CheckIcon } from '../icons';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

interface CameraMenuProps {
  open: boolean;
  cameras: CameraDeviceInfo[];
  selectedDeviceId: string | null;
  cameraEnabled: boolean;
  onSelectCamera: (deviceId: string) => void;
  onTurnOffCamera: () => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function CameraMenu({
  open,
  cameras,
  selectedDeviceId,
  cameraEnabled,
  onSelectCamera,
  onTurnOffCamera,
  onClose,
  triggerRef,
}: CameraMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Total items = cameras + 1 ("Turn camera off")
  const totalItems = cameras.length + 1;

  // Initial focus and returning focus
  useEffect(() => {
    if (open) {
      // Find current selected index, default to 0
      const selIdx = cameras.findIndex((c) => c.deviceId === selectedDeviceId);
      setFocusedIndex(selIdx !== -1 && cameraEnabled ? selIdx : 0);

      // Focus menu container
      setTimeout(() => {
        const firstBtn = menuRef.current?.querySelectorAll<HTMLButtonElement>('button')[selIdx !== -1 && cameraEnabled ? selIdx : 0];
        firstBtn?.focus();
      }, 30);
    } else if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [open, cameras, selectedDeviceId, cameraEnabled, triggerRef]);

  // Keyboard navigation: Arrow keys move, Enter selects, Escape closes (Section 25)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev + 1) % totalItems;
          const btns = menuRef.current?.querySelectorAll<HTMLButtonElement>('button');
          btns?.[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev - 1 + totalItems) % totalItems;
          const btns = menuRef.current?.querySelectorAll<HTMLButtonElement>('button');
          btns?.[next]?.focus();
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, totalItems, onClose]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Select Camera"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '280px',
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.shape.radiusCardInner,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        padding: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxSizing: 'border-box',
      }}
    >
      {cameras.map((cam, idx) => {
        const isSelected = cameraEnabled && cam.deviceId === selectedDeviceId;
        const displayName = cam.label || `Camera ${idx + 1}`;

        return (
          <button
            key={cam.deviceId || idx}
            type="button"
            role="menuitem"
            tabIndex={focusedIndex === idx ? 0 : -1}
            onClick={() => {
              onSelectCamera(cam.deviceId);
              onClose();
            }}
            style={{
              height: '40px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: tokens.shape.radiusControl,
              border: 'none',
              background: focusedIndex === idx ? tokens.colors.chipNeutral : 'transparent',
              color: tokens.colors.ink,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={() => setFocusedIndex(idx)}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginRight: '8px',
              }}
            >
              {displayName}
            </span>
            {isSelected && <CheckIcon size={16} color={tokens.colors.ink} />}
          </button>
        );
      })}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: tokens.colors.rowDivider,
          margin: '4px 0',
        }}
      />

      {/* Last item: Turn camera off / on */}
      <button
        type="button"
        role="menuitem"
        tabIndex={focusedIndex === cameras.length ? 0 : -1}
        onClick={() => {
          onTurnOffCamera();
          onClose();
        }}
        style={{
          height: '40px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: tokens.shape.radiusControl,
          border: 'none',
          background:
            focusedIndex === cameras.length
              ? tokens.colors.chipNeutral
              : 'transparent',
          color: tokens.colors.ink,
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        onMouseEnter={() => setFocusedIndex(cameras.length)}
      >
        <span>{cameraEnabled ? 'Turn camera off' : 'Turn camera on'}</span>
        {!cameraEnabled && <CheckIcon size={16} color={tokens.colors.ink} />}
      </button>
    </div>
  );
}
