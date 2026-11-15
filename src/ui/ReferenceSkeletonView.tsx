import { useEffect, useRef } from 'react';
import type { SignReferenceEntry } from '../packs/schema';
import type { FingerName } from '../engine';
import { ReferenceHintCard } from './ReferenceHintCard';

interface ReferenceSkeletonViewProps {
  sign: string;
  entry: SignReferenceEntry | undefined;
}

const FINGER_BONES: Record<FingerName, ReadonlyArray<[number, number]>> = {
  thumb: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ],
  index: [
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
  ],
  middle: [
    [9, 10],
    [10, 11],
    [11, 12],
  ],
  ring: [
    [13, 14],
    [14, 15],
    [15, 16],
  ],
  pinky: [
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
  ],
};

const PALM_BRIDGES: ReadonlyArray<[number, number]> = [
  [5, 9],
  [9, 13],
  [13, 17],
];

const FINGER_COLORS: Record<FingerName, string> = {
  thumb: '#f59e0b',
  index: '#38bdf8',
  middle: '#10b981',
  ring: '#a78bfa',
  pinky: '#f472b6',
};

export function ReferenceSkeletonView({
  sign,
  entry,
}: ReferenceSkeletonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarks = entry?.canonicalLandmarks;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length !== 21) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Auto-fit landmarks cleanly into the canvas with padding
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const spanX = Math.max(0.05, maxX - minX);
    const spanY = Math.max(0.05, maxY - minY);
    const pad = 36;
    const scale = Math.min(
      (canvas.width - pad * 2) / spanX,
      (canvas.height - pad * 2) / spanY
    );
    const offsetX = (canvas.width - spanX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - spanY * scale) / 2 - minY * scale;

    const toPx = (pt: { x: number; y: number }) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY,
    });

    // Palm bridge
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (const [a, b] of PALM_BRIDGES) {
      const pA = toPx(landmarks[a]);
      const pB = toPx(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }

    // Color-coded fingers
    (Object.keys(FINGER_BONES) as FingerName[]).forEach((finger) => {
      ctx.strokeStyle = FINGER_COLORS[finger];
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const [a, b] of FINGER_BONES[finger]) {
        const pA = toPx(landmarks[a]);
        const pB = toPx(landmarks[b]);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
    });

    // Joint nodes
    landmarks.forEach((pt, idx) => {
      const p = toPx(pt);
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#eab308' : '#f8fafc';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    });
  }, [landmarks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          backgroundColor: '#020617',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#94a3b8',
            marginBottom: '0.4rem',
          }}
        >
          <span>Canonical Landmark Reference</span>
          <span>Sign: {sign}</span>
        </div>

        {landmarks && landmarks.length === 21 ? (
          <canvas
            ref={canvasRef}
            width={280}
            height={240}
            aria-label={`Landmark skeleton diagram for ASL sign ${sign}`}
            style={{
              width: '100%',
              maxWidth: '280px',
              height: 'auto',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              padding: '2.25rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.85rem',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
            }}
          >
            Canonical landmark template not yet recorded for "{sign}". Follow
            the written description below.
          </div>
        )}
      </div>

      <ReferenceHintCard sign={sign} entry={entry} />
    </div>
  );
}
