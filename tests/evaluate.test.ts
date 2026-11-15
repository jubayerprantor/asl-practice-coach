import { describe, expect, it } from 'vitest';
import evaluatorConfigJson from '../src/packs/asl/evaluator-config.json';
import {
  evaluate,
  extractHandFeatures,
  SignEvaluatorSession,
  type EvaluatorConfig,
  type SignPackBundle,
} from '../src/engine';
import type { ThresholdsPackFile } from '../src/packs/schema';
import {
  FIXTURE_LETTER_B_RIGHT,
  FIXTURE_LETTER_V_RIGHT,
} from './fixtures/handFixtures';
import { perturbFingerCurl, perturbFingertipSpacing } from './synthetic';

const TEST_CONFIG = evaluatorConfigJson as EvaluatorConfig;

/**
 * Builds a test pack bundle derived directly from fixture feature measurements
 * so unit tests never rely on hardcoded magic thresholds.
 */
function buildFixtureDerivedPack(): SignPackBundle {
  const vFeats = extractHandFeatures(FIXTURE_LETTER_V_RIGHT, 'Right');

  const thresholds: ThresholdsPackFile = {
    schemaVersion: '1.0.0',
    language: 'asl',
    status: 'provisional',
    generatedAt: '2026-11-15T00:00:00.000Z',
    percentileLow: 5,
    percentileHigh: 95,
    signs: {
      V: {
        sign: 'V',
        status: 'provisional',
        derivedFromDataset: 'fixture',
        checkedAgainstDataset: null,
        sampleCount: 1,
        conditions: [
          {
            id: 'index_curl',
            feature: 'curl_index_deg',
            finger: 'index',
            label: 'index curl',
            feedbackKeyBelow: 'index_curl_more',
            feedbackKeyAbove: 'index_extend_more',
            priority: 1,
            min: vFeats.curl_index_deg - 15,
            max: vFeats.curl_index_deg + 15,
          },
          {
            id: 'middle_curl',
            feature: 'curl_middle_deg',
            finger: 'middle',
            label: 'middle curl',
            feedbackKeyBelow: 'middle_curl_more',
            feedbackKeyAbove: 'middle_extend_more',
            priority: 1,
            min: vFeats.curl_middle_deg - 15,
            max: vFeats.curl_middle_deg + 15,
          },
          {
            id: 'ring_curl',
            feature: 'curl_ring_deg',
            finger: 'ring',
            label: 'ring curl',
            feedbackKeyBelow: 'ring_curl_more',
            feedbackKeyAbove: 'ring_extend_more',
            priority: 2,
            min: vFeats.curl_ring_deg - 20,
            max: vFeats.curl_ring_deg + 20,
          },
          {
            id: 'pinky_curl',
            feature: 'curl_pinky_deg',
            finger: 'pinky',
            label: 'pinky curl',
            feedbackKeyBelow: 'pinky_curl_more',
            feedbackKeyAbove: 'pinky_extend_more',
            priority: 2,
            min: vFeats.curl_pinky_deg - 20,
            max: vFeats.curl_pinky_deg + 20,
          },
          {
            id: 'index_middle_spacing',
            feature: 'dist_index_middle',
            finger: 'index',
            secondaryFinger: 'middle',
            label: 'index-middle spacing',
            feedbackKeyBelow: 'index_middle_apart',
            feedbackKeyAbove: 'index_middle_closer',
            priority: 2,
            min: vFeats.dist_index_middle - 0.12,
            max: vFeats.dist_index_middle + 0.15,
          },
        ],
      },
    },
  };

  return { thresholds, config: TEST_CONFIG };
}

describe('Evaluation Engine (/src/engine/evaluate.ts)', () => {
  const pack = buildFixtureDerivedPack();

  it('returns "correct" when all sign conditions pass', () => {
    const res = evaluate(FIXTURE_LETTER_V_RIGHT, 'V', pack);

    expect(res.status).toBe('correct');
    expect(res.unableReason).toBeNull();
    expect(res.topIssue).toBeNull();
    expect(res.fingers.index.passed).toBe(true);
    expect(res.fingers.middle.passed).toBe(true);
    expect(res.fingers.ring.passed).toBe(true);
    expect(res.fingers.pinky.passed).toBe(true);
  });

  it('flags ONLY the perturbed ring finger on synthetic error "V with ring finger half-extended"', () => {
    const syntheticWrongV = perturbFingerCurl(
      FIXTURE_LETTER_V_RIGHT,
      'ring',
      -95,
      'Right'
    );

    const res = evaluate(syntheticWrongV.landmarks, 'V', pack);

    expect(res.status).toBe('needs_correction');
    expect(res.fingers.ring.passed).toBe(false);
    expect(res.fingers.ring.feedbackKey).toBe('ring_curl_more');

    // All non-perturbed fingers must still pass
    expect(res.fingers.index.passed).toBe(true);
    expect(res.fingers.middle.passed).toBe(true);
    expect(res.fingers.pinky.passed).toBe(true);
    expect(res.fingers.thumb.passed).toBe(true);
    expect(res.topIssue?.finger).toBe('ring');
  });

  it('flags index-middle spacing when fingers are brought together like letter U', () => {
    const narrowV = perturbFingertipSpacing(
      FIXTURE_LETTER_V_RIGHT,
      'index',
      'middle',
      -20,
      'Right'
    );

    const res = evaluate(narrowV.landmarks, 'V', pack);
    expect(res.status).toBe('needs_correction');
    expect(res.topIssue?.ruleId).toBe('index_middle_spacing');
    expect(res.topIssue?.feedbackKey).toBe('index_middle_apart');
  });

  it('returns "unable_to_evaluate" with clear reasons when confidence gate fails', () => {
    // 1. Low MediaPipe confidence score
    const lowScore = evaluate(FIXTURE_LETTER_V_RIGHT, 'V', pack, {
      mediaPipeScore: 0.35,
    });
    expect(lowScore.status).toBe('unable_to_evaluate');
    expect(lowScore.unableReason).toBe('low_detection_confidence');

    // 2. Hand too far (shrunk to tiny scale in frame)
    const tinyHand = FIXTURE_LETTER_V_RIGHT.map((pt) => ({
      x: 0.5 + (pt.x - 0.5) * 0.15,
      y: 0.5 + (pt.y - 0.5) * 0.15,
      z: pt.z * 0.15,
    }));
    const farRes = evaluate(tinyHand, 'V', pack, { mediaPipeScore: 0.95 });
    expect(farRes.status).toBe('unable_to_evaluate');
    expect(farRes.unableReason).toBe('hand_too_far');

    // 3. Hand too close
    const giantHand = FIXTURE_LETTER_V_RIGHT.map((pt) => ({
      x: 0.5 + (pt.x - 0.5) * 2.4,
      y: 0.5 + (pt.y - 0.5) * 2.4,
      z: pt.z * 2.4,
    }));
    const closeRes = evaluate(giantHand, 'V', pack, { mediaPipeScore: 0.95 });
    expect(closeRes.status).toBe('unable_to_evaluate');
    expect(['hand_too_close', 'hand_out_of_frame']).toContain(
      closeRes.unableReason
    );

    // 4. Null landmarks
    const noHand = evaluate(null, 'V', pack);
    expect(noHand.status).toBe('unable_to_evaluate');
    expect(noHand.unableReason).toBe('no_hand_detected');
  });

  it('prevents threshold boundary flickering via per-finger hysteresis', () => {
    const session = new SignEvaluatorSession();
    const vFeats = extractHandFeatures(FIXTURE_LETTER_V_RIGHT, 'Right');

    // Create a custom pack where index_curl max is right at the fixture value
    const tightPack: SignPackBundle = {
      ...pack,
      thresholds: {
        ...pack.thresholds,
        signs: {
          V: {
            ...pack.thresholds.signs.V,
            conditions: [
              {
                id: 'index_curl',
                feature: 'curl_index_deg',
                finger: 'index',
                label: 'index curl',
                feedbackKeyBelow: 'index_curl_more',
                feedbackKeyAbove: 'index_extend_more',
                priority: 1,
                min: vFeats.curl_index_deg - 20,
                max: vFeats.curl_index_deg + 0.5,
              },
            ],
          },
        },
      },
    };

    // Frame 1: passes inside [min, max]
    const f1 = session.evaluateFrame(
      { landmarks: FIXTURE_LETTER_V_RIGHT, timestampMs: 100 },
      'V',
      tightPack
    );
    expect(f1.status).toBe('correct');

    // Frame 2: tiny 1.0° micro-jitter slightly above max, still inside hysteresis exit band
    const slightlyBent = perturbFingerCurl(
      FIXTURE_LETTER_V_RIGHT,
      'index',
      1.0,
      'Right'
    );
    const f2 = session.evaluateFrame(
      { landmarks: slightlyBent.landmarks, timestampMs: 133 },
      'V',
      tightPack
    );
    expect(f2.status).toBe('correct');
  });

  it('tracks hold progress over 1.2s and resets when sign breaks', () => {
    const session = new SignEvaluatorSession(1200);

    // t = 0ms -> start holding
    const r0 = session.evaluateFrame(
      { landmarks: FIXTURE_LETTER_V_RIGHT, timestampMs: 1000 },
      'V',
      pack
    );
    expect(r0.status).toBe('correct');
    expect(r0.hold.progress).toBe(0);
    expect(r0.hold.completed).toBe(false);

    // t = 600ms -> 50% held
    const r600 = session.evaluateFrame(
      { landmarks: FIXTURE_LETTER_V_RIGHT, timestampMs: 1600 },
      'V',
      pack
    );
    expect(r600.hold.progress).toBeCloseTo(0.5, 2);
    expect(r600.hold.completed).toBe(false);

    // t = 2250ms (1250ms held >= 1200ms) -> completed
    const rDone = session.evaluateFrame(
      { landmarks: FIXTURE_LETTER_V_RIGHT, timestampMs: 2250 },
      'V',
      pack
    );
    expect(rDone.hold.completed).toBe(true);
    expect(rDone.hold.progress).toBe(1);

    // Wrong pose breaks the hold and resets timer
    const rBreak = session.evaluateFrame(
      { landmarks: FIXTURE_LETTER_B_RIGHT, timestampMs: 3500 },
      'V',
      pack
    );
    expect(rBreak.status).toBe('needs_correction');
    expect(rBreak.hold.heldMs).toBe(0);
    expect(rBreak.hold.completed).toBe(false);
  });
});
