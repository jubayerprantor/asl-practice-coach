import { tokens } from './tokens';
import { BarChartIcon, BookOpenIcon, CheckSquareIcon } from './icons';
import type { AppMode } from './components/ModeTabs';

interface MobileBottomNavProps {
  mode: AppMode;
  onModeChange: (next: AppMode) => void;
}

export function MobileBottomNav({ mode, onModeChange }: MobileBottomNavProps) {
  const items: ReadonlyArray<{
    id: 'learn' | 'check' | 'progress';
    label: string;
    icon: typeof BookOpenIcon;
  }> = [
    { id: 'learn', label: 'Learn', icon: BookOpenIcon },
    { id: 'check', label: 'Check', icon: CheckSquareIcon },
    { id: 'progress', label: 'Progress', icon: BarChartIcon },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: tokens.colors.surface,
        borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = mode === id;
        const color = isActive ? tokens.colors.ink : tokens.colors.mutedText;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              height: '100%',
              minHeight: tokens.shape.mobileTouchTarget,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color,
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            <Icon size={20} color={color} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
