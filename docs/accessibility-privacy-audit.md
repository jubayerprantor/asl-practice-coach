# Step 12: Accessibility & Privacy Audit

## Verified Controls
1. **Text-First & Deaf/Hard-of-Hearing Parity:** Every spoken Web Speech hint is derived from the exact visible text rendered inside `FeedbackPanel`'s `aria-live="polite"` status region. Audio feedback defaults to OFF.
2. **Non-Color Visual Cues:** Skeleton overlays and status pills pair color with explicit icons (`✓`, `!`, `?`), text labels (`OK`, `Fix First`, `Adjust`), and distinct line dash patterns (solid vs. dashed).
3. **Keyboard Navigation:** All mode tabs, sign buttons, camera toggles, voice toggles, reference reveals, and data deletion confirmations are reachable via `Tab` with high-contrast `:focus-visible` outlines (`Alt+1/2/3` switches modes).
4. **Local-Only Privacy & Zero Runtime Network Calls:** MediaPipe WASM and `hand_landmarker.task` load from local `/public/mediapipe/`. Verified in browser DevTools Network tab (`Offline` mode enabled) that zero external network requests occur during camera tracking, evaluation, or IndexedDB logging.
5. **Visible Camera-Off Control & Setup Guidance:** "Turn Camera Off" remains pinned above the video stage at all times, and `CameraSetupCheck` verifies framing, distance, palm orientation, and lighting before practice begins.

## Known Limitations / Items Not Fixed in Browser MVP
1. **Native Screen Reader & Canvas Landmarks:** While `FeedbackPanel` updates via `aria-live="polite"`, the HTML5 `<canvas>` skeleton overlay itself is purely visual and cannot be navigated joint-by-joint by a screen reader.
2. **No Automated Browser-Level CI Accessibility Test Yet:** Unit tests run in Node (`Vitest`); automated `axe-core` / Playwright keyboard E2E checks should be added before packaging desktop/mobile builds.
3. **Browser-Dependent Speech Voices:** `window.speechSynthesis` voice quality and availability vary across OS/browser engines (especially on Linux/Safari) and cannot be bundled offline in standard web builds without native platform TTS wrappers.
