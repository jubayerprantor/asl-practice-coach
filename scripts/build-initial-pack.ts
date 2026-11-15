import fs from 'fs';
import path from 'path';
import type { ReferencePackFile, ThresholdsPackFile, SignThresholdSpec, FeatureConditionRule } from '../src/packs/schema';
import type { Vec3 } from '../src/engine';
import { FIXTURE_LETTER_B_RIGHT, FIXTURE_LETTER_V_RIGHT } from '../tests/fixtures/handFixtures';

const FIXTURE_LETTER_A_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.410, y: 0.700, z: -0.030 },
  { x: 0.415, y: 0.620, z: -0.020 },
  { x: 0.420, y: 0.550, z: -0.015 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.445, y: 0.560, z: -0.040 },
  { x: 0.450, y: 0.610, z: -0.045 },
  { x: 0.455, y: 0.640, z: -0.020 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.495, y: 0.550, z: -0.040 },
  { x: 0.500, y: 0.605, z: -0.045 },
  { x: 0.505, y: 0.635, z: -0.020 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.545, y: 0.575, z: -0.040 },
  { x: 0.540, y: 0.620, z: -0.045 },
  { x: 0.535, y: 0.640, z: -0.015 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.585, y: 0.605, z: -0.040 },
  { x: 0.580, y: 0.650, z: -0.045 },
  { x: 0.575, y: 0.670, z: -0.015 },
];

const FIXTURE_LETTER_L_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.380, y: 0.750, z: -0.030 },
  { x: 0.320, y: 0.750, z: -0.030 },
  { x: 0.260, y: 0.750, z: -0.030 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.442, y: 0.500, z: -0.012 },
  { x: 0.440, y: 0.410, z: -0.014 },
  { x: 0.438, y: 0.330, z: -0.015 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.495, y: 0.550, z: -0.040 },
  { x: 0.500, y: 0.605, z: -0.045 },
  { x: 0.505, y: 0.635, z: -0.020 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.545, y: 0.575, z: -0.040 },
  { x: 0.540, y: 0.620, z: -0.045 },
  { x: 0.535, y: 0.640, z: -0.015 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.585, y: 0.605, z: -0.040 },
  { x: 0.580, y: 0.650, z: -0.045 },
  { x: 0.575, y: 0.670, z: -0.015 },
];

const FIXTURE_LETTER_Y_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.380, y: 0.750, z: -0.030 },
  { x: 0.320, y: 0.750, z: -0.030 },
  { x: 0.260, y: 0.750, z: -0.030 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.445, y: 0.550, z: -0.040 },
  { x: 0.450, y: 0.605, z: -0.045 },
  { x: 0.455, y: 0.635, z: -0.020 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.495, y: 0.550, z: -0.040 },
  { x: 0.500, y: 0.605, z: -0.045 },
  { x: 0.505, y: 0.635, z: -0.020 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.545, y: 0.575, z: -0.040 },
  { x: 0.540, y: 0.620, z: -0.045 },
  { x: 0.535, y: 0.640, z: -0.015 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.630, y: 0.560, z: -0.015 },
  { x: 0.670, y: 0.490, z: -0.017 },
  { x: 0.710, y: 0.430, z: -0.019 },
];

const referenceData: ReferencePackFile = {
  schemaVersion: '1.0.0',
  language: 'asl',
  signs: {
    A: {
      sign: 'A',
      authoredByHuman: true,
      summary: 'Make a fist with your four fingers curled into your palm. Keep your thumb upright resting alongside the outer edge of your index finger.',
      fingerNotes: {
        thumb: 'Rest thumb straight up against the side of your index knuckle, not tucked over fingers.',
        index: 'Curled tightly into the palm.',
        middle: 'Curled tightly into the palm.',
        ring: 'Curled tightly into the palm.',
        pinky: 'Curled tightly into the palm.',
      },
      orientationNote: 'Palm faces outward toward the viewer with an upright wrist.',
      canonicalLandmarks: FIXTURE_LETTER_A_RIGHT,
    },
    B: {
      sign: 'B',
      authoredByHuman: true,
      summary: 'Hold all four fingers straight up and pressed together. Fold your thumb flat across your palm under the fingers.',
      fingerNotes: {
        thumb: 'Folded flat across the palm.',
        index: 'Fully extended upward and touching middle finger.',
        middle: 'Fully extended upward and touching index and ring fingers.',
        ring: 'Fully extended upward and touching middle and pinky fingers.',
        pinky: 'Fully extended upward and touching ring finger.',
      },
      orientationNote: 'Palm faces directly outward with hand held vertically.',
      canonicalLandmarks: FIXTURE_LETTER_B_RIGHT,
    },
    L: {
      sign: 'L',
      authoredByHuman: true,
      summary: 'Extend your thumb horizontally and index finger vertically to form a right-angle "L" shape. Curl middle, ring, and pinky into your palm.',
      fingerNotes: {
        thumb: 'Extended horizontally outward to the side at a 90° angle.',
        index: 'Extended straight upward vertically.',
        middle: 'Curled tightly into the palm.',
        ring: 'Curled tightly into the palm.',
        pinky: 'Curled tightly into the palm.',
      },
      orientationNote: 'Palm faces outward toward the viewer.',
      canonicalLandmarks: FIXTURE_LETTER_L_RIGHT,
    },
    V: {
      sign: 'V',
      authoredByHuman: true,
      summary: 'Extend your index and middle fingers upward in a separated "V" (peace) shape. Fold your thumb over your curled ring and pinky fingers.',
      fingerNotes: {
        thumb: 'Folded across palm holding down ring and pinky fingers.',
        index: 'Fully extended upward and angled slightly outward.',
        middle: 'Fully extended upward and angled slightly outward.',
        ring: 'Curled tightly into the palm.',
        pinky: 'Curled tightly into the palm.',
      },
      orientationNote: 'Palm faces directly outward with fingers spread into a "V".',
      canonicalLandmarks: FIXTURE_LETTER_V_RIGHT,
    },
    Y: {
      sign: 'Y',
      authoredByHuman: true,
      summary: 'Extend your thumb outward to the side and pinky outward to the opposite side ("hang loose" shape). Curl your index, middle, and ring fingers into your palm.',
      fingerNotes: {
        thumb: 'Extended fully outward to the side.',
        index: 'Curled tightly into the palm.',
        middle: 'Curled tightly into the palm.',
        ring: 'Curled tightly into the palm.',
        pinky: 'Extended fully outward to the side.',
      },
      orientationNote: 'Palm faces forward toward the viewer.',
      canonicalLandmarks: FIXTURE_LETTER_Y_RIGHT,
    },
  },
};

function makeSignThresholds(
  sign: string,
  specs: {
    thumb: { min: number; max: number };
    index: { min: number; max: number };
    middle: { min: number; max: number };
    ring: { min: number; max: number };
    pinky: { min: number; max: number };
    spacing?: {
      feature: 'dist_index_middle';
      min: number;
      max: number;
      feedbackBelow: string;
      feedbackAbove: string;
    };
  }
): SignThresholdSpec {
  const conditions: FeatureConditionRule[] = [
    {
      id: 'thumb_curl',
      feature: 'curl_thumb_deg',
      finger: 'thumb',
      label: 'thumb curl',
      feedbackKeyBelow: 'thumb_curl_more',
      feedbackKeyAbove: 'thumb_extend_more',
      priority: 2,
      min: specs.thumb.min,
      max: specs.thumb.max,
    },
    {
      id: 'index_curl',
      feature: 'curl_index_deg',
      finger: 'index',
      label: 'index curl',
      feedbackKeyBelow: 'index_curl_more',
      feedbackKeyAbove: 'index_extend_more',
      priority: 1,
      min: specs.index.min,
      max: specs.index.max,
    },
    {
      id: 'middle_curl',
      feature: 'curl_middle_deg',
      finger: 'middle',
      label: 'middle curl',
      feedbackKeyBelow: 'middle_curl_more',
      feedbackKeyAbove: 'middle_extend_more',
      priority: 1,
      min: specs.middle.min,
      max: specs.middle.max,
    },
    {
      id: 'ring_curl',
      feature: 'curl_ring_deg',
      finger: 'ring',
      label: 'ring curl',
      feedbackKeyBelow: 'ring_curl_more',
      feedbackKeyAbove: 'ring_extend_more',
      priority: 1,
      min: specs.ring.min,
      max: specs.ring.max,
    },
    {
      id: 'pinky_curl',
      feature: 'curl_pinky_deg',
      finger: 'pinky',
      label: 'pinky curl',
      feedbackKeyBelow: 'pinky_curl_more',
      feedbackKeyAbove: 'pinky_extend_more',
      priority: 1,
      min: specs.pinky.min,
      max: specs.pinky.max,
    },
  ];

  if (specs.spacing) {
    conditions.push({
      id: 'index_middle_spread',
      feature: specs.spacing.feature,
      finger: 'index',
      label: 'index-middle spacing',
      feedbackKeyBelow: specs.spacing.feedbackBelow,
      feedbackKeyAbove: specs.spacing.feedbackAbove,
      priority: 3,
      min: specs.spacing.min,
      max: specs.spacing.max,
    });
  }

  return {
    sign,
    status: 'provisional',
    derivedFromDataset: 'canonical_fixtures',
    checkedAgainstDataset: null,
    sampleCount: 1,
    conditions,
  };
}

const thresholdsData: ThresholdsPackFile = {
  schemaVersion: '1.0.0',
  language: 'asl',
  status: 'provisional',
  generatedAt: new Date().toISOString(),
  percentileLow: 5,
  percentileHigh: 95,
  signs: {
    A: makeSignThresholds('A', {
      thumb: { min: 0, max: 65 },
      index: { min: 140, max: 270 },
      middle: { min: 140, max: 270 },
      ring: { min: 140, max: 270 },
      pinky: { min: 140, max: 270 },
    }),
    B: makeSignThresholds('B', {
      thumb: { min: 60, max: 135 },
      index: { min: 0, max: 45 },
      middle: { min: 0, max: 45 },
      ring: { min: 0, max: 45 },
      pinky: { min: 0, max: 45 },
      spacing: {
        feature: 'dist_index_middle',
        min: 0,
        max: 0.55,
        feedbackBelow: 'index_middle_spread_more',
        feedbackAbove: 'index_middle_bring_together',
      },
    }),
    L: makeSignThresholds('L', {
      thumb: { min: 0, max: 55 },
      index: { min: 0, max: 45 },
      middle: { min: 140, max: 270 },
      ring: { min: 140, max: 270 },
      pinky: { min: 140, max: 270 },
    }),
    V: makeSignThresholds('V', {
      thumb: { min: 65, max: 135 },
      index: { min: 0, max: 45 },
      middle: { min: 0, max: 45 },
      ring: { min: 140, max: 270 },
      pinky: { min: 140, max: 270 },
      spacing: {
        feature: 'dist_index_middle',
        min: 0.45,
        max: 2.50,
        feedbackBelow: 'index_middle_spread_more',
        feedbackAbove: 'index_middle_bring_together',
      },
    }),
    Y: makeSignThresholds('Y', {
      thumb: { min: 0, max: 55 },
      index: { min: 140, max: 270 },
      middle: { min: 140, max: 270 },
      ring: { min: 140, max: 270 },
      pinky: { min: 0, max: 45 },
    }),
  },
};

const root = process.cwd();
fs.writeFileSync(
  path.join(root, 'src/packs/asl/reference.json'),
  JSON.stringify(referenceData, null, 2) + '\n',
  'utf-8'
);
fs.writeFileSync(
  path.join(root, 'src/packs/asl/thresholds.json'),
  JSON.stringify(thresholdsData, null, 2) + '\n',
  'utf-8'
);
console.log('Successfully generated reference.json and thresholds.json for signs A, B, L, V, Y');
