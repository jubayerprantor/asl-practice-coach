import type { AnatomicalHandedness, Vec3 } from './types';

export interface LandmarkFrame {
  landmarks: readonly Vec3[] | null;
  worldLandmarks?: readonly Vec3[] | null;
  handedness?: AnatomicalHandedness | null;
  confidence?: number;
  timestampMs?: number;
  status?:
    | 'tracking'
    | 'no_hand'
    | 'two_hands'
    | 'low_confidence'
    | 'disconnected'
    | 'too_far';
}

export interface LandmarkSource {
  subscribe(callback: (frame: LandmarkFrame) => void): () => void;
  start(): void;
  stop(): void;
}

/**
 * CameraLandmarkSource:
 * Placeholder/wrapper for live camera & MediaPipe execution.
 * (Will be fully integrated with HandTrackingService in Step 4).
 */
export class CameraLandmarkSource implements LandmarkSource {
  private subscribers = new Set<(frame: LandmarkFrame) => void>();
  private active = false;

  subscribe(callback: (frame: LandmarkFrame) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  emit(frame: LandmarkFrame): void {
    if (!this.active) return;
    for (const sub of this.subscribers) {
      sub(frame);
    }
  }
}
