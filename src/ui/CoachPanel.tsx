import { tokens } from './tokens';
import { LessonPath, type LessonSignStatus } from './LessonPath';
import { TargetSign } from './TargetSign';
import { HoldDots } from './HoldDots';
import { HintCard } from './HintCard';
import { StatusCard } from './StatusCard';
import { FingerList } from './FingerList';
import { HoldMeter } from './HoldMeter';
import type { EvaluationResult } from '../engine/evaluateTypes';
import type { FeedbackPackFile } from '../packs/schema';

interface CoachPanelProps {
  mode: 'learn' | 'check' | 'progress';
  targetSign: string;
  showReference: boolean;
  onToggleReference: () => void;
  evaluation: EvaluationResult | null;
  feedbackPack?: FeedbackPackFile;

  // Learn mode props
  currentLessonNumber?: number;
  totalLessons?: number;
  lessonSigns?: LessonSignStatus[];
  onSelectSign?: (sign: string) => void;
  completedHolds?: number;
  requiredHolds?: number;
}

export function CoachPanel({
  mode,
  targetSign,
  showReference,
  onToggleReference,
  evaluation,
  feedbackPack,
  currentLessonNumber = 1,
  totalLessons = 1,
  lessonSigns = [],
  onSelectSign,
  completedHolds = 0,
  requiredHolds = 3,
}: CoachPanelProps) {
  // Derive single instruction for HintCard when needs_correction
  let hintMessage = 'Adjust hand to match target.';
  if (evaluation?.status === 'needs_correction') {
    const key = evaluation.topIssue?.feedbackKey;
    if (key && feedbackPack?.messages[key]) {
      hintMessage = feedbackPack.messages[key];
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

  const isUnableToEvaluate =
    evaluation === null || evaluation.status === 'unable_to_evaluate';

  return (
    <aside
      aria-label="Coach Feedback"
      style={{
        width: tokens.shape.sidePanelWidth,
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.shape.radiusCard,
        border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* A. Learn mode only: LessonPath */}
      {mode === 'learn' && lessonSigns.length > 0 && (
        <LessonPath
          currentLessonNumber={currentLessonNumber}
          totalLessons={totalLessons}
          signs={lessonSigns}
          onSelectSign={onSelectSign}
        />
      )}

      {/* B. TargetSign */}
      <TargetSign
        sign={targetSign}
        showReference={showReference}
        onToggleReference={onToggleReference}
      />

      {/* C. Learn mode only: HoldDots */}
      {mode === 'learn' && (
        <HoldDots
          completedHolds={completedHolds}
          requiredHolds={requiredHolds}
        />
      )}

      {/* D. HintCard or E. StatusCard */}
      {isUnableToEvaluate ? (
        <StatusCard reason={evaluation?.unableReason ?? 'no_hand_detected'} />
      ) : (
        <HintCard
          status={evaluation.status === 'correct' ? 'correct' : 'needs_correction'}
          message={hintMessage}
        />
      )}

      {/* F. FingerList */}
      <FingerList evaluation={evaluation} />

      {/* G. HoldMeter */}
      <HoldMeter hold={evaluation?.hold ?? null} />
    </aside>
  );
}
