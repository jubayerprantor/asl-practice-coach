import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type CameraPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'error';

export interface LatestHandFrame {
  landmarks: NormalizedLandmark[] | null;
  worldLandmarks: NormalizedLandmark[] | null;
  /** Raw MediaPipe handedness ('Left' | 'Right') before mirror correction */
  rawHandedness: 'Left' | 'Right' | null;
  /** Anatomical handedness accounting for mirrored webcam feed */
  anatomicalHandedness: 'Left' | 'Right' | null;
  score: number;
  timestampMs: number;
}
