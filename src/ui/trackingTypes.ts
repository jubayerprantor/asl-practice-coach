import type { Vec3 } from '../engine';

export type CameraPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'error';

export interface LatestHandFrame {
  landmarks: Vec3[] | null;
  worldLandmarks: Vec3[] | null;
  /** Raw MediaPipe handedness ('Left' | 'Right') before mirror correction */
  rawHandedness: 'Left' | 'Right' | null;
  /** Anatomical handedness accounting for mirrored webcam feed */
  anatomicalHandedness: 'Left' | 'Right' | null;
  score: number;
  timestampMs: number;
}
