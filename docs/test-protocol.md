# Step 15: Real-Human Testing & Data Collection Protocol

> **Pre-Collection Checklist:**
> 1. Confirm your institution's IRB / ethics review requirements before collecting data from human participants—even when storing anonymous landmarks only.
> 2. Have a fluent or native ASL signer review `/src/packs/asl/reference.json` and `/src/packs/asl/feedback.json` before running participant sessions.
> 3. Recruit participants across diverse hand sizes, skin tones, left/right handedness, and everyday room lighting conditions.

## 1. What Is Recorded (and What Is Never Recorded)
- **Recorded:** 30 stable frames of 21 normalized 3D hand landmark coordinates `(x, y, z)`, MediaPipe confidence score, anatomical handedness (`Left` / `Right`), target sign label, an optional `intendedError` tag, and an anonymous participant code (`P01`, `P02`, etc.).
- **Never Recorded:** Raw webcam video, still photographs, facial landmarks, audio, IP addresses, or personally identifiable names/emails. All processing runs locally in the browser; exported JSON files are saved manually by the researcher.

## 2. Participant Instructions
1. Sit comfortably at arm's length from the webcam in natural indoor lighting (avoid bright backlighting behind your hand).
2. Confirm your assigned anonymous Participant ID (e.g., `P01`) and signing hand (`Left` or `Right`).
3. For **clean target trials**, form the requested ASL fingerspelling letter and hold it steady until all 30 frames are captured (~1 second).
4. For **deliberate-mistake trials**, follow the researcher's specific prompt (e.g., *"Form letter V, but leave your ring finger half-extended"*) while the researcher records the `intendedError` tag.
5. You may pause, skip any sign, or stop participating at any time without penalty.

## 3. Informed Consent Wording (Placeholder — Adapt to Institutional Template)
> **Purpose:** You are invited to test an offline ASL fingerspelling practice tool. The software detects 21 geometric joint coordinates of your hand in real time to evaluate finger positions.
>
> **Privacy & Data:** No video or images of you are ever saved or uploaded. Only anonymous 3D hand-skeleton coordinates linked to a random participant code (`P01`) are stored locally on the study device.
>
> **Voluntary Participation & Withdrawal:** Participation is completely voluntary. You may stop at any time. To withdraw your data during or after the session, notify the researcher with your participant code (`P01`), and all clips matching that code will be permanently deleted from the local database and JSON export files.

## 4. How to Withdraw or Delete Participant Data
- **In-App (During Session):** Click **Remove** next to any clip or **Clear All Clips** in the Test Recorder panel to erase entries from browser IndexedDB immediately.
- **Post-Export:** Filter out and delete all objects where `"subjectId": "<PARTICIPANT_ID>"` from the exported JSON file.
