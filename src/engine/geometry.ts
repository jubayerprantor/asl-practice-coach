import type {
  AnatomicalHandedness,
  FingerCurlMetrics,
  FingerName,
  PalmOrientationMetrics,
  Vec3,
} from './types';

export const EXPECTED_LANDMARK_COUNT = 21;

export const LANDMARK_INDEX = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

const FINGER_CHAINS: Record<FingerName, readonly [number, number, number, number]> = {
  thumb: [
    LANDMARK_INDEX.THUMB_CMC,
    LANDMARK_INDEX.THUMB_MCP,
    LANDMARK_INDEX.THUMB_IP,
    LANDMARK_INDEX.THUMB_TIP,
  ],
  index: [
    LANDMARK_INDEX.INDEX_MCP,
    LANDMARK_INDEX.INDEX_PIP,
    LANDMARK_INDEX.INDEX_DIP,
    LANDMARK_INDEX.INDEX_TIP,
  ],
  middle: [
    LANDMARK_INDEX.MIDDLE_MCP,
    LANDMARK_INDEX.MIDDLE_PIP,
    LANDMARK_INDEX.MIDDLE_DIP,
    LANDMARK_INDEX.MIDDLE_TIP,
  ],
  ring: [
    LANDMARK_INDEX.RING_MCP,
    LANDMARK_INDEX.RING_PIP,
    LANDMARK_INDEX.RING_DIP,
    LANDMARK_INDEX.RING_TIP,
  ],
  pinky: [
    LANDMARK_INDEX.PINKY_MCP,
    LANDMARK_INDEX.PINKY_PIP,
    LANDMARK_INDEX.PINKY_DIP,
    LANDMARK_INDEX.PINKY_TIP,
  ],
};

const FINGERTIP_INDEX: Record<FingerName, number> = {
  thumb: LANDMARK_INDEX.THUMB_TIP,
  index: LANDMARK_INDEX.INDEX_TIP,
  middle: LANDMARK_INDEX.MIDDLE_TIP,
  ring: LANDMARK_INDEX.RING_TIP,
  pinky: LANDMARK_INDEX.PINKY_TIP,
};

function assertValidLandmarks(landmarks: readonly Vec3[]): void {
  if (!landmarks || landmarks.length !== EXPECTED_LANDMARK_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_LANDMARK_COUNT} landmarks, received ${landmarks?.length ?? 0}`
    );
  }
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function lengthVec3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalizeVec3(v: Vec3): Vec3 {
  const len = lengthVec3(v);
  if (len < 1e-9) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function distanceVec3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Computes the interior angle at vertex B formed by segments BA and BC, in radians [0, PI].
 */
export function jointAngle(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = subtractVec3(a, b);
  const bc = subtractVec3(c, b);
  const lenBa = lengthVec3(ba);
  const lenBc = lengthVec3(bc);

  if (lenBa < 1e-9 || lenBc < 1e-9) {
    return 0;
  }

  const cosTheta = Math.max(-1, Math.min(1, dotVec3(ba, bc) / (lenBa * lenBc)));
  return Math.acos(cosTheta);
}

/**
 * Mirrors raw normalized landmarks horizontally across x = 0.5 (for testing left/right symmetry).
 */
export function mirrorLandmarksX(landmarks: readonly Vec3[]): Vec3[] {
  assertValidLandmarks(landmarks);
  return landmarks.map((pt) => ({
    x: 1 - pt.x,
    y: pt.y,
    z: pt.z,
  }));
}

/**
 * Normalizes 21 hand landmarks into a canonical, invariant palm coordinate frame:
 * 1. Translates wrist (0) to origin (0, 0, 0).
 * 2. Scales uniformly by palm length: distance(wrist[0], middle_MCP[9]).
 * 3. Rotates into an orthonormal palm basis:
 *    - +Y points from wrist (0) to middle MCP (9).
 *    - +X points toward the index-finger side of the palm (canonical right-hand frame).
 *    - +Z is orthogonal to the palm plane (+X cross +Y).
 * 4. If handedness === 'Left', mirrors into canonical right-hand coordinates so downstream
 *    geometric comparisons work identically for both left and right hands.
 */
export function normalizeHand(
  landmarks: readonly Vec3[],
  handedness: AnatomicalHandedness = 'Right'
): Vec3[] {
  assertValidLandmarks(landmarks);

  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const indexMcp = landmarks[LANDMARK_INDEX.INDEX_MCP];
  const middleMcp = landmarks[LANDMARK_INDEX.MIDDLE_MCP];
  const pinkyMcp = landmarks[LANDMARK_INDEX.PINKY_MCP];

  const wristToMiddle = subtractVec3(middleMcp, wrist);
  const palmScale = lengthVec3(wristToMiddle);
  if (palmScale < 1e-9) {
    throw new Error('Degenerate hand landmarks: zero palm scale');
  }

  // +Y axis: wrist -> middle MCP
  const yAxis = normalizeVec3(wristToMiddle);

  // Reference vector across the palm from pinky MCP (17) toward index MCP (5)
  const pinkyToIndex = subtractVec3(indexMcp, pinkyMcp);

  // For a canonical right hand, (pinkyToIndex x yAxis) defines the palm normal (+Z)
  // For a left hand (mirror reflection), the cross product reverses sign, so we negate it
  const rawZ =
    handedness === 'Left'
      ? crossVec3(yAxis, pinkyToIndex)
      : crossVec3(pinkyToIndex, yAxis);

  const zAxis = normalizeVec3(rawZ);
  // +X = Y cross Z ensures a right-handed orthonormal frame pointing toward the index side
  const xAxis = normalizeVec3(crossVec3(yAxis, zAxis));

  return landmarks.map((pt) => {
    const rel = subtractVec3(pt, wrist);
    return {
      x: ((handedness === 'Left' ? -1 : 1) * dotVec3(rel, xAxis)) / palmScale,
      y: dotVec3(rel, yAxis) / palmScale,
      z: dotVec3(rel, zAxis) / palmScale,
    };
  });
}

/**
 * Computes joint bend angles (in degrees, where 0° = completely straight) for a given finger.
 * Because joint angles are purely relative, they are naturally invariant to scale, translation,
 * rotation, and handedness.
 */
export function fingerCurl(
  landmarks: readonly Vec3[],
  finger: FingerName
): FingerCurlMetrics {
  assertValidLandmarks(landmarks);

  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const [j0, j1, j2, j3] = FINGER_CHAINS[finger];

  const mcpInteriorRad = jointAngle(wrist, landmarks[j0], landmarks[j1]);
  const pipInteriorRad = jointAngle(landmarks[j0], landmarks[j1], landmarks[j2]);
  const dipInteriorRad = jointAngle(landmarks[j1], landmarks[j2], landmarks[j3]);

  const radToDeg = 180 / Math.PI;
  const mcpBendDeg = (Math.PI - mcpInteriorRad) * radToDeg;
  const pipBendDeg = (Math.PI - pipInteriorRad) * radToDeg;
  const dipBendDeg = (Math.PI - dipInteriorRad) * radToDeg;

  return {
    mcpBendDeg,
    pipBendDeg,
    dipBendDeg,
    totalCurlDeg: pipBendDeg + dipBendDeg,
  };
}

/**
 * Computes Euclidean distance between two fingertips normalized by palm size (wrist[0] -> middle_MCP[9]).
 */
export function fingertipDistance(
  landmarks: readonly Vec3[],
  fingerA: FingerName,
  fingerB: FingerName
): number {
  assertValidLandmarks(landmarks);

  const palmScale = distanceVec3(
    landmarks[LANDMARK_INDEX.WRIST],
    landmarks[LANDMARK_INDEX.MIDDLE_MCP]
  );
  if (palmScale < 1e-9) {
    throw new Error('Degenerate hand landmarks: zero palm scale');
  }

  const tipA = landmarks[FINGERTIP_INDEX[fingerA]];
  const tipB = landmarks[FINGERTIP_INDEX[fingerB]];
  return distanceVec3(tipA, tipB) / palmScale;
}

/**
 * Computes palm orientation vectors and roll/pitch/facing components in camera/image space.
 * Accounts for handedness so the palm normal always points outward from the palmar surface.
 */
export function palmOrientation(
  landmarks: readonly Vec3[],
  handedness: AnatomicalHandedness = 'Right'
): PalmOrientationMetrics {
  assertValidLandmarks(landmarks);

  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const indexMcp = landmarks[LANDMARK_INDEX.INDEX_MCP];
  const middleMcp = landmarks[LANDMARK_INDEX.MIDDLE_MCP];
  const pinkyMcp = landmarks[LANDMARK_INDEX.PINKY_MCP];

  const fingerDirection = normalizeVec3(subtractVec3(middleMcp, wrist));
  const pinkyToIndex = subtractVec3(indexMcp, pinkyMcp);

  const rawNormal =
    handedness === 'Left'
      ? crossVec3(fingerDirection, pinkyToIndex)
      : crossVec3(pinkyToIndex, fingerDirection);

  const palmNormal = normalizeVec3(rawNormal);

  // In image coordinates (+y is downward), an upright hand has fingerDirection.y < 0, fingerDirection.x ~ 0
  const rollRad = Math.atan2(fingerDirection.x, -fingerDirection.y);

  return {
    palmNormal,
    fingerDirection,
    rollRad,
    pitchComponent: palmNormal.y,
    facingComponent: palmNormal.z,
  };
}
