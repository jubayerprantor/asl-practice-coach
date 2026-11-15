export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export type AnatomicalHandedness = 'Left' | 'Right';

export interface FingerCurlMetrics {
  /** Angle in degrees at the MCP / CMC joint (0° = straight, higher = bent) */
  mcpBendDeg: number;
  /** Angle in degrees at the PIP / MCP joint (0° = straight, higher = bent) */
  pipBendDeg: number;
  /** Angle in degrees at the DIP / IP joint (0° = straight, higher = bent) */
  dipBendDeg: number;
  /** Sum of PIP + DIP bend angles in degrees (primary continuous curl metric) */
  totalCurlDeg: number;
}

export interface PalmOrientationMetrics {
  /** Unit normal vector perpendicular to the palm plane in raw input coordinates */
  palmNormal: Vec3;
  /** Unit direction vector from wrist (0) toward middle MCP (9) in raw input coordinates */
  fingerDirection: Vec3;
  /** Roll angle in radians around the camera Z-axis (0 = upright fingers pointing up in image y) */
  rollRad: number;
  /** Pitch component (palmNormal.y: +1 facing down, -1 facing up) */
  pitchComponent: number;
  /** Yaw/facing component (palmNormal.z: negative = facing camera in MediaPipe coords) */
  facingComponent: number;
}
