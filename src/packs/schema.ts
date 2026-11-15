import type { FeatureName } from '../engine/features';
import type { FingerName } from '../engine/types';

export type ThresholdStatus = 'provisional' | 'validated';

/**
 * A single data-derived geometric condition for a target sign.
 * Every numeric bound comes from thresholds.json, never hardcoded in engine logic.
 */
export interface FeatureConditionRule {
  /** Unique rule ID within the sign (e.g., "index_curl", "index_middle_spread") */
  id: string;
  /** Feature key computed by extractHandFeatures() */
  feature: FeatureName;
  /** Primary finger responsible when this condition fails (for UI highlight & single-hint priority) */
  finger: FingerName;
  /** Optional secondary finger (e.g., for pairwise fingertip distance rules) */
  secondaryFinger?: FingerName;
  /** Human-readable condition label (e.g., "index: extended", "index-middle spacing: apart") */
  label: string;
  /** Key mapped into feedback.json when value < min */
  feedbackKeyBelow: string;
  /** Key mapped into feedback.json when value > max */
  feedbackKeyAbove: string;
  /** Priority weight (1 = highest priority when multiple conditions fail simultaneously) */
  priority: number;
  /** Lower bound derived from empirical percentile data */
  min: number;
  /** Upper bound derived from empirical percentile data */
  max: number;
  /** Cross-dataset validation pass rate (0..1) recorded during derivation */
  crossDatasetPassRate?: number;
  /** True if Dataset A and Dataset B disagreed substantially during derivation */
  highDisagreementWarning?: boolean;
}

export interface SignThresholdSpec {
  sign: string;
  status: ThresholdStatus;
  derivedFromDataset: string;
  checkedAgainstDataset: string | null;
  sampleCount: number;
  conditions: FeatureConditionRule[];
}

export interface ThresholdsPackFile {
  schemaVersion: '1.0.0';
  language: string;
  status: ThresholdStatus;
  generatedAt: string;
  percentileLow: number;
  percentileHigh: number;
  signs: Record<string, SignThresholdSpec>;
}

/**
 * Human-authored handshape reference description (/src/packs/asl/reference.json).
 * Rule 2: Must be authored/reviewed by a human, never generated from LLM ASL knowledge.
 */
export interface SignReferenceEntry {
  sign: string;
  authoredByHuman: boolean;
  summary: string;
  fingerNotes: Partial<Record<FingerName, string>>;
  orientationNote: string;
  /** Optional canonical 21-point landmark template for vector skeleton rendering */
  canonicalLandmarks?: Array<{ x: number; y: number; z: number }>;
}

export interface ReferencePackFile {
  schemaVersion: '1.0.0';
  language: string;
  signs: Record<string, SignReferenceEntry>;
}

export interface FeedbackPackFile {
  schemaVersion: '1.0.0';
  language: string;
  messages: Record<string, string>;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  signs: string[];
  requiredSuccessfulHolds: number;
}

export interface CurriculumPackFile {
  schemaVersion: '1.0.0';
  language: string;
  lessons: CurriculumLesson[];
}
