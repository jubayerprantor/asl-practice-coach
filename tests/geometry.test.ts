import { describe, expect, it } from 'vitest';
import {
  fingerCurl,
  fingertipDistance,
  HandLandmarkSmoother,
  jointAngle,
  mirrorLandmarksX,
  normalizeHand,
  palmOrientation,
  type Vec3,
} from '../src/engine';
import {
  FIXTURE_LETTER_B_RIGHT,
  FIXTURE_LETTER_V_RIGHT,
} from './fixtures/handFixtures';

/**
 * Helper: applies uniform scale, 3D Euler rotation (Rx, Ry, Rz), and 3D translation.
 */
function transformLandmarks(
  landmarks: readonly Vec3[],
  options: {
    scale: number;
    rx: number;
    ry: number;
    rz: number;
    tx: number;
    ty: number;
    tz: number;
  }
): Vec3[] {
  const { scale, rx, ry, rz, tx, ty, tz } = options;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  return landmarks.map((p) => {
    // Scale
    let x = p.x * scale;
    let y = p.y * scale;
    let z = p.z * scale;

    // Rotate X
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    y = y1;
    z = z1;

    // Rotate Y
    const x2 = x * cy + z * sy;
    const z2 = -x * sy + z * cy;
    x = x2;
    z = z2;

    // Rotate Z
    const x3 = x * cz - y * sz;
    const y3 = x * sz + y * cz;
    x = x3;
    y = y3;

    // Translate
    return { x: x + tx, y: y + ty, z: z + tz };
  });
}

describe('Geometry Module (/src/engine/geometry.ts)', () => {
  it('computes exact interior angles in jointAngle()', () => {
    const a: Vec3 = { x: 1, y: 0, z: 0 };
    const b: Vec3 = { x: 0, y: 0, z: 0 };
    const c90: Vec3 = { x: 0, y: 1, z: 0 };
    const c180: Vec3 = { x: -1, y: 0, z: 0 };

    expect(jointAngle(a, b, c90)).toBeCloseTo(Math.PI / 2, 6);
    expect(jointAngle(a, b, c180)).toBeCloseTo(Math.PI, 6);
  });

  it('places wrist at origin and middle MCP at (0, 1, 0) in normalizeHand()', () => {
    const norm = normalizeHand(FIXTURE_LETTER_B_RIGHT, 'Right');

    expect(norm[0].x).toBeCloseTo(0, 6);
    expect(norm[0].y).toBeCloseTo(0, 6);
    expect(norm[0].z).toBeCloseTo(0, 6);

    expect(norm[9].x).toBeCloseTo(0, 6);
    expect(norm[9].y).toBeCloseTo(1, 6);
    expect(norm[9].z).toBeCloseTo(0, 6);
  });

  it('is strictly invariant to translation, uniform scaling, and arbitrary 3D rotation', () => {
    const baseline = normalizeHand(FIXTURE_LETTER_V_RIGHT, 'Right');

    const transformed = transformLandmarks(FIXTURE_LETTER_V_RIGHT, {
      scale: 3.75,
      rx: 0.65,
      ry: -0.82,
      rz: 1.35,
      tx: -12.4,
      ty: 8.9,
      tz: 4.2,
    });

    const normalizedTransformed = normalizeHand(transformed, 'Right');

    expect(normalizedTransformed).toHaveLength(21);
    for (let i = 0; i < 21; i++) {
      expect(normalizedTransformed[i].x).toBeCloseTo(baseline[i].x, 5);
      expect(normalizedTransformed[i].y).toBeCloseTo(baseline[i].y, 5);
      expect(normalizedTransformed[i].z).toBeCloseTo(baseline[i].z, 5);
    }
  });

  it('produces identical canonical coordinates when mirroring a Right hand into a Left hand', () => {
    const rightNormalized = normalizeHand(FIXTURE_LETTER_V_RIGHT, 'Right');
    const mirroredLeftRaw = mirrorLandmarksX(FIXTURE_LETTER_V_RIGHT);
    const leftNormalized = normalizeHand(mirroredLeftRaw, 'Left');

    for (let i = 0; i < 21; i++) {
      expect(leftNormalized[i].x).toBeCloseTo(rightNormalized[i].x, 5);
      expect(leftNormalized[i].y).toBeCloseTo(rightNormalized[i].y, 5);
      expect(leftNormalized[i].z).toBeCloseTo(rightNormalized[i].z, 5);
    }
  });

  it('distinguishes extended vs curled fingers via fingerCurl()', () => {
    const indexCurl = fingerCurl(FIXTURE_LETTER_V_RIGHT, 'index');
    const ringCurl = fingerCurl(FIXTURE_LETTER_V_RIGHT, 'ring');

    expect(indexCurl.totalCurlDeg).toBeLessThan(15);
    expect(ringCurl.totalCurlDeg).toBeGreaterThan(150);
  });

  it('measures normalized fingertip spread accurately between B and V fixtures', () => {
    const spreadB = fingertipDistance(FIXTURE_LETTER_B_RIGHT, 'index', 'middle');
    const spreadV = fingertipDistance(FIXTURE_LETTER_V_RIGHT, 'index', 'middle');

    expect(spreadV).toBeGreaterThan(spreadB * 2);
  });

  it('computes consistent outward palm normal for both Right and mirrored Left hands', () => {
    const orientRight = palmOrientation(FIXTURE_LETTER_B_RIGHT, 'Right');
    const orientLeft = palmOrientation(
      mirrorLandmarksX(FIXTURE_LETTER_B_RIGHT),
      'Left'
    );

    expect(orientRight.palmNormal.z).toBeCloseTo(orientLeft.palmNormal.z, 5);
    expect(orientRight.palmNormal.y).toBeCloseTo(orientLeft.palmNormal.y, 5);
    expect(orientRight.palmNormal.x).toBeCloseTo(-orientLeft.palmNormal.x, 5);
  });
});

describe('One Euro Smoothing Filter (/src/engine/oneEuroFilter.ts)', () => {
  it('dampens high-frequency jitter while converging on stationary coordinates', () => {
    const smoother = new HandLandmarkSmoother({
      minCutoff: 1.0,
      beta: 0.0,
      dCutoff: 1.0,
    });

    // Inject alternating +/- 0.02 jitter on landmark 8 (index tip)
    let lastY = 0;
    for (let frame = 0; frame < 10; frame++) {
      const jitter = frame % 2 === 0 ? 0.02 : -0.02;
      const noisyFrame = FIXTURE_LETTER_B_RIGHT.map((pt, idx) =>
        idx === 8 ? { ...pt, y: pt.y + jitter } : pt
      );
      const smoothed = smoother.filter(noisyFrame, frame * 33.33);
      lastY = smoothed[8].y;
    }

    const trueY = FIXTURE_LETTER_B_RIGHT[8].y;
    expect(Math.abs(lastY - trueY)).toBeLessThan(0.01);
  });
});
