import type { Vec3 } from '../src/engine';
import { extractHandFeatures } from '../src/engine/features';

// Canonical Right-hand landmark poses for C, O, D, F

// 1. Sign 'C': All fingers curved in an open arc, thumb curved opposing
export const FIXTURE_LETTER_C_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.390, y: 0.720, z: -0.030 }, // 2: THUMB_MCP
  { x: 0.380, y: 0.640, z: -0.040 }, // 3: THUMB_IP
  { x: 0.420, y: 0.590, z: -0.045 }, // 4: THUMB_TIP (curved upward)
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.430, y: 0.520, z: -0.030 }, // 6: INDEX_PIP (curved forward)
  { x: 0.450, y: 0.470, z: -0.055 }, // 7: INDEX_DIP
  { x: 0.480, y: 0.460, z: -0.055 }, // 8: INDEX_TIP
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.485, y: 0.510, z: -0.030 }, // 10: MIDDLE_PIP
  { x: 0.505, y: 0.460, z: -0.055 }, // 11: MIDDLE_DIP
  { x: 0.530, y: 0.450, z: -0.055 }, // 12: MIDDLE_TIP
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.535, y: 0.525, z: -0.030 }, // 14: RING_PIP
  { x: 0.550, y: 0.480, z: -0.055 }, // 15: RING_DIP
  { x: 0.570, y: 0.470, z: -0.055 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.580, y: 0.560, z: -0.030 }, // 18: PINKY_PIP
  { x: 0.588, y: 0.520, z: -0.050 }, // 19: PINKY_DIP
  { x: 0.600, y: 0.505, z: -0.050 }, // 20: PINKY_TIP
];

// 2. Sign 'O': Closed circle - fingers curled down to meet upward curved thumb
export const FIXTURE_LETTER_O_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.410, y: 0.700, z: -0.030 }, // 2: THUMB_MCP
  { x: 0.430, y: 0.630, z: -0.045 }, // 3: THUMB_IP
  { x: 0.465, y: 0.575, z: -0.055 }, // 4: THUMB_TIP (touches fingertips)
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.430, y: 0.530, z: -0.030 }, // 6: INDEX_PIP
  { x: 0.445, y: 0.510, z: -0.055 }, // 7: INDEX_DIP
  { x: 0.468, y: 0.560, z: -0.055 }, // 8: INDEX_TIP (contacts thumb tip)
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.485, y: 0.525, z: -0.030 }, // 10: MIDDLE_PIP
  { x: 0.490, y: 0.515, z: -0.055 }, // 11: MIDDLE_DIP
  { x: 0.480, y: 0.565, z: -0.055 }, // 12: MIDDLE_TIP (contacts thumb tip)
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.530, y: 0.545, z: -0.030 }, // 14: RING_PIP
  { x: 0.525, y: 0.535, z: -0.055 }, // 15: RING_DIP
  { x: 0.500, y: 0.575, z: -0.055 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.575, y: 0.580, z: -0.030 }, // 18: PINKY_PIP
  { x: 0.565, y: 0.565, z: -0.050 }, // 19: PINKY_DIP
  { x: 0.530, y: 0.590, z: -0.050 }, // 20: PINKY_TIP
];

// 3. Sign 'D': Index straight up, middle/ring/pinky curled touching thumb
export const FIXTURE_LETTER_D_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.420, y: 0.700, z: -0.030 }, // 2: THUMB_MCP
  { x: 0.450, y: 0.640, z: -0.045 }, // 3: THUMB_IP
  { x: 0.490, y: 0.610, z: -0.050 }, // 4: THUMB_TIP (touches middle finger pad)
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.442, y: 0.500, z: -0.012 }, // 6: INDEX_PIP (extended)
  { x: 0.440, y: 0.410, z: -0.014 }, // 7: INDEX_DIP
  { x: 0.438, y: 0.330, z: -0.015 }, // 8: INDEX_TIP (pointing straight UP)
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.495, y: 0.540, z: -0.035 }, // 10: MIDDLE_PIP (curled into circle)
  { x: 0.495, y: 0.585, z: -0.050 }, // 11: MIDDLE_DIP
  { x: 0.495, y: 0.615, z: -0.045 }, // 12: MIDDLE_TIP
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.540, y: 0.565, z: -0.035 }, // 14: RING_PIP (curled into palm)
  { x: 0.535, y: 0.615, z: -0.045 }, // 15: RING_DIP
  { x: 0.530, y: 0.635, z: -0.030 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.580, y: 0.605, z: -0.035 }, // 18: PINKY_PIP (curled)
  { x: 0.575, y: 0.645, z: -0.040 }, // 19: PINKY_DIP
  { x: 0.570, y: 0.665, z: -0.025 }, // 20: PINKY_TIP
];

// 4. Sign 'F': Index touches thumb ("OK" ring), middle/ring/pinky extended UP
export const FIXTURE_LETTER_F_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.410, y: 0.700, z: -0.030 }, // 2: THUMB_MCP
  { x: 0.425, y: 0.630, z: -0.045 }, // 3: THUMB_IP
  { x: 0.450, y: 0.580, z: -0.055 }, // 4: THUMB_TIP (touches index tip)
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.430, y: 0.540, z: -0.035 }, // 6: INDEX_PIP (curled to thumb)
  { x: 0.435, y: 0.530, z: -0.055 }, // 7: INDEX_DIP
  { x: 0.452, y: 0.570, z: -0.055 }, // 8: INDEX_TIP (touches thumb tip)
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.495, y: 0.480, z: -0.007 }, // 10: MIDDLE_PIP (extended UP)
  { x: 0.495, y: 0.380, z: -0.009 }, // 11: MIDDLE_DIP
  { x: 0.495, y: 0.295, z: -0.010 }, // 12: MIDDLE_TIP
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.542, y: 0.505, z: -0.010 }, // 14: RING_PIP (extended UP)
  { x: 0.544, y: 0.415, z: -0.012 }, // 15: RING_DIP
  { x: 0.545, y: 0.340, z: -0.014 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.586, y: 0.555, z: -0.015 }, // 18: PINKY_PIP (extended UP)
  { x: 0.589, y: 0.485, z: -0.017 }, // 19: PINKY_DIP
  { x: 0.591, y: 0.420, z: -0.019 }, // 20: PINKY_TIP
];

function printFeatures(name: string, landmarks: Vec3[]) {
  const feats = extractHandFeatures(landmarks, 'Right');
  console.log(`\n=== Features for Sign ${name} ===`);
  console.log(`curl_thumb_deg:   ${feats.curl_thumb_deg.toFixed(1)}°`);
  console.log(`curl_index_deg:   ${feats.curl_index_deg.toFixed(1)}°`);
  console.log(`curl_middle_deg:  ${feats.curl_middle_deg.toFixed(1)}°`);
  console.log(`curl_ring_deg:    ${feats.curl_ring_deg.toFixed(1)}°`);
  console.log(`curl_pinky_deg:   ${feats.curl_pinky_deg.toFixed(1)}°`);
  console.log(`dist_thumb_index: ${feats.dist_thumb_index.toFixed(3)}`);
  console.log(`dist_thumb_middle:${feats.dist_thumb_middle.toFixed(3)}`);
  console.log(`dist_thumb_ring:  ${feats.dist_thumb_ring.toFixed(3)}`);
  console.log(`dist_index_middle:${feats.dist_index_middle.toFixed(3)}`);
  console.log(`dist_middle_ring: ${feats.dist_middle_ring.toFixed(3)}`);
  console.log(`dist_ring_pinky:  ${feats.dist_ring_pinky.toFixed(3)}`);
}

printFeatures('C', FIXTURE_LETTER_C_RIGHT);
printFeatures('O', FIXTURE_LETTER_O_RIGHT);
printFeatures('D', FIXTURE_LETTER_D_RIGHT);
printFeatures('F', FIXTURE_LETTER_F_RIGHT);
