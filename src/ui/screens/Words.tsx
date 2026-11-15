import { useState } from 'react';
import { tokens } from '../tokens';
import { resolveHintFeedback } from '../hintUtils';
import { CameraPanel } from '../components/CameraPanel';
import { HintCard } from '../components/HintCard';
import { StatusCard } from '../components/StatusCard';
import { FingerList } from '../components/FingerList';
import { HoldMeter } from '../components/HoldMeter';
import { ReferenceInset } from '../components/ReferenceInset';
import type { EvaluationResult } from '../../engine/evaluateTypes';
import type { FeedbackPackFile, SignReferenceEntry } from '../../packs/schema';
import type { LandmarkSource, SignPackBundle } from '../../engine';
import type { WordPracticeItem } from '../../services/wordPractice';

interface WordsScreenProps {
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
  selectedCameraId?: string | null;
  landmarkSource?: LandmarkSource | null;
  isCameraDisconnected?: boolean;
  onChooseCamera?: () => void;
  cameraChangedNotice?: string | null;
  onCameraDisconnected?: () => void;
  holdMs?: number;

  // Word practice props
  currentWord: string;
  currentLetterIndex: number;
  isWordComplete: boolean;
  category: string;
  hint?: string;
  onNextWord: () => void;
  onSelectWord: (idx: number) => void;
  wordIndex: number;
  words: readonly WordPracticeItem[];
}

export function WordsScreen({
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
  selectedCameraId = null,
  landmarkSource = null,
  isCameraDisconnected = false,
  onChooseCamera,
  cameraChangedNotice = null,
  onCameraDisconnected,
  holdMs,
  currentWord,
  currentLetterIndex,
  isWordComplete,
  category,
  hint,
  onNextWord,
  onSelectWord,
  wordIndex,
  words,
}: WordsScreenProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);
  const isTouch = isMobile || isTablet;

  const { feedbackKey, hintMessage } = resolveHintFeedback(
    evaluation,
    feedbackPack ?? ({ messages: {}, unableReasons: {} } as any)
  );

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
            isLessonComplete={isWordComplete}
            isMobile={isMobile}
            isTablet={isTablet}
            selectedCameraId={selectedCameraId}
            landmarkSource={landmarkSource}
            isCameraDisconnected={isCameraDisconnected}
            holdMs={holdMs}
            onEvaluationChange={onEvaluationChange}
            onCameraDisconnected={onCameraDisconnected}
            onToggleCamera={onToggleCamera}
          />
        </div>

        {/* Coach Content */}
        <aside
          aria-label="Word Coach Feedback"
          style={{
            width: isMobile || isTablet ? '100%' : tokens.shape.sidePanelWidth,
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.shape.radiusCard,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            padding: isMobile ? '20px' : '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          {/* Word Selector & Category Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '12px',
              borderBottom: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            }}
          >
            <div>
              <div
                style={{
                  ...tokens.typography.sectionLabel,
                  color: tokens.colors.mutedText,
                  marginBottom: '4px',
                }}
              >
                FINGERSPELLED WORD ({category})
              </div>
              {hint && (
                <div style={{ fontSize: '13px', color: tokens.colors.mutedText }}>
                  {hint}
                </div>
              )}
            </div>

            <select
              aria-label="Select vocabulary word"
              value={wordIndex}
              onChange={(e) => onSelectWord(Number(e.target.value))}
              style={{
                height: tokens.shape.buttonHeight,
                padding: '0 10px',
                borderRadius: tokens.shape.radiusControl,
                border: `1px solid ${tokens.colors.borderStrong}`,
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.ink,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {words.map((w, idx) => (
                <option key={w.id} value={idx}>
                  {w.word}
                </option>
              ))}
            </select>
          </div>

          {/* Letter Chips Display (C - A - T) */}
          <div
            role="status"
            aria-label={`Spelling word: ${currentWord}. Current letter: ${currentTargetSign}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              padding: '12px 0',
            }}
          >
            {currentWord.split('').map((letter, idx) => {
              const isPast = idx < currentLetterIndex;
              const isCurrent = idx === currentLetterIndex && !isWordComplete;

              return (
                <div
                  key={`${letter}-${idx}`}
                  style={{
                    width: '46px',
                    height: '52px',
                    borderRadius: tokens.shape.radiusControl,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCurrent
                      ? tokens.colors.ink
                      : isPast
                        ? 'rgba(94, 224, 192, 0.2)'
                        : tokens.colors.chipNeutral,
                    color: isCurrent
                      ? '#FFFFFF'
                      : isPast
                        ? '#0F6955'
                        : tokens.colors.mutedText,
                    border: isCurrent
                      ? `2px solid ${tokens.colors.ink}`
                      : isPast
                        ? `1.5px solid ${tokens.colors.overlayPassing}`
                        : `1px solid ${tokens.colors.border}`,
                    fontSize: '22px',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>

          {/* Active Target Sign display & Hold Meter */}
          {isWordComplete ? (
            <div
              style={{
                backgroundColor: 'rgba(94, 224, 192, 0.15)',
                border: `1.5px solid ${tokens.colors.overlayPassing}`,
                borderRadius: tokens.shape.radiusCard,
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '24px' }}>🎉</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: tokens.colors.ink }}>
                Word Completed: {currentWord}!
              </div>
              <div style={{ fontSize: '13px', color: tokens.colors.mutedText }}>
                Excellent rhythm! You completed all letters for this word.
              </div>
              <button
                type="button"
                onClick={onNextWord}
                className="btn-primary"
                style={{
                  height: tokens.shape.buttonHeight,
                  padding: '0 24px',
                  borderRadius: tokens.shape.radiusControl,
                  fontSize: '14px',
                  fontWeight: 600,
                  marginTop: '8px',
                }}
              >
                Next Word
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: tokens.colors.chipNeutral,
                  borderRadius: tokens.shape.radiusControl,
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: tokens.colors.mutedText }}>
                    Active Letter:
                  </span>{' '}
                  <strong style={{ fontSize: '18px', color: tokens.colors.ink }}>
                    {currentTargetSign}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleReferenceClick}
                  className="btn-outlined"
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: tokens.shape.radiusControl,
                  }}
                >
                  {showReference ? 'Hide Tip' : 'Show Tip'}
                </button>
              </div>

              {isCameraDisconnected ? (
                <StatusCard
                  reason="camera_disconnected"
                  onAction={onChooseCamera}
                  isTouch={isTouch}
                />
              ) : cameraChangedNotice ? (
                <StatusCard
                  reason="camera_changed"
                  customMessage={cameraChangedNotice}
                  isTouch={isTouch}
                />
              ) : isUnableToEvaluate || !cameraEnabled ? (
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
                cameraEnabled={cameraEnabled && !isCameraDisconnected}
                isMobile={false}
              />

              <HoldMeter
                hold={evaluation?.hold ?? null}
                cameraEnabled={cameraEnabled && !isCameraDisconnected}
              />
            </>
          )}
        </aside>
      </div>

      {/* Mobile reference sheet */}
      {isMobile && mobileSheetOpen && referenceEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Reference for sign ${currentTargetSign}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(24, 27, 30, 0.72)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            style={{
              backgroundColor: tokens.colors.surface,
              width: '100%',
              maxHeight: '80vh',
              borderTopLeftRadius: tokens.shape.radiusPanel,
              borderTopRightRadius: tokens.shape.radiusPanel,
              padding: '24px',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
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

            {referenceEntry.summary && (
              <p
                style={{
                  ...tokens.typography.body,
                  color: tokens.colors.mutedText,
                  margin: '0 0 16px 0',
                }}
              >
                {referenceEntry.summary}
              </p>
            )}

            {referenceEntry.canonicalLandmarks && (
              <div style={{ width: '100%', height: '220px' }}>
                <ReferenceInset landmarks={referenceEntry.canonicalLandmarks} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
