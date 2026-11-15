import { useState } from 'react';
import { tokens } from './tokens';
import { LessonPath, type LessonSignStatus } from './LessonPath';
import { TargetSign } from './TargetSign';
import { HoldDots } from './HoldDots';
import { HintCard } from './HintCard';
import { StatusCard } from './StatusCard';
import { FingerList } from './FingerList';
import { HoldMeter } from './HoldMeter';
import { CheckCircleIcon } from './icons';
import type { EvaluationResult } from '../engine/evaluateTypes';
import type { FeedbackPackFile, SignReferenceEntry } from '../packs/schema';

interface CoachPanelProps {
  mode: 'learn' | 'check' | 'progress';
  targetSign: string;
  showReference: boolean;
  onToggleReference: () => void;
  evaluation: EvaluationResult | null;
  feedbackPack?: FeedbackPackFile;
  referenceEntry?: SignReferenceEntry;
  cameraEnabled?: boolean;
  isMobile?: boolean;

  // Learn mode props
  currentLessonNumber?: number;
  totalLessons?: number;
  lessonSigns?: LessonSignStatus[];
  onSelectSign?: (sign: string) => void;
  completedHolds?: number;
  requiredHolds?: number;

  // Lesson complete props (Section 9)
  isLessonComplete?: boolean;
  nextSign?: string | null;
  isLastLesson?: boolean;
  mostAdjustedFinger?: string | null;
  onContinueLesson?: () => void;
  onPracticeAgain?: () => void;
}

export function CoachPanel({
  mode,
  targetSign,
  showReference,
  onToggleReference,
  evaluation,
  feedbackPack,
  referenceEntry,
  cameraEnabled = true,
  isMobile = false,
  currentLessonNumber = 1,
  totalLessons = 1,
  lessonSigns = [],
  onSelectSign,
  completedHolds = 0,
  requiredHolds = 3,
  isLessonComplete = false,
  nextSign = null,
  isLastLesson = false,
  mostAdjustedFinger = null,
  onContinueLesson,
  onPracticeAgain,
}: CoachPanelProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);

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

  const handleMobileReferenceClick = () => {
    if (isMobile) {
      setMobileSheetOpen(true);
    } else {
      onToggleReference();
    }
  };

  return (
    <>
      <aside
        aria-label="Coach Feedback"
        style={{
          width: isMobile ? '100%' : tokens.shape.sidePanelWidth,
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.shape.radiusCard,
          border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
          padding: isMobile ? '20px' : '28px',
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
          onToggleReference={handleMobileReferenceClick}
        />

        {/* Section 9: Lesson Complete View */}
        {isLessonComplete ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
            }}
          >
            {/* Confirmation Card (neutral colors, check-circle icon) */}
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                backgroundColor: tokens.colors.statusCardFill,
                border: `${tokens.shape.borderWidth} solid ${tokens.colors.statusCardBorder}`,
                borderRadius: tokens.shape.radiusCard,
                padding: '16px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                <CheckCircleIcon size={20} color={tokens.colors.ink} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: tokens.colors.ink,
                  }}
                >
                  {targetSign} complete
                </div>
                <div
                  style={{
                    ...tokens.typography.smallMeta,
                    color: tokens.colors.mutedText,
                    lineHeight: 1.4,
                  }}
                >
                  {`You held it correctly ${requiredHolds} times. ${
                    nextSign
                      ? `${nextSign} is now unlocked.`
                      : 'You finished all signs in this lesson.'
                  }`}
                </div>
              </div>
            </div>

            {/* HoldDots show 3 of 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <HoldDots
                completedHolds={requiredHolds}
                requiredHolds={requiredHolds}
              />
              {mostAdjustedFinger && (
                <div
                  style={{
                    fontSize: '12px',
                    color: tokens.colors.mutedText,
                  }}
                >
                  Most adjusted this lesson: {mostAdjustedFinger} finger
                </div>
              )}
            </div>

            {/* Actions: Primary continue button + secondary practice again button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={onContinueLesson}
                style={{
                  height: '42px',
                  width: '100%',
                  borderRadius: tokens.shape.radiusButton,
                  backgroundColor: tokens.colors.ink,
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isLastLesson && !nextSign
                  ? 'Go to Check mode'
                  : `Continue to ${nextSign ?? 'next'}`}
              </button>

              <button
                type="button"
                onClick={onPracticeAgain}
                style={{
                  height: tokens.shape.buttonHeight,
                  width: '100%',
                  borderRadius: tokens.shape.radiusButton,
                  border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                  backgroundColor: tokens.colors.surface,
                  color: tokens.colors.ink,
                  fontSize: tokens.typography.statusText.fontSize,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Practice {targetSign} again
              </button>
            </div>
          </div>
        ) : (
          /* Normal practice view */
          <>
            {/* C. Learn mode only: HoldDots */}
            {mode === 'learn' && (
              <HoldDots
                completedHolds={completedHolds}
                requiredHolds={requiredHolds}
              />
            )}

            {/* D. HintCard or E. StatusCard */}
            {isUnableToEvaluate || !cameraEnabled ? (
              <StatusCard
                reason={
                  !cameraEnabled
                    ? 'no_hand_detected'
                    : evaluation?.unableReason ?? 'no_hand_detected'
                }
              />
            ) : (
              <HintCard
                status={
                  evaluation.status === 'correct' ? 'correct' : 'needs_correction'
                }
                message={hintMessage}
              />
            )}

            {/* F. FingerList */}
            <FingerList
              evaluation={evaluation}
              cameraEnabled={cameraEnabled}
              isMobile={isMobile}
            />

            {/* G. HoldMeter (hidden when lesson complete) */}
            <HoldMeter
              hold={evaluation?.hold ?? null}
              cameraEnabled={cameraEnabled}
            />
          </>
        )}
      </aside>

      {/* Section 13: Mobile Reference Bottom Sheet */}
      {isMobile && mobileSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Reference for sign ${targetSign}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(22, 24, 26, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            style={{
              backgroundColor: tokens.colors.surface,
              borderTopLeftRadius: tokens.shape.radiusPanel,
              borderTopRightRadius: tokens.shape.radiusPanel,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: tokens.colors.ink,
                }}
              >
                Reference: {targetSign}
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: tokens.colors.mutedText,
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                Close
              </button>
            </div>

            {referenceEntry?.summary && (
              <p
                style={{
                  ...tokens.typography.body,
                  color: tokens.colors.mutedText,
                  margin: 0,
                }}
              >
                {referenceEntry.summary}
              </p>
            )}

            {referenceEntry?.orientationNote && (
              <div
                style={{
                  fontSize: '13px',
                  color: tokens.colors.secondaryBody,
                  backgroundColor: tokens.colors.chipNeutral,
                  padding: '12px',
                  borderRadius: tokens.shape.radiusControl,
                }}
              >
                Orientation: {referenceEntry.orientationNote}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
