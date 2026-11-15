import { useMemo, useState } from 'react';
import thresholdsJson from './packs/asl/thresholds.json';
import evaluatorConfigJson from './packs/asl/evaluator-config.json';
import feedbackJson from './packs/asl/feedback.json';
import type { EvaluationResult, EvaluatorConfig, SignPackBundle } from './engine';
import type { FeedbackPackFile, ThresholdsPackFile } from './packs/schema';
import { CameraView } from './ui/CameraView';
import { FeedbackPanel } from './ui/FeedbackPanel';
import { SyntheticOverlayPreview } from './ui/SyntheticOverlayPreview';

const ASL_PACK: SignPackBundle = {
  thresholds: thresholdsJson as ThresholdsPackFile,
  config: evaluatorConfigJson as EvaluatorConfig,
};

const FEEDBACK_PACK = feedbackJson as FeedbackPackFile;

export default function App() {
  const availableSigns = useMemo(
    () => Object.keys(ASL_PACK.thresholds.signs ?? {}).sort(),
    []
  );
  const [targetSign, setTargetSign] = useState<string>(
    availableSigns[0] ?? 'V'
  );
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const showSyntheticPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('syntheticPreview') === '1';

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          ASL Fingerspelling Practice Coach
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.9rem' }}>
          100% local processing — webcam video never leaves your device.
        </p>
      </header>

      {availableSigns.length > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>Target Sign:</strong>
          <select
            value={targetSign}
            onChange={(e) => {
              setTargetSign(e.target.value);
              setEvaluation(null);
            }}
            style={{ padding: '0.35rem 0.6rem', fontSize: '1rem' }}
          >
            {availableSigns.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      <CameraView
        targetSign={targetSign}
        pack={ASL_PACK}
        onEvaluationChange={setEvaluation}
      />

      <FeedbackPanel evaluation={evaluation} feedbackPack={FEEDBACK_PACK} />

      {showSyntheticPreview && <SyntheticOverlayPreview />}
    </main>
  );
}
