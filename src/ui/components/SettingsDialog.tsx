import { useEffect, useRef } from 'react';
import { tokens } from '../tokens';
import {
  DIFFICULTY_CONFIG,
  type DifficultyTier,
  type FontScale,
  type StreakData,
} from '../../services/userPreferences';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  difficulty: DifficultyTier;
  onDifficultyChange: (tier: DifficultyTier) => void;
  highContrast: boolean;
  onHighContrastChange: (enabled: boolean) => void;
  fontScale: FontScale;
  onFontScaleChange: (scale: FontScale) => void;
  streak: StreakData;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function SettingsDialog({
  open,
  onClose,
  difficulty,
  onDifficultyChange,
  highContrast,
  onHighContrastChange,
  fontScale,
  onFontScaleChange,
  streak,
  triggerRef,
}: SettingsDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    } else if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(24, 27, 30, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        style={{
          backgroundColor: tokens.colors.ground,
          border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
          borderRadius: tokens.shape.radiusCard,
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            paddingBottom: '12px',
          }}
        >
          <h2
            id="settings-dialog-title"
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: tokens.colors.ink,
              fontFamily: tokens.typography.fontFamily,
            }}
          >
            Practice Settings
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="btn-outlined"
            style={{
              padding: '6px 12px',
              borderRadius: tokens.shape.radiusControl,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Section 1: Practice Streak Summary */}
        <div
          style={{
            backgroundColor: 'rgba(255, 176, 32, 0.08)',
            border: '1px solid rgba(255, 176, 32, 0.3)',
            borderRadius: tokens.shape.radiusControl,
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFB020',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              Daily Habit Streak
            </div>
            <div style={{ fontSize: '13px', color: tokens.colors.ink }}>
              {streak.currentStreak > 0
                ? `${streak.currentStreak} day${streak.currentStreak === 1 ? '' : 's'} in a row!`
                : 'Start your practice today to build a streak.'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFB020' }}>
              🔥 {streak.currentStreak}
            </div>
            <div style={{ fontSize: '11px', color: tokens.colors.mutedText }}>
              Best: {streak.bestStreak}d
            </div>
          </div>
        </div>

        {/* Section 2: Difficulty Tier */}
        <div style={{ marginBottom: '22px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.ink,
              marginBottom: '8px',
            }}
          >
            Difficulty & Hold Duration
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            {(['beginner', 'standard', 'advanced'] as DifficultyTier[]).map((tier) => {
              const active = difficulty === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onDifficultyChange(tier)}
                  aria-pressed={active}
                  style={{
                    padding: '10px 8px',
                    borderRadius: tokens.shape.radiusControl,
                    border: `1.5px solid ${active ? tokens.colors.overlayPassing : tokens.colors.border}`,
                    backgroundColor: active ? 'rgba(94, 224, 192, 0.12)' : 'transparent',
                    color: active ? '#0F6955' : tokens.colors.ink,
                    fontWeight: active ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {DIFFICULTY_CONFIG[tier].label}
                  <div
                    style={{
                      fontSize: '11px',
                      opacity: 0.8,
                      marginTop: '2px',
                    }}
                  >
                    {(DIFFICULTY_CONFIG[tier].holdMs / 1000).toFixed(1)}s
                  </div>
                </button>
              );
            })}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: tokens.colors.mutedText,
              lineHeight: 1.4,
            }}
          >
            {DIFFICULTY_CONFIG[difficulty].description}
          </p>
        </div>

        {/* Section 3: High Contrast Mode (Accessibility) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.ink }}>
              High-Contrast Theme
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.mutedText, marginTop: '2px' }}>
              Maximizes UI contrast for low-vision visibility (WCAG AA).
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={highContrast}
            onClick={() => onHighContrastChange(!highContrast)}
            style={{
              width: '46px',
              height: '26px',
              borderRadius: '13px',
              border: 'none',
              backgroundColor: highContrast ? tokens.colors.overlayPassing : tokens.colors.border,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.ground,
                position: 'absolute',
                top: '3px',
                left: highContrast ? '23px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* Section 4: Font Scale */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.ink }}>
              Large Font Size
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.mutedText, marginTop: '2px' }}>
              Scales text sizes up for easier reading from a distance.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={fontScale === 'large'}
            onClick={() => onFontScaleChange(fontScale === 'large' ? 'standard' : 'large')}
            style={{
              width: '46px',
              height: '26px',
              borderRadius: '13px',
              border: 'none',
              backgroundColor: fontScale === 'large' ? tokens.colors.overlayPassing : tokens.colors.border,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.ground,
                position: 'absolute',
                top: '3px',
                left: fontScale === 'large' ? '23px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* Footer info */}
        <div
          style={{
            borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            paddingTop: '16px',
            textAlign: 'center',
            fontSize: '11px',
            color: tokens.colors.mutedText,
          }}
        >
          All settings & progress are stored 100% locally on your device.
        </div>
      </div>
    </div>
  );
}
