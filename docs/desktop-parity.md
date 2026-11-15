# Desktop Parity Verification Checklist

This document tracks manual verification criteria for the packaged standalone Windows desktop build (`release/ASL Practice Coach Setup 0.1.0.exe` and `release/win-unpacked/ASL Practice Coach.exe`), ensuring 100% parity with the web baseline.

---

## Verification Criteria Checklist

| # | Invariant / Feature | Expected Behavior | Status |
|---|---|---|:---:|
| **1** | **Offline Execution** | Disconnect Wi-Fi / Ethernet and launch the application. App launches instantly, loads local Inter fonts, wasm runtimes, and `hand_landmarker.task` model with zero network timeouts. | `[x] Verified` |
| **2** | **Camera Stream & MediaPipe Lifecycle** | Setup card detects connected webcam devices. Upon starting practice, `CameraService` shares the single active stream with `CameraPanel`, and `HandTrackingService` initializes without WebGL context errors. | `[x] Verified` |
| **3** | **Anatomical Handedness Accuracy** | Raising right hand in front of the front-facing webcam displays "Right hand detected". Thumb angle and curl checks evaluate correctly without inverted mirror coordinate transforms. | `[x] Verified` |
| **4** | **Consecutive Hold Completion (Learn Mode)** | Forming sign A fills the circular progress meter to 100% (Check 1 of 2). On completion, the hold timer resets and a second 1.2s hold cleanly completes Check 2 of 2, transitioning to Lesson Complete. | `[x] Verified` |
| **5** | **Check Mode Sign Selector & Auto-Cycle** | In Check mode, interactive chips for all 34 signs (24 letters and digits 0–9) allow directly selecting any target letter. Completing a hold on a sign pauses for 500ms and smoothly auto-advances to the next sign. | `[x] Verified` |
| **6** | **Camera Blocked Flow & Windows Settings Link** | If camera permissions are revoked in Windows Settings, the app transitions to the "Camera is blocked" card. Clicking the link triggers the allowlisted bridge to open `ms-settings:privacy-webcam`. | `[x] Verified` |
| **7** | **Window Geometry & State Persistence** | Default window opens at $1280 \times 800$ with native title bar (menu bar hidden). Minimum size is constrained to $1024 \times 700$. Resizing/moving and restarting the app restores the exact saved bounds from `%APPDATA%\asl-practice-coach\window-state.json`. | `[x] Verified` |
| **8** | **Storage & Progress Persistence** | User progress and practice attempts logged to IndexedDB (`asl_practice_coach_db`) and localStorage persist across app restarts under the fixed origin `app://asl`. | `[x] Verified` |
| **9** | **Security Lockdown & Navigation Sandbox** | Production builds have DevTools disabled. Middle-clicking or dragging external links is blocked; `setWindowOpenHandler` denies all popups; strict CSP enforces `app://asl` origin only. | `[x] Verified` |
| **10** | **Zero Mock Leakage Invariant** | Packaged application folder (`release/win-unpacked/resources/app/dist`) verified by `distScan` to contain zero mock strings (`MOCK DATA`, `MockLandmarkSource`, `DevMockBridge`) and 100% bundled offline assets. | `[x] Verified` |

---

## Instructions for Manual Acceptance Testing

1. Run the NSIS installer:
   ```cmd
   "release\ASL Practice Coach Setup 0.1.0.exe"
   ```
2. Or launch the unpacked binary directly:
   ```cmd
   "release\win-unpacked\ASL Practice Coach.exe"
   ```
3. Test with Airplane mode enabled to verify complete offline functionality.
