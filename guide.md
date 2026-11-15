# ASL Practice Coach — Developer & Architecture Guide

This guide explains the development workflow, runtime architecture, the Dev Mode mocking subsystem, and release mechanics.

---

## 1. Application Architecture: Desktop App vs. Web Harness

### The Real Target: 100% Offline Desktop Application
**ASL Practice Coach is an offline desktop application powered by Electron.**
- It does **not** rely on any external web servers, cloud APIs, or CDNs.
- All machine learning inference (MediaPipe Hand Landmarker via WebAssembly) and computer vision run entirely on the local device's CPU/GPU.
- Camera video frames never leave your local machine.

### Why Does a "Web Version" Exist?
When you run `npm run dev`, Vite starts a local dev server in your browser. This is strictly a **rapid developer harness**:
- **Instant Hot-Module Replacement (HMR):** When you adjust UI styles, curriculum text, or geometric thresholds, changes reflect in milliseconds without restarting an Electron window.
- **Zero Package Overhead:** You can test features, UI flows, and algorithms without running multi-minute packaging routines (`electron-builder`) repeatedly.
- **Production Truth:** When generating the desktop release (`npm run dist:win`), Electron bundles the compiled output and loads it via a secure custom protocol (`app://asl`). The local dev web server is never included in the final installer.

---

## 2. Understanding "Dev Mode" & The Mock Subsystem

### What is Dev Mode?
When running under `npm run dev`, Vite exposes `import.meta.env.DEV = true`. This activates the **Dev Mock Bridge** (`src/dev/DevMockBridge.tsx`) and displays a collapsible control panel at the bottom of the screen.

### Why is Dev Mode Essential?
When developing a computer vision sign language app:
1. **Physical Fatigue:** Testing hand shapes manually requires holding your hand up in front of a webcam for hours, causing physical fatigue.
2. **Reproducibility:** A human cannot hold a hand at an exact 45.2° curl angle repeatedly across 50 test runs.
3. **Edge Case Simulation:** Simulating edge cases (e.g., camera disconnection, sudden low lighting, two hands in frame, hand moving too fast) is difficult with a real webcam.

### What Can You Do in Dev Mode?
When you expand the Dev Mode panel:
- **Inject Canonical Signs:** Instantly feed perfect landmark coordinates for signs (e.g., A, B, L, V, Y) to test the hold timer and lesson completion state machine.
- **Simulate Faulty Gestures:**
  - *Faulty Thumb:* Thumb curls too far in; verifies that the hint card says "Straighten thumb" and isolates the thumb in the finger list.
  - *Faulty Index:* Verifies error isolation on the index finger.
- **Simulate Real-World Failure States:**
  - *No Hand:* Verifies the "No hand detected" prompt.
  - *Two Hands:* Verifies prompt to keep only one hand in view.
  - *Low Confidence / Bad Lighting:* Verifies stability thresholds.
  - *Hand Too Far / Hand Too Close:* Verifies distance warnings.
  - *Camera Disconnected:* Verifies the disconnect banner and camera recovery picker.
- **Frame-by-Frame Stepping & Pause:** Freeze hand landmarks in place to inspect joint angles and geometry calculations in real-time.
- **Diagnostics Overlay:** Displays raw coordinates, FPS counter, hold progress, and landmark detection confidence.

### Production Safety (Zero-Mock Invariant)
The mock subsystem is **strictly segregated**:
- `DevMockBridge` is loaded conditionally via dynamic imports guarded by `import.meta.env.DEV`.
- In production builds (`npm run build` or `npm run dist:win`), Vite's tree-shaking and Rollup dead-code elimination remove `src/dev` entirely.
- Stage 5 of the verification pipeline (`npm run verify:web`) runs a scanner (`tests/distScan.test.ts`) that inspects the production bundle to verify that **zero mock strings, mock code, or dev controls exist in the shipping app**.

---

## 3. GitHub Releases vs. GitHub Packages

In the GitHub repository sidebar:
- **"Packages" (Empty):**
  - GitHub Packages is designed for software registries (such as publishing an `@org/package` to npm, Maven, RubyGems, or Docker container registries).
  - Since ASL Practice Coach is an end-user application (not a reusable code library), **Packages should remain empty**.
- **"Releases" (Where Desktop Installers Live):**
  - This is where releases belong.
  - When you publish a release, you attach compiled desktop binary assets:
    - `ASL-Practice-Coach-Setup-0.2.0.exe` (Windows NSIS Installer)
    - `ASL-Practice-Coach-0.2.0-mac.dmg` (macOS Installer)
    - `ASL-Practice-Coach-0.2.0.AppImage` (Linux Portable)

---

## 4. Release Evaluation: Is the App "Production Ready"?

### What is Already Production Quality
- **34 Signs Modeled:** All 24 static letters + 10 digits (0–9) fully active.
- **8 Lessons & Curriculum:** Structured learning path from single anchors to complete alphabet and numbers.
- **Word Practice Mode:** Sequential fingerspelling engine with common vocabulary.
- **Practice Consistency Tracking:** Local daily streak counter and difficulty tiers (Relaxed 1.2s, Standard 2.0s, Precision 3.0s).
- **100% Privacy & Offline:** Zero tracking, zero telemetry, zero remote network calls.
- **Robust Quality Gates:** 59 automated unit tests and a 6-stage verification pipeline passing with 100% evaluable accuracy.

### What is Kept for Future Phases
- **Dynamic Signs (J & Z):** In ASL, J and Z require tracing a path through the air. These will be implemented in Phase 6 using a temporal motion engine.
- **Professional Lifeprint Parity & Code Signing:** Extended cross-dataset verification and official OS certificates are reserved for Phase 7.

### Recommended Versioning & Release Action
1. **Initial Tag Cleanup:**
   - The test placeholder `v0.1.0` was removed so the official debut release is clean.
2. **Official Tag: `v0.1.0`:**
   - Tagging this milestone as **`v0.1.0`** marks the first official public release with the actual Windows installer (`.exe`) attached.
   - It represents our complete static curriculum (24 letters, numbers 0–9, 8 lessons, word practice, habit tracking, and 100% offline desktop runtime).
