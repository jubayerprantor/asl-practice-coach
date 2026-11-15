import { describe, expect, it } from 'vitest';
import {
  fingerCurl,
  fingertipDistance,
  palmOrientation,
  type FingerName,
} from '../src/engine';
import {
  FIXTURE_LETTER_B_RIGHT,
  FIXTURE_LETTER_V_RIGHT,
} from './fixtures/handFixtures';
import {
  perturbFingerCurl,
  perturbFingertipSpacing,
  perturbWristTilt,
} from './synthetic';

const ALL_FINGERS: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

describe('Synthetic Error Generator (/tests/synthetic.ts)', () => {
  it('generates "V with ring finger half-extended" and leaves all other fingers unchanged', () => {
    const baselineCurls = Object.fromEntries(
      ALL_FINGERS.map((f) => [f, fingerCurl(FIXTURE_LETTER_V_RIGHT, f).totalCurlDeg])
    ) as Record<FingerName, number>;

    // Negative deltaCurlDeg straightens the curled ring finger by ~90°
    const mutated = perturbFingerCurl(
      FIXTURE_LETTER_V_RIGHT,
      'ring',
      -90,
      'Right'
    );

    expect(mutated.perturbation.targetFinger).toBe('ring');
    expect(mutated.perturbation.direction).toBe('less_curled');

    const newRingCurl = fingerCurl(mutated.landmarks, 'ring').totalCurlDeg;
    expect(newRingCurl).toBeLessThan(baselineCurls.ring - 60);

    // Every non-target finger must keep its exact curl angle
    for (const f of ALL_FINGERS) {
      if (f === 'ring') continue;
      const newCurl = fingerCurl(mutated.landmarks, f).totalCurlDeg;
      expect(newCurl).toBeCloseTo(baselineCurls[f], 4);
    }
  });

  it('increases finger curl on an extended finger without affecting neighbors', () => {
    const baseIndexCurl = fingerCurl(FIXTURE_LETTER_B_RIGHT, 'index').totalCurlDeg;
    const baseMiddleCurl = fingerCurl(FIXTURE_LETTER_B_RIGHT, 'middle').totalCurlDeg;

    const mutated = perturbFingerCurl(
      FIXTURE_LETTER_B_RIGHT,
      'index',
      110,
      'Right'
    );

    expect(mutated.perturbation.targetFinger).toBe('index');
    expect(mutated.perturbation.direction).toBe('more_curled');
    expect(fingerCurl(mutated.landmarks, 'index').totalCurlDeg).toBeGreaterThan(
      baseIndexCurl + 80
    );
    expect(fingerCurl(mutated.landmarks, 'middle').totalCurlDeg).toBeCloseTo(
      baseMiddleCurl,
      4
    );
  });

  it('narrows index-middle fingertip spacing in V without changing finger curls', () => {
    const baseSpread = fingertipDistance(
      FIXTURE_LETTER_V_RIGHT,
      'index',
      'middle'
    );
    const baseIndexCurl = fingerCurl(FIXTURE_LETTER_V_RIGHT, 'index').totalCurlDeg;

    const mutated = perturbFingertipSpacing(
      FIXTURE_LETTER_V_RIGHT,
      'index',
      'middle',
      -22,
      'Right'
    );

    const newSpread = fingertipDistance(mutated.landmarks, 'index', 'middle');
    expect(newSpread).toBeLessThan(baseSpread * 0.6);
    expect(fingerCurl(mutated.landmarks, 'index').totalCurlDeg).toBeCloseTo(
      baseIndexCurl,
      4
    );
  });

  it('tilts the wrist orientation while preserving internal finger curls', () => {
    const baseOrient = palmOrientation(FIXTURE_LETTER_B_RIGHT, 'Right');
    const baseIndexCurl = fingerCurl(FIXTURE_LETTER_B_RIGHT, 'index').totalCurlDeg;

    const mutated = perturbWristTilt(
      FIXTURE_LETTER_B_RIGHT,
      { yaw: 35, roll: 15 },
      'Right'
    );

    const newOrient = palmOrientation(mutated.landmarks, 'Right');
    expect(newOrient.facingComponent).not.toBeCloseTo(
      baseOrient.facingComponent,
      1
    );
    expect(fingerCurl(mutated.landmarks, 'index').totalCurlDeg).toBeCloseTo(
      baseIndexCurl,
      4
    );
  });
});
