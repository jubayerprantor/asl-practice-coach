import { useEffect, useMemo, useState } from 'react';
import {
  getLanguagePack,
  listAvailableLanguagePacks,
  toSignPackBundle,
} from './packs/packRegistry';
import { CheckMode } from './ui/CheckMode';
import { LearnMode } from './ui/LearnMode';
import { ProgressDashboard } from './ui/ProgressDashboard';
import { SyntheticOverlayPreview } from './ui/SyntheticOverlayPreview';

const kbdStyle: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  padding: '0.1rem 0.35rem',
  fontWeight: 700,
  fontSize: '0.75rem',
  color: '#0f172a',
};

export default function App() {
  const availablePacks = useMemo(() => listAvailableLanguagePacks(), []);
  const [activePackId, setActivePackId] = useState<string>(
    availablePacks[0]?.id ?? 'asl'
  );
  const [mode, setMode] = useState<'learn' | 'check' | 'progress'>('learn');

  const loadedPack = useMemo(
    () => getLanguagePack(activePackId),
    [activePackId]
  );
  const signPackBundle = useMemo(
    () => toSignPackBundle(loadedPack),
    [loadedPack]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === '1') {
        e.preventDefault();
        setMode('learn');
      } else if (e.key === '2') {
        e.preventDefault();
        setMode('check');
      } else if (e.key === '3') {
        e.preventDefault();
        setMode('progress');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showSyntheticPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('syntheticPreview') === '1';

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              Fingerspelling Practice Coach
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.88rem' }}>
              100% local processing — webcam video never leaves your device.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Runtime Language Pack Selector */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <span>Language Pack:</span>
              <select
                value={loadedPack.manifest.id}
                onChange={(e) => setActivePackId(e.target.value)}
                aria-label="Select sign language pack"
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                }}
              >
                {availablePacks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>

            <nav aria-label="Practice modes" style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMode('learn')}
                aria-pressed={mode === 'learn'}
                title="Learn Mode (Alt+1)"
                style={navBtnStyle(mode === 'learn')}
              >
                Learn
              </button>
              <button
                type="button"
                onClick={() => setMode('check')}
                aria-pressed={mode === 'check'}
                title="Check Mode (Alt+2)"
                style={navBtnStyle(mode === 'check')}
              >
                Check
              </button>
              <button
                type="button"
                onClick={() => setMode('progress')}
                aria-pressed={mode === 'progress'}
                title="Progress & Adaptive Mode (Alt+3)"
                style={navBtnStyle(mode === 'progress')}
              >
                Progress &amp; Adaptive
              </button>
            </nav>
          </div>
        </div>

        {/* Documented Keyboard Shortcuts Bar */}
        <div
          role="note"
          aria-label="Keyboard shortcuts"
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.78rem',
            color: '#64748b',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, color: '#475569' }}>Shortcuts:</span>
          <span><kbd style={kbdStyle}>Alt+1</kbd> Learn</span>
          <span><kbd style={kbdStyle}>Alt+2</kbd> Check</span>
          <span><kbd style={kbdStyle}>Alt+3</kbd> Progress</span>
          <span><kbd style={kbdStyle}>Alt+C</kbd> Camera On/Off</span>
          <span><kbd style={kbdStyle}>Alt+V</kbd> Voice Hints</span>
          <span><kbd style={kbdStyle}>Alt+R</kbd> Reference</span>
        </div>
      </header>

      {mode === 'learn' && (
        <LearnMode
          key={`learn-${loadedPack.manifest.id}`}
          pack={signPackBundle}
          feedbackPack={loadedPack.feedback}
          referencePack={loadedPack.reference}
          curriculumPack={loadedPack.curriculum}
        />
      )}

      {mode === 'check' && (
        <CheckMode
          key={`check-${loadedPack.manifest.id}`}
          pack={signPackBundle}
          feedbackPack={loadedPack.feedback}
          referencePack={loadedPack.reference}
        />
      )}

      {mode === 'progress' && (
        <ProgressDashboard
          key={`progress-${loadedPack.manifest.id}`}
          pack={signPackBundle}
          feedbackPack={loadedPack.feedback}
        />
      )}

      {showSyntheticPreview && <SyntheticOverlayPreview />}
    </main>
  );
}

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 0.95rem',
    borderRadius: '6px',
    border: '1px solid #0284c7',
    backgroundColor: active ? '#0284c7' : '#ffffff',
    color: active ? '#ffffff' : '#0284c7',
    fontWeight: 700,
    cursor: 'pointer',
  };
}
