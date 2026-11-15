import { describe, expect, it } from 'vitest';
import {
  extractHandFeatures,
  FEATURE_NAMES,
  featureMapToVector,
  mirrorLandmarksX,
} from '../src/engine';
import {
  FIXTURE_LETTER_B_RIGHT,
  FIXTURE_LETTER_V_RIGHT,
} from './fixtures/handFixtures';

describe('Feature Extractor (/src/engine/features.ts)', () => {
  it('produces all 18 finite features matching FEATURE_NAMES order', () => {
    const features = extractHandFeatures(FIXTURE_LETTER_B_RIGHT, 'Right');
    const vec = featureMapToVector(features);

    expect(vec).toHaveLength(FEATURE_NAMES.length);
    for (const val of vec) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it('produces identical curl and fingertip distance features for mirrored Left vs Right hands', () => {
    const rightFeatures = extractHandFeatures(FIXTURE_LETTER_V_RIGHT, 'Right');
    const leftFeatures = extractHandFeatures(
      mirrorLandmarksX(FIXTURE_LETTER_V_RIGHT),
      'Left'
    );

    for (const name of FEATURE_NAMES) {
      if (name === 'orient_roll_rad') {
        // Mirroring across X negates horizontal roll angle
        expect(leftFeatures[name]).toBeCloseTo(-rightFeatures[name], 5);
      } else {
        expect(leftFeatures[name]).toBeCloseTo(rightFeatures[name], 5);
      }
    }
  });
});
