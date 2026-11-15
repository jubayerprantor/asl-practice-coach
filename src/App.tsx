import { useState } from 'react';
import thresholdsJson from './packs/asl/thresholds.json';
import evaluatorConfigJson from './packs/asl/evaluator-config.json';
import feedbackJson from './packs/asl/feedback.json';
import referenceJson from './packs/asl/reference.json';
import curriculumJson from './packs/asl/curriculum.json';
import type { EvaluatorConfig, SignPackBundle } from './engine';
import type {
  CurriculumPackFile,
  FeedbackPackFile,
  ReferencePackFile,
  ThresholdsPackFile,
} from './packs/schema';
import { CheckMode } from './ui/CheckMode';
import { LearnMode } from './ui/LearnMode';
import { ProgressDashboard } from './ui/ProgressDashboard';
import { SyntheticOverlayPreview } from './ui/SyntheticOverlayPreview';

const ASL_PACK: SignPackBundle = {
  thresholds: thresholdsJson as ThresholdsPackFile,
  config: evaluatorConfigJson as EvaluatorConfig,
};

const FEEDBACK_PACK = feedbackJson as FeedbackPackFile;
const REFERENCE_PACK = referenceJson as ReferencePackFile;
const CURRICULUM_PACK = curriculumJson as CurriculumPackFile;

export default function App() {
  const [mode, setMode] = useState<'learn' | 'check' | 'progress'>('learn');

  const showSyntheticPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('syntheticPreview') === '1';

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            ASL Fingerspelling Practice Coach
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.88rem' }}>
            100% local processing — webcam video never leaves your device.
          </p>
        </div>

        <nav aria-label="Practice modes" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMode('learn')}
            aria-pressed={mode === 'learn'}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              backgroundColor: mode === 'learn' ? '#0284c7' : '#ffffff',
              color: mode === 'learn' ? '#ffffff' : '#0284c7',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Learn Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('check')}
            aria-pressed={mode === 'check'}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              backgroundColor: mode === 'check' ? '#0284c7' : '#ffffff',
              color: mode === 'check' ? '#ffffff' : '#0284c7',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Check Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('progress')}
            aria-pressed={mode === 'progress'}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              backgroundColor: mode === 'progress' ? '#0284c7' : '#ffffff',
              color: mode === 'progress' ? '#ffffff' : '#0284c7',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Progress &amp; Adaptive
          </button>
        </nav>
      </header>

      {mode === 'learn' && (
        <LearnMode
          pack={ASL_PACK}
          feedbackPack={FEEDBACK_PACK}
          referencePack={REFERENCE_PACK}
          curriculumPack={CURRICULUM_PACK}
        />
      )}

      {mode === 'check' && (
        <CheckMode
          pack={ASL_PACK}
          feedbackPack={FEEDBACK_PACK}
          referencePack={REFERENCE_PACK}
        />
      )}

      {mode === 'progress' && (
        <ProgressDashboard
          pack={ASL_PACK}
          feedbackPack={FEEDBACK_PACK}
        />
      )}

      {showSyntheticPreview && <SyntheticOverlayPreview />}
    </main>
  );
}
