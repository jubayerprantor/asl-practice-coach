import { tokens } from '../tokens';

export type AppMode = 'check' | 'learn' | 'progress' | 'home';

interface ModeTabsProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
}

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const tabs: ReadonlyArray<{
    id: 'check' | 'learn' | 'progress';
    label: string;
    shortcut: string;
  }> = [
    { id: 'check', label: 'Check', shortcut: 'Ctrl+1' },
    { id: 'learn', label: 'Learn', shortcut: 'Ctrl+2' },
    { id: 'progress', label: 'Progress', shortcut: 'Ctrl+3' },
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
        {tabs.map(({ id, label, shortcut }) => {
          const isActive = mode === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              title={`${label} (${shortcut})`}
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
