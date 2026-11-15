import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedDatasetFile } from '../src/data/schema';
import {
  extractHandFeatures,
  FEATURE_NAMES,
  featureMapToVector,
  type AnatomicalHandedness,
} from '../src/engine';

interface FeaturizedSample {
  id: string;
  label: string;
  sourceDataset: string;
  subjectId: string | null;
  vector: number[];
}

interface ConfusionPair {
  actual: string;
  predicted: string;
  count: number;
  errorRatePct: number;
}

interface EvaluationResult {
  name: string;
  totalSamples: number;
  correctCount: number;
  accuracyPct: number;
  labels: string[];
  matrix: number[][]; // [actualIdx][predictedIdx]
  topConfusions: ConfusionPair[];
}

function parseDatasetsArg(argv: string[]): string[] {
  const datasets: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--datasets' && i + 1 < argv.length) {
      datasets.push(
        ...argv[i + 1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      i++;
    }
  }

  if (datasets.length > 0) return datasets;

  // Auto-discover all JSON files in /data/processed if --datasets is omitted
  const processedDir = path.resolve('data', 'processed');
  if (!fs.existsSync(processedDir)) {
    throw new Error(`Directory not found: ${processedDir}. Run Step 3 ingestion first.`);
  }
  return fs
    .readdirSync(processedDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json'))
    .sort();
}

function loadAndFeaturize(datasetSlug: string): {
  meta: ProcessedDatasetFile;
  rows: FeaturizedSample[];
} {
  const filePath = path.resolve('data', 'processed', `${datasetSlug}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Processed dataset not found: ${filePath}`);
  }

  const raw = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  ) as ProcessedDatasetFile;

  const rows: FeaturizedSample[] = raw.samples.map((sample) => {
    const handedness: AnatomicalHandedness =
      sample.handedness === 'Left' ? 'Left' : 'Right';
    const featureMap = extractHandFeatures(sample.landmarks, handedness);
    return {
      id: sample.id,
      label: sample.label,
      sourceDataset: sample.sourceDataset,
      subjectId: sample.subjectId,
      vector: featureMapToVector(featureMap),
    };
  });

  return { meta: raw, rows };
}

/**
 * Computes and writes per-letter mean and std of every geometric feature.
 */
function writeFeatureStatsCsv(
  datasetSlug: string,
  rows: FeaturizedSample[],
  reportDir: string
): void {
  const byLabel = new Map<string, number[][]>();
  for (const r of rows) {
    const list = byLabel.get(r.label) ?? [];
    list.push(r.vector);
    byLabel.set(r.label, list);
  }

  const labels = Array.from(byLabel.keys()).sort();
  const header = [
    'dataset',
    'label',
    'sample_count',
    ...FEATURE_NAMES.flatMap((f) => [`${f}_mean`, `${f}_std`]),
  ].join(',');

  const csvLines: string[] = [header];

  for (const label of labels) {
    const vectors = byLabel.get(label)!;
    const n = vectors.length;
    const statsCols: string[] = [];

    for (let fIdx = 0; fIdx < FEATURE_NAMES.length; fIdx++) {
      let sum = 0;
      for (const v of vectors) sum += v[fIdx];
      const mean = sum / n;

      let sqDiffSum = 0;
      for (const v of vectors) {
        const diff = v[fIdx] - mean;
        sqDiffSum += diff * diff;
      }
      const std = Math.sqrt(sqDiffSum / n);
      statsCols.push(mean.toFixed(4), std.toFixed(4));
    }

    csvLines.push([datasetSlug, label, String(n), ...statsCols].join(','));
  }

  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `${datasetSlug}-feature-stats.csv`);
  fs.writeFileSync(outPath, csvLines.join('\n') + '\n', 'utf-8');
  console.log(`[analyze] Wrote feature stats: ${outPath}`);
}

/**
 * Fit z-score scaler strictly on training split, then classify test samples via kNN (k=5).
 * No hyperparameter tuning is performed here.
 */
function evaluateKnn(
  evalName: string,
  trainSet: FeaturizedSample[],
  testSet: FeaturizedSample[],
  k = 5
): EvaluationResult {
  const dim = FEATURE_NAMES.length;
  const nTrain = trainSet.length;

  const means = new Array<number>(dim).fill(0);
  const stds = new Array<number>(dim).fill(1);

  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (const s of trainSet) sum += s.vector[d];
    means[d] = sum / nTrain;

    let sq = 0;
    for (const s of trainSet) {
      const diff = s.vector[d] - means[d];
      sq += diff * diff;
    }
    const std = Math.sqrt(sq / nTrain);
    stds[d] = std > 1e-8 ? std : 1;
  }

  const standardize = (vec: number[]): number[] =>
    vec.map((val, d) => (val - means[d]) / stds[d]);

  const trainScaled = trainSet.map((s) => ({
    label: s.label,
    vec: standardize(s.vector),
  }));

  const labelSet = new Set<string>([
    ...trainSet.map((s) => s.label),
    ...testSet.map((s) => s.label),
  ]);
  const labels = Array.from(labelSet).sort();
  const labelToIdx = new Map<string, number>(
    labels.map((l, idx) => [l, idx])
  );

  const matrix: number[][] = Array.from({ length: labels.length }, () =>
    new Array<number>(labels.length).fill(0)
  );

  let correctCount = 0;

  for (const testSample of testSet) {
    const q = standardize(testSample.vector);

    // Compute Euclidean distance to all training samples
    const distances: Array<{ distSq: number; label: string }> = new Array(
      trainScaled.length
    );
    for (let i = 0; i < trainScaled.length; i++) {
      const tr = trainScaled[i].vec;
      let distSq = 0;
      for (let d = 0; d < dim; d++) {
        const diff = q[d] - tr[d];
        distSq += diff * diff;
      }
      distances[i] = { distSq, label: trainScaled[i].label };
    }

    distances.sort((a, b) => a.distSq - b.distSq);
    const neighbors = distances.slice(0, Math.min(k, distances.length));

    // Majority vote (tie-broken by nearest neighbor order)
    const votes = new Map<string, number>();
    let bestLabel = neighbors[0].label;
    let bestVotes = 0;

    for (const nb of neighbors) {
      const nextCount = (votes.get(nb.label) ?? 0) + 1;
      votes.set(nb.label, nextCount);
      if (nextCount > bestVotes) {
        bestVotes = nextCount;
        bestLabel = nb.label;
      }
    }

    const actualIdx = labelToIdx.get(testSample.label)!;
    const predIdx = labelToIdx.get(bestLabel)!;
    matrix[actualIdx][predIdx] += 1;

    if (bestLabel === testSample.label) {
      correctCount++;
    }
  }

  // Extract top off-diagonal confused pairs
  const confusions: ConfusionPair[] = [];
  for (let r = 0; r < labels.length; r++) {
    const rowTotal = matrix[r].reduce((a, b) => a + b, 0);
    if (rowTotal === 0) continue;
    for (let c = 0; c < labels.length; c++) {
      if (r === c) continue;
      const count = matrix[r][c];
      if (count > 0) {
        confusions.push({
          actual: labels[r],
          predicted: labels[c],
          count,
          errorRatePct: (count / rowTotal) * 100,
        });
      }
    }
  }

  confusions.sort((a, b) => b.count - a.count);

  return {
    name: evalName,
    totalSamples: testSet.length,
    correctCount,
    accuracyPct:
      testSet.length > 0 ? (correctCount / testSet.length) * 100 : 0,
    labels,
    matrix,
    topConfusions: confusions.slice(0, 12),
  };
}

/**
 * Leave-One-Subject-Out evaluation within a single dataset (only when subject IDs exist).
 */
function evaluateLoso(
  datasetSlug: string,
  rows: FeaturizedSample[],
  k = 5
): EvaluationResult | null {
  const validRows = rows.filter((r) => r.subjectId !== null);
  const subjects = Array.from(
    new Set(validRows.map((r) => r.subjectId!))
  ).sort();

  if (subjects.length < 2) {
    console.warn(
      `[analyze] Skipping LOSO for "${datasetSlug}": found ${subjects.length} subject IDs (requires >= 2).`
    );
    return null;
  }

  const labels = Array.from(new Set(validRows.map((r) => r.label))).sort();
  const labelToIdx = new Map<string, number>(
    labels.map((l, idx) => [l, idx])
  );
  const aggregatedMatrix: number[][] = Array.from(
    { length: labels.length },
    () => new Array<number>(labels.length).fill(0)
  );

  let totalSamples = 0;
  let totalCorrect = 0;

  for (const heldOutSubject of subjects) {
    const trainSplit = validRows.filter((r) => r.subjectId !== heldOutSubject);
    const testSplit = validRows.filter((r) => r.subjectId === heldOutSubject);
    if (trainSplit.length === 0 || testSplit.length === 0) continue;

    const foldRes = evaluateKnn(
      `${datasetSlug}-fold-${heldOutSubject}`,
      trainSplit,
      testSplit,
      k
    );

    totalSamples += foldRes.totalSamples;
    totalCorrect += foldRes.correctCount;

    for (let r = 0; r < foldRes.labels.length; r++) {
      const globalR = labelToIdx.get(foldRes.labels[r])!;
      for (let c = 0; c < foldRes.labels.length; c++) {
        const globalC = labelToIdx.get(foldRes.labels[c])!;
        aggregatedMatrix[globalR][globalC] += foldRes.matrix[r][c];
      }
    }
  }

  const confusions: ConfusionPair[] = [];
  for (let r = 0; r < labels.length; r++) {
    const rowTotal = aggregatedMatrix[r].reduce((a, b) => a + b, 0);
    if (rowTotal === 0) continue;
    for (let c = 0; c < labels.length; c++) {
      if (r === c) continue;
      const count = aggregatedMatrix[r][c];
      if (count > 0) {
        confusions.push({
          actual: labels[r],
          predicted: labels[c],
          count,
          errorRatePct: (count / rowTotal) * 100,
        });
      }
    }
  }
  confusions.sort((a, b) => b.count - a.count);

  return {
    name: `loso-${datasetSlug}`,
    totalSamples,
    correctCount: totalCorrect,
    accuracyPct: totalSamples > 0 ? (totalCorrect / totalSamples) * 100 : 0,
    labels,
    matrix: aggregatedMatrix,
    topConfusions: confusions.slice(0, 12),
  };
}

function writeConfusionMatrixCsv(
  res: EvaluationResult,
  reportDir: string
): string {
  fs.mkdirSync(reportDir, { recursive: true });
  const csvPath = path.join(reportDir, `confusion-${res.name}.csv`);
  const header = ['actual\\predicted', ...res.labels].join(',');
  const lines = res.matrix.map((row, idx) =>
    [res.labels[idx], ...row.map(String)].join(',')
  );
  fs.writeFileSync(csvPath, [header, ...lines].join('\n') + '\n', 'utf-8');
  return csvPath;
}

function writeSummaryMarkdown(
  results: EvaluationResult[],
  skippedLosoDatasets: string[],
  reportDir: string
): string {
  const mdPath = path.join(reportDir, 'feasibility-report.md');
  const lines: string[] = [
    '# Step 5: Cross-Dataset & Subject-Split Feasibility Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Baseline classifier: Un-tuned kNN ($k = 5$) on 18 geometric features (5 finger curls, 10 normalized fingertip distances, 3 palm orientation components). No random splits were used.',
    '',
    '## Overall Accuracy Summary',
    '',
    '| Evaluation Split | Test Samples | Correct | Top-1 Accuracy |',
    '| :--- | ---: | ---: | ---: |',
  ];

  for (const res of results) {
    lines.push(
      `| \`${res.name}\` | ${res.totalSamples} | ${res.correctCount} | **${res.accuracyPct.toFixed(2)}%** |`
    );
  }

  if (skippedLosoDatasets.length > 0) {
    lines.push(
      '',
      `> **Note:** Leave-One-Subject-Out (LOSO) was skipped for dataset(s) lacking multiple subject IDs: ${skippedLosoDatasets.map((d) => `\`${d}\``).join(', ')}.`
    );
  }

  for (const res of results) {
    lines.push(
      '',
      `## Top Confused Letter Pairs: \`${res.name}\``,
      '',
      '| Actual Letter | Predicted As | Misclassified Count | Row Error Rate |',
      '| :--- | :--- | ---: | ---: |'
    );

    if (res.topConfusions.length === 0) {
      lines.push('| *(None)* | — | 0 | 0.00% |');
    } else {
      for (const pair of res.topConfusions) {
        lines.push(
          `| **${pair.actual}** | **${pair.predicted}** | ${pair.count} | ${pair.errorRatePct.toFixed(1)}% |`
        );
      }
    }
  }

  lines.push('');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
  return mdPath;
}

async function main() {
  const slugs = parseDatasetsArg(process.argv.slice(2));
  if (slugs.length < 2) {
    console.warn(
      `[analyze] Only ${slugs.length} dataset(s) found (${slugs.join(', ')}). Cross-dataset evaluation requires at least 2 datasets.`
    );
  }

  const reportDir = path.resolve('docs', 'reports');
  const loaded = slugs.map((slug) => ({
    slug,
    ...loadAndFeaturize(slug),
  }));

  // 1 & 2. Per-letter mean and std of every feature per dataset
  for (const ds of loaded) {
    writeFeatureStatsCsv(ds.slug, ds.rows, reportDir);
  }

  const evalResults: EvaluationResult[] = [];
  const skippedLoso: string[] = [];

  // 3a. Cross-dataset evaluations (A -> B and B -> A)
  for (let i = 0; i < loaded.length; i++) {
    for (let j = 0; j < loaded.length; j++) {
      if (i === j) continue;
      const trainDs = loaded[i];
      const testDs = loaded[j];
      const evalName = `train-${trainDs.slug}__test-${testDs.slug}`;
      console.log(`[analyze] Running cross-dataset kNN: ${evalName}...`);
      const res = evaluateKnn(evalName, trainDs.rows, testDs.rows, 5);
      writeConfusionMatrixCsv(res, reportDir);
      evalResults.push(res);
    }
  }

  // 3b. Leave-one-subject-out (only when subject IDs exist)
  for (const ds of loaded) {
    if (!ds.meta.hasSubjectIds) {
      skippedLoso.push(ds.slug);
      continue;
    }
    console.log(`[analyze] Running Leave-One-Subject-Out (LOSO) for ${ds.slug}...`);
    const losoRes = evaluateLoso(ds.slug, ds.rows, 5);
    if (losoRes) {
      writeConfusionMatrixCsv(losoRes, reportDir);
      evalResults.push(losoRes);
    } else {
      skippedLoso.push(ds.slug);
    }
  }

  const summaryPath = writeSummaryMarkdown(evalResults, skippedLoso, reportDir);

  console.log('\n=== Step 5 Feasibility Summary ===');
  for (const res of evalResults) {
    console.log(
      `  ${res.name}: ${res.accuracyPct.toFixed(2)}% (${res.correctCount}/${res.totalSamples})`
    );
    const preview = res.topConfusions
      .slice(0, 5)
      .map((p) => `${p.actual}->${p.predicted} (${p.count})`)
      .join(', ');
    console.log(`    Top confusions: ${preview || 'None'}`);
  }
  console.log(`\nFull report saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error('[analyze] Fatal error:', err);
  process.exit(1);
});
