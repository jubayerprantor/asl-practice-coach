# ASL Fingerspelling Practice Coach

A browser-based American Sign Language (ASL) fingerspelling practice coach. Webcam in, per-finger corrective feedback out. All video and landmark processing runs 100% locally on your device—no video ever leaves the browser.

## Tech Stack
- **UI & Build:** React + Vite + TypeScript
- **Hand Tracking:** `@mediapipe/tasks-vision` (`HandLandmarker`)
- **Overlay:** HTML5 Canvas
- **Optional Audio:** Web Speech API (`speechSynthesis`)
- **Local Storage:** IndexedDB
- **Testing:** Vitest

## Project Structure
```text
/src/engine      Pure geometry & evaluation logic (no React, DOM, or webcam)
/src/packs/asl   Human-authored ASL pack (reference.json, thresholds.json, feedback.json, curriculum.json)
/src/data        Dataset ingestion & landmark schema definitions
/src/ui          React UI components
/src/storage     IndexedDB wrapper for local progress & logs
/scripts         Offline analysis, threshold derivation, and evaluation scripts
/docs            Data schema, dataset licenses/sources, and human test protocols
/tests           Unit tests and fixture suites
```

## Project Hard Rules

1. **Never invent thresholds.** Every angle/distance threshold must be read from a data-derived config file (`thresholds.json`), never hardcoded inline. Mark all derived thresholds `"provisional"` until validated on real users.
2. **Never generate ASL handshape descriptions from LLM knowledge.** Handshape descriptions live in `/src/packs/asl/reference.json`, authored and reviewed by a human.
3. **Keep `/src/engine/` pure.** Landmarks in, results out. Zero React, DOM, or webcam imports inside `/src/engine/`.
4. **Unit test every engine function** using dataset and synthetic fixtures.
5. **Never give a correction when confidence is low.** Return `"unable_to_evaluate"` instead.
6. **Feedback must be text first.** Voice feedback is optional and off by default. Never rely on red/green color alone; pair with icons and text labels.
7. **Work in small steps.** Implement only what the current step asks and explain tradeoffs before major changes.
8. **Handle MediaPipe handedness carefully.** Labels flip with mirrored webcam input; maintain explicit unit tests for both left and right hands.
9. **Enforce strict data hygiene.** Record the source and license of every dataset in `/docs/data-sources.md`. Never split train/test randomly—split by dataset source or subject ID. Deduplicate near-identical frames before evaluation, and report per-letter MediaPipe detection dropout counts.
10. **Isolate synthetic data.** Synthetic perturbations may be used for unit tests only. Never report synthetic results as evidence of real-world accuracy.

## Phase 2 Rules

1. Do not change engine behavior, thresholds, feedback text, or visual design in this phase. Refactor structure only, unless a step says otherwise.
2. Never delete a file without first listing it and showing me what, if anything, differs from its replacement. Wait for my confirmation.
3. Mock or developer tooling must exist only in development builds. Gate it on `import.meta.env.DEV`, never on a URL parameter alone, and never ship it in `dist/`.
4. Anything shown with mock data must display a visible "MOCK DATA" banner. Mock results must never be saved to progress storage or counted in evaluation reports.
5. Performance claims need numbers. Do not state a speedup or memory saving you have not measured.
6. After every step run: `tsc --noEmit`, `vitest run`, and `vite build`. Report the results. Do not continue if any fail.
7. Work in small steps. Explain tradeoffs before big changes.

## Getting Started

```bash
npm install
npm run dev    # Start local Vite dev server
npm test       # Run Vitest unit tests
```
