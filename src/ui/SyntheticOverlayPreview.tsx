import { useEffect, useRef, useState } from 'react';
import type { Vec3 } from '../engine';
import { FIXTURE_LETTER_V_RIGHT } from '../../tests/fixtures/handFixtures';
import { perturbFingerCurl } from '../../tests/synthetic';

const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: readonly Vec3[],
  highlightIndices: Set<number>
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const [a, b] of HAND_CONNECTIONS) {
    const isHighlighted = highlightIndices.has(a) || highlightIndices.has(b);
    ctx.strokeStyle = isHighlighted ? '#f97316' : '#38bdf8';
    ctx.lineWidth = isHighlighted ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height);
    ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height);
    ctx.stroke();
  }

  landmarks.forEach((pt, idx) => {
    ctx.beginPath();
    ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = highlightIndices.has(idx) ? '#f97316' : '#ffffff';
    ctx.fill();
  });
}

export function SyntheticOverlayPreview() {
  const [ringExtendDeg, setRingExtendDeg] = useState<number>(95);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const syntheticSample = perturbFingerCurl(
    FIXTURE_LETTER_V_RIGHT,
    'ring',
    -ringExtendDeg,
    'Right'
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    // Highlight ring finger joints (13, 14, 15, 16)
    drawSkeleton(
      canvasRef.current,
      syntheticSample.landmarks,
      new Set([13, 14, 15, 16])
    );
  }, [syntheticSample]);

  return (
    <section
      style={{
        marginTop: '1.5rem',
        padding: '1rem',
        border: '1px dashed #f97316',
        borderRadius: '8px',
        maxWidth: '420px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
      }}
    >
      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
        Synthetic Unit-Test Fixture Preview (Not Real Data)
      </strong>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
        Mutation: {syntheticSample.perturbation.description}
      </p>
      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Ring Finger Extension Delta: -{ringExtendDeg}°
        <input
          type="range"
          min={0}
          max={150}
          value={ringExtendDeg}
          onChange={(e) => setRingExtendDeg(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>
      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        style={{
          width: '100%',
          backgroundColor: '#020617',
          borderRadius: '6px',
        }}
      />
    </section>
  );
}
