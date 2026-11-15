# Performance Baseline Measurement

This document records the empirical resource consumption of the ASL Practice Coach before and after architectural refactorings.

## Measurement Instructions
1. Open Google Chrome with extensions disabled or in an Incognito / clean profile window.
2. Open Chrome Task Manager using **Shift + Esc** (or `Menu > More Tools > Task Manager`). Find the row corresponding to the application tab (`http://localhost:5173`).
3. Open DevTools Console (**F12** or **Ctrl + Shift + I**) to inspect the 10-second `[Diagnostics]` logs.
4. Record the measurements for each scenario below into the **Before (Phase 1 Baseline)** columns.

---

## Baseline Table (Before Phase 2 Refactor)

| Scenario | Tab Memory (Chrome Task Manager, MB) | JS Heap (Diagnostics log, MB) | Live Landmarkers | Active Tracks | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Empty Page** (about:blank) | | | 0 | 0 | Chrome baseline overhead |
| **2. App on Home** (Setup done, no camera active) | | | | | Initial app bundle & DOM loaded |
| **3. Camera on in Check Mode** (Active recognition loop) | | | | | MediaPipe WASM + GPU loaded |
| **4. Screen Transitions** (Switch Check $\rightarrow$ Learn $\rightarrow$ Home 10 times) | | | | | Tests component remount leakage |
| **5. Continuous Run** (10-minute continuous practice in Check mode) | | | | | Tests steady-state memory retention |

---

## Post-Refactor Table (After Phase 4 Singletons & Idle Release)

*To be completed in Step 5 after implementing `HandTrackingService` and `CameraService`.*

| Scenario | Tab Memory (Chrome Task Manager, MB) | JS Heap (Diagnostics log, MB) | Live Landmarkers | Active Tracks | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Empty Page** (about:blank) | | | 0 | 0 | |
| **2. App on Home** (Setup done, no camera active) | | | | | |
| **3. Camera on in Check Mode** (Active recognition loop) | | | | | |
| **4. Screen Transitions** (Switch Check $\rightarrow$ Learn $\rightarrow$ Home 10 times) | | | | | |
| **5. Continuous Run** (10-minute continuous practice in Check mode) | | | | | |

---

## Call Site Audit: Where Landmarkers & Streams Are Allocated

### Active Code Sites (Used by Current App)
- **`src/ui/components/CameraPanel.tsx`:**
  - Line 128: `HandLandmarker.createFromOptions(vision, { ... })`
  - Line 205: `navigator.mediaDevices.getUserMedia({ ... })`
- **`src/ui/components/SetupCard.tsx`:**
  - Line 40: `navigator.mediaDevices.getUserMedia({ ... })`

### Orphaned Legacy Files (Scheduled for Cleanup in Step 2)
- `src/ui/CameraPanel.tsx`: Lines 102 & 178
- `src/ui/CameraSetupCard.tsx`: Line 29
- `src/ui/CameraView.tsx`: Lines 87 & 177
