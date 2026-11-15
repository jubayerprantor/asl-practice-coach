import { SetupCard } from '../components/SetupCard';

interface SetupScreenProps {
  isBlocked?: boolean;
  onStart: () => void;
  onRetryPermission?: () => void;
  isTouch?: boolean;
}

export function SetupScreen({
  isBlocked = false,
  onStart,
  onRetryPermission,
  isTouch = false,
}: SetupScreenProps) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
      }}
    >
      <SetupCard
        isBlocked={isBlocked}
        onStart={onStart}
        onRetryPermission={onRetryPermission}
        isTouch={isTouch}
      />
    </div>
  );
}
