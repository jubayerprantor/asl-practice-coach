import {
  fingerCurl,
  fingertipDistance,
  normalizeHand,
  palmOrientation,
} from './geometry';
import type { AnatomicalHandedness, FingerName, Vec3 } from './types';

export const FINGER_ORDER: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

export const FINGERTIP_PAIRS: ReadonlyArray<readonly [FingerName, FingerName]> = [
  ['thumb', 'index'],
  ['thumb', 'middle'],
  ['thumb', 'ring'],
  ['thumb', 'pinky'],
  ['index', 'middle'],
  ['index', 'ring'],
  ['index', 'pinky'],
  ['middle', 'ring'],
  ['middle', 'pinky'],
  ['ring', 'pinky'],
];

export const FEATURE_NAMES = [
  'curl_thumb_deg',
  'curl_index_deg',
  'curl_middle_deg',
  'curl_ring_deg',
  'curl_pinky_deg',
  'dist_thumb_index',
  'dist_thumb_middle',
  'dist_thumb_ring',
  'dist_thumb_pinky',
  'dist_index_middle',
  'dist_index_ring',
  'dist_index_pinky',
  'dist_middle_ring',
  'dist_middle_pinky',
  'dist_ring_pinky',
  'orient_roll_rad',
  'orient_pitch',
  'orient_facing',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export type HandFeatureMap = Record<FeatureName, number>;

/**
 * Extracts a fixed-length, scale- and mirror-normalized geometric feature map
 * from raw 21-point hand landmarks.
 */
export function extractHandFeatures(
  landmarks: readonly Vec3[],
  handedness: AnatomicalHandedness = 'Right'
): HandFeatureMap {
  // Canonicalize hand coordinates (handles Left/Right mirror consistency)
  const canonical = normalizeHand(landmarks, handedness);

  // Palm orientation in image/camera space (accounts for anatomical handedness)
  const orientation = palmOrientation(landmarks, handedness);

  return {
    curl_thumb_deg: fingerCurl(canonical, 'thumb').totalCurlDeg,
    curl_index_deg: fingerCurl(canonical, 'index').totalCurlDeg,
    curl_middle_deg: fingerCurl(canonical, 'middle').totalCurlDeg,
    curl_ring_deg: fingerCurl(canonical, 'ring').totalCurlDeg,
    curl_pinky_deg: fingerCurl(canonical, 'pinky').totalCurlDeg,

    dist_thumb_index: fingertipDistance(canonical, 'thumb', 'index'),
    dist_thumb_middle: fingertipDistance(canonical, 'thumb', 'middle'),
    dist_thumb_ring: fingertipDistance(canonical, 'thumb', 'ring'),
    dist_thumb_pinky: fingertipDistance(canonical, 'thumb', 'pinky'),
    dist_index_middle: fingertipDistance(canonical, 'index', 'middle'),
    dist_index_ring: fingertipDistance(canonical, 'index', 'ring'),
    dist_index_pinky: fingertipDistance(canonical, 'index', 'pinky'),
    dist_middle_ring: fingertipDistance(canonical, 'middle', 'ring'),
    dist_middle_pinky: fingertipDistance(canonical, 'middle', 'pinky'),
    dist_ring_pinky: fingertipDistance(canonical, 'ring', 'pinky'),

    orient_roll_rad: orientation.rollRad,
    orient_pitch: orientation.pitchComponent,
    orient_facing: orientation.facingComponent,
  };
}

export function featureMapToVector(features: HandFeatureMap): number[] {
  return FEATURE_NAMES.map((name) => features[name]);
}
