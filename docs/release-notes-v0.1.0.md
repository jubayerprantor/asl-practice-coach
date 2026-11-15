# ASL Practice Coach v0.1.0 — Initial Desktop Release

We are proud to present **v0.1.0** of **ASL Practice Coach**, a private, completely offline on-device American Sign Language fingerspelling coach with real-time geometric feedback.

---

### Highlights & Core Features

#### 1. Full 24 Static Letters & Numbers 0–9
* **34 Active Signs:** Complete spatial geometric modeling for letters `A, B, C, D, E, F, G, H, I, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y` and numerical digits `0, 1, 2, 3, 4, 5, 6, 7, 8, 9`.
* **8 Structured Lessons:**
  * **Lesson 1:** Anchor Signs (`A, B, L, V, Y`)
  * **Lesson 2:** Fist & Compact Family (`C, E, O, S`)
  * **Lesson 3:** Index & Directional Family (`D, F, G, H, I`)
  * **Lesson 4:** Cross & Contact Family (`K, R, U, W`)
  * **Lesson 5:** Thumb-Tuck Family (`M, N, T, X`)
  * **Lesson 6:** Downward & Tilt Family (`P, Q`)
  * **Lesson 7:** Numbers 1–5 (`1, 2, 3, 4, 5`)
  * **Lesson 8:** Numbers 6–9 & 0 (`6, 7, 8, 9, 0`)

#### 2. Word Fingerspelling Practice Mode (`Ctrl+3`)
* Practice beginner vocabulary (`CAT`, `DOG`, `SUN`, `ASL`, `BOOK`, etc.) letter-by-letter.
* Interactive word chips, real-time hold progression, and celebratory completion banners.

#### 3. Practice Consistency & Personalization
* **Habit Streak Tracking:** Tracks consecutive active practice days stored privately in local storage.
* **3 Difficulty Tiers:**
  * *Relaxed:* 1.2s hold duration (ideal for beginners and motor accessibility).
  * *Standard:* 2.0s hold duration (default balanced tier).
  * *Precision:* 3.0s hold duration (for advanced muscle-memory mastery).
* **Accessibility Settings:** High-contrast color scheme, dynamic font scaling, and polite screen-reader announcements.

#### 4. 100% Privacy & Zero-Cloud Guarantee
* Video frames are processed entirely on your local machine using MediaPipe Hand Landmarker via local WebAssembly.
* Zero cloud calls, zero telemetry, zero analytics, zero external network connections.

---

### Desktop Installer Assets
* `ASL-Practice-Coach-Setup-0.1.0.exe`: Windows NSIS Desktop Installer (x64)
