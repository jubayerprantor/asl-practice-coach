import { useEffect, useRef } from 'react';
import { tokens } from '../tokens';

interface DialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function Dialog({
  open,
  title,
  body,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  triggerRef,
}: DialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Initial focus on Cancel button (Section 18)
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    } else if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  // Escape key closes & Focus trap (Section 18)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(22, 24, 26, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-body"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.shape.radiusPanel,
          border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          id="dialog-title"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: tokens.colors.ink,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>

        <div
          id="dialog-body"
          style={{
            ...tokens.typography.body,
            color: tokens.colors.mutedText,
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn-outlined"
            onClick={onCancel}
            style={{
              height: tokens.shape.buttonHeight,
              padding: '0 18px',
              borderRadius: tokens.shape.radiusControl,
              fontSize: tokens.typography.statusText.fontSize,
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{
              height: tokens.shape.buttonHeight,
              padding: '0 18px',
              borderRadius: tokens.shape.radiusControl,
              fontSize: tokens.typography.statusText.fontSize,
              fontWeight: 600,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
