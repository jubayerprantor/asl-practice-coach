import type { Vec3 } from './types';

export interface OneEuroConfig {
  /** Minimum cutoff frequency in Hz (lower = smoother at rest, default: 1.5) */
  minCutoff: number;
  /** Speed coefficient (higher = less lag during fast hand movement, default: 0.05) */
  beta: number;
  /** Derivative cutoff frequency in Hz (default: 1.0) */
  dCutoff: number;
}

export const DEFAULT_ONE_EURO_CONFIG: OneEuroConfig = {
  minCutoff: 1.5,
  beta: 0.05,
  dCutoff: 1.0,
};

class LowPassFilter {
  private initialized = false;
  private yHat = 0;

  filter(value: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.yHat = value;
      return value;
    }
    this.yHat = alpha * value + (1 - alpha) * this.yHat;
    return this.yHat;
  }

  lastValue(): number {
    return this.yHat;
  }

  hasValue(): boolean {
    return this.initialized;
  }

  reset(): void {
    this.initialized = false;
    this.yHat = 0;
  }
}

export class ScalarOneEuroFilter {
  private readonly xFilter = new LowPassFilter();
  private readonly dxFilter = new LowPassFilter();
  private lastTimestampSec: number | null = null;

  constructor(private readonly config: OneEuroConfig = DEFAULT_ONE_EURO_CONFIG) {}

  private computeAlpha(cutoffHz: number, dtSec: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoffHz);
    return 1.0 / (1.0 + tau / dtSec);
  }

  filter(value: number, timestampSec: number): number {
    if (this.lastTimestampSec === null) {
      this.lastTimestampSec = timestampSec;
      this.dxFilter.filter(0, 1);
      return this.xFilter.filter(value, 1);
    }

    const dtSec = Math.max(1e-4, timestampSec - this.lastTimestampSec);
    this.lastTimestampSec = timestampSec;

    const prevX = this.xFilter.hasValue() ? this.xFilter.lastValue() : value;
    const dx = (value - prevX) / dtSec;

    const alphaD = this.computeAlpha(this.config.dCutoff, dtSec);
    const edx = this.dxFilter.filter(dx, alphaD);

    const cutoff = this.config.minCutoff + this.config.beta * Math.abs(edx);
    const alpha = this.computeAlpha(cutoff, dtSec);

    return this.xFilter.filter(value, alpha);
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTimestampSec = null;
  }
}

/**
 * Applies independent One Euro filters across all 21 3D hand landmarks.
 */
export class HandLandmarkSmoother {
  private readonly filters: Array<{
    x: ScalarOneEuroFilter;
    y: ScalarOneEuroFilter;
    z: ScalarOneEuroFilter;
  }>;

  constructor(config: OneEuroConfig = DEFAULT_ONE_EURO_CONFIG) {
    this.filters = Array.from({ length: 21 }, () => ({
      x: new ScalarOneEuroFilter(config),
      y: new ScalarOneEuroFilter(config),
      z: new ScalarOneEuroFilter(config),
    }));
  }

  filter(landmarks: readonly Vec3[], timestampMs: number): Vec3[] {
    if (landmarks.length !== 21) {
      throw new Error(`Expected 21 landmarks, received ${landmarks.length}`);
    }
    const timestampSec = timestampMs / 1000;
    return landmarks.map((pt, i) => ({
      x: this.filters[i].x.filter(pt.x, timestampSec),
      y: this.filters[i].y.filter(pt.y, timestampSec),
      z: this.filters[i].z.filter(pt.z, timestampSec),
    }));
  }

  reset(): void {
    for (const f of this.filters) {
      f.x.reset();
      f.y.reset();
      f.z.reset();
    }
  }
}
