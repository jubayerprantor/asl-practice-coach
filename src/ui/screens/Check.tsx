import { useState } from 'react';
import { tokens } from '../tokens';
import { CameraPanel } from '../components/CameraPanel';
import { TargetSign } from '../components/TargetSign';
import { HintCard } from '../components/HintCard';
import { StatusCard } from '../components/StatusCard';
import { FingerList } from '../components/FingerList';
import { HoldMeter } from '../components/HoldMeter';
import type { EvaluationResult } from '../../engine/evaluateTypes';
import type { FeedbackPackFile, SignReferenceEntry } from '../../packs/schema';
import type { SignPackBundle } from '../../engine';

interface CheckScreenProps {
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  currentTargetSign: string;
  pack: SignPackBundle;
  referenceEntry?: SignReferenceEntry;
  feedbackPack?: FeedbackPackFile;
  evaluation: EvaluationResult | null;
  onEvaluationChange: (res: EvaluationResult) => void;
  showReference: boolean;
  onToggleReference: () => void;
  isMobile: boolean;
  isTablet: boolean;
}

export function CheckScreen({
  cameraEnabled,
  onToggleCamera,
  currentTargetSign,
  pack,
  referenceEntry,
  feedbackPack,
  evaluation,
  onEvaluationChange,
  showReference,
  onToggleReference,
  isMobile,
  isTablet,
}: CheckScreenProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);

  const isTouch = isMobile || isTablet;

  // Derive single instruction for HintCard when needs_correction
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

  const isUnableToEvaluate =
    evaluation === null || evaluation.status === 'unable_to_evaluate';

  const handleReferenceClick = () => {
    if (isMobile) {
      setMobileSheetOpen(true);
    } else {
      onToggleReference();
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile || isTablet ? 'column' : 'row',
          gap: tokens.spacing.gridGap,
          minHeight: isMobile || isTablet ? undefined : '700px',
          width: '100%',
        }}
      >
        {/* Camera Stage */}
        <div
          style={{
            flex: isMobile || isTablet ? undefined : 1,
            width: '100%',
            display: 'flex',
          }}
        >
          <CameraPanel
            cameraEnabled={cameraEnabled}
            targetSign={currentTargetSign}
            pack={pack}
            referenceEntry={referenceEntry}
            showReferenceInset={!isMobile && showReference}
            isLessonComplete={false}
            isMobile={isMobile}
            isTablet={isTablet}
            onEvaluationChange={onEvaluationChange}
            onToggleCamera={onToggleCamera}
          />
        </div>

        {/* Coach Content */}
        <aside
          aria-label="Coach Feedback"
          style={{
            width: isMobile || isTablet ? '100%' : tokens.shape.sidePanelWidth,
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
          {isTablet ? (
            /* Tablet layout: 2 columns inside CoachPanel */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <TargetSign
                  sign={currentTargetSign}
                  showReference={showReference}
                  onToggleReference={handleReferenceClick}
                  isTouch={isTouch}
                />
                {isUnableToEvaluate || !cameraEnabled ? (
                  <StatusCard
                    reason={!cameraEnabled ? 'no_hand_detected' : evaluation?.unableReason ?? 'no_hand_detected'}
                    isTouch={isTouch}
                  />
                ) : (
                  <HintCard
                    status={evaluation.status === 'correct' ? 'correct' : 'needs_correction'}
                    message={hintMessage}
                    feedbackKey={feedbackKey}
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FingerList
                  evaluation={evaluation}
                  cameraEnabled={cameraEnabled}
                  isMobile={false}
                />
                <HoldMeter
                  hold={evaluation?.hold ?? null}
                  cameraEnabled={cameraEnabled}
                />
              </div>
            </div>
          ) : (
            /* Desktop and Mobile */
            <>
              <TargetSign
                sign={currentTargetSign}
                showReference={showReference}
                onToggleReference={handleReferenceClick}
                isTouch={isTouch}
              />

              {isUnableToEvaluate || !cameraEnabled ? (
                <StatusCard
                  reason={!cameraEnabled ? 'no_hand_detected' : evaluation?.unableReason ?? 'no_hand_detected'}
                  isTouch={isTouch}
                />
              ) : (
                <HintCard
                  status={evaluation.status === 'correct' ? 'correct' : 'needs_correction'}
                  message={hintMessage}
                  feedbackKey={feedbackKey}
                />
              )}

              <FingerList
                evaluation={evaluation}
                cameraEnabled={cameraEnabled}
                isMobile={isMobile}
              />

              <HoldMeter
                hold={evaluation?.hold ?? null}
                cameraEnabled={cameraEnabled}
              />
            </>
          )}
        </aside>
      </div>

      {/* Mobile Reference Bottom Sheet */}
      {isMobile && mobileSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Reference for sign ${currentTargetSign}`}
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
                Reference: {currentTargetSign}
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
