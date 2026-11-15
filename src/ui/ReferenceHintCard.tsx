import type { SignReferenceEntry } from '../packs/schema';
import type { FingerName } from '../engine';

interface ReferenceHintCardProps {
  sign: string;
  entry: SignReferenceEntry | undefined;
}

const FINGER_LABELS: Record<FingerName, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky',
};

export function ReferenceHintCard({ sign, entry }: ReferenceHintCardProps) {
  if (!entry || !entry.authoredByHuman) {
    return (
      <div
        role="region"
        aria-label={`Reference for sign ${sign}`}
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          color: '#e2e8f0',
          fontSize: '0.9rem',
        }}
      >
        <strong>Reference for "{sign}":</strong> Human-authored reference notes
        have not been added for this sign yet.
      </div>
    );
  }

  const fingerEntries = Object.entries(entry.fingerNotes) as Array<
    [FingerName, string]
  >;

  return (
    <div
      role="region"
      aria-label={`Reference for sign ${sign}`}
      style={{
        padding: '0.9rem 1rem',
        borderRadius: '8px',
        backgroundColor: '#1e293b',
        border: '1px solid #38bdf8',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>
        Reference Guide: Sign "{sign}"
      </strong>
      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.4 }}>
        {entry.summary}
      </p>

      {fingerEntries.length > 0 && (
        <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', fontSize: '0.88rem' }}>
          {fingerEntries.map(([finger, note]) => (
            <li key={finger}>
              <strong>{FINGER_LABELS[finger]}:</strong> {note}
            </li>
          ))}
        </ul>
      )}

      {entry.orientationNote && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
          <strong>Orientation:</strong> {entry.orientationNote}
        </p>
      )}
    </div>
  );
}
