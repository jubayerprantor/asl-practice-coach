<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/branding/horizontal-color-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/branding/horizontal-color.svg">
    <img alt="ASL Practice Coach" src="public/branding/horizontal-color.svg" width="380">
  </picture>
</p>

<p align="center">
  <strong>Private, on-device American Sign Language (ASL) fingerspelling and numbers coach with real-time biomechanical joint feedback.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Privacy-100%25_On--Device-5EE0C0?style=flat-square" alt="Privacy" />
  <img src="https://img.shields.io/badge/Target-Offline_Desktop_App-181B1E?style=flat-square" alt="Offline Desktop" />
  <img src="https://img.shields.io/badge/Signs-34_Active_(Letters_+_Digits)-FFB020?style=flat-square" alt="34 Signs" />
  <img src="https://img.shields.io/badge/Engine-MediaPipe_Tasks_Vision-181B1E?style=flat-square" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tests-59_Passing-success?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions_Desktop_Packager-purple?style=flat-square" alt="CI/CD" />
</p>

---

## Overview

**ASL Practice Coach** is a privacy-first, on-device desktop application that helps users learn and master American Sign Language fingerspelling letters and numbers. 

Unlike video tutorials or flashcards that provide zero real-time correction, ASL Practice Coach analyzes live webcam frames on your local machine using computer vision. It computes 21 skeletal hand landmarks in 3D space at 30+ FPS, evaluates joint curl angles, finger spreads, and palm orientations against empirical biomechanical thresholds, and provides immediate, targeted anatomical guidance (e.g., *"Curl index finger more"*, *"Bring thumb closer to index finger"*).

### Absolute Privacy & Offline Security
* **Zero Video Streaming:** Video frames are processed entirely on your local machine and are never recorded or uploaded.
* **Transient In-Memory Evaluation:** Landmark data is computed in memory and discarded on the next frame.
* **100% Offline Architecture:** Ships with bundled MediaPipe WASM binaries, task models, and Inter typography—the application functions with your internet connection completely disabled.

---

## What's Included

### 1. 34 Active Signs Across 8 Structured Lessons
* **Full Static Alphabet (24 Signs):** `A, B, C, D, E, F, G, H, I, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y` *(J and Z are dynamic trajectory signs scheduled for Phase 6)*.
* **Numerical Digits (10 Signs):** `0, 1, 2, 3, 4, 5, 6, 7, 8, 9`.
* **Structured Curriculum Progression:**
  * **Lesson 1:** Anchor Signs (`A, B, L, V, Y`)
  * **Lesson 2:** Fist & Compact Family (`C, E, O, S`)
  * **Lesson 3:** Index & Directional Family (`D, F, G, H, I`)
  * **Lesson 4:** Cross & Contact Family (`K, R, U, W`)
  * **Lesson 5:** Thumb-Tuck Family (`M, N, T, X`)
  * **Lesson 6:** Downward & Tilt Family (`P, Q`)
  * **Lesson 7:** Numbers 1–5 (`1, 2, 3, 4, 5`)
  * **Lesson 8:** Numbers 6–9 & 0 (`6, 7, 8, 9, 0`)

### 2. Practice Modes
* **Learn Mode (`Ctrl+2`):** Guided lesson path with reference hand overlays, finger checklists, single-mistake hints, and post-lesson completion recaps.
* **Check Mode (`Ctrl+1`):** Quick-reference testing screen with instant sign picker chips, real-time hold meter, and automatic advance upon confirmation.
* **Word Practice Mode (`Ctrl+3`):** Sequential fingerspelling engine for everyday vocabulary (`CAT`, `DOG`, `SUN`, `ASL`, `BOOK`, etc.) with letter progression chips and celebration feedback.
* **Progress Mode (`Ctrl+4`):** Curriculum mastery overview tracking completed signs and lesson progress.

### 3. Personalization & Accessibility
* **Habit Streak Tracking:** Private daily practice streak tracking stored locally on your device.
* **Difficulty Tiers:**
  * *Relaxed:* 1.2s hold duration (ideal for beginners and motor accessibility).
  * *Standard:* 2.0s hold duration (balanced default practice tier).
  * *Precision:* 3.0s hold duration (for advanced muscle-memory mastery).
* **Accessibility Settings:** High-contrast visual mode, dynamic font scaling (100%–150%), and polite screen-reader announcements.
* **Optional Voice Coaching (`Ctrl+Shift+V`):** Non-blocking spoken feedback using the browser/system speech engine (muted by default).

---

## Architecture & Project Structure

ASL Practice Coach is designed as an **offline desktop application** wrapped in Electron, with a Vite development server used strictly as a rapid local developer harness. For detailed architecture documentation, see [**`guide.md`**](guide.md).

```text
/
├── .github/workflows/       # GitHub Actions automated desktop packaging CI/CD
├── docs/                    # Architecture records, test protocols, branding guidelines
│   ├── branding/            # Brand identity board & logo usage guidelines
│   ├── reports/             # Benchmark evaluations (100% Massey ASL accuracy)
│   ├── release-notes-v0.1.0.md # Release notes for official distributions
│   └── desktop-build.md     # Desktop packaging instructions and CI architecture
├── electron/                # Privileged Electron wrapper (main.cjs, preload.cjs, protocol app://asl)
├── guide.md                 # Developer & architecture guide (Dev Mode & runtime details)
├── plan.md                  # Categorical 7-phase implementation roadmap
├── public/                  # Offline WASM, models, fonts, icons, and branding SVGs
│   └── branding/            # Dual-theme SVG logos (light & dark mode variants)
├── scripts/                 # Ingestion, evaluation, dist inspection, and smoke tests
├── src/
│   ├── engine/              # PURE geometry & evaluation logic (Zero DOM/React dependencies)
│   │   ├── geometry.ts      # Vectors, curls, Euclidean spreads, palm normals
│   │   ├── evaluate.ts      # Biomechanical threshold evaluation & issue isolation
│   │   ├── synthetic.ts     # Deterministic synthetic test perturbations
│   │   └── types.ts         # Landmark, pack, and evaluation schemas
│   ├── packs/               # Modular language pack registry (ASL Lessons 1–8)
│   │   └── asl/             # reference.json, thresholds.json, feedback.json, curriculum.json
│   ├── services/            # CameraService, HandTrackingService, WordPractice, UserPreferences
│   ├── storage/             # IndexedDB local progress & settings wrapper
│   └── ui/                  # React components, responsive layouts, design tokens
└── tests/                   # 14 Vitest suites (59 passing tests, frozen snapshot invariants)
```

---

## Design Tokens & Brand Identity

The brand identity centers on the **Muscle-Memory Loop**—a continuous line tracing an ASL gesture wrapping into a circular confirmation timer:

| Token | Light Theme | Dark Theme | Role & Meaning |
| :--- | :--- | :--- | :--- |
| **Ink / Typography** | `#181B1E` | `#FFFFFF` | Primary readable text, prominent headings |
| **Coaching Amber** | `#FFB020` | `#FFB020` | Hold timer progress, targeted corrective finger guidance |
| **Mint Passing** | `#5EE0C0` | `#5EE0C0` | Confirmed hold completion, correct sign status |
| **Background / Ground**| `#F6F6F3` | `#16181A` | Non-glare application background |
| **Borders** | `#E3E3DE` | `#33373B` | Clean, subtle architectural dividing lines |

Dual-theme vector brand assets are maintained in [`public/branding/`](public/branding):
* `horizontal-color.svg` — Standard header lockup (Light background)
* `horizontal-color-dark.svg` — Header lockup (Dark background)
* `symbol-color.svg` — Standalone logo symbol / app mark
* `symbol-small.svg` — Compact favicon and app icon mark

---

## Quickstart & Local Development

### Prerequisites
* **Node.js:** v20 or v22 LTS
* **npm:** v10+

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/your-username/asl-practice-coach.git
cd asl-practice-coach

# Install dependencies (fast, lightweight dev dependencies)
npm install

# Start the Vite development harness
npm run dev

# Open http://localhost:5173 in your browser
```

> [!NOTE]
> When running under `npm run dev`, Vite activates the **Dev Mock Control Panel** at the bottom of the screen. This allows you to test hand recognition without raising your hand or plugging in a camera. See [`guide.md`](guide.md) for full Dev Mode documentation.

---

## Verification Pipeline (`npm run verify:web`)

Every pull request and build must pass the rigorous 6-stage verification pipeline:

```bash
npm run verify:web
```

The pipeline executes synchronously and halts on the first failure:

1. **TypeScript Validation:** `tsc --noEmit` verifies strict types.
2. **Unit & Invariant Tests:** `vitest run` executes all 14 test suites (59 tests) including the frozen snapshot test (`tests/mockSnapshot.test.ts`).
3. **Evaluation Benchmark:** `scripts/evaluate.ts` verifies 100% accuracy on the held-out public Massey ASL dataset.
4. **Production Web Build:** `vite build` creates minified, tree-shaken artifacts.
5. **Dist Inspection:** `scripts/inspect-dist.ts` validates that all WASM, models, and fonts exist locally in `dist/`, scans for illegal external URLs, and guarantees zero mock code in production.
6. **Headless Smoke Test:** `scripts/smoke-test.ts` spins up an offline local server, navigates headless Chrome, verifies IndexedDB initialization, and confirms zero non-local network requests.

---

## Desktop Packaging via GitHub Actions

To keep development environments fast and free from heavy platform binaries and build caches, desktop packaging is automated in GitHub Actions ([`.github/workflows/build-desktop.yml`](.github/workflows/build-desktop.yml)).

### Publishing an Official Desktop Release
Push any tag starting with `v` (e.g. `v0.1.0`):

```bash
git tag v0.1.0
git push origin v0.1.0
```

The cloud runner runs `verify:web`, installs packaging tools, produces standalone Windows NSIS installers (`.exe`), and attaches the executable directly to the GitHub Release.

---

## Core Engineering Invariants

1. **Never Hardcode Thresholds:** All geometric conditions are derived from empirical dataset statistics in `thresholds.json`.
2. **Pure Mathematical Engine:** `/src/engine` contains zero React hooks, DOM manipulation, or webcam APIs. It receives 21 landmarks and outputs evaluation results.
3. **Frozen Snapshot Invariant:** The test in `tests/mockSnapshot.test.ts` asserts engine stability against `tests/fixtures/evaluationSnapshot.json`, ensuring non-regressive accuracy.
4. **Offline Isolation:** Zero runtime dependencies on external CDNs or remote APIs. All vision models and fonts are served locally.
5. **Handedness Parity:** Mirroring and observer perspectives are normalized so both physical right and left hands receive identical feedback.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details. Dataset sources and licenses are documented in [`docs/data-sources.md`](docs/data-sources.md).
