import { SetupCard } from '../components/SetupCard';
import type { CameraDeviceInfo } from '../components/CameraMenu';

interface SetupScreenProps {
  isBlocked?: boolean;
  onStart: () => void;
  onRetryPermission?: () => void;
  cameras?: CameraDeviceInfo[];
  selectedCameraId?: string | null;
  onSelectCamera?: (id: string) => void;
  isTouch?: boolean;
}

export function SetupScreen({
  isBlocked = false,
  onStart,
  onRetryPermission,
  cameras = [],
  selectedCameraId = null,
  onSelectCamera,
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
        cameras={cameras}
        selectedCameraId={selectedCameraId}
        onSelectCamera={onSelectCamera}
        isTouch={isTouch}
      />
    </div>
  );
}
