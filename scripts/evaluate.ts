import fs from 'node:fs';
import path from 'node:path';
import type { LandmarkSample, ProcessedDatasetFile } from '../src/data/schema';
import {
  evaluate,
  type AnatomicalHandedness,
  type EvaluatorConfig,
  type FingerName,
  type SignPackBundle,
} from '../src/engine';
import type { ThresholdsPackFile } from '../src/packs/schema';
import {
  perturbFingerCurl,
  perturbFingertipSpacing,
} from '../tests/synthetic';

interface CliOptions {
  datasetSlug: string;
  heldOutSubjects: Set<string> | null;
  allowTrainDatasetWithSubjectSplit: boolean;
  reportDir: string;
}

interface PerLetterEvalRow {
  dataset: string;
  label: string;
  totalSamples: number;
  evaluableSamples: number;
  unableToEvaluateCount: number;
  unableToEvaluateRatePct: number;
  correctCount: number;
  recognitionAccuracyOverallPct: number;
  recognitionAccuracyEvaluablePct: number;
  falseCorrectionCount: number;
  falseCorrectionRatePct: number;
}

interface SyntheticSensitivityRow {
  baseLabel: string;
  perturbationType: string;
  targetFinger: string;
  trials: number;
  flaggedAsNeedsCorrection: number;
  isolatedExactFingerCount: number;
  detectionRatePct: number;
  exactFingerIsolationRatePct: number;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i++;
    }
  }

  const thresholdsPath = path.resolve('src', 'packs', 'asl', 'thresholds.json');
  const thresholds = JSON.parse(
    fs.readFileSync(thresholdsPath, 'utf-8')
  ) as ThresholdsPackFile;
  const derivedFrom = Object.values(thresholds.signs)[0]?.derivedFromDataset;

  const processedDir = path.resolve('data', 'processed');
  const available = fs.existsSync(processedDir)
    ? fs
        .readdirSync(processedDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.basename(f, '.json'))
        .sort()
    : [];

  // Default to a dataset that was NOT used to derive thresholds.json
  const defaultHeldOut =
    available.find((slug) => slug !== derivedFrom) ?? available[0];
  const datasetSlug = args.get('dataset') ?? defaultHeldOut;

  if (!datasetSlug) {
    console.error(
      'Usage: npm run eval:harness -- --dataset <heldOutSlug> [--held-out-subjects s1,s2]'
    );
    process.exit(1);
  }

  const subjectsRaw = args.get('held-out-subjects');
  const heldOutSubjects = subjectsRaw
    ? new Set(
        subjectsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

  return {
    datasetSlug,
    heldOutSubjects,
    allowTrainDatasetWithSubjectSplit: Boolean(heldOutSubjects),
    reportDir: path.resolve('docs', 'reports'),
  };
}

function loadPackBundle(): SignPackBundle {
  const thresholdsPath = path.resolve('src', 'packs', 'asl', 'thresholds.json');
  const configPath = path.resolve(
    'src',
    'packs',
    'asl',
    'evaluator-config.json'
  );

  const thresholds = JSON.parse(
    fs.readFileSync(thresholdsPath, 'utf-8')
  ) as ThresholdsPackFile;
  const config = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  ) as EvaluatorConfig;

  return { thresholds, config };
}

function loadHeldOutSamples(
  opts: CliOptions,
  pack: SignPackBundle
): LandmarkSample[] {
  const derivedDatasets = new Set(
    Object.values(pack.thresholds.signs).map((s) => s.derivedFromDataset)
  );

  if (
    derivedDatasets.has(opts.datasetSlug) &&
    !opts.allowTrainDatasetWithSubjectSplit
  ) {
    throw new Error(
      `Data Leakage Guard (Rule 9): Dataset "${opts.datasetSlug}" was used to derive thresholds.json. ` +
        `Pass a separate held-out dataset via --dataset <slug>, or filter to unseen subjects via --held-out-subjects <ids>.`
    );
  }

  const filePath = path.resolve(
    'data',
    'processed',
    `${opts.datasetSlug}.json`
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Processed dataset not found: ${filePath}`);
  }

  const raw = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  ) as ProcessedDatasetFile;

  if (!opts.heldOutSubjects) {
    return raw.samples;
  }

  if (!raw.hasSubjectIds) {
    throw new Error(
      `Dataset "${opts.datasetSlug}" has no subject IDs; cannot filter by --held-out-subjects.`
    );
  }

  const filtered = raw.samples.filter(
    (s) => s.subjectId !== null && opts.heldOutSubjects!.has(s.subjectId)
  );
  if (filtered.length === 0) {
    throw new Error(
      `No samples matched --held-out-subjects in "${opts.datasetSlug}".`
    );
  }
  return filtered;
}

/**
 * Evaluates real public held-out images only.
 */
function evaluateHeldOutPublicData(
  datasetSlug: string,
  samples: LandmarkSample[],
  pack: SignPackBundle
): PerLetterEvalRow[] {
  const configuredSigns = new Set(Object.keys(pack.thresholds.signs));
  const byLabel = new Map<string, LandmarkSample[]>();

  for (const s of samples) {
    if (!configuredSigns.has(s.label)) continue;
    const list = byLabel.get(s.label) ?? [];
    list.push(s);
    byLabel.set(s.label, list);
  }

  const labels = Array.from(byLabel.keys()).sort();
  const rows: PerLetterEvalRow[] = [];

  for (const label of labels) {
    const group = byLabel.get(label)!;
    let unableCount = 0;
    let correctCount = 0;
    let falseCorrectionCount = 0;

    for (const sample of group) {
      const handedness: AnatomicalHandedness =
        sample.handedness === 'Left' ? 'Left' : 'Right';

      const res = evaluate(sample.landmarks, label, pack, {
        handedness,
        mediaPipeScore: sample.confidence,
      });

      if (res.status === 'unable_to_evaluate') {
        unableCount++;
      } else if (res.status === 'correct') {
        correctCount++;
      } else if (res.status === 'needs_correction') {
        falseCorrectionCount++;
      }
    }

    const total = group.length;
    const evaluable = total - unableCount;

    rows.push({
      dataset: datasetSlug,
      label,
      totalSamples: total,
      evaluableSamples: evaluable,
      unableToEvaluateCount: unableCount,
      unableToEvaluateRatePct: total > 0 ? (unableCount / total) * 100 : 0,
      correctCount,
      recognitionAccuracyOverallPct:
        total > 0 ? (correctCount / total) * 100 : 0,
      recognitionAccuracyEvaluablePct:
        evaluable > 0 ? (correctCount / evaluable) * 100 : 0,
      falseCorrectionCount,
      falseCorrectionRatePct:
        total > 0 ? (falseCorrectionCount / total) * 100 : 0,
    });
  }

  return rows;
}

/**
 * Rule 10: Synthetic perturbation sensitivity benchmark.
 * Strictly isolated from real-image metrics and labeled "synthetic".
 */
function evaluateSyntheticSensitivity(
  samples: LandmarkSample[],
  pack: SignPackBundle
): SyntheticSensitivityRow[] {
  const configuredSigns = new Set(Object.keys(pack.thresholds.signs));

  // Take up to 15 baseline samples that currently pass evaluation cleanly
  const cleanBaselines = samples
    .filter((s) => {
      if (!configuredSigns.has(s.label)) return false;
      const handedness: AnatomicalHandedness =
        s.handedness === 'Left' ? 'Left' : 'Right';
      const res = evaluate(s.landmarks, s.label, pack, {
        handedness,
        mediaPipeScore: s.confidence,
      });
      return res.status === 'correct';
    })
    .slice(0, 40);

  const fingers: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  const summaryMap = new Map<string, SyntheticSensitivityRow>();

  const recordTrial = (
    baseLabel: string,
    perturbationType: string,
    targetFinger: string,
    flagged: boolean,
    exactFingerOnly: boolean
  ) => {
    const key = `${baseLabel}::${perturbationType}::${targetFinger}`;
    const existing = summaryMap.get(key) ?? {
      baseLabel,
      perturbationType,
      targetFinger,
      trials: 0,
      flaggedAsNeedsCorrection: 0,
      isolatedExactFingerCount: 0,
      detectionRatePct: 0,
      exactFingerIsolationRatePct: 0,
    };
    existing.trials += 1;
    if (flagged) existing.flaggedAsNeedsCorrection += 1;
    if (exactFingerOnly) existing.isolatedExactFingerCount += 1;
    existing.detectionRatePct =
      (existing.flaggedAsNeedsCorrection / existing.trials) * 100;
    existing.exactFingerIsolationRatePct =
      (existing.isolatedExactFingerCount / existing.trials) * 100;
    summaryMap.set(key, existing);
  };

  for (const base of cleanBaselines) {
    const handedness: AnatomicalHandedness =
      base.handedness === 'Left' ? 'Left' : 'Right';

    // 1. Single-finger curl perturbations (+/- 85 deg)
    for (const finger of fingers) {
      for (const delta of [85, -85]) {
        const mutated = perturbFingerCurl(
          base.landmarks,
          finger,
          delta,
          handedness
        );
        const res = evaluate(mutated.landmarks, base.label, pack, {
          handedness,
          mediaPipeScore: base.confidence,
        });

        const flagged = res.status === 'needs_correction';
        const failingFingers = fingers.filter((f) => !res.fingers[f].passed);
        const exactFingerOnly =
          flagged &&
          failingFingers.length === 1 &&
          failingFingers[0] === finger;

        recordTrial(
          base.label,
          delta > 0 ? 'synthetic_curl_increase' : 'synthetic_curl_decrease',
          finger,
          flagged,
          exactFingerOnly
        );
      }
    }

    // 2. Index-middle fingertip spacing perturbation (+/- 22 deg)
    for (const deltaSpread of [22, -22]) {
      const mutated = perturbFingertipSpacing(
        base.landmarks,
        'index',
        'middle',
        deltaSpread,
        handedness
      );
      const res = evaluate(mutated.landmarks, base.label, pack, {
        handedness,
        mediaPipeScore: base.confidence,
      });

      const flagged = res.status === 'needs_correction';
      const exactPair =
        flagged &&
        (res.topIssue?.finger === 'index' ||
          res.topIssue?.finger === 'middle');

      recordTrial(
        base.label,
        deltaSpread > 0
          ? 'synthetic_spread_wider'
          : 'synthetic_spread_closer',
        'index-middle',
        flagged,
        exactPair
      );
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) =>
    a.baseLabel.localeCompare(b.baseLabel)
  );
}

function writePublicCsv(csvPath: string, rows: PerLetterEvalRow[]): void {
  const header = [
    'dataset',
    'label',
    'total_samples',
    'evaluable_samples',
    'unable_to_evaluate_count',
    'unable_to_evaluate_rate_pct',
    'correct_count',
    'recognition_accuracy_overall_pct',
    'recognition_accuracy_evaluable_pct',
    'false_correction_count',
    'false_correction_rate_pct',
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.dataset,
      r.label,
      r.totalSamples,
      r.evaluableSamples,
      r.unableToEvaluateCount,
      r.unableToEvaluateRatePct.toFixed(2),
      r.correctCount,
      r.recognitionAccuracyOverallPct.toFixed(2),
      r.recognitionAccuracyEvaluablePct.toFixed(2),
      r.falseCorrectionCount,
      r.falseCorrectionRatePct.toFixed(2),
    ].join(',')
  );

  fs.writeFileSync(csvPath, [header, ...lines].join('\n') + '\n', 'utf-8');
}

function writeSyntheticCsv(
  csvPath: string,
  rows: SyntheticSensitivityRow[]
): void {
  const header = [
    'source_type',
    'base_label',
    'perturbation_type',
    'target_finger',
    'trials',
    'flagged_needs_correction',
    'isolated_exact_finger_count',
    'synthetic_detection_rate_pct',
    'synthetic_exact_finger_isolation_pct',
  ].join(',');

  const lines = rows.map((r) =>
    [
      'synthetic',
      r.baseLabel,
      r.perturbationType,
      r.targetFinger,
      r.trials,
      r.flaggedAsNeedsCorrection,
      r.isolatedExactFingerCount,
      r.detectionRatePct.toFixed(2),
      r.exactFingerIsolationRatePct.toFixed(2),
    ].join(',')
  );

  fs.writeFileSync(csvPath, [header, ...lines].join('\n') + '\n', 'utf-8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pack = loadPackBundle();
  const heldOutSamples = loadHeldOutSamples(opts, pack);

  console.log(
    `[evaluate] Running held-out public evaluation on "${opts.datasetSlug}" (${heldOutSamples.length} samples)...`
  );

  const publicRows = evaluateHeldOutPublicData(
    opts.datasetSlug,
    heldOutSamples,
    pack
  );
  const syntheticRows = evaluateSyntheticSensitivity(heldOutSamples, pack);

  fs.mkdirSync(opts.reportDir, { recursive: true });
  const publicCsvPath = path.join(
    opts.reportDir,
    `eval-heldout-${opts.datasetSlug}.csv`
  );
  const syntheticCsvPath = path.join(
    opts.reportDir,
    `eval-synthetic-${opts.datasetSlug}.csv`
  );
  const summaryMdPath = path.join(
    opts.reportDir,
    `evaluation-summary-${opts.datasetSlug}.md`
  );

  writePublicCsv(publicCsvPath, publicRows);
  writeSyntheticCsv(syntheticCsvPath, syntheticRows);

  // Aggregate macro/micro totals for held-out public images
  const totSamples = publicRows.reduce((a, b) => a + b.totalSamples, 0);
  const totEvaluable = publicRows.reduce((a, b) => a + b.evaluableSamples, 0);
  const totUnable = publicRows.reduce((a, b) => a + b.unableToEvaluateCount, 0);
  const totCorrect = publicRows.reduce((a, b) => a + b.correctCount, 0);
  const totFalseCorr = publicRows.reduce(
    (a, b) => a + b.falseCorrectionCount,
    0
  );

  const overallAccPct =
    totSamples > 0 ? (totCorrect / totSamples) * 100 : 0;
  const evaluableAccPct =
    totEvaluable > 0 ? (totCorrect / totEvaluable) * 100 : 0;
  const unableRatePct =
    totSamples > 0 ? (totUnable / totSamples) * 100 : 0;
  const falseCorrRatePct =
    totSamples > 0 ? (totFalseCorr / totSamples) * 100 : 0;

  // Aggregate isolated synthetic sensitivity totals
  const synTrials = syntheticRows.reduce((a, b) => a + b.trials, 0);
  const synFlagged = syntheticRows.reduce(
    (a, b) => a + b.flaggedAsNeedsCorrection,
    0
  );
  const synIsolated = syntheticRows.reduce(
    (a, b) => a + b.isolatedExactFingerCount,
    0
  );
  const synDetPct = synTrials > 0 ? (synFlagged / synTrials) * 100 : 0;
  const synIsoPct = synTrials > 0 ? (synIsolated / synTrials) * 100 : 0;

  const mdLines: string[] = [
    `# Step 13: Development Evaluation Summary (\`${opts.datasetSlug}\`)`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Threshold Pack Status: \`${pack.thresholds.status}\``,
    '',
    '## 1. Held-Out Public Image Dataset Results (Real Images)',
    '',
    `- **Total Held-Out Samples Evaluated:** ${totSamples}`,
    `- **Evaluable Samples:** ${totEvaluable} (${(100 - unableRatePct).toFixed(2)}%)`,
    `- **\`unable_to_evaluate\` Abstention Rate:** **${unableRatePct.toFixed(2)}%** (${totUnable}/${totSamples})`,
    `- **Recognition Accuracy (Among Evaluable):** **${evaluableAccPct.toFixed(2)}%** (${totCorrect}/${totEvaluable})`,
    `- **Recognition Accuracy (Overall Including Abstentions):** **${overallAccPct.toFixed(2)}%** (${totCorrect}/${totSamples})`,
    `- **False-Correction Rate on Correct-Labeled Samples:** **${falseCorrRatePct.toFixed(2)}%** (${totFalseCorr}/${totSamples})`,
    '',
    '| Letter | Total | Evaluable | `unable_to_evaluate` Rate | Accuracy (Evaluable) | Accuracy (Overall) | False-Correction Rate |',
    '| :--- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...publicRows.map(
      (r) =>
        `| **${r.label}** | ${r.totalSamples} | ${r.evaluableSamples} | ${r.unableToEvaluateRatePct.toFixed(1)}% | ${r.recognitionAccuracyEvaluablePct.toFixed(1)}% | ${r.recognitionAccuracyOverallPct.toFixed(1)}% | ${r.falseCorrectionRatePct.toFixed(1)}% |`
    ),
    '',
    '---',
    '',
    '## 2. Synthetic Error-Injection Sensitivity (SYNTHETIC ONLY — Rule 10)',
    '',
    '> **Important Disclaimer (Rule 10):** The numbers below were produced by applying programmatic geometric perturbations to landmark coordinates. They are **synthetic unit/sensitivity diagnostics only** and must **never** be cited or combined as evidence of real-world learner accuracy.',
    '',
    `- **Synthetic Perturbation Trials:** ${synTrials}`,
    `- **Synthetic Error Detection Rate (\`needs_correction\`):** **${synDetPct.toFixed(2)}%** (${synFlagged}/${synTrials})`,
    `- **Synthetic Exact-Finger Isolation Rate:** **${synIsoPct.toFixed(2)}%** (${synIsolated}/${synTrials})`,
    '',
  ];

  fs.writeFileSync(summaryMdPath, mdLines.join('\n'), 'utf-8');

  console.log('\n=== Held-Out Public Dataset Results (Real Images) ===');
  console.log(`  Dataset:                ${opts.datasetSlug}`);
  console.log(`  Accuracy (Evaluable):   ${evaluableAccPct.toFixed(2)}%`);
  console.log(`  unable_to_evaluate:     ${unableRatePct.toFixed(2)}%`);
  console.log(`  False-Correction Rate:  ${falseCorrRatePct.toFixed(2)}%`);

  console.log('\n=== Synthetic Error Detection (SYNTHETIC ONLY — Do Not Mix) ===');
  console.log(`  Synthetic Detection:    ${synDetPct.toFixed(2)}% (${synFlagged}/${synTrials})`);
  console.log(`  Exact Finger Isolated:  ${synIsoPct.toFixed(2)}% (${synIsolated}/${synTrials})`);

  console.log(`\nReports written:\n  - ${summaryMdPath}\n  - ${publicCsvPath}\n  - ${syntheticCsvPath}`);
}

main().catch((err) => {
  console.error('[evaluate] Fatal error:', err);
  process.exit(1);
});
