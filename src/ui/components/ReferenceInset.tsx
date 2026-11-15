import { useEffect, useRef } from 'react';
import { tokens } from '../tokens';
import type { FingerName } from '../../engine/types';

interface ReferenceInsetProps {
  landmarks: Array<{ x: number; y: number; z: number }>;
}

const FINGER_BONES: Record<FingerName, ReadonlyArray<[number, number]>> = {
  thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
  index: [[0, 5], [5, 6], [6, 7], [7, 8]],
  middle: [[9, 10], [10, 11], [11, 12]],
  ring: [[13, 14], [14, 15], [15, 16]],
  pinky: [[0, 17], [17, 18], [18, 19], [19, 20]],
};

const PALM_BRIDGES: ReadonlyArray<[number, number]> = [
  [5, 9],
  [9, 13],
  [13, 17],
];

export function ReferenceInset({ landmarks }: ReferenceInsetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || landmarks.length !== 21) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const spanX = Math.max(0.05, maxX - minX);
    const spanY = Math.max(0.05, maxY - minY);
    const pad = 10;
    const scale = Math.min((canvas.width - pad * 2) / spanX, (canvas.height - pad * 2) / spanY);
    const offsetX = (canvas.width - spanX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - spanY * scale) / 2 - minY * scale;

    const toPx = (pt: { x: number; y: number }) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY,
    });

    // Palm bridge
    ctx.strokeStyle = '#5C6166';
    ctx.lineWidth = 1.5;
    for (const [a, b] of PALM_BRIDGES) {
      const pA = toPx(landmarks[a]);
      const pB = toPx(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }

    // Fingers
    (Object.keys(FINGER_BONES) as FingerName[]).forEach((finger) => {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
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

    // Joint dots
    landmarks.forEach((pt, idx) => {
      const p = toPx(pt);
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 0 ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#BDBFBA';
      ctx.fill();
    });
  }, [landmarks]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        width: '140px',
        height: '140px',
        zIndex: 10,
        backgroundColor: 'rgba(24, 27, 30, 0.85)',
        borderRadius: '12px',
        padding: '10px',
        border: `1px solid ${tokens.colors.secondaryBody}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: tokens.colors.overlayNeutral,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Reference
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={96}
        style={{
          width: '120px',
          height: '96px',
          display: 'block',
        }}
      />
    </div>
  );
}
