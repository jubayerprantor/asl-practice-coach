import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedDatasetFile } from '../src/data/schema';
import {
  extractHandFeatures,
  FEATURE_NAMES,
  type AnatomicalHandedness,
  type FeatureName,
  type FingerName,
} from '../src/engine';
import type {
  FeatureConditionRule,
  ReferencePackFile,
  SignThresholdSpec,
  ThresholdsPackFile,
} from '../src/packs/schema';

interface CliOptions {
  trainDataset: string;
  valDataset: string | null;
  pLow: number;
  pHigh: number;
  outputPath: string;
  reportPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i++;
    }
  }

  const processedDir = path.resolve('data', 'processed');
  const available = fs.existsSync(processedDir)
    ? fs
        .readdirSync(processedDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.basename(f, '.json'))
        .sort()
    : [];

  const trainDataset = args.get('train-dataset') ?? available[0];
  const valDataset =
    args.get('val-dataset') ?? (available.length > 1 ? available[1] : null);

  if (!trainDataset) {
    console.error(
      'Usage: npm run derive-thresholds -- --train-dataset <slugA> [--val-dataset <slugB>] [--p-low 5] [--p-high 95]'
    );
    process.exit(1);
  }

  return {
    trainDataset,
    valDataset,
    pLow: Number(args.get('p-low') ?? 5),
    pHigh: Number(args.get('p-high') ?? 95),
    outputPath: path.resolve('src', 'packs', 'asl', 'thresholds.json'),
    reportPath: path.resolve('docs', 'reports', 'threshold-agreement.md'),
  };
}

/**
 * Maps each geometric feature to its primary finger, condition label,
 * priority rank, and feedback lookup keys (no numeric thresholds here).
 */
const FEATURE_RULE_METADATA: Record<
  FeatureName,
  {
    id: string;
    finger: FingerName;
    secondaryFinger?: FingerName;
    label: string;
    feedbackKeyBelow: string;
    feedbackKeyAbove: string;
    priority: number;
  }
> = {
  curl_thumb_deg: {
    id: 'thumb_curl',
    finger: 'thumb',
    label: 'thumb curl angle',
    feedbackKeyBelow: 'thumb_curl_more',
    feedbackKeyAbove: 'thumb_extend_more',
    priority: 2,
  },
  curl_index_deg: {
    id: 'index_curl',
    finger: 'index',
    label: 'index curl angle',
    feedbackKeyBelow: 'index_curl_more',
    feedbackKeyAbove: 'index_extend_more',
    priority: 1,
  },
  curl_middle_deg: {
    id: 'middle_curl',
    finger: 'middle',
    label: 'middle curl angle',
    feedbackKeyBelow: 'middle_curl_more',
    feedbackKeyAbove: 'middle_extend_more',
    priority: 1,
  },
  curl_ring_deg: {
    id: 'ring_curl',
    finger: 'ring',
    label: 'ring curl angle',
    feedbackKeyBelow: 'ring_curl_more',
    feedbackKeyAbove: 'ring_extend_more',
    priority: 2,
  },
  curl_pinky_deg: {
    id: 'pinky_curl',
    finger: 'pinky',
    label: 'pinky curl angle',
    feedbackKeyBelow: 'pinky_curl_more',
    feedbackKeyAbove: 'pinky_extend_more',
    priority: 2,
  },
  dist_thumb_index: {
    id: 'thumb_index_spacing',
    finger: 'thumb',
    secondaryFinger: 'index',
    label: 'thumb-index spacing',
    feedbackKeyBelow: 'thumb_index_apart',
    feedbackKeyAbove: 'thumb_index_closer',
    priority: 3,
  },
  dist_thumb_middle: {
    id: 'thumb_middle_spacing',
    finger: 'thumb',
    secondaryFinger: 'middle',
    label: 'thumb-middle spacing',
    feedbackKeyBelow: 'thumb_middle_apart',
    feedbackKeyAbove: 'thumb_middle_closer',
    priority: 3,
  },
  dist_thumb_ring: {
    id: 'thumb_ring_spacing',
    finger: 'thumb',
    secondaryFinger: 'ring',
    label: 'thumb-ring spacing',
    feedbackKeyBelow: 'thumb_ring_apart',
    feedbackKeyAbove: 'thumb_ring_closer',
    priority: 4,
  },
  dist_thumb_pinky: {
    id: 'thumb_pinky_spacing',
    finger: 'thumb',
    secondaryFinger: 'pinky',
    label: 'thumb-pinky spacing',
    feedbackKeyBelow: 'thumb_pinky_apart',
    feedbackKeyAbove: 'thumb_pinky_closer',
    priority: 4,
  },
  dist_index_middle: {
    id: 'index_middle_spacing',
    finger: 'index',
    secondaryFinger: 'middle',
    label: 'index-middle spacing',
    feedbackKeyBelow: 'index_middle_apart',
    feedbackKeyAbove: 'index_middle_closer',
    priority: 2,
  },
  dist_index_ring: {
    id: 'index_ring_spacing',
    finger: 'index',
    secondaryFinger: 'ring',
    label: 'index-ring spacing',
    feedbackKeyBelow: 'index_ring_apart',
    feedbackKeyAbove: 'index_ring_closer',
    priority: 4,
  },
  dist_index_pinky: {
    id: 'index_pinky_spacing',
    finger: 'index',
    secondaryFinger: 'pinky',
    label: 'index-pinky spacing',
    feedbackKeyBelow: 'index_pinky_apart',
    feedbackKeyAbove: 'index_pinky_closer',
    priority: 4,
  },
  dist_middle_ring: {
    id: 'middle_ring_spacing',
    finger: 'middle',
    secondaryFinger: 'ring',
    label: 'middle-ring spacing',
    feedbackKeyBelow: 'middle_ring_apart',
    feedbackKeyAbove: 'middle_ring_closer',
    priority: 3,
  },
  dist_middle_pinky: {
    id: 'middle_pinky_spacing',
    finger: 'middle',
    secondaryFinger: 'pinky',
    label: 'middle-pinky spacing',
    feedbackKeyBelow: 'middle_pinky_apart',
    feedbackKeyAbove: 'middle_pinky_closer',
    priority: 4,
  },
  dist_ring_pinky: {
    id: 'ring_pinky_spacing',
    finger: 'ring',
    secondaryFinger: 'pinky',
    label: 'ring-pinky spacing',
    feedbackKeyBelow: 'ring_pinky_apart',
    feedbackKeyAbove: 'ring_pinky_closer',
    priority: 3,
  },
  orient_roll_rad: {
    id: 'palm_roll',
    finger: 'index',
    label: 'hand tilt / roll',
    feedbackKeyBelow: 'wrist_tilt_right',
    feedbackKeyAbove: 'wrist_tilt_left',
    priority: 5,
  },
  orient_pitch: {
    id: 'palm_pitch',
    finger: 'middle',
    label: 'palm vertical pitch',
    feedbackKeyBelow: 'wrist_pitch_down',
    feedbackKeyAbove: 'wrist_pitch_up',
    priority: 5,
  },
  orient_facing: {
    id: 'palm_facing',
    finger: 'middle',
    label: 'palm facing camera',
    feedbackKeyBelow: 'palm_face_camera',
    feedbackKeyAbove: 'palm_turn_away',
    priority: 5,
  },
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const weight = idx - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

function intervalIoU(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number
): number {
  const interStart = Math.max(minA, minB);
  const interEnd = Math.min(maxA, maxB);
  const intersection = Math.max(0, interEnd - interStart);
  const union = Math.max(maxA, maxB) - Math.min(minA, minB);
  return union > 1e-9 ? intersection / union : 1;
}

function loadDatasetFeatures(slug: string): Map<string, Record<FeatureName, number[]>> {
  const filePath = path.resolve('data', 'processed', `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Processed dataset not found: ${filePath}`);
  }

  const raw = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  ) as ProcessedDatasetFile;

  const grouped = new Map<string, Record<FeatureName, number[]>>();

  for (const sample of raw.samples) {
    const handedness: AnatomicalHandedness =
      sample.handedness === 'Left' ? 'Left' : 'Right';
    const feats = extractHandFeatures(sample.landmarks, handedness);

    let bucket = grouped.get(sample.label);
    if (!bucket) {
      bucket = {} as Record<FeatureName, number[]>;
      for (const name of FEATURE_NAMES) {
        bucket[name] = [];
      }
      grouped.set(sample.label, bucket);
    }

    for (const name of FEATURE_NAMES) {
      bucket[name].push(feats[name]);
    }
  }

  return grouped;
}

/**
 * Ensures /src/packs/asl/reference.json exists with empty human-fillable entries
 * without generating any ASL handshape descriptions from LLM knowledge (Rule 2).
 */
function ensureHumanReferenceSkeleton(letters: string[]): void {
  const refPath = path.resolve('src', 'packs', 'asl', 'reference.json');
  let existing: Partial<ReferencePackFile> = {};
  if (fs.existsSync(refPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
    } catch {
      existing = {};
    }
  }

  const signs = existing.signs ?? {};
  let added = 0;

  for (const letter of letters) {
    if (!signs[letter]) {
      signs[letter] = {
        sign: letter,
        authoredByHuman: false,
        summary: 'TODO: Human-authored ASL handshape description required.',
        fingerNotes: {},
        orientationNote: 'TODO: Human-authored orientation note required.',
      };
      added++;
    }
  }

  const payload: ReferencePackFile = {
    schemaVersion: '1.0.0',
    language: 'asl',
    signs,
  };

  fs.mkdirSync(path.dirname(refPath), { recursive: true });
  fs.writeFileSync(refPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  if (added > 0) {
    console.log(
      `[derive-thresholds] Added ${added} placeholder sign entries to ${refPath} for human authoring.`
    );
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(
    `[derive-thresholds] Deriving [${opts.pLow}th, ${opts.pHigh}th] percentile ranges from "${opts.trainDataset}"` +
      (opts.valDataset ? ` and checking against "${opts.valDataset}"` : '')
  );

  const trainMap = loadDatasetFeatures(opts.trainDataset);
  const valMap = opts.valDataset ? loadDatasetFeatures(opts.valDataset) : null;

  const letters = Array.from(trainMap.keys()).sort();
  ensureHumanReferenceSkeleton(letters);

  const signsOutput: Record<string, SignThresholdSpec> = {};
  const reportLines: string[] = [
    '# Step 6: Cross-Dataset Threshold Agreement Report',
    '',
    `- **Derived From (Dataset A):** \`${opts.trainDataset}\` (${opts.pLow}th–${opts.pHigh}th percentile)`,
    `- **Checked Against (Dataset B):** ${opts.valDataset ? `\`${opts.valDataset}\`` : '*None*'}`,
    '- **Status:** `provisional` (must be reviewed by hand and validated on real users)',
    '',
    '## High-Disagreement Rules (Dataset B Pass Rate < 70% or Interval IoU < 0.40)',
    '',
    '| Sign | Feature | Dataset A Range | Dataset B Range | Interval IoU | Dataset B Pass Rate |',
    '| :--- | :--- | :--- | :--- | ---: | ---: |',
  ];

  let totalRules = 0;
  let flaggedDisagreements = 0;

  for (const letter of letters) {
    const trainBucket = trainMap.get(letter)!;
    const valBucket = valMap?.get(letter) ?? null;
    const sampleCount = trainBucket[FEATURE_NAMES[0]].length;

    const conditions: FeatureConditionRule[] = [];

    for (const featureName of FEATURE_NAMES) {
      const sortedTrain = [...trainBucket[featureName]].sort((a, b) => a - b);
      const minA = Number(percentile(sortedTrain, opts.pLow).toFixed(4));
      const maxA = Number(percentile(sortedTrain, opts.pHigh).toFixed(4));

      let passRate: number | undefined;
      let highDisagreement = false;

      if (valBucket && valBucket[featureName].length > 0) {
        const valVals = valBucket[featureName];
        const sortedVal = [...valVals].sort((a, b) => a - b);
        const minB = Number(percentile(sortedVal, opts.pLow).toFixed(4));
        const maxB = Number(percentile(sortedVal, opts.pHigh).toFixed(4));

        const inRangeCount = valVals.filter(
          (v) => v >= minA && v <= maxA
        ).length;
        passRate = Number((inRangeCount / valVals.length).toFixed(4));
        const iou = intervalIoU(minA, maxA, minB, maxB);

        if (passRate < 0.7 || iou < 0.4) {
          highDisagreement = true;
          flaggedDisagreements++;
          reportLines.push(
            `| **${letter}** | \`${featureName}\` | [${minA}, ${maxA}] | [${minB}, ${maxB}] | ${iou.toFixed(2)} | ${(passRate * 100).toFixed(1)}% |`
          );
        }
      }

      const meta = FEATURE_RULE_METADATA[featureName];
      totalRules++;

      conditions.push({
        id: meta.id,
        feature: featureName,
        finger: meta.finger,
        ...(meta.secondaryFinger
          ? { secondaryFinger: meta.secondaryFinger }
          : {}),
        label: meta.label,
        feedbackKeyBelow: meta.feedbackKeyBelow,
        feedbackKeyAbove: meta.feedbackKeyAbove,
        priority: meta.priority,
        min: minA,
        max: maxA,
        ...(passRate !== undefined ? { crossDatasetPassRate: passRate } : {}),
        ...(highDisagreement ? { highDisagreementWarning: true } : {}),
      });
    }

    signsOutput[letter] = {
      sign: letter,
      status: 'provisional',
      derivedFromDataset: opts.trainDataset,
      checkedAgainstDataset: opts.valDataset,
      sampleCount,
      conditions,
    };
  }

  if (flaggedDisagreements === 0) {
    reportLines.push(
      '| *(None)* | All derived intervals agreed across datasets | — | — | — | — |'
    );
  }

  reportLines.push(
    '',
    `Total feature rules derived: **${totalRules}** across **${letters.length}** signs. Flagged cross-dataset disagreements: **${flaggedDisagreements}**.`,
    ''
  );

  const packFile: ThresholdsPackFile = {
    schemaVersion: '1.0.0',
    language: 'asl',
    status: 'provisional',
    generatedAt: new Date().toISOString(),
    percentileLow: opts.pLow,
    percentileHigh: opts.pHigh,
    signs: signsOutput,
  };

  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  fs.writeFileSync(
    opts.outputPath,
    JSON.stringify(packFile, null, 2) + '\n',
    'utf-8'
  );

  fs.mkdirSync(path.dirname(opts.reportPath), { recursive: true });
  fs.writeFileSync(opts.reportPath, reportLines.join('\n'), 'utf-8');

  console.log(`\n[derive-thresholds] Wrote provisional pack: ${opts.outputPath}`);
  console.log(`[derive-thresholds] Wrote disagreement report: ${opts.reportPath}`);
  console.log(
    `[derive-thresholds] Summary: ${totalRules} rules derived, ${flaggedDisagreements} flagged for cross-dataset disagreement.`
  );
}

main().catch((err) => {
  console.error('[derive-thresholds] Fatal error:', err);
  process.exit(1);
});
