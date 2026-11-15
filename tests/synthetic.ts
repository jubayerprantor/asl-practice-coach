/**
 * ============================================================================
 * WARNING — RULE 10: SYNTHETIC DATA FOR UNIT TESTS ONLY
 * These functions generate simulated geometric perturbations of landmark frames.
 * They are NOT real learner mistakes and must NEVER be reported as evidence of
 * real-world recognition or diagnostic accuracy.
 * ============================================================================
 */

import {
  crossVec3,
  LANDMARK_INDEX,
  normalizeVec3,
  subtractVec3,
  type AnatomicalHandedness,
  type FingerName,
  type Vec3,
} from '../src/engine';

export type PerturbationDirection =
  | 'more_curled'
  | 'less_curled'
  | 'spread_wider'
  | 'spread_closer'
  | 'wrist_tilted';

export interface SyntheticPerturbationRecord {
  targetFinger: FingerName | 'wrist';
  secondaryFinger?: FingerName;
  direction: PerturbationDirection;
  magnitude: number;
  description: string;
}

export interface SyntheticErrorSample {
  /** Simulated landmarks (21 points) — synthetic unit-test fixture only */
  landmarks: Vec3[];
  handedness: AnatomicalHandedness;
  /** Ground-truth record of which finger/joint was altered and in which direction */
  perturbation: SyntheticPerturbationRecord;
}

const FINGER_JOINT_INDICES: Record<FingerName, readonly [number, number, number, number]> = {
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

/**
 * Rodrigues' rotation formula: rotates point `p` around `pivot` by `angleRad` about unit `axis`.
 */
function rotatePointAroundAxis(
  p: Vec3,
  pivot: Vec3,
  axis: Vec3,
  angleRad: number
): Vec3 {
  const k = normalizeVec3(axis);
  const v = subtractVec3(p, pivot);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const kCrossV = crossVec3(k, v);
  const kDotV = k.x * v.x + k.y * v.y + k.z * v.z;

  return {
    x: pivot.x + v.x * cosA + kCrossV.x * sinA + k.x * kDotV * (1 - cosA),
    y: pivot.y + v.y * cosA + kCrossV.y * sinA + k.y * kDotV * (1 - cosA),
    z: pivot.z + v.z * cosA + kCrossV.z * sinA + k.z * kDotV * (1 - cosA),
  };
}

function cloneLandmarks(landmarks: readonly Vec3[]): Vec3[] {
  return landmarks.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z }));
}

function computePalmNormal(
  landmarks: readonly Vec3[],
  handedness: AnatomicalHandedness
): Vec3 {
  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const indexMcp = landmarks[LANDMARK_INDEX.INDEX_MCP];
  const middleMcp = landmarks[LANDMARK_INDEX.MIDDLE_MCP];
  const pinkyMcp = landmarks[LANDMARK_INDEX.PINKY_MCP];

  const fingerDir = normalizeVec3(subtractVec3(middleMcp, wrist));
  const pinkyToIndex = subtractVec3(indexMcp, pinkyMcp);

  const raw =
    handedness === 'Left'
      ? crossVec3(fingerDir, pinkyToIndex)
      : crossVec3(pinkyToIndex, fingerDir);

  return normalizeVec3(raw);
}

/**
 * Increases or decreases a single finger's curl angle without modifying any other finger.
 * @param deltaCurlDeg Positive = bend finger further into palm; Negative = extend/straighten finger.
 */
export function perturbFingerCurl(
  landmarks: readonly Vec3[],
  finger: FingerName,
  deltaCurlDeg: number,
  handedness: AnatomicalHandedness = 'Right'
): SyntheticErrorSample {
  const mutated = cloneLandmarks(landmarks);
  const [, pipIdx, dipIdx, tipIdx] = FINGER_JOINT_INDICES[finger];

  const wrist = mutated[LANDMARK_INDEX.WRIST];
  const middleMcp = mutated[LANDMARK_INDEX.MIDDLE_MCP];
  const indexMcp = mutated[LANDMARK_INDEX.INDEX_MCP];
  const pinkyMcp = mutated[LANDMARK_INDEX.PINKY_MCP];

  const fingerDir = normalizeVec3(subtractVec3(middleMcp, wrist));
  const pinkyToIndex = subtractVec3(indexMcp, pinkyMcp);
  const rawNormal =
    handedness === 'Left'
      ? crossVec3(fingerDir, pinkyToIndex)
      : crossVec3(pinkyToIndex, fingerDir);
  const palmNormal = normalizeVec3(rawNormal);

  // Flexion axis across knuckles: perpendicular to palmNormal and fingerDir
  let flexAxis = normalizeVec3(crossVec3(palmNormal, fingerDir));
  if (Math.hypot(flexAxis.x, flexAxis.y, flexAxis.z) < 1e-6) {
    flexAxis = { x: 1, y: 0, z: 0 };
  }

  // Split curl delta across PIP (55%) and DIP (45%) joints
  const totalRad = (deltaCurlDeg * Math.PI) / 180;
  const pipRad = totalRad * 0.55;
  const dipRad = totalRad * 0.45;

  // 1. Rotate DIP, TIP around PIP
  const pipPivot = mutated[pipIdx];
  for (const idx of [dipIdx, tipIdx]) {
    mutated[idx] = rotatePointAroundAxis(mutated[idx], pipPivot, flexAxis, pipRad);
  }

  // 2. Rotate TIP around DIP
  const dipPivot = mutated[dipIdx];
  mutated[tipIdx] = rotatePointAroundAxis(mutated[tipIdx], dipPivot, flexAxis, dipRad);

  const direction: PerturbationDirection =
    deltaCurlDeg >= 0 ? 'more_curled' : 'less_curled';

  return {
    landmarks: mutated,
    handedness,
    perturbation: {
      targetFinger: finger,
      direction,
      magnitude: Math.abs(deltaCurlDeg),
      description: `${finger} ${direction === 'more_curled' ? 'curled' : 'extended'} by ${Math.abs(deltaCurlDeg).toFixed(1)}°`,
    },
  };
}

/**
 * Alters fingertip spacing between two fingers by pivoting them symmetrically in the palm plane.
 * @param deltaSpreadDeg Positive = spread fingertips farther apart; Negative = bring closer together.
 */
export function perturbFingertipSpacing(
  landmarks: readonly Vec3[],
  fingerA: FingerName,
  fingerB: FingerName,
  deltaSpreadDeg: number,
  handedness: AnatomicalHandedness = 'Right'
): SyntheticErrorSample {
  const mutated = cloneLandmarks(landmarks);
  const palmNormal = computePalmNormal(mutated, handedness);

  const chainA = FINGER_JOINT_INDICES[fingerA];
  const chainB = FINGER_JOINT_INDICES[fingerB];
  const mcpA = mutated[chainA[0]];
  const mcpB = mutated[chainB[0]];

  // Determine signed direction that moves fingerA away from fingerB in the palm plane
  const bToA = subtractVec3(mcpA, mcpB);
  const proxA = subtractVec3(mutated[chainA[1]], mcpA);
  const outwardRef = crossVec3(palmNormal, proxA);
  const sign =
    outwardRef.x * bToA.x + outwardRef.y * bToA.y + outwardRef.z * bToA.z >= 0
      ? 1
      : -1;

  const halfAngleRad = ((deltaSpreadDeg * 0.5) * Math.PI) / 180;

  // Pivot finger A distal joints around mcpA
  for (const idx of chainA.slice(1)) {
    mutated[idx] = rotatePointAroundAxis(
      mutated[idx],
      mcpA,
      palmNormal,
      sign * halfAngleRad
    );
  }

  // Pivot finger B distal joints around mcpB in the opposite direction
  for (const idx of chainB.slice(1)) {
    mutated[idx] = rotatePointAroundAxis(
      mutated[idx],
      mcpB,
      palmNormal,
      -sign * halfAngleRad
    );
  }

  const direction: PerturbationDirection =
    deltaSpreadDeg >= 0 ? 'spread_wider' : 'spread_closer';

  return {
    landmarks: mutated,
    handedness,
    perturbation: {
      targetFinger: fingerA,
      secondaryFinger: fingerB,
      direction,
      magnitude: Math.abs(deltaSpreadDeg),
      description: `${fingerA}-${fingerB} spacing ${direction === 'spread_wider' ? 'widened' : 'narrowed'} by ${Math.abs(deltaSpreadDeg).toFixed(1)}°`,
    },
  };
}

/**
 * Tilts the entire hand around the wrist (landmark 0) by Euler angles in degrees.
 */
export function perturbWristTilt(
  landmarks: readonly Vec3[],
  tiltDeg: { pitch?: number; yaw?: number; roll?: number },
  handedness: AnatomicalHandedness = 'Right'
): SyntheticErrorSample {
  let mutated = cloneLandmarks(landmarks);
  const wrist = mutated[LANDMARK_INDEX.WRIST];

  const pitchRad = ((tiltDeg.pitch ?? 0) * Math.PI) / 180;
  const yawRad = ((tiltDeg.yaw ?? 0) * Math.PI) / 180;
  const rollRad = ((tiltDeg.roll ?? 0) * Math.PI) / 180;

  if (pitchRad !== 0) {
    mutated = mutated.map((p) =>
      rotatePointAroundAxis(p, wrist, { x: 1, y: 0, z: 0 }, pitchRad)
    );
  }
  if (yawRad !== 0) {
    mutated = mutated.map((p) =>
      rotatePointAroundAxis(p, wrist, { x: 0, y: 1, z: 0 }, yawRad)
    );
  }
  if (rollRad !== 0) {
    mutated = mutated.map((p) =>
      rotatePointAroundAxis(p, wrist, { x: 0, y: 0, z: 1 }, rollRad)
    );
  }

  const totalTilt = Math.hypot(
    tiltDeg.pitch ?? 0,
    tiltDeg.yaw ?? 0,
    tiltDeg.roll ?? 0
  );

  return {
    landmarks: mutated,
    handedness,
    perturbation: {
      targetFinger: 'wrist',
      direction: 'wrist_tilted',
      magnitude: totalTilt,
      description: `wrist tilted (pitch=${tiltDeg.pitch ?? 0}°, yaw=${tiltDeg.yaw ?? 0}°, roll=${tiltDeg.roll ?? 0}°)`,
    },
  };
}
