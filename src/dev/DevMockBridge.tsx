import { useRef, useState } from 'react';
import { MockLandmarkSource } from './mockLandmarkSource';
import { MockControlPanel } from './MockControlPanel';
import type { LandmarkSource } from '../engine';

interface DevMockBridgeProps {
  currentTargetSign: string;
  onMockSourceChange: (source: LandmarkSource | null) => void;
  onMockActiveChange: (active: boolean) => void;
}

export function DevMockBridge({
  currentTargetSign,
  onMockSourceChange,
  onMockActiveChange,
}: DevMockBridgeProps) {
  const mockSourceRef = useRef<MockLandmarkSource | null>(null);
  const [active, setActive] = useState<boolean>(false);

  if (!mockSourceRef.current) {
    mockSourceRef.current = new MockLandmarkSource('A', 'correct');
  }

  const handleToggle = (next: boolean) => {
    setActive(next);
    onMockActiveChange(next);
    onMockSourceChange(next ? mockSourceRef.current : null);
  };

  return (
    <MockControlPanel
      mockSource={mockSourceRef.current}
      active={active}
      onToggleActive={handleToggle}
      currentTargetSign={currentTargetSign}
    />
  );
}
