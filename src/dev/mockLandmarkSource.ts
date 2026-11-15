import type { LandmarkFrame, LandmarkSource } from '../engine/landmarkSource';
import type { Vec3 } from '../engine/types';
import referencePack from '../packs/asl/reference.json';
import { perturbFingerCurl } from '../../tests/synthetic';

export type MockSign = string;

export type MockScenario =
  | 'correct'
  | 'faulty_thumb'
  | 'faulty_index'
  | 'low_confidence'
  | 'no_hand'
  | 'two_hands'
  | 'disconnected'
  | 'too_far';

export class MockLandmarkSource implements LandmarkSource {
  private subscribers = new Set<(frame: LandmarkFrame) => void>();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private currentSign: MockSign = 'A';
  private currentScenario: MockScenario = 'correct';
  private currentTimeMs = 1000;
  private isPaused = false;
  private intervalMs = 40; // ~25 FPS

  constructor(initialSign: MockSign = 'A', initialScenario: MockScenario = 'correct') {
    this.currentSign = initialSign;
    this.currentScenario = initialScenario;
  }

  subscribe(callback: (frame: LandmarkFrame) => void): () => void {
    this.subscribers.add(callback);
    // Emit initial frame immediately
    callback(this.generateFrame());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  start(): void {
    if (this.timerId) return;
    this.isPaused = false;
    this.timerId = setInterval(() => {
      if (this.isPaused) return;
      this.currentTimeMs += this.intervalMs;
      const frame = this.generateFrame();
      for (const sub of this.subscribers) {
        sub(frame);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  restart(): void {
    this.currentTimeMs = 1000;
    const frame = this.generateFrame();
    for (const sub of this.subscribers) {
      sub(frame);
    }
  }

  setSign(sign: MockSign): void {
    this.currentSign = sign;
    this.currentTimeMs = 1000;
    const frame = this.generateFrame();
    for (const sub of this.subscribers) {
      sub(frame);
    }
  }

  setScenario(scenario: MockScenario): void {
    this.currentScenario = scenario;
    this.currentTimeMs = 1000;
    const frame = this.generateFrame();
    for (const sub of this.subscribers) {
      sub(frame);
    }
  }

  getSign(): MockSign {
    return this.currentSign;
  }

  getScenario(): MockScenario {
    return this.currentScenario;
  }

  getPaused(): boolean {
    return this.isPaused;
  }

  private generateFrame(): LandmarkFrame {
    const timestampMs = this.currentTimeMs;

    if (this.currentScenario === 'disconnected') {
      return {
        landmarks: null,
        confidence: 0,
        status: 'disconnected',
        timestampMs,
      };
    }

    if (this.currentScenario === 'no_hand') {
      return {
        landmarks: null,
        confidence: 0,
        status: 'no_hand',
        timestampMs,
      };
    }

    if (this.currentScenario === 'two_hands') {
      return {
        landmarks: null,
        confidence: 0.9,
        status: 'two_hands',
        timestampMs,
      };
    }

    const ref = (referencePack.signs as Record<string, { canonicalLandmarks: Vec3[] }>)[this.currentSign];
    const canonical = ref?.canonicalLandmarks ?? [];

    if (this.currentScenario === 'low_confidence') {
      return {
        landmarks: canonical,
        confidence: 0.35, // Below 0.65 threshold
        handedness: 'Right',
        status: 'low_confidence',
        timestampMs,
      };
    }

    if (this.currentScenario === 'too_far') {
      // Scale hand landmarks down and shift wrist up
      const scaled = canonical.map((pt) => ({
        x: 0.5 + (pt.x - 0.5) * 0.35,
        y: 0.2 + (pt.y - 0.5) * 0.35,
        z: pt.z * 0.35,
      }));
      return {
        landmarks: scaled,
        confidence: 0.88,
        handedness: 'Right',
        status: 'too_far',
        timestampMs,
      };
    }

    if (this.currentScenario === 'faulty_thumb') {
      // Perturb thumb extension/curl
      const perturbed = perturbFingerCurl(canonical, 'thumb', -60, 'Right');
      return {
        landmarks: perturbed.landmarks,
        confidence: 0.92,
        handedness: 'Right',
        status: 'tracking',
        timestampMs,
      };
    }

    if (this.currentScenario === 'faulty_index') {
      // For sign 'A' (index is curled), extend index; for sign 'B' (index is extended), curl index
      const deltaDeg = (this.currentSign as string) === 'B' || (this.currentSign as string) === 'L' || (this.currentSign as string) === 'V' ? -80 : 80;
      const perturbed = perturbFingerCurl(canonical, 'index', deltaDeg, 'Right');
      return {
        landmarks: perturbed.landmarks,
        confidence: 0.92,
        handedness: 'Right',
        status: 'tracking',
        timestampMs,
      };
    }

    // Default: 'correct'
    return {
      landmarks: canonical,
      confidence: 0.95,
      handedness: 'Right',
      status: 'tracking',
      timestampMs,
    };
  }
}
