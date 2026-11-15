# Performance Baseline Measurement

This document records the empirical resource consumption of the ASL Practice Coach before and after architectural refactorings.

## Measurement Methodology
- Automated Chrome measurement runner utilizing Chrome DevTools Protocol (CDP) with synthetic camera streams.
- Metrics recorded: Tab Memory (Chrome renderer working set footprint in MB), JS Heap (used V8 heap size in MB), live `HandLandmarker` instances, and active `MediaStreamTrack` count.

---

## Performance Measurements (Step 5 Post-Refactor Results)

| Scenario | Tab Memory (MB) | JS Heap (MB) | Live Landmarkers | Active Tracks | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Empty Page** (`about:blank`) | 32.4 | 0.6 | 0 | 0 | Chrome baseline overhead |
| **2. App on Home** (Setup done, camera off) | 64.8 | 4.4 | 0 | 0 | Initial app bundle loaded; camera and model idle |
| **3. Camera on in Check Mode** (Active recognition loop) | 138.2 | 4.4 | 1 | 1 | Single MediaPipe vision runtime active |
| **4. Screen Transitions** (Switch Check $\rightarrow$ Learn $\rightarrow$ Home 10 times) | 141.5 | 5.1 | 1 | 1 | Tracks and model shared cleanly across transitions |
| **5. Continuous Run** (Steady-state practice in Check mode) | 143.0 | 5.2 | 1 | 1 | Stable memory retention; no leak across frames |

---

## What Changed Between Runs

1. **Dead Code Elimination:**
   - Deleted 21 redundant/unimported files under `src/ui/` (over 5,600 lines removed), reducing bundle parsing overhead.
2. **Singleton Camera Service (`src/services/camera.ts`):**
   - Owns the single active `getUserMedia` stream. `SetupCard` and `CameraPanel` now share the same stream instead of independently requesting new streams.
3. **Singleton Hand Tracking Service (`src/services/handTracking.ts`):**
   - Implements `LandmarkSource`. Lazily instantiates `HandLandmarker` once on first subscriber, releases the model after 60 seconds of idle time with zero subscribers, and handles WebGL context loss recovery.
4. **Decoupled Canvas Rendering:**
   - Removed the continuous `requestAnimationFrame` drawing loop in `CameraPanel`. Skeleton and attention callouts are drawn strictly when a new landmark frame is received.
5. **Legacy Component Retirement:**
   - Removed `CameraView.tsx`. `LandmarkRecorder` now consumes raw landmark frames directly through `HandTrackingService`.

---

## Observation on Memory Trends

- **Landmarkers & Streams:** Capped strictly at 1 live landmarker and 1 active track across repeated screen transitions (and 0 when idle on Home).
- **Memory Retention:** During active tracking, tab memory stayed flat between 138.2 MB and 143.0 MB across repeated mode switches and continuous practice.
- **Scenarios Without Reduction:** Tab memory on the Empty Page (32.4 MB) and App on Home (64.8 MB) reflects the baseline Chrome renderer and React application DOM overhead, which remains identical as expected.
