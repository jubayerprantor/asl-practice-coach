import type {
  EvaluationResult,
  FingerName,
  Vec3,
} from '../engine';

const FINGER_BONES: Record<FingerName, ReadonlyArray<[number, number]>> = {
  thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
  index: [[0, 5], [5, 6], [6, 7], [7, 8]],
  middle: [[9, 10], [10, 11], [11, 12]],
  ring: [[13, 14], [14, 15], [15, 16]],
  pinky: [[0, 17], [17, 18], [18, 19], [19, 20]],
};

const PALM_BRIDGE_BONES: ReadonlyArray<[number, number]> = [
  [5, 9],
  [9, 13],
  [13, 17],
];

const FINGERTIP_MAP: Record<FingerName, { tipIdx: number; shortLabel: string }> = {
  thumb: { tipIdx: 4, shortLabel: 'Thumb' },
  index: { tipIdx: 8, shortLabel: 'Index' },
  middle: { tipIdx: 12, shortLabel: 'Middle' },
  ring: { tipIdx: 16, shortLabel: 'Ring' },
  pinky: { tipIdx: 20, shortLabel: 'Pinky' },
};

const ALL_FINGERS: readonly FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

/**
 * Draws an upright pill badge on a CSS-mirrored canvas (scaleX(-1))
 * by locally un-flipping the canvas context around (x, y).
 */
function drawUprightBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  borderColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1); // Counter-flip so text reads left-to-right on mirrored stage

  ctx.font = 'bold 12px system-ui, sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 6;
  const width = metrics.width + padX * 2;
  const height = 20;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);

  ctx.restore();
}

export function drawDiagnosticHandOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: readonly Vec3[] | null,
  evaluation: EvaluationResult | null
): void {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 21) return;

  const isEvaluable =
    evaluation !== null && evaluation.status !== 'unable_to_evaluate';

  // 1. Draw palm bridge connectors
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = isEvaluable ? '#64748b' : '#94a3b8';
  ctx.lineWidth = 2.5;
  for (const [a, b] of PALM_BRIDGE_BONES) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Draw each finger with distinct color + stroke style (solid = pass, dashed = adjust)
  for (const finger of ALL_FINGERS) {
    const fingerState = isEvaluable ? evaluation.fingers[finger] : null;
    const passed = fingerState ? fingerState.passed : null;

    ctx.save();
    if (passed === true) {
      ctx.strokeStyle = '#10b981'; // Emerald
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
    } else if (passed === false) {
      ctx.strokeStyle = '#f97316'; // High-contrast orange
      ctx.setLineDash([7, 5]);   // Dashed line pattern for non-color differentiation
      ctx.lineWidth = 4.5;
    } else {
      ctx.strokeStyle = '#94a3b8'; // Neutral slate when unable_to_evaluate
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 3;
    }

    ctx.lineCap = 'round';
    for (const [a, b] of FINGER_BONES[finger]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Draw 21 joint nodes
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, i === 0 ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#eab308' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  }

  // 4. Draw non-color fingertip badges (✓ / ! / ?)
  for (const finger of ALL_FINGERS) {
    const { tipIdx, shortLabel } = FINGERTIP_MAP[finger];
    const tip = landmarks[tipIdx];
    const x = tip.x * width;
    const y = tip.y * height - 16;

    if (!isEvaluable) {
      if (finger === 'middle') {
        drawUprightBadge(ctx, x, y, '? Tracking', '#334155', '#94a3b8');
      }
      continue;
    }

    const fingerState = evaluation.fingers[finger];
    if (fingerState.passed) {
      drawUprightBadge(ctx, x, y, `✓ ${shortLabel}`, '#065f46', '#10b981');
    } else {
      drawUprightBadge(ctx, x, y, `! ${shortLabel}`, '#9a3412', '#f97316');
    }
  }
}
