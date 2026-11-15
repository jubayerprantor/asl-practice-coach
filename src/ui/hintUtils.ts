import type { EvaluationResult } from '../engine/evaluateTypes';
import type { FeedbackPackFile } from '../packs/schema';

export interface ResolvedHint {
  feedbackKey: string | null;
  hintMessage: string;
}

/**
 * Resolves the primary feedbackKey and user-facing corrective hint message
 * from an evaluation result and active feedback pack.
 */
export function resolveHintFeedback(
  evaluation: EvaluationResult | null,
  feedbackPack: FeedbackPackFile
): ResolvedHint {
  let hintMessage = 'Adjust hand to match target.';
  const feedbackKey = evaluation?.topIssue?.feedbackKey ?? null;

  if (evaluation?.status === 'needs_correction') {
    if (feedbackKey && feedbackPack?.messages[feedbackKey]) {
      hintMessage = feedbackPack.messages[feedbackKey];
    } else if (evaluation.topIssue) {
      const finger = evaluation.topIssue.finger;
      const fingerLabel = finger === 'pinky' ? 'little' : finger;
      if (evaluation.topIssue.margin > 0) {
        hintMessage = `Curl your ${fingerLabel} finger down more.`;
      } else {
        hintMessage = `Straighten your ${fingerLabel} finger up more.`;
      }
    }
  }

  return { feedbackKey, hintMessage };
}
