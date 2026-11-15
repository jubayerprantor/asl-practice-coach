/**
 * Dev-only performance and resource diagnostics module.
 * Only loaded when import.meta.env.DEV is true.
 * Logs live resource instances every 10 seconds.
 */

import { HandLandmarker } from '@mediapipe/tasks-vision';

interface PerformanceMemory {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

let liveLandmarkers = 0;
const trackedStreams = new Set<MediaStream>();
let openWebGLContexts = 0;
let diagnosticsIntervalId: ReturnType<typeof setInterval> | null = null;

export function trackLandmarkerCreated<T extends { close?: () => void }>(instance: T): T {
  liveLandmarkers++;
  const origClose = instance.close;
  if (typeof origClose === 'function') {
    instance.close = function (this: any) {
      liveLandmarkers = Math.max(0, liveLandmarkers - 1);
      return origClose.apply(this);
    };
  }
  return instance;
}

export function initDiagnostics(): void {
  if (typeof window === 'undefined') return;

  // 1. Monkey-patch HandLandmarker.createFromOptions to count live instances
  const originalCreateFromOptions = HandLandmarker.createFromOptions;
  if (originalCreateFromOptions) {
    HandLandmarker.createFromOptions = async function (...args: Parameters<typeof originalCreateFromOptions>) {
      const instance = await originalCreateFromOptions.apply(this, args);
      return trackLandmarkerCreated(instance);
    };
  }

  // 2. Monkey-patch getUserMedia to track live MediaStreamTracks
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      const stream = await originalGetUserMedia(constraints);
      trackedStreams.add(stream);
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          // Check if all tracks ended to clean up stream reference
          const hasLive = stream.getTracks().some((t) => t.readyState === 'live');
          if (!hasLive) {
            trackedStreams.delete(stream);
          }
        });
      });
      return stream;
    };
  }

  // 3. Track open WebGL contexts
  if (typeof HTMLCanvasElement !== 'undefined') {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextType: string,
      ...args: any[]
    ) {
      const ctx = originalGetContext.call(this, contextType as any, ...args);
      if (
        ctx &&
        (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl')
      ) {
        openWebGLContexts++;
        this.addEventListener(
          'webglcontextlost',
          () => {
            openWebGLContexts = Math.max(0, openWebGLContexts - 1);
          },
          { once: true }
        );
      }
      return ctx;
    } as any;
  }

  // 4. Log diagnostics every 10 seconds
  function getActiveTracksCount(): number {
    let active = 0;
    for (const stream of trackedStreams) {
      for (const track of stream.getTracks()) {
        if (track.readyState === 'live') {
          active++;
        }
      }
    }
    return active;
  }

  function getUsedJSHeapMB(): string {
    const mem = (performance as unknown as { memory?: PerformanceMemory }).memory;
    if (mem && typeof mem.usedJSHeapSize === 'number') {
      return (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1);
    }
    return 'N/A';
  }

  function logDiagnostics() {
    const activeTracks = getActiveTracksCount();
    const jsHeapMB = getUsedJSHeapMB();
    console.log(
      `%c[Diagnostics]%c Landmarkers: ${liveLandmarkers} | Active Tracks: ${activeTracks} | WebGL Contexts: ${openWebGLContexts} | JS Heap: ${jsHeapMB} MB`,
      'color: #5EE0C0; font-weight: bold;',
      'color: #16181A;'
    );
  }

  // Immediate initial log + 10s periodic log
  logDiagnostics();
  if (diagnosticsIntervalId) clearInterval(diagnosticsIntervalId);
  diagnosticsIntervalId = setInterval(logDiagnostics, 10000);
}
