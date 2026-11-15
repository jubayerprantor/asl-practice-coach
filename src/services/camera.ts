export type CameraServiceState =
  | 'off'
  | 'requesting'
  | 'active'
  | 'blocked'
  | 'disconnected';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface CameraServiceConfig {
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'asl_selected_camera_id';

export class CameraService {
  private state: CameraServiceState = 'off';
  private stream: MediaStream | null = null;
  private selectedDeviceId: string | null = null;
  private devices: CameraDeviceInfo[] = [];
  private videoElement: HTMLVideoElement | null = null;

  private stateListeners = new Set<(state: CameraServiceState) => void>();
  private streamListeners = new Set<(stream: MediaStream | null) => void>();
  private deviceListeners = new Set<(devices: CameraDeviceInfo[]) => void>();

  private storageKey: string;
  private focusHandler: (() => void) | null = null;
  private deviceChangeHandler: (() => void) | null = null;

  constructor(config: CameraServiceConfig = {}) {
    this.storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY;
    this.initFromStorage();
    this.initEventListeners();
  }

  private initFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        this.selectedDeviceId = window.localStorage.getItem(this.storageKey);
      } catch {
        this.selectedDeviceId = null;
      }
    }
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;

    this.focusHandler = () => {
      this.handleWindowFocus();
    };
    window.addEventListener('focus', this.focusHandler);

    if (navigator.mediaDevices?.addEventListener) {
      this.deviceChangeHandler = () => {
        this.refreshDevices().catch(() => {});
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  public getState(): CameraServiceState {
    return this.state;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  public getDevices(): CameraDeviceInfo[] {
    return [...this.devices];
  }

  public getVideoElement(): HTMLVideoElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.setAttribute('aria-hidden', 'true');
      this.videoElement.style.display = 'none';
    }
    return this.videoElement;
  }

  public subscribeState(listener: (state: CameraServiceState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public subscribeStream(listener: (stream: MediaStream | null) => void): () => void {
    this.streamListeners.add(listener);
    listener(this.stream);
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  public subscribeDevices(listener: (devices: CameraDeviceInfo[]) => void): () => void {
    this.deviceListeners.add(listener);
    listener(this.devices);
    return () => {
      this.deviceListeners.delete(listener);
    };
  }

  private setState(newState: CameraServiceState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const listener of this.stateListeners) {
      listener(newState);
    }
  }

  private setStream(newStream: MediaStream | null): void {
    this.stream = newStream;

    // Attach or detach internal video element
    const video = this.getVideoElement();
    if (video) {
      video.srcObject = newStream;
      if (newStream) {
        video.play().catch(() => {});
      }
    }

    for (const listener of this.streamListeners) {
      listener(newStream);
    }
  }

  public async refreshDevices(): Promise<CameraDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
        }));

      this.devices = videoDevices;

      // Validate selected camera ID
      if (this.selectedDeviceId && !videoDevices.some((d) => d.deviceId === this.selectedDeviceId)) {
        if (videoDevices.length > 0) {
          this.selectDevice(videoDevices[0].deviceId, false);
        } else {
          this.selectedDeviceId = null;
        }
      } else if (!this.selectedDeviceId && videoDevices.length > 0) {
        this.selectDevice(videoDevices[0].deviceId, false);
      }

      for (const listener of this.deviceListeners) {
        listener(this.devices);
      }
      return videoDevices;
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
      return [];
    }
  }

  public selectDevice(deviceId: string, restartIfActive = true): Promise<MediaStream | null> {
    this.selectedDeviceId = deviceId;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.storageKey, deviceId);
      } catch {}
    }

    if (restartIfActive && this.state === 'active') {
      this.stopAll();
      return this.start(deviceId);
    }
    return Promise.resolve(this.stream);
  }

  public async start(requestedDeviceId?: string): Promise<MediaStream | null> {
    const targetDeviceId = requestedDeviceId ?? this.selectedDeviceId;

    // Reuse existing live stream if deviceId matches and tracks are live
    if (this.stream) {
      const activeVideoTrack = this.stream.getVideoTracks().find((t) => t.readyState === 'live');
      if (activeVideoTrack) {
        const currentSettings = activeVideoTrack.getSettings ? activeVideoTrack.getSettings() : null;
        if (!targetDeviceId || !currentSettings?.deviceId || currentSettings.deviceId === targetDeviceId) {
          this.setState('active');
          return this.stream;
        }
      }
      // Target device differs from current live stream; stop old stream first
      this.stopAll();
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.setState('blocked');
      return null;
    }

    this.setState('requesting');

    try {
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Track disconnection listener (Section 25)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleTrackEnded();
        };
      }

      this.setStream(stream);
      this.setState('active');
      this.refreshDevices().catch(() => {});
      return stream;
    } catch (err: any) {
      console.warn('[CameraService] getUserMedia failed:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        this.setState('blocked');
      } else {
        this.setState('disconnected');
      }
      this.setStream(null);
      return null;
    }
  }

  private handleTrackEnded(): void {
    this.setState('disconnected');
    this.setStream(null);
  }

  public stopAll(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
      this.setStream(null);
    }
    this.setState('off');
  }

  public async handleWindowFocus(): Promise<void> {
    // If blocked or disconnected, check if user granted permission in browser settings
    if (this.state === 'blocked') {
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (status.state === 'granted') {
            this.setState('off');
          }
        }
      } catch {}
    }
  }

  public destroy(): void {
    this.stopAll();
    if (typeof window !== 'undefined') {
      if (this.focusHandler) {
        window.removeEventListener('focus', this.focusHandler);
      }
      if (this.deviceChangeHandler && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      }
    }
    this.stateListeners.clear();
    this.streamListeners.clear();
    this.deviceListeners.clear();
  }
}

export const cameraService = new CameraService();
