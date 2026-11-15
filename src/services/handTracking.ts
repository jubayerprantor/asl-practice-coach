import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { LandmarkFrame, LandmarkSource } from '../engine/landmarkSource';
import type { AnatomicalHandedness, Vec3 } from '../engine/types';
import { cameraService, CameraService } from './camera';

export type HandTrackingStatus = 'loading' | 'ready' | 'failed';

export interface HandTrackingConfig {
  idleTimeoutMs?: number;
  processingIntervalMs?: number;
  wasmPath?: string;
  modelAssetPath?: string;
  cameraService?: CameraService;
}

const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_INTERVAL_MS = 40;
const DEFAULT_WASM_PATH = '/mediapipe/wasm';
const DEFAULT_MODEL_PATH = '/mediapipe/hand_landmarker.task';

export class HandTrackingService implements LandmarkSource {
  private subscribers = new Set<(frame: LandmarkFrame) => void>();
  private statusListeners = new Set<(status: HandTrackingStatus) => void>();

  private status: HandTrackingStatus = 'loading';
  private landmarker: HandLandmarker | null = null;
  private initPromise: Promise<HandLandmarker | null> | null = null;
  private idleTimerId: ReturnType<typeof setTimeout> | null = null;

  private running = false;
  private loopTimerId: ReturnType<typeof setTimeout> | ReturnType<typeof requestAnimationFrame> | null = null;
  private customVideo: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  private config: Required<Omit<HandTrackingConfig, 'cameraService'>> & {
    cameraService: CameraService;
  };

  constructor(config: HandTrackingConfig = {}) {
    this.config = {
      idleTimeoutMs: config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
      processingIntervalMs: config.processingIntervalMs ?? DEFAULT_INTERVAL_MS,
      wasmPath: config.wasmPath ?? DEFAULT_WASM_PATH,
      modelAssetPath: config.modelAssetPath ?? DEFAULT_MODEL_PATH,
      cameraService: config.cameraService ?? cameraService,
    };
  }

  public getStatus(): HandTrackingStatus {
    return this.status;
  }

  public subscribeStatus(listener: (status: HandTrackingStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(newStatus: HandTrackingStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      listener(newStatus);
    }
  }

  /**
   * LandmarkSource implementation:
   * Lazily initializes HandLandmarker on first subscriber.
   * Cancels idle release timer if active.
   */
  public subscribe(callback: (frame: LandmarkFrame) => void): () => void {
    this.subscribers.add(callback);

    // Cancel idle timer if one was scheduled
    if (this.idleTimerId) {
      clearTimeout(this.idleTimerId);
      this.idleTimerId = null;
    }

    // Lazy initialization on first subscriber
    if (!this.landmarker && !this.initPromise) {
      this.initLandmarker().catch(() => {});
    }

    if (this.running) {
      this.startLoop();
    }

    return () => {
      this.subscribers.delete(callback);

      // When subscribers reach zero, schedule model release after idleTimeoutMs
      if (this.subscribers.size === 0) {
        this.scheduleIdleRelease();
      }
    };
  }

  public start(): void {
    this.running = true;
    if (this.subscribers.size > 0) {
      if (!this.landmarker && !this.initPromise) {
        this.initLandmarker().catch(() => {});
      }
      this.startLoop();
    }
  }

  public stop(): void {
    this.running = false;
    this.stopLoop();
  }

  public setVideoSource(video: HTMLVideoElement | null): void {
    this.customVideo = video;
  }

  public getVideoSource(): HTMLVideoElement | null {
    return this.customVideo ?? this.config.cameraService.getVideoElement();
  }

  public async retry(): Promise<void> {
    this.releaseModel();
    await this.initLandmarker();
  }

  private async initLandmarker(): Promise<HandLandmarker | null> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.setStatus('loading');

    this.initPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(this.config.wasmPath);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.config.modelAssetPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        this.landmarker = landmarker;
        this.setStatus('ready');
        return landmarker;
      } catch (err) {
        console.error('HandTrackingService failed to load landmarker:', err);
        this.setStatus('failed');
        return null;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private scheduleIdleRelease(): void {
    if (this.idleTimerId) clearTimeout(this.idleTimerId);
    this.idleTimerId = setTimeout(() => {
      this.releaseModel();
      this.idleTimerId = null;
    }, this.config.idleTimeoutMs);
  }

  public releaseModel(): void {
    this.stopLoop();
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {}
      this.landmarker = null;
    }
    this.initPromise = null;
  }

  private startLoop(): void {
    if (this.loopTimerId) return;

    const interval = this.config.processingIntervalMs;

    const tick = () => {
      if (!this.running || this.subscribers.size === 0) {
        this.stopLoop();
        return;
      }

      this.processVideoFrame();
      this.loopTimerId = setTimeout(tick, interval);
    };

    this.loopTimerId = setTimeout(tick, interval);
  }

  private stopLoop(): void {
    if (this.loopTimerId) {
      clearTimeout(this.loopTimerId as any);
      this.loopTimerId = null;
    }
  }

  private processVideoFrame(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const camState = this.config.cameraService.getState();

    if (camState === 'disconnected') {
      this.emit({
        landmarks: null,
        status: 'disconnected',
        confidence: 0,
        timestampMs: now,
      });
      return;
    }

    if (!this.landmarker || this.status !== 'ready') {
      return;
    }

    const video = this.getVideoSource();
    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.currentTime === this.lastVideoTime
    ) {
      return;
    }

    this.lastVideoTime = video.currentTime;

    try {
      const result = this.landmarker.detectForVideo(video, now);
      const handCount = result.landmarks?.length ?? 0;

      if (handCount === 0) {
        this.emit({
          landmarks: null,
          worldLandmarks: null,
          confidence: 0,
          status: 'no_hand',
          timestampMs: now,
        });
        return;
      }

      if (handCount > 1) {
        this.emit({
          landmarks: null,
          worldLandmarks: null,
          confidence: 0.9,
          status: 'two_hands',
          timestampMs: now,
        });
        return;
      }

      const detectedLandmarks = (result.landmarks?.[0] as Vec3[]) ?? null;
      const detectedWorldLandmarks = (result.worldLandmarks?.[0] as Vec3[]) ?? null;
      const category = result.handednesses?.[0]?.[0];

      const rawHand =
        category?.categoryName === 'Left' || category?.categoryName === 'Right'
          ? category.categoryName
          : null;

      // In front/selfie camera mode, MediaPipe's observer-relative "Left" corresponds to the user's anatomical Right hand
      const anatomicalHand: AnatomicalHandedness | null =
        rawHand === 'Left' ? 'Right' : rawHand === 'Right' ? 'Left' : null;

      const score = category?.score ?? 0;
      const status = score < 0.5 ? 'low_confidence' : 'tracking';

      this.emit({
        landmarks: detectedLandmarks,
        worldLandmarks: detectedWorldLandmarks,
        handedness: anatomicalHand,
        confidence: score,
        status,
        timestampMs: now,
      });
    } catch (err: any) {
      // Check for WebGL context loss and trigger recovery
      const isContextLost =
        err?.message?.includes('WebGL') ||
        err?.message?.includes('context') ||
        err?.name === 'ContextLostError';

      if (isContextLost) {
        console.warn('WebGL context lost in HandTrackingService. Recovering...');
        this.retry().catch(() => {});
      }
    }
  }

  private emit(frame: LandmarkFrame): void {
    for (const sub of this.subscribers) {
      try {
        sub(frame);
      } catch (err) {
        console.error('Error in LandmarkSource subscriber:', err);
      }
    }
  }

  public destroy(): void {
    if (this.idleTimerId) {
      clearTimeout(this.idleTimerId);
      this.idleTimerId = null;
    }
    this.releaseModel();
    this.subscribers.clear();
    this.statusListeners.clear();
  }
}

export const handTrackingService = new HandTrackingService();
