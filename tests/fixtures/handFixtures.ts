import type { Vec3 } from '../../src/engine';

/**
 * Processed dataset-schema fixture: Open hand / Letter 'B' pose (Right hand)
 * Extended index, middle, ring, pinky; thumb folded across palm.
 */
export const FIXTURE_LETTER_B_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.410, y: 0.700, z: -0.030 }, // 2: THUMB_MCP
  { x: 0.460, y: 0.650, z: -0.035 }, // 3: THUMB_IP
  { x: 0.515, y: 0.620, z: -0.040 }, // 4: THUMB_TIP (tucked across palm)
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.442, y: 0.500, z: -0.012 }, // 6: INDEX_PIP
  { x: 0.440, y: 0.410, z: -0.014 }, // 7: INDEX_DIP
  { x: 0.438, y: 0.330, z: -0.015 }, // 8: INDEX_TIP
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.495, y: 0.480, z: -0.007 }, // 10: MIDDLE_PIP
  { x: 0.495, y: 0.380, z: -0.009 }, // 11: MIDDLE_DIP
  { x: 0.495, y: 0.295, z: -0.010 }, // 12: MIDDLE_TIP
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.542, y: 0.505, z: -0.010 }, // 14: RING_PIP
  { x: 0.544, y: 0.415, z: -0.012 }, // 15: RING_DIP
  { x: 0.545, y: 0.340, z: -0.014 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.586, y: 0.555, z: -0.015 }, // 18: PINKY_PIP
  { x: 0.589, y: 0.485, z: -0.017 }, // 19: PINKY_DIP
  { x: 0.591, y: 0.420, z: -0.019 }, // 20: PINKY_TIP
];

/**
 * Processed dataset-schema fixture: Letter 'V' pose (Right hand)
 * Index & middle extended and spread apart; ring & pinky curled into palm.
 */
export const FIXTURE_LETTER_V_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 }, // 0: WRIST
  { x: 0.440, y: 0.770, z: -0.020 }, // 1: THUMB_CMC
  { x: 0.420, y: 0.700, z: -0.035 }, // 2: THUMB_MCP
  { x: 0.470, y: 0.660, z: -0.045 }, // 3: THUMB_IP
  { x: 0.525, y: 0.650, z: -0.050 }, // 4: THUMB_TIP
  { x: 0.445, y: 0.620, z: -0.010 }, // 5: INDEX_MCP
  { x: 0.420, y: 0.500, z: -0.012 }, // 6: INDEX_PIP
  { x: 0.400, y: 0.410, z: -0.014 }, // 7: INDEX_DIP
  { x: 0.382, y: 0.330, z: -0.015 }, // 8: INDEX_TIP (spread left)
  { x: 0.495, y: 0.610, z: -0.005 }, // 9: MIDDLE_MCP
  { x: 0.515, y: 0.480, z: -0.007 }, // 10: MIDDLE_PIP
  { x: 0.532, y: 0.380, z: -0.009 }, // 11: MIDDLE_DIP
  { x: 0.548, y: 0.295, z: -0.010 }, // 12: MIDDLE_TIP (spread right)
  { x: 0.540, y: 0.625, z: -0.008 }, // 13: RING_MCP
  { x: 0.545, y: 0.575, z: -0.040 }, // 14: RING_PIP (curled)
  { x: 0.540, y: 0.620, z: -0.045 }, // 15: RING_DIP
  { x: 0.535, y: 0.640, z: -0.015 }, // 16: RING_TIP
  { x: 0.582, y: 0.650, z: -0.012 }, // 17: PINKY_MCP
  { x: 0.585, y: 0.605, z: -0.040 }, // 18: PINKY_PIP (curled)
  { x: 0.580, y: 0.650, z: -0.045 }, // 19: PINKY_DIP
  { x: 0.575, y: 0.670, z: -0.015 }, // 20: PINKY_TIP
];

/**
 * Processed dataset-schema fixture: Letter 'C' pose (Right hand)
 * All fingers curved in an open arc, thumb curved opposing
 */
export const FIXTURE_LETTER_C_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.390, y: 0.720, z: -0.030 },
  { x: 0.380, y: 0.640, z: -0.040 },
  { x: 0.420, y: 0.590, z: -0.045 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.430, y: 0.520, z: -0.030 },
  { x: 0.450, y: 0.470, z: -0.055 },
  { x: 0.480, y: 0.460, z: -0.055 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.485, y: 0.510, z: -0.030 },
  { x: 0.505, y: 0.460, z: -0.055 },
  { x: 0.530, y: 0.450, z: -0.055 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.535, y: 0.525, z: -0.030 },
  { x: 0.550, y: 0.480, z: -0.055 },
  { x: 0.570, y: 0.470, z: -0.055 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.580, y: 0.560, z: -0.030 },
  { x: 0.588, y: 0.520, z: -0.050 },
  { x: 0.600, y: 0.505, z: -0.050 },
];

/**
 * Processed dataset-schema fixture: Letter 'O' pose (Right hand)
 * Closed circle - all four fingers curved down to meet upward curved thumb tip
 */
export const FIXTURE_LETTER_O_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.410, y: 0.700, z: -0.030 },
  { x: 0.430, y: 0.630, z: -0.045 },
  { x: 0.465, y: 0.575, z: -0.055 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.430, y: 0.530, z: -0.030 },
  { x: 0.445, y: 0.510, z: -0.055 },
  { x: 0.468, y: 0.560, z: -0.055 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.485, y: 0.525, z: -0.030 },
  { x: 0.490, y: 0.515, z: -0.055 },
  { x: 0.480, y: 0.565, z: -0.055 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.530, y: 0.545, z: -0.030 },
  { x: 0.525, y: 0.535, z: -0.055 },
  { x: 0.500, y: 0.575, z: -0.055 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.575, y: 0.580, z: -0.030 },
  { x: 0.565, y: 0.565, z: -0.050 },
  { x: 0.530, y: 0.590, z: -0.050 },
];

/**
 * Processed dataset-schema fixture: Letter 'D' pose (Right hand)
 * Index straight up, middle/ring/pinky curled down touching thumb
 */
export const FIXTURE_LETTER_D_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.420, y: 0.700, z: -0.030 },
  { x: 0.450, y: 0.640, z: -0.045 },
  { x: 0.490, y: 0.610, z: -0.050 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.442, y: 0.500, z: -0.012 },
  { x: 0.440, y: 0.410, z: -0.014 },
  { x: 0.438, y: 0.330, z: -0.015 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.495, y: 0.540, z: -0.035 },
  { x: 0.495, y: 0.585, z: -0.050 },
  { x: 0.495, y: 0.615, z: -0.045 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.540, y: 0.565, z: -0.035 },
  { x: 0.535, y: 0.615, z: -0.045 },
  { x: 0.530, y: 0.635, z: -0.030 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.580, y: 0.605, z: -0.035 },
  { x: 0.575, y: 0.645, z: -0.040 },
  { x: 0.570, y: 0.665, z: -0.025 },
];

/**
 * Processed dataset-schema fixture: Letter 'F' pose (Right hand)
 * Index touches thumb in circle ("OK" loop), middle/ring/pinky extended up
 */
export const FIXTURE_LETTER_F_RIGHT: Vec3[] = [
  { x: 0.500, y: 0.820, z: 0.000 },
  { x: 0.440, y: 0.770, z: -0.020 },
  { x: 0.410, y: 0.700, z: -0.030 },
  { x: 0.425, y: 0.630, z: -0.045 },
  { x: 0.450, y: 0.580, z: -0.055 },
  { x: 0.445, y: 0.620, z: -0.010 },
  { x: 0.430, y: 0.540, z: -0.035 },
  { x: 0.435, y: 0.530, z: -0.055 },
  { x: 0.452, y: 0.570, z: -0.055 },
  { x: 0.495, y: 0.610, z: -0.005 },
  { x: 0.495, y: 0.480, z: -0.007 },
  { x: 0.495, y: 0.380, z: -0.009 },
  { x: 0.495, y: 0.295, z: -0.010 },
  { x: 0.540, y: 0.625, z: -0.008 },
  { x: 0.542, y: 0.505, z: -0.010 },
  { x: 0.544, y: 0.415, z: -0.012 },
  { x: 0.545, y: 0.340, z: -0.014 },
  { x: 0.582, y: 0.650, z: -0.012 },
  { x: 0.586, y: 0.555, z: -0.015 },
  { x: 0.589, y: 0.485, z: -0.017 },
  { x: 0.591, y: 0.420, z: -0.019 },
];
