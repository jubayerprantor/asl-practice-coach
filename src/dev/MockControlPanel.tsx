import { useEffect, useState } from 'react';
import {
  MockLandmarkSource,
  type MockScenario,
  type MockSign,
} from './mockLandmarkSource';
import { tokens } from '../ui/tokens';

const SCENARIOS: ReadonlyArray<{ id: MockScenario; label: string }> = [
  { id: 'correct', label: '1. Correct Sign' },
  { id: 'faulty_thumb', label: '2. Faulty Thumb' },
  { id: 'faulty_index', label: '3. Faulty Index' },
  { id: 'low_confidence', label: '4. Low Confidence' },
  { id: 'no_hand', label: '5. No Hand' },
  { id: 'two_hands', label: '6. Two Hands' },
  { id: 'disconnected', label: '7. Camera Disconnected' },
  { id: 'too_far', label: '8. Hand Too Far' },
];

const SIGNS: MockSign[] = ['A', 'B', 'L', 'V', 'Y'];

interface MockControlPanelProps {
  mockSource: MockLandmarkSource;
  active: boolean;
  onToggleActive: (active: boolean) => void;
  currentTargetSign?: string;
}

export function MockControlPanel({
  mockSource,
  active,
  onToggleActive,
  currentTargetSign = 'A',
}: MockControlPanelProps) {
  const [selectedSign, setSelectedSign] = useState<MockSign>(
    (SIGNS.includes(currentTargetSign as MockSign) ? currentTargetSign : 'A') as MockSign
  );
  const [selectedScenario, setSelectedScenario] = useState<MockScenario>('correct');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Sync sign when target changes
  useEffect(() => {
    if (SIGNS.includes(currentTargetSign as MockSign)) {
      setSelectedSign(currentTargetSign as MockSign);
      mockSource.setSign(currentTargetSign as MockSign);
    }
  }, [currentTargetSign, mockSource]);

  // Keyboard shortcuts active inside Dev panel
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === ']') {
        e.preventDefault();
        const currentIdx = SCENARIOS.findIndex((s) => s.id === selectedScenario);
        const next = SCENARIOS[(currentIdx + 1) % SCENARIOS.length].id;
        setSelectedScenario(next);
        mockSource.setScenario(next);
      } else if (e.key === '[') {
        e.preventDefault();
        const currentIdx = SCENARIOS.findIndex((s) => s.id === selectedScenario);
        const prev = SCENARIOS[(currentIdx - 1 + SCENARIOS.length) % SCENARIOS.length].id;
        setSelectedScenario(prev);
        mockSource.setScenario(prev);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        mockSource.togglePause();
        setIsPaused(mockSource.getPaused());
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        mockSource.restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, selectedScenario, mockSource]);

  return (
    <>
      {/* Rule 4: Persistent MOCK DATA Banner when active */}
      {active && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '28px',
            backgroundColor: '#16181A',
            color: '#FFB020',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            borderBottom: '2px solid #FFB020',
            userSelect: 'none',
          }}
        >
          MOCK DATA ACTIVE — REPLAYING FIXTURE SAMPLES (DEV ONLY)
        </div>
      )}

      {/* Floating Dev Control Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 10000,
          fontFamily: tokens.typography.fontFamily,
        }}
      >
        {!isMinimized ? (
          <div
            style={{
              width: '280px',
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.shape.radiusCardInner,
              border: `2px solid ${active ? tokens.colors.overlayNeedsAttention : tokens.colors.borderStrong}`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: tokens.colors.ink }}>
                DEV MOCK PANEL
              </span>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: tokens.colors.mutedText,
                }}
              >
                Hide
              </button>
            </div>

            {/* Mock Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !active;
                onToggleActive(next);
                if (next) {
                  mockSource.start();
                } else {
                  mockSource.stop();
                }
              }}
              style={{
                height: '32px',
                borderRadius: tokens.shape.radiusControl,
                backgroundColor: active ? tokens.colors.ink : tokens.colors.chipNeutral,
                color: active ? '#FFFFFF' : tokens.colors.ink,
                border: `1px solid ${tokens.colors.borderStrong}`,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {active ? 'Mock Mode: ON' : 'Mock Mode: OFF'}
            </button>

            {active && (
              <>
                {/* Sign Selector */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                  <span>Target Sign:</span>
                  <select
                    value={selectedSign}
                    onChange={(e) => {
                      const next = e.target.value as MockSign;
                      setSelectedSign(next);
                      mockSource.setSign(next);
                    }}
                    style={{
                      height: '28px',
                      padding: '0 6px',
                      borderRadius: tokens.shape.radiusControl,
                      border: `1px solid ${tokens.colors.borderStrong}`,
                      fontSize: '12px',
                    }}
                  >
                    {SIGNS.map((s) => (
                      <option key={s} value={s}>
                        Letter {s}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Scenario Selector */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                  <span>Scenario:</span>
                  <select
                    value={selectedScenario}
                    onChange={(e) => {
                      const next = e.target.value as MockScenario;
                      setSelectedScenario(next);
                      mockSource.setScenario(next);
                    }}
                    style={{
                      height: '28px',
                      padding: '0 6px',
                      borderRadius: tokens.shape.radiusControl,
                      border: `1px solid ${tokens.colors.borderStrong}`,
                      fontSize: '12px',
                    }}
                  >
                    {SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Playback Controls */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      mockSource.togglePause();
                      setIsPaused(mockSource.getPaused());
                    }}
                    style={{
                      flex: 1,
                      height: '28px',
                      borderRadius: tokens.shape.radiusControl,
                      backgroundColor: tokens.colors.chipNeutral,
                      border: `1px solid ${tokens.colors.borderStrong}`,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isPaused ? 'Resume (P)' : 'Pause (P)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => mockSource.restart()}
                    style={{
                      flex: 1,
                      height: '28px',
                      borderRadius: tokens.shape.radiusControl,
                      backgroundColor: tokens.colors.chipNeutral,
                      border: `1px solid ${tokens.colors.borderStrong}`,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Restart (R)
                  </button>
                </div>

                <span style={{ fontSize: '10px', color: tokens.colors.mutedText, textAlign: 'center' }}>
                  Shortcuts: [ prev | ] next | P pause | R restart
                </span>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            style={{
              padding: '6px 12px',
              borderRadius: tokens.shape.radiusControl,
              backgroundColor: active ? tokens.colors.overlayNeedsAttention : tokens.colors.ink,
              color: active ? '#16181A' : '#FFFFFF',
              fontWeight: 700,
              fontSize: '11px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
            }}
          >
            {active ? 'MOCK ON' : 'DEV MOCK'}
          </button>
        )}
      </div>
    </>
  );
}
