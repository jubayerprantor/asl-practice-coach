import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SignEvaluatorSession } from '../src/engine';
import { toSignPackBundle, getLanguagePack } from '../src/packs/packRegistry';
import { perturbFingerCurl } from './synthetic';

const SNAPSHOT_PATH = resolve(__dirname, 'fixtures/evaluationSnapshot.json');

describe('Mock Replay Evaluation Snapshot Parity', () => {
  it('evaluates static signs A-E consistently against frozen snapshot', () => {
    const loadedPack = getLanguagePack('asl');
    const pack = toSignPackBundle(loadedPack);
    const session = new SignEvaluatorSession();

    const signs = ['A', 'B', 'L', 'V', 'Y'] as const;
    const results: Record<string, any> = {};

    for (const sign of signs) {
      session.reset();
      const ref = loadedPack.reference.signs[sign];
      const canonical = ref.canonicalLandmarks;
      if (!canonical) {
        throw new Error(`Missing canonical landmarks for sign ${sign}`);
      }

      // 1. Correct canonical frame
      const correctEval = session.evaluateFrame(
        {
          landmarks: canonical,
          handedness: 'Right',
          mediaPipeScore: 0.95,
          timestampMs: 1000,
        },
        sign,
        pack
      );

      // 2. Perturbed thumb frame
      session.reset();
      const faultyThumb = perturbFingerCurl(canonical, 'thumb', -60, 'Right');
      const thumbEval = session.evaluateFrame(
        {
          landmarks: faultyThumb.landmarks,
          handedness: 'Right',
          mediaPipeScore: 0.92,
          timestampMs: 1000,
        },
        sign,
        pack
      );

      // 3. Perturbed index frame
      session.reset();
      const deltaIndex = (sign as string) === 'B' || (sign as string) === 'L' || (sign as string) === 'V' ? -80 : 80;
      const faultyIndex = perturbFingerCurl(canonical, 'index', deltaIndex, 'Right');
      const indexEval = session.evaluateFrame(
        {
          landmarks: faultyIndex.landmarks,
          handedness: 'Right',
          mediaPipeScore: 0.92,
          timestampMs: 1000,
        },
        sign,
        pack
      );

      results[sign] = {
        correct: {
          status: correctEval.status,
          unableReason: correctEval.unableReason,
          topIssue: correctEval.topIssue,
          fingers: Object.fromEntries(
            Object.entries(correctEval.fingers).map(([f, r]) => [
              f,
              { passed: r.passed, priority: r.priority, feedbackKey: r.feedbackKey },
            ])
          ),
        },
        faultyThumb: {
          status: thumbEval.status,
          unableReason: thumbEval.unableReason,
          topIssue: thumbEval.topIssue,
          thumbPassed: thumbEval.fingers.thumb.passed,
        },
        faultyIndex: {
          status: indexEval.status,
          unableReason: indexEval.unableReason,
          topIssue: indexEval.topIssue,
          indexPassed: indexEval.fingers.index.passed,
        },
      };
    }

    // Strictly frozen snapshot: NEVER regenerate. If results differ, report the failure.
    if (!existsSync(SNAPSHOT_PATH)) {
      throw new Error(`Evaluation snapshot missing at ${SNAPSHOT_PATH}. It must not be regenerated.`);
    }

    const storedSnapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    expect(results).toEqual(storedSnapshot);
  });
});

