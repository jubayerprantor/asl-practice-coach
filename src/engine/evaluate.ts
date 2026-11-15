import { extractHandFeatures } from './features';
import {
  distanceVec3,
  EXPECTED_LANDMARK_COUNT,
  LANDMARK_INDEX,
  normalizeHand,
  palmOrientation,
} from './geometry';
import type {
  ConditionEvaluationDetail,
  EvaluateFrameInput,
  EvaluationResult,
  EvaluatorConfig,
  FingerEvaluationResult,
  HoldTimerSnapshot,
  SignPackBundle,
  UnableToEvaluateReason,
} from './evaluateTypes';
import type { AnatomicalHandedness, FingerName, Vec3 } from './types';
import type { FeatureConditionRule } from '../packs/schema';

const ALL_FINGERS: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

function createEmptyFingerResults(
  passed: boolean
): Record<FingerName, FingerEvaluationResult> {
  return {
    thumb: { finger: 'thumb', passed, margin: 0, feedbackKey: null, priority: 99 },
    index: { finger: 'index', passed, margin: 0, feedbackKey: null, priority: 99 },
    middle: { finger: 'middle', passed, margin: 0, feedbackKey: null, priority: 99 },
    ring: { finger: 'ring', passed, margin: 0, feedbackKey: null, priority: 99 },
    pinky: { finger: 'pinky', passed, margin: 0, feedbackKey: null, priority: 99 },
  };
}

interface ConfidenceCheckOutput {
  ok: boolean;
  confidence: number;
  reason: UnableToEvaluateReason | null;
}

/**
 * Evaluates frame quality & tracking reliability before inspecting finger rules (Rule 5).
 */
function checkConfidenceGate(
  landmarks: readonly Vec3[] | null,
  handedness: AnatomicalHandedness,
  mediaPipeScore: number,
  prevNormalized: readonly Vec3[] | null,
  dtMs: number | null,
  config: EvaluatorConfig
): ConfidenceCheckOutput {
  const gate = config.confidenceGate;

  if (!landmarks || landmarks.length !== EXPECTED_LANDMARK_COUNT) {
    return { ok: false, confidence: 0, reason: 'no_hand_detected' };
  }

  if (mediaPipeScore < gate.minMediaPipeScore) {
    return {
      ok: false,
      confidence: mediaPipeScore,
      reason: 'low_detection_confidence',
    };
  }

  // 1. Check frame edge clipping (x, y in [0, 1] image space)
  const margin = gate.frameEdgeMarginNorm;
  for (const pt of landmarks) {
    if (
      pt.x < margin ||
      pt.x > 1 - margin ||
      pt.y < margin ||
      pt.y > 1 - margin
    ) {
      return {
        ok: false,
        confidence: mediaPipeScore * 0.5,
        reason: 'hand_out_of_frame',
      };
    }
  }

  // 2. Check hand size in frame (wrist -> middle MCP distance)
  const palmSize = distanceVec3(
    landmarks[LANDMARK_INDEX.WRIST],
    landmarks[LANDMARK_INDEX.MIDDLE_MCP]
  );

  if (palmSize < gate.minPalmSizeNorm) {
    return {
      ok: false,
      confidence: mediaPipeScore * 0.5,
      reason: 'hand_too_far',
    };
  }

  if (palmSize > gate.maxPalmSizeNorm) {
    return {
      ok: false,
      confidence: mediaPipeScore * 0.5,
      reason: 'hand_too_close',
    };
  }

  // 3. Check palm facing angle (abs(palmNormal.z) measures how frontal vs edge-on the palm is)
  const orient = palmOrientation(landmarks, handedness);
  const frontalFacing = Math.abs(orient.palmNormal.z);
  if (frontalFacing < gate.minPalmFacingZ) {
    return {
      ok: false,
      confidence: mediaPipeScore * frontalFacing,
      reason: 'turn_palm_toward_camera',
    };
  }

  // 4. Check inter-frame stability (velocity in normalized palm units / sec)
  let stabilityFactor = 1.0;
  if (prevNormalized && dtMs !== null && dtMs > 0) {
    const currNorm = normalizeHand(landmarks, handedness);
    let distSum = 0;
    for (let i = 0; i < EXPECTED_LANDMARK_COUNT; i++) {
      distSum += distanceVec3(currNorm[i], prevNormalized[i]);
    }
    const meanDisplacement = distSum / EXPECTED_LANDMARK_COUNT;
    const velocityPerSec = meanDisplacement / (dtMs / 1000);

    if (velocityPerSec > gate.maxLandmarkVelocityPerSec) {
      return {
        ok: false,
        confidence: mediaPipeScore * 0.4,
        reason: 'hand_moving_too_fast',
      };
    }
    stabilityFactor = Math.max(
      0.5,
      1 - velocityPerSec / (gate.maxLandmarkVelocityPerSec * 2)
    );
  }

  const compositeConfidence = Number(
    Math.min(1, mediaPipeScore * Math.min(1, frontalFacing + 0.35) * stabilityFactor).toFixed(4)
  );

  return {
    ok: true,
    confidence: compositeConfidence,
    reason: null,
  };
}

/**
 * Evaluates a single condition with optional hysteresis state from the previous frame.
 */
function evaluateSingleCondition(
  rule: FeatureConditionRule,
  measuredValue: number,
  previouslyPassed: boolean | undefined,
  hysteresisFraction: number
): ConditionEvaluationDetail {
  const rangeWidth = Math.max(1e-6, rule.max - rule.min);
  const band = rangeWidth * hysteresisFraction;

  // Apply hysteresis:
  // - If previously passing, allow slight overshoot by `band` before failing.
  // - If previously failing, require entering inside [min + band, max - band] to pass.
  let effectiveMin = rule.min;
  let effectiveMax = rule.max;

  if (previouslyPassed === true) {
    effectiveMin = rule.min - band;
    effectiveMax = rule.max + band;
  } else if (previouslyPassed === false && band * 2 < rangeWidth * 0.5) {
    effectiveMin = rule.min + band;
    effectiveMax = rule.max - band;
  }

  let margin = 0;
  let feedbackKey: string | null = null;

  if (measuredValue < effectiveMin) {
    margin = measuredValue - rule.min; // negative
    feedbackKey = rule.feedbackKeyBelow;
  } else if (measuredValue > effectiveMax) {
    margin = measuredValue - rule.max; // positive
    feedbackKey = rule.feedbackKeyAbove;
  }

  const passed = feedbackKey === null;
  const normalizedSeverity = passed ? 0 : Math.abs(margin) / rangeWidth;

  return {
    ruleId: rule.id,
    feature: rule.feature,
    finger: rule.finger,
    ...(rule.secondaryFinger ? { secondaryFinger: rule.secondaryFinger } : {}),
    passed,
    measuredValue,
    min: rule.min,
    max: rule.max,
    margin,
    normalizedSeverity,
    feedbackKey,
    priority: rule.priority,
  };
}

/**
 * Stateful session wrapper providing per-finger hysteresis and a configurable hold-timer
 * state machine so live webcam evaluation never flickers.
 */
export class SignEvaluatorSession {
  private prevNormalized: Vec3[] | null = null;
  private prevTimestampMs: number | null = null;
  private prevTargetSign: string | null = null;

  /** Tracks previous pass/fail state per ruleId for hysteresis */
  private readonly conditionState = new Map<string, boolean>();

  /** Hold-timer state */
  private holdStartMs: number | null = null;
  private lastPassingMs: number | null = null;
  private holdCompleted = false;

  constructor(private readonly requiredHoldMs?: number) {}

  reset(): void {
    this.prevNormalized = null;
    this.prevTimestampMs = null;
    this.conditionState.clear();
    this.holdStartMs = null;
    this.lastPassingMs = null;
    this.holdCompleted = false;
  }

  evaluateFrame(
    input: EvaluateFrameInput,
    targetSign: string,
    pack: SignPackBundle
  ): EvaluationResult {
    const normalizedSign = targetSign.toUpperCase();
    if (this.prevTargetSign !== normalizedSign) {
      this.reset();
      this.prevTargetSign = normalizedSign;
    }

    const holdGoalMs =
      this.requiredHoldMs ?? pack.config.holdTimer.defaultHoldMs;
    const nowMs = input.timestampMs ?? 0;
    const dtMs =
      this.prevTimestampMs !== null && nowMs >= this.prevTimestampMs
        ? nowMs - this.prevTimestampMs
        : null;

    const signSpec = pack.thresholds.signs[normalizedSign];
    if (!signSpec) {
      this.resetHoldTimer();
      return {
        targetSign: normalizedSign,
        status: 'unable_to_evaluate',
        confidence: 0,
        unableReason: 'sign_not_in_pack',
        fingers: createEmptyFingerResults(false),
        conditions: [],
        topIssue: null,
        hold: this.buildHoldSnapshot(nowMs, holdGoalMs, false),
      };
    }

    const handedness: AnatomicalHandedness = input.handedness ?? 'Right';
    const score = input.mediaPipeScore ?? 1.0;

    const gateCheck = checkConfidenceGate(
      input.landmarks,
      handedness,
      score,
      this.prevNormalized,
      dtMs,
      pack.config
    );

    if (!gateCheck.ok || !input.landmarks) {
      this.prevNormalized = null;
      this.prevTimestampMs = input.timestampMs ?? null;
      this.updateHoldTimerOnNonPassing(
        nowMs,
        pack.config.holdTimer.transientDropGraceMs
      );
      return {
        targetSign: normalizedSign,
        status: 'unable_to_evaluate',
        confidence: gateCheck.confidence,
        unableReason: gateCheck.reason,
        fingers: createEmptyFingerResults(false),
        conditions: [],
        topIssue: null,
        hold: this.buildHoldSnapshot(nowMs, holdGoalMs, false),
      };
    }

    // Update frame history for next frame's velocity check
    this.prevNormalized = normalizeHand(input.landmarks, handedness);
    this.prevTimestampMs = nowMs;

    const features = extractHandFeatures(input.landmarks, handedness);
    const hysteresisFrac = pack.config.hysteresis.bandFractionOfRange;

    const conditionResults: ConditionEvaluationDetail[] =
      signSpec.conditions.map((rule) => {
        const prevPass = this.conditionState.get(rule.id);
        const detail = evaluateSingleCondition(
          rule,
          features[rule.feature],
          prevPass,
          hysteresisFrac
        );
        this.conditionState.set(rule.id, detail.passed);
        return detail;
      });

    // Aggregate per-finger results
    const fingers = createEmptyFingerResults(true);
    for (const finger of ALL_FINGERS) {
      const relevant = conditionResults.filter(
        (c) => c.finger === finger || c.secondaryFinger === finger
      );
      const failing = relevant.filter((c) => !c.passed);

      if (failing.length > 0) {
        // Sort by priority (ascending) then severity (descending)
        failing.sort(
          (a, b) =>
            a.priority - b.priority ||
            b.normalizedSeverity - a.normalizedSeverity
        );
        const primaryFail = failing[0];
        fingers[finger] = {
          finger,
          passed: false,
          margin: primaryFail.margin,
          feedbackKey: primaryFail.feedbackKey,
          priority: primaryFail.priority,
        };
      }
    }

    const failingConditions = conditionResults.filter((c) => !c.passed);
    failingConditions.sort(
      (a, b) =>
        a.priority - b.priority || b.normalizedSeverity - a.normalizedSeverity
    );

    const allPassed = failingConditions.length === 0;
    const holdSnapshot = this.buildHoldSnapshot(nowMs, holdGoalMs, allPassed);

    return {
      targetSign: normalizedSign,
      status: allPassed ? 'correct' : 'needs_correction',
      confidence: gateCheck.confidence,
      unableReason: null,
      fingers,
      conditions: conditionResults,
      topIssue: failingConditions[0] ?? null,
      hold: holdSnapshot,
    };
  }

  private resetHoldTimer(): void {
    this.holdStartMs = null;
    this.lastPassingMs = null;
    this.holdCompleted = false;
  }

  private updateHoldTimerOnNonPassing(
    nowMs: number,
    graceMs: number
  ): void {
    if (
      this.lastPassingMs !== null &&
      nowMs - this.lastPassingMs <= graceMs
    ) {
      // Allow brief single-frame tracking hiccup without wiping progress
      return;
    }
    this.resetHoldTimer();
  }

  private buildHoldSnapshot(
    nowMs: number,
    requiredHoldMs: number,
    isPassingNow: boolean
  ): HoldTimerSnapshot {
    if (!isPassingNow) {
      this.resetHoldTimer();
      return {
        isHolding: false,
        heldMs: 0,
        requiredHoldMs,
        progress: 0,
        completed: false,
      };
    }

    if (this.holdStartMs === null) {
      this.holdStartMs = nowMs;
    }
    this.lastPassingMs = nowMs;

    const heldMs = Math.max(0, nowMs - this.holdStartMs);
    const progress =
      requiredHoldMs > 0 ? Math.min(1, heldMs / requiredHoldMs) : 1;

    if (heldMs >= requiredHoldMs) {
      this.holdCompleted = true;
    }

    return {
      isHolding: true,
      heldMs,
      requiredHoldMs,
      progress,
      completed: this.holdCompleted,
    };
  }
}

/**
 * Stateless single-frame convenience wrapper: evaluate(landmarks, targetSign, pack)
 */
export function evaluate(
  landmarks: readonly Vec3[] | null,
  targetSign: string,
  pack: SignPackBundle,
  options?: {
    handedness?: AnatomicalHandedness;
    mediaPipeScore?: number;
    timestampMs?: number;
  }
): EvaluationResult {
  const session = new SignEvaluatorSession();
  return session.evaluateFrame(
    {
      landmarks,
      handedness: options?.handedness ?? 'Right',
      mediaPipeScore: options?.mediaPipeScore ?? 1.0,
      timestampMs: options?.timestampMs ?? 0,
    },
    targetSign,
    pack
  );
}
