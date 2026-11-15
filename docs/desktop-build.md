# Desktop Build & Packaging Guide (Windows)

This document provides exact prerequisites and build commands for packaging ASL Practice Coach as a native Windows desktop application with Electron and NSIS.

---

## 1. Prerequisites

- **Operating System:** Windows 10 or 11 (64-bit)
- **Node.js:** v20.x or higher (LTS recommended)
- **Package Manager:** npm (bundled with Node.js)
- **Webcam:** Integrated or USB webcam for live hand gesture evaluation

No native C++ compiler or Rust toolchain is required.

---

## 2. Architecture & Security Invariants

The desktop application is packaged using Electron with strict security and isolation guarantees:

1. **Clean Web Output Packaging:**
   - The wrapper packages only the pre-compiled `dist/` directory.
   - Zero separate renderer code is introduced.
2. **Custom Privileged Protocol:**
   - The app runs exclusively on `app://asl` registered as privileged (`standard`, `secure`, `supportFetchAPI`, `corsEnabled`, `stream`).
   - The origin `app://asl` is locked permanently so user progress (IndexedDB `asl_practice_coach_db` and localStorage) is preserved.
3. **Strict Content Security Policy (CSP):**
   ```text
   default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none';
   ```
4. **Sandboxing & Isolation:**
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - External navigations and `window.open` requests are blocked.
   - DevTools are disabled in production builds.
5. **Permissions:**
   - Only `media` permission is granted to `app://asl`. All other permissions are rejected.
   - When camera access is blocked in OS settings, the blocked UI provides a direct shortcut to Windows Camera Settings (`ms-settings:privacy-webcam`).
6. **Window Geometry:**
   - Default: `1280 x 800`
   - Minimum: `1024 x 700`
   - Native Windows title bar with menu bar hidden.
   - Window size, position, and maximized state are persisted across sessions in `%APPDATA%\asl-practice-coach\window-state.json`.
7. **Offline Isolation:**
   - 100% offline assets: MediaPipe wasm runtimes, `hand_landmarker.task` model, and Inter font files are bundled locally.
   - Zero telemetry, zero analytics, zero external network requests.

---

## 3. Development Mode

To build the web distribution and run the Electron desktop wrapper in development:

```bash
npm run dev:desktop
```

---

## 4. Production Packaging

To build the complete standalone Windows installer (.exe):

```bash
npm run build:desktop
```

### What this command executes in order:
1. `npx vite build --mode production`: Generates an optimized production bundle in `dist/`.
2. `npx electron-builder --dir`: Builds the unpacked desktop directory in `release/win-unpacked/`.
3. **Packaged `distScan` Invariant Verification:** Scans `release/win-unpacked/resources/app/dist` to assert that:
   - All 12 required offline assets are present (Wasm binaries, model file, fonts).
   - Zero mock strings (`MOCK DATA`, `MockLandmarkSource`, `DevMockBridge`, etc.) are present in the installer bundle.
4. `npx electron-builder --win nsis`: Produces the final standalone NSIS setup installer.

---

## 5. Build Outputs

All desktop distribution files are generated in the `release/` directory:

| File | Description |
|---|---|
| `release/ASL Practice Coach Setup 0.1.0.exe` | Standard Windows NSIS Setup installer. |
| `release/win-unpacked/` | Unpacked standalone executable folder (`ASL Practice Coach.exe`). |
