import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CameraService } from '../src/services/camera';
import { HandTrackingService } from '../src/services/handTracking';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

describe('Singleton Services: CameraService & HandTrackingService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('HandTrackingService Lifecycle', () => {
    it('subscribing twice creates only ONE landmarker (singleton lazy initialization)', async () => {
      let closeCalled = 0;
      const fakeLandmarker = {
        close: vi.fn(() => {
          closeCalled++;
        }),
        detectForVideo: vi.fn(() => ({ landmarks: [], handednesses: [] })),
      };

      const createFromOptionsSpy = vi
        .spyOn(HandLandmarker, 'createFromOptions')
        .mockResolvedValue(fakeLandmarker as any);

      vi.spyOn(FilesetResolver, 'forVisionTasks').mockResolvedValue({} as any);

      const service = new HandTrackingService({
        idleTimeoutMs: 500,
        processingIntervalMs: 20,
      });

      expect(createFromOptionsSpy).toHaveBeenCalledTimes(0);

      // Subscriber 1
      const unsub1 = service.subscribe(() => {});
      // Subscriber 2
      const unsub2 = service.subscribe(() => {});

      // Flush microtasks for async initialization
      await Promise.resolve();
      await Promise.resolve();

      // Exactly ONE landmarker created despite two subscribers
      expect(createFromOptionsSpy).toHaveBeenCalledTimes(1);
      expect(service.getStatus()).toBe('ready');

      unsub1();
      unsub2();
      service.destroy();
    });

    it('unsubscribing all triggers model release after the idle time', async () => {
      const closeSpy = vi.fn();
      const fakeLandmarker = {
        close: closeSpy,
        detectForVideo: vi.fn(() => ({ landmarks: [], handednesses: [] })),
      };

      vi.spyOn(HandLandmarker, 'createFromOptions').mockResolvedValue(fakeLandmarker as any);
      vi.spyOn(FilesetResolver, 'forVisionTasks').mockResolvedValue({} as any);

      const service = new HandTrackingService({
        idleTimeoutMs: 1000,
        processingIntervalMs: 20,
      });

      const unsub1 = service.subscribe(() => {});
      const unsub2 = service.subscribe(() => {});

      await Promise.resolve();
      await Promise.resolve();

      expect(closeSpy).toHaveBeenCalledTimes(0);

      // First subscriber unmounts - still 1 subscriber left, so NO release
      unsub1();
      vi.advanceTimersByTime(1200);
      expect(closeSpy).toHaveBeenCalledTimes(0);

      // Second subscriber unmounts - subscriber count reaches 0
      unsub2();

      // Before idle timeout expires: still not closed
      vi.advanceTimersByTime(500);
      expect(closeSpy).toHaveBeenCalledTimes(0);

      // After idle timeout (1000ms): model is released
      vi.advanceTimersByTime(600);
      expect(closeSpy).toHaveBeenCalledTimes(1);

      service.destroy();
    });
  });

  describe('CameraService Stream & Disconnection Lifecycle', () => {
    it('stopAll stops every track and leaves zero active tracks', async () => {
      let track1Stopped = false;
      let track2Stopped = false;

      const fakeTrack1 = {
        kind: 'video',
        readyState: 'live',
        stop: vi.fn(() => {
          track1Stopped = true;
          fakeTrack1.readyState = 'ended';
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const fakeTrack2 = {
        kind: 'video',
        readyState: 'live',
        stop: vi.fn(() => {
          track2Stopped = true;
          fakeTrack2.readyState = 'ended';
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const fakeStream = {
        getVideoTracks: () => [fakeTrack1, fakeTrack2],
        getTracks: () => [fakeTrack1, fakeTrack2],
      };

      // Mock navigator.mediaDevices
      const getUserMediaMock = vi.fn().mockResolvedValue(fakeStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: getUserMediaMock,
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const camera = new CameraService();
      await camera.start();

      expect(camera.getState()).toBe('active');
      expect(camera.getStream()).toBe(fakeStream);

      // Calling stopAll() stops every track and clears stream
      camera.stopAll();

      expect(track1Stopped).toBe(true);
      expect(track2Stopped).toBe(true);
      expect(fakeTrack1.stop).toHaveBeenCalled();
      expect(fakeTrack2.stop).toHaveBeenCalled();
      expect(camera.getStream()).toBe(null);
      expect(camera.getState()).toBe('off');

      camera.destroy();
    });

    it('track disconnection produces the disconnected state and notifies subscribers', async () => {
      let onendedCallback: (() => void) | null = null;

      const fakeTrack = {
        kind: 'video',
        readyState: 'live',
        set onended(cb: any) {
          onendedCallback = cb;
        },
        get onended(): any {
          return onendedCallback;
        },
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const fakeStream = {
        getVideoTracks: () => [fakeTrack],
        getTracks: () => [fakeTrack],
      };

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(fakeStream),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const camera = new CameraService();
      let reportedState = camera.getState();
      camera.subscribeState((st) => {
        reportedState = st;
      });

      await camera.start();
      expect(reportedState).toBe('active');

      // Simulate unexpected camera hardware unplug / track ended
      expect(onendedCallback).toBeDefined();
      if (onendedCallback) {
        (onendedCallback as () => void)();
      }

      expect(reportedState).toBe('disconnected');
      expect(camera.getState()).toBe('disconnected');
      expect(camera.getStream()).toBe(null);

      camera.destroy();
    });
  });
});
