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
  FIXTURE_LETTER_C_RIGHT,
  FIXTURE_LETTER_O_RIGHT,
  FIXTURE_LETTER_D_RIGHT,
  FIXTURE_LETTER_F_RIGHT,
  FIXTURE_LETTER_U_RIGHT,
  FIXTURE_LETTER_I_RIGHT,
  FIXTURE_LETTER_W_RIGHT,
  FIXTURE_LETTER_S_RIGHT,
  FIXTURE_LETTER_R_RIGHT,
  FIXTURE_LETTER_K_RIGHT,
  FIXTURE_LETTER_X_RIGHT,
  FIXTURE_LETTER_E_RIGHT,
  FIXTURE_LETTER_G_RIGHT,
  FIXTURE_LETTER_H_RIGHT,
  FIXTURE_LETTER_P_RIGHT,
  FIXTURE_LETTER_Q_RIGHT,
  FIXTURE_LETTER_T_RIGHT,
  FIXTURE_LETTER_N_RIGHT,
  FIXTURE_LETTER_M_RIGHT,
  FIXTURE_DIGIT_0_RIGHT,
  FIXTURE_DIGIT_1_RIGHT,
  FIXTURE_DIGIT_2_RIGHT,
  FIXTURE_DIGIT_3_RIGHT,
  FIXTURE_DIGIT_4_RIGHT,
  FIXTURE_DIGIT_5_RIGHT,
  FIXTURE_DIGIT_6_RIGHT,
  FIXTURE_DIGIT_7_RIGHT,
  FIXTURE_DIGIT_8_RIGHT,
  FIXTURE_DIGIT_9_RIGHT,
} from './fixtures/handFixtures';
import { getLanguagePack, toSignPackBundle } from '../src/packs/packRegistry';
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

  it('correctly evaluates canonical fixtures for Lesson 2 signs (C, O, D, F)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const resC = evaluate(FIXTURE_LETTER_C_RIGHT, 'C', prodPack);
    expect(resC.status).toBe('correct');
    expect(resC.topIssue).toBeNull();

    const resO = evaluate(FIXTURE_LETTER_O_RIGHT, 'O', prodPack);
    expect(resO.status).toBe('correct');
    expect(resO.topIssue).toBeNull();

    const resD = evaluate(FIXTURE_LETTER_D_RIGHT, 'D', prodPack);
    expect(resD.status).toBe('correct');
    expect(resD.topIssue).toBeNull();

    const resF = evaluate(FIXTURE_LETTER_F_RIGHT, 'F', prodPack);
    expect(resF.status).toBe('correct');
    expect(resF.topIssue).toBeNull();
  });

  it('detects distinct finger mistakes on Lesson 2 signs', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    // Showing 'D' when target is 'O': thumb and index are far apart instead of touching
    const wrongO = evaluate(FIXTURE_LETTER_D_RIGHT, 'O', prodPack);
    expect(wrongO.status).toBe('needs_correction');
    expect(wrongO.topIssue?.ruleId).toBe('thumb_index_spacing');
    expect(wrongO.topIssue?.feedbackKey).toBe('thumb_index_closer');
    expect(wrongO.fingers.index.passed).toBe(false);
    expect(wrongO.fingers.thumb.passed).toBe(false);

    // Showing 'C' when target is 'O': thumb and index are apart instead of touching
    const openCForO = evaluate(FIXTURE_LETTER_C_RIGHT, 'O', prodPack);
    expect(openCForO.status).toBe('needs_correction');
    expect(openCForO.topIssue?.feedbackKey).toBe('thumb_index_closer');

    // Showing 'O' when target is 'C': fingers are curled too tight and closed into an O
    const closedOForC = evaluate(FIXTURE_LETTER_O_RIGHT, 'C', prodPack);
    expect(closedOForC.status).toBe('needs_correction');
    expect(closedOForC.fingers.middle.passed).toBe(false);
    expect(closedOForC.fingers.middle.feedbackKey).toBe('middle_extend_more');
    expect(
      closedOForC.conditions.find((c) => c.ruleId === 'thumb_index_spacing')?.passed
    ).toBe(false);
  });

  it('correctly evaluates canonical fixtures for Lesson 3 signs (U, I, W, S)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const resU = evaluate(FIXTURE_LETTER_U_RIGHT, 'U', prodPack);
    expect(resU.status).toBe('correct');
    expect(resU.topIssue).toBeNull();

    const resI = evaluate(FIXTURE_LETTER_I_RIGHT, 'I', prodPack);
    expect(resI.status).toBe('correct');
    expect(resI.topIssue).toBeNull();

    const resW = evaluate(FIXTURE_LETTER_W_RIGHT, 'W', prodPack);
    expect(resW.status).toBe('correct');
    expect(resW.topIssue).toBeNull();

    const resS = evaluate(FIXTURE_LETTER_S_RIGHT, 'S', prodPack);
    expect(resS.status).toBe('correct');
    expect(resS.topIssue).toBeNull();
  });

  it('distinguishes between parallel U and spread V', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    // Showing V when target is U: fingers are spread apart instead of touching
    const spreadVForU = evaluate(FIXTURE_LETTER_V_RIGHT, 'U', prodPack);
    expect(spreadVForU.status).toBe('needs_correction');
    expect(spreadVForU.topIssue?.ruleId).toBe('index_middle_spacing');
    expect(spreadVForU.topIssue?.feedbackKey).toBe('index_middle_closer');

    // Showing U when target is V: fingers are touching instead of spread apart
    const parallelUForV = evaluate(FIXTURE_LETTER_U_RIGHT, 'V', prodPack);
    expect(parallelUForV.status).toBe('needs_correction');
    expect(parallelUForV.topIssue?.ruleId).toBe('index_middle_spread');
    expect(parallelUForV.topIssue?.feedbackKey).toBe('index_middle_spread_more');
  });

  it('correctly evaluates canonical fixtures for Lesson 4 signs (R, K, X, E)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const resR = evaluate(FIXTURE_LETTER_R_RIGHT, 'R', prodPack);
    expect(resR.status).toBe('correct');
    expect(resR.topIssue).toBeNull();

    const resK = evaluate(FIXTURE_LETTER_K_RIGHT, 'K', prodPack);
    expect(resK.status).toBe('correct');
    expect(resK.topIssue).toBeNull();

    const resX = evaluate(FIXTURE_LETTER_X_RIGHT, 'X', prodPack);
    expect(resX.status).toBe('correct');
    expect(resX.topIssue).toBeNull();

    const resE = evaluate(FIXTURE_LETTER_E_RIGHT, 'E', prodPack);
    expect(resE.status).toBe('correct');
    expect(resE.topIssue).toBeNull();
  });

  it('correctly evaluates canonical fixtures for Lesson 5 signs (G, H, P, Q)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const resG = evaluate(FIXTURE_LETTER_G_RIGHT, 'G', prodPack);
    expect(resG.status).toBe('correct');
    expect(resG.topIssue).toBeNull();

    const resH = evaluate(FIXTURE_LETTER_H_RIGHT, 'H', prodPack);
    expect(resH.status).toBe('correct');
    expect(resH.topIssue).toBeNull();

    const resP = evaluate(FIXTURE_LETTER_P_RIGHT, 'P', prodPack);
    expect(resP.status).toBe('correct');
    expect(resP.topIssue).toBeNull();

    const resQ = evaluate(FIXTURE_LETTER_Q_RIGHT, 'Q', prodPack);
    expect(resQ.status).toBe('correct');
    expect(resQ.topIssue).toBeNull();
  });

  it('correctly evaluates canonical fixtures for Lesson 6 signs (T, N, M)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const resT = evaluate(FIXTURE_LETTER_T_RIGHT, 'T', prodPack);
    expect(resT.status).toBe('correct');
    expect(resT.topIssue).toBeNull();

    const resN = evaluate(FIXTURE_LETTER_N_RIGHT, 'N', prodPack);
    expect(resN.status).toBe('correct');
    expect(resN.topIssue).toBeNull();

    const resM = evaluate(FIXTURE_LETTER_M_RIGHT, 'M', prodPack);
    expect(resM.status).toBe('correct');
    expect(resM.topIssue).toBeNull();
  });

  it('correctly evaluates canonical fixtures for Lesson 7 numbers (1, 2, 3, 4, 5)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const res1 = evaluate(FIXTURE_DIGIT_1_RIGHT, '1', prodPack);
    expect(res1.status).toBe('correct');
    expect(res1.topIssue).toBeNull();

    const res2 = evaluate(FIXTURE_DIGIT_2_RIGHT, '2', prodPack);
    expect(res2.status).toBe('correct');
    expect(res2.topIssue).toBeNull();

    const res3 = evaluate(FIXTURE_DIGIT_3_RIGHT, '3', prodPack);
    expect(res3.status).toBe('correct');
    expect(res3.topIssue).toBeNull();

    const res4 = evaluate(FIXTURE_DIGIT_4_RIGHT, '4', prodPack);
    expect(res4.status).toBe('correct');
    expect(res4.topIssue).toBeNull();

    const res5 = evaluate(FIXTURE_DIGIT_5_RIGHT, '5', prodPack);
    expect(res5.status).toBe('correct');
    expect(res5.topIssue).toBeNull();
  });

  it('correctly evaluates canonical fixtures for Lesson 8 numbers (6, 7, 8, 9, 0)', () => {
    const prodPack = toSignPackBundle(getLanguagePack('asl'));

    const res6 = evaluate(FIXTURE_DIGIT_6_RIGHT, '6', prodPack);
    expect(res6.status).toBe('correct');
    expect(res6.topIssue).toBeNull();

    const res7 = evaluate(FIXTURE_DIGIT_7_RIGHT, '7', prodPack);
    expect(res7.status).toBe('correct');
    expect(res7.topIssue).toBeNull();

    const res8 = evaluate(FIXTURE_DIGIT_8_RIGHT, '8', prodPack);
    expect(res8.status).toBe('correct');
    expect(res8.topIssue).toBeNull();

    const res9 = evaluate(FIXTURE_DIGIT_9_RIGHT, '9', prodPack);
    expect(res9.status).toBe('correct');
    expect(res9.topIssue).toBeNull();

    const res0 = evaluate(FIXTURE_DIGIT_0_RIGHT, '0', prodPack);
    expect(res0.status).toBe('correct');
    expect(res0.topIssue).toBeNull();
  });
});
