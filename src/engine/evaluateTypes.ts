import type { AnatomicalHandedness, FingerName, Vec3 } from './types';
import type { ThresholdsPackFile } from '../packs/schema';

export type OverallEvaluationStatus =
  | 'correct'
  | 'needs_correction'
  | 'unable_to_evaluate';

export type UnableToEvaluateReason =
  | 'no_hand_detected'
  | 'sign_not_in_pack'
  | 'low_detection_confidence'
  | 'hand_too_far'
  | 'hand_too_close'
  | 'hand_out_of_frame'
  | 'turn_palm_toward_camera'
  | 'hand_moving_too_fast';

export interface ConditionEvaluationDetail {
  ruleId: string;
  feature: string;
  finger: FingerName;
  secondaryFinger?: FingerName;
  passed: boolean;
  measuredValue: number;
  min: number;
  max: number;
  /** Signed distance outside [min, max]: 0 when passed, negative when below min, positive when above max */
  margin: number;
  /** Normalized severity (|margin| / rangeWidth) used to rank the single highest-priority mistake */
  normalizedSeverity: number;
  feedbackKey: string | null;
  priority: number;
}

export interface FingerEvaluationResult {
  finger: FingerName;
  passed: boolean;
  /** Worst margin among all conditions involving this finger (0 if all passed) */
  margin: number;
  /** Feedback key of the highest-priority failing condition for this finger, or null if passed */
  feedbackKey: string | null;
  priority: number;
}

export interface HoldTimerSnapshot {
  isHolding: boolean;
  heldMs: number;
  requiredHoldMs: number;
  progress: number; // 0..1
  completed: boolean;
}

export interface EvaluationResult {
  targetSign: string;
  status: OverallEvaluationStatus;
  confidence: number;
  unableReason: UnableToEvaluateReason | null;
  fingers: Record<FingerName, FingerEvaluationResult>;
  conditions: ConditionEvaluationDetail[];
  /** Highest-priority failing condition across the hand (for single-hint feedback) */
  topIssue: ConditionEvaluationDetail | null;
  hold: HoldTimerSnapshot;
}

export interface EvaluatorGateConfig {
  minMediaPipeScore: number;
  minPalmSizeNorm: number;
  maxPalmSizeNorm: number;
  frameEdgeMarginNorm: number;
  minPalmFacingZ: number;
  maxLandmarkVelocityPerSec: number;
}

export interface EvaluatorConfig {
  schemaVersion: '1.0.0';
  status: 'provisional' | 'validated';
  confidenceGate: EvaluatorGateConfig;
  hysteresis: {
    bandFractionOfRange: number;
  };
  holdTimer: {
    defaultHoldMs: number;
    transientDropGraceMs: number;
  };
}

export interface EvaluateFrameInput {
  landmarks: readonly Vec3[] | null;
  handedness?: AnatomicalHandedness;
  mediaPipeScore?: number;
  timestampMs?: number;
}

export interface SignPackBundle {
  thresholds: ThresholdsPackFile;
  config: EvaluatorConfig;
}
