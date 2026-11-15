import { tokens } from '../tokens';

export type AppMode = 'check' | 'learn' | 'progress' | 'home';

interface ModeTabsProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
}

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const tabs: ReadonlyArray<{ id: 'check' | 'learn' | 'progress'; label: string }> = [
    { id: 'check', label: 'Check' },
    { id: 'learn', label: 'Learn' },
    { id: 'progress', label: 'Progress' },
  ];

  return (
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
          height: '40px',
          boxSizing: 'border-box',
        }}
      >
        {tabs.map(({ id, label }) => {
          const isActive = mode === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onModeChange(id)}
              className="tab-btn"
              style={{
                borderRadius: tokens.shape.radiusTabInner,
                padding: '6px 16px',
                fontSize: tokens.typography.statusText.fontSize,
                fontWeight: isActive ? 600 : 500,
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
