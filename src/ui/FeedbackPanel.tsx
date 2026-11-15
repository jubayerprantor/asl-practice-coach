import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult, FingerName } from '../engine';
import type { FeedbackPackFile } from '../packs/schema';
import { DebouncedSpeechCoach } from './speechCoach';

interface FeedbackPanelProps {
  evaluation: EvaluationResult | null;
  feedbackPack: FeedbackPackFile;
}

const FINGER_LABELS: Record<FingerName, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky',
};

const FINGER_ORDER: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

export function FeedbackPanel({
  evaluation,
  feedbackPack,
}: FeedbackPanelProps) {
  // Rule 6: Voice feedback is optional and OFF by default
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const speechCoachRef = useRef<DebouncedSpeechCoach>(
    new DebouncedSpeechCoach(4000)
  );
  const speechSupported = speechCoachRef.current.isSupported();

  // Derive primary text message from evaluation state
  let bannerTitle = 'Ready';
  let primaryMessage = 'Select a sign and show your hand to the camera.';
  let bannerAccent = '#334155';
  let statusIcon = '•';
  let spokenCue: string | null = null;

  if (evaluation) {
    if (evaluation.status === 'unable_to_evaluate') {
      const reasonKey = evaluation.unableReason ?? 'no_hand_detected';
      const reasonText =
        feedbackPack.unableReasons[reasonKey] ??
        'Unable to evaluate hand position clearly.';
      bannerTitle = 'Unable to evaluate';
      primaryMessage = `Unable to evaluate: ${reasonText}`;
      bannerAccent = '#475569';
      statusIcon = '?';
    } else if (evaluation.status === 'correct') {
      if (evaluation.hold.completed) {
        bannerTitle = `Confirmed: ${evaluation.targetSign}`;
        primaryMessage = `Great job! Sign "${evaluation.targetSign}" held steadily.`;
        spokenCue = `Confirmed ${evaluation.targetSign}`;
      } else {
        bannerTitle = 'Good — hold steady';
        primaryMessage = `Hold that position (${(
          evaluation.hold.heldMs / 1000
        ).toFixed(1)}s / ${(evaluation.hold.requiredHoldMs / 1000).toFixed(
          1
        )}s)...`;
      }
      bannerAccent = '#047857';
      statusIcon = '✓';
    } else {
      // needs_correction: show ONLY the single highest-priority failing finger hint
      const topIssue = evaluation.topIssue;
      const key = topIssue?.feedbackKey ?? '';
      const hintText =
        (key && feedbackPack.messages[key]) ||
        (topIssue
          ? `Adjust your ${FINGER_LABELS[topIssue.finger].toLowerCase()} finger.`
          : 'Adjust your handshape to match the target sign.');

      bannerTitle = topIssue
        ? `Adjust ${FINGER_LABELS[topIssue.finger]}`
        : 'Adjust Handshape';
      primaryMessage = hintText;
      bannerAccent = '#c2410c';
      statusIcon = '!';
      spokenCue = hintText;
    }
  }

  // Trigger debounced speech when enabled
  useEffect(() => {
    if (!voiceEnabled) {
      speechCoachRef.current.stop();
      return;
    }
    if (spokenCue) {
      speechCoachRef.current.speak(spokenCue, voiceEnabled);
    }
  }, [voiceEnabled, spokenCue]);

  useEffect(() => {
    const coach = speechCoachRef.current;
    return () => coach.reset();
  }, []);

  const holdPct = evaluation
    ? Math.round(evaluation.hold.progress * 100)
    : 0;

  return (
    <aside
      aria-label="Coaching feedback"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem',
        borderRadius: '8px',
        border: `2px solid ${bannerAccent}`,
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        maxWidth: '640px',
      }}
    >
      {/* Header row with status badge + optional voice toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.6rem',
              height: '1.6rem',
              borderRadius: '999px',
              backgroundColor: bannerAccent,
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {statusIcon}
          </span>
          <strong style={{ fontSize: '1.05rem' }}>{bannerTitle}</strong>
        </div>

        <button
          type="button"
          onClick={() => setVoiceEnabled((v) => !v)}
          disabled={!speechSupported}
          aria-pressed={voiceEnabled}
          title={
            speechSupported
              ? 'Toggle optional spoken voice hints'
              : 'Speech synthesis is not supported in this browser'
          }
          style={{
            padding: '0.35rem 0.7rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            backgroundColor: voiceEnabled ? '#0284c7' : '#1e293b',
            color: '#f8fafc',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: speechSupported ? 'pointer' : 'not-allowed',
          }}
        >
          {speechSupported
            ? voiceEnabled
              ? '🔊 Voice Hints: ON'
              : '🔇 Voice Hints: OFF'
            : '🔇 Voice Unavailable'}
        </button>
      </div>

      {/* Primary Text Instruction (Live Region for Screen Readers) */}
      <p
        role="status"
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 500,
          lineHeight: 1.4,
          color: '#f1f5f9',
        }}
      >
        {primaryMessage}
      </p>

      {/* Hold Progress Bar */}
      {evaluation && evaluation.status === 'correct' && (
        <div
          aria-label="Hold stability progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={holdPct}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            backgroundColor: '#1e293b',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${holdPct}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 60ms linear',
            }}
          />
        </div>
      )}

      {/* Per-Finger Non-Color Status Pills (✓ Pass / ! Adjust / ? Unknown) */}
      <div
        aria-label="Per-finger status breakdown"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '0.4rem',
        }}
      >
        {FINGER_ORDER.map((finger) => {
          const isEvaluable =
            evaluation !== null && evaluation.status !== 'unable_to_evaluate';
          const fingerRes = isEvaluable ? evaluation.fingers[finger] : null;
          const isTopIssue = evaluation?.topIssue?.finger === finger;

          let icon = '?';
          let stateLabel = 'Waiting';
          let bg = '#1e293b';
          let border = '#334155';

          if (fingerRes) {
            if (fingerRes.passed) {
              icon = '✓';
              stateLabel = 'OK';
              bg = '#064e3b';
              border = '#10b981';
            } else {
              icon = '!';
              stateLabel = isTopIssue ? 'Fix First' : 'Adjust';
              bg = '#7c2d12';
              border = '#f97316';
            }
          }

          return (
            <div
              key={finger}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.4rem 0.25rem',
                borderRadius: '6px',
                backgroundColor: bg,
                border: `1.5px solid ${border}`,
                fontSize: '0.78rem',
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {icon} {FINGER_LABELS[finger]}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>
                {stateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
