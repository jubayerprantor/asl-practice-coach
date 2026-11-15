import { useState } from 'react';
import { tokens } from './tokens';
import { AlertTriangleIcon, CheckCircleIcon, DashCircleIcon } from './icons';
import type { FingerName } from '../engine/types';
import type { EvaluationResult } from '../engine/evaluateTypes';

interface FingerListProps {
  evaluation: EvaluationResult | null;
  cameraEnabled?: boolean;
  isMobile?: boolean;
}

const ORDERED_FINGERS: ReadonlyArray<{ id: FingerName; label: string }> = [
  { id: 'thumb', label: 'Thumb' },
  { id: 'index', label: 'Index' },
  { id: 'middle', label: 'Middle' },
  { id: 'ring', label: 'Ring' },
  { id: 'pinky', label: 'Little' },
];

function getFingerProblemText(feedbackKey: string | null): string {
  if (!feedbackKey) return 'Needs adjustment';
  if (feedbackKey.includes('curl_more')) return 'Too straight';
  if (feedbackKey.includes('extend_more')) return 'Too bent';
  if (feedbackKey.includes('closer')) return 'Move closer';
  if (feedbackKey.includes('apart')) return 'Spread apart';
  return 'Adjust finger';
}

export function FingerList({
  evaluation,
  cameraEnabled = true,
  isMobile = false,
}: FingerListProps) {
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  const isEvaluable =
    cameraEnabled &&
    evaluation !== null &&
    evaluation.status !== 'unable_to_evaluate';

  // Mobile collapsed view: single row of five finger icons that expands on tap
  if (isMobile && !mobileExpanded) {
    return (
      <button
        type="button"
        onClick={() => setMobileExpanded(true)}
        aria-expanded={false}
        aria-label="Finger status overview, tap to expand details"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: tokens.shape.fingerRowHeight,
          width: '100%',
          padding: '0 8px',
          background: 'none',
          border: 'none',
          borderBottom: `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            ...tokens.typography.fingerName,
            color: tokens.colors.ink,
          }}
        >
          Fingers
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ORDERED_FINGERS.map(({ id }) => {
            const passed = isEvaluable && Boolean(evaluation?.fingers[id]?.passed);
            const needsAttention =
              isEvaluable && evaluation?.fingers[id] && !passed;

            return (
              <div
                key={id}
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {passed && <CheckCircleIcon size={18} color={tokens.colors.ink} />}
                {needsAttention && (
                  <AlertTriangleIcon
                    size={18}
                    color={tokens.colors.overlayNeedsAttention}
                  />
                )}
                {!passed && !needsAttention && (
                  <DashCircleIcon size={18} color={tokens.colors.overlayNeutral} />
                )}
              </div>
            );
          })}
        </div>
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {isMobile && mobileExpanded && (
        <button
          type="button"
          onClick={() => setMobileExpanded(false)}
          aria-expanded={true}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.colors.mutedText,
            fontSize: '12px',
            textAlign: 'right',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Collapse
        </button>
      )}

      {ORDERED_FINGERS.map(({ id, label }, index) => {
        let state: 'passed' | 'attention' | 'not_checked' = 'not_checked';
        let statusText = 'Not checked';

        if (isEvaluable && evaluation) {
          const fingerResult = evaluation.fingers[id];
          if (fingerResult?.passed) {
            state = 'passed';
            statusText = 'In position';
          } else {
            state = 'attention';
            statusText = getFingerProblemText(fingerResult?.feedbackKey ?? null);
          }
        }

        const isLast = index === ORDERED_FINGERS.length - 1;

        return (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: tokens.shape.fingerRowHeight,
              borderBottom: isLast
                ? 'none'
                : `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {state === 'passed' && (
                  <CheckCircleIcon size={20} color={tokens.colors.ink} />
                )}
                {state === 'attention' && (
                  <AlertTriangleIcon
                    size={20}
                    color={tokens.colors.overlayNeedsAttention}
                  />
                )}
                {state === 'not_checked' && (
                  <DashCircleIcon
                    size={20}
                    color={tokens.colors.overlayNeutral}
                  />
                )}
              </div>
              <span
                style={{
                  ...tokens.typography.fingerName,
                  color: tokens.colors.ink,
                }}
              >
                {label}
              </span>
            </div>
            <span
              style={{
                ...tokens.typography.smallMeta,
                color: tokens.colors.mutedText,
              }}
            >
              {statusText}
            </span>
          </div>
        );
      })}
    </div>
  );
}
