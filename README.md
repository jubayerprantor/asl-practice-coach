<p align="center">
  <img src="ASL-Practice-Coach-Branding/artwork/horizontal-color.svg" alt="ASL Practice Coach" width="360" />
</p>

<p align="center">
  <strong>On-device, real-time American Sign Language (ASL) fingerspelling tutor with joint-level biomechanical feedback.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Privacy-100%25_On--Device-5EE0C0?style=flat-square" alt="Privacy" />
  <img src="https://img.shields.io/badge/AI_Engine-MediaPipe_Tasks_Vision-181B1E?style=flat-square" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square" alt="Vite" />
  <img src="https://img.shields.io/badge/Tests-Vitest_Passing-success?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/Cloud_Packaging-GitHub_Actions-purple?style=flat-square" alt="CI/CD" />
</p>

---

## Overview

**ASL Practice Coach** is an interactive, privacy-first web and desktop tutor designed to help learners master the American Sign Language fingerspelling alphabet.

Unlike traditional flashcards or passive videos that offer no validation, ASL Practice Coach analyzes live webcam frames directly in the browser using on-device computer vision. It computes 21 three-dimensional skeletal hand landmarks at 30+ FPS, evaluates joint curl angles, spreads, and palm orientations against human-reviewed biomechanical thresholds, and provides immediate anatomical guidance (e.g. *"Curl index finger more"*, *"Tuck thumb across palm"*).

### Absolute Privacy Guarantee
* **Zero Video Streaming**: Video frames never leave your computer.
* **In-Memory Processing**: Landmarks are evaluated in transient browser memory and immediately discarded.
* **100% Offline Capable**: Bundled offline MediaPipe WASM binaries, task models, and fonts allow the app to operate with the network completely disabled.

---

## Key Features

- **21-Point Skeletal Tracking**: Captures wrist, MCP (knuckles), PIP, DIP, and fingertip coordinates in real-time.
- **Biomechanical Rule Engine**: Evaluates finger curl angles in degrees, inter-finger spread ratios relative to palm size, and 3D palm normal vectors.
- **Hold-to-Confirm Muscle Memory Engine**: Requires the user to hold the correct sign steadily for a configurable duration (1.2s) across multiple repetitions before marking it mastered.
- **Color-Coded Visual Guidance**:
  - `Mint Green (#5EE0C0)` — Correct finger position and successful hold completion.
  - `Coaching Amber (#FFB020)` — Targeted finger requiring attention.
  - `Neutral Slate (#8A9096)` — Resting / non-target landmarks.
- **Curriculum & Check Modes**:
  - **Learn Mode**: Structured progression through Lesson 1 (**A, B, L, V, Y**), complete with reference sign photos, target outlines, and mistake analytics.
  - **Check Mode**: Rapid test and practice screen with instant sign switching chips and auto-advance review.
  - **Progress Mode**: Tracks mastered signs and schedules reviews using Leitner spaced repetition.
- **Optional Voice Coaching**: Non-blocking, debounced spoken instructions using the browser's Web Speech API (muted by default).
- **Desktop Packaging via GitHub Actions**: Clean cloud CI/CD that packages standalone Windows NSIS installers without taxing local development machines.

---

## Architecture & Project Structure

```text
/
├── .github/workflows/       # GitHub Actions automated desktop packaging CI/CD
├── ASL-Practice-Coach-Branding/ # Brand guidelines, SVGs, and web icon assets
├── data/                    # Processed evaluation datasets (e.g. Massey ASL)
├── docs/                    # Architecture records, test protocols, parity checklists
│   ├── reports/             # Generated evaluation summaries and accuracy benchmarks
│   ├── desktop-build.md     # Desktop packaging instructions and CI architecture
│   └── desktop-parity.md    # Desktop-to-web behavioral parity checklist
├── electron/                # Privileged Electron wrapper (main.cjs, preload.cjs)
├── public/                  # Offline WASM, models, fonts, icons, and branding SVGs
├── scripts/                 # Ingestion, evaluation, dist inspection, and smoke tests
├── src/
│   ├── engine/              # PURE geometry & evaluation logic (Zero DOM/React dependencies)
│   │   ├── geometry.ts      # Vectors, curls, Euclidean spreads, palm normals
│   │   ├── evaluate.ts      # Biomechanical threshold evaluation & issue isolation
│   │   ├── synthetic.ts     # Deterministic synthetic test perturbations
│   │   └── types.ts         # Landmark, pack, and evaluation schemas
│   ├── packs/               # Modular language pack registry (ASL Lesson 1)
│   │   └── asl/             # reference.json, thresholds.json, feedback.json, curriculum.json
│   ├── services/            # CameraService, HandTrackingService, Leitner review store
│   ├── storage/             # IndexedDB local progress & settings wrapper
│   └── ui/                  # React components, responsive layouts, design tokens
└── tests/                   # 12 Vitest suites (geometry, services, frozen snapshot invariant)
```

---

## Design Tokens & Brand Identity

The brand identity centers on the **Muscle-Memory Loop**—a continuous line tracing an ASL gesture wrapping into a circular confirmation timer:

| Token | Hex Value | Role & Meaning |
| :--- | :--- | :--- |
| **Slate Charcoal** | `#181B1E` | Primary ink, dark camera viewfinder, strong typography |
| **Coaching Amber** | `#FFB020` | Hold timer arc, targeted corrective guidance, attentive feedback |
| **Mint Passing** | `#5EE0C0` | Confirmed hold, correct sign, positive progress |
| **Eggshell Ground**| `#F6F6F3` | Warm, non-glare application background |
| **Borders** | `#E3E3DE` | Clean, subtle architectural dividing lines |

Vector brand assets are organized in [`ASL-Practice-Coach-Branding/`](file:///c:/Users/DSU/Downloads/PROGRAMMING/ASL%20Practice%20Coach/ASL-Practice-Coach-Branding):
- `artwork/horizontal-color.svg` — Standard header lockup
- `artwork/symbol-color.svg` — Standalone logo symbol / app mark
- `icons/` — Complete favicon and manifest suite (`favicon.ico`, `favicon.svg`, `icon-180.png`, `icon-192.png`, `icon-512.png`)

---

## Quickstart & Local Development

### Prerequisites
- **Node.js**: v20 or v22 LTS
- **npm**: v10+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/asl-practice-coach.git
cd asl-practice-coach

# Install dependencies (fast, lightweight web dependencies only)
npm install
```

### Running Locally
```bash
# Start the Vite development server
npm run dev

# Open http://localhost:5173 in your browser
```

---

## Verification Pipeline (`npm run verify:web`)

Every pull request and build must pass the rigorous 6-stage verification pipeline:

```bash
npm run verify:web
```

The pipeline executes synchronously and halts on the first failure:

1. **TypeScript Validation**: `tsc --noEmit` verifies strict types.
2. **Unit & Invariant Tests**: `vitest run` executes all 12 test suites, including the frozen snapshot test (`tests/mockSnapshot.test.ts`).
3. **Evaluation Benchmark**: `scripts/evaluate.ts` tests accuracy on the held-out public Massey ASL dataset.
4. **Production Web Build**: `vite build` creates minified, tree-shaken artifacts.
5. **Dist Inspection**: `scripts/inspect-dist.ts` validates that all WASM, models, and fonts exist locally in `dist/`, scans for illegal external URLs, and ensures mock code is 100% eliminated.
6. **Headless Smoke Test**: `scripts/smoke-test.ts` spins up an offline local server, navigates headless Chrome, verifies IndexedDB initialization, and confirms zero external network calls.

---

## Cloud Packaging via GitHub Actions

To keep development machines fast and free from heavy Electron binaries and build caches, desktop packaging is automated in GitHub Actions (`.github/workflows/build-desktop.yml`).

### Triggering a Cloud Build
* **Draft Release on Tag**: Push any tag starting with `v` (e.g. `v0.1.0`):
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  ```
* **Manual Dispatch**: Go to the **Actions** tab in GitHub, select **Build Desktop Application**, and click **Run workflow**.

The cloud runner runs `verify:web`, dynamically installs builder tools, produces signed/clean NSIS Windows installers, and uploads the `.exe` directly to GitHub Releases and artifacts.

---

## Core Engineering Invariants

1. **Never Invent Thresholds**: All angle and distance boundaries are derived from empirical dataset statistics in `thresholds.json`.
2. **Pure Mathematical Engine**: `/src/engine` contains zero React hooks, DOM manipulation, or webcam APIs. It receives 21 landmarks and outputs evaluation results.
3. **Frozen Snapshot Invariant**: The test suite in `tests/mockSnapshot.test.ts` verifies evaluation stability against `tests/fixtures/evaluationSnapshot.json`, which must never be regenerated.
4. **Text-First & Accessible**: Visual feedback pairs icons with text explanations; audio is an optional enhancement that defaults to off.
5. **Handedness Parity**: Mirroring and observer perspectives are normalized so both physical right and left hands receive accurate feedback.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details. Dataset sources and licenses are documented in [`docs/data-sources.md`](docs/data-sources.md).
