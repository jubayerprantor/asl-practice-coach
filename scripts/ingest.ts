import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Node.js environment shims for @mediapipe/tasks-vision WASM runtime
// ---------------------------------------------------------------------------
const g = globalThis as any;
g.self = globalThis;
g.window = globalThis;
g.WebGLRenderingContext = class {};
g.WebGL2RenderingContext = class {};

class NodeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
    this.colorSpace = 'srgb';
  }
}
g.ImageData = NodeImageData;

const createMockGL = () => {
  const noop = () => {};
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === 'string') {
        if (
          prop === 'createTexture' ||
          prop === 'createBuffer' ||
          prop === 'createFramebuffer' ||
          prop === 'createProgram' ||
          prop === 'createShader' ||
          prop === 'createVertexArray'
        ) {
          return () => ({});
        }
        if (prop === 'getExtension') {
          return () => ({});
        }
        if (prop === 'getParameter') {
          return () => 16;
        }
        if (prop === 'getShaderParameter' || prop === 'getProgramParameter') {
          return () => true;
        }
        if (prop === 'canvas') {
          return { width: 640, height: 480 };
        }
        if (
          prop.startsWith('COLOR_') ||
          prop.startsWith('GL_') ||
          prop.includes('BUFFER') ||
          prop.includes('TEXTURE') ||
          prop.includes('SHADER')
        ) {
          return 1;
        }
      }
      return noop;
    },
  });
};

const mockGL = createMockGL();

const origFetch = g.fetch;
g.fetch = async (url: any, options: any) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (
    urlStr.startsWith('file:///') ||
    urlStr.startsWith('file://') ||
    /^[a-zA-Z]:[\\\/]/.test(urlStr)
  ) {
    let filePath = urlStr;
    if (filePath.startsWith('file:///')) filePath = filePath.slice(8);
    else if (filePath.startsWith('file://')) filePath = filePath.slice(7);
    const buf = fs.readFileSync(filePath);
    return new Response(buf, { status: 200, statusText: 'OK' });
  }
  return origFetch(url, options);
};

g.document = {
  createElement: (tag: string) => {
    if (tag === 'script') {
      const script: any = {
        _src: '',
        set src(val: string) {
          this._src = val;
        },
        get src() {
          return this._src;
        },
        addEventListener: (evt: string, cb: () => void) => {
          if (evt === 'load') script._onload = cb;
          if (evt === 'error') script._onerror = cb;
        },
      };
      return script;
    }
    if (tag === 'canvas') {
      return {
        getContext: () => mockGL,
        width: 640,
        height: 480,
      };
    }
    return {};
  },
  body: {
    appendChild: (elem: any) => {
      let filePath = elem.src;
      if (filePath.startsWith('file:///')) filePath = filePath.slice(8);
      else if (filePath.startsWith('file://')) filePath = filePath.slice(7);
      try {
        const s = fs.readFileSync(filePath, 'utf8');
        const fn = new Function('exports', 'module', s);
        const m = { exports: {} as any };
        fn(m.exports, m);
        g.ModuleFactory = m.exports;
        g.self.ModuleFactory = m.exports;
        if (elem._onload) setTimeout(elem._onload, 0);
      } catch (e) {
        if (elem._onerror) setTimeout(() => elem._onerror(e), 0);
      }
    },
  },
};

// ---------------------------------------------------------------------------
// Imports dependent on browser shims
// ---------------------------------------------------------------------------
import {
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import type {
  HandednessLabel,
  LandmarkSample,
  LetterDropoutRow,
  Point3D,
  ProcessedDatasetFile,
} from '../src/data/schema';

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VALID_LETTERS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

/**
 * Normalized mean per-landmark Euclidean distance threshold (in palm-scale units).
 * Samples closer than this to an already-accepted sample of the same label (+ subject)
 * are treated as near-duplicates and skipped.
 */
const NEAR_DUPLICATE_THRESHOLD = 0.015;

interface CliOptions {
  dataset: string;
  inputDir: string;
  outputDir: string;
  reportDir: string;
  subjectRegex: RegExp | null;
  maxPerClass: number | null;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length) {
      args.set(arg.slice(2), argv[i + 1]);
      i++;
    }
  }

  const dataset = args.get('dataset');
  if (!dataset) {
    console.error(
      'Usage: npm run ingest -- --dataset <slug> [--input <dir>] [--subject-regex <regex>] [--max-per-class <n>]'
    );
    process.exit(1);
  }

  const inputDir =
    args.get('input') ?? path.resolve('data-raw', dataset);
  const outputDir = path.resolve('data', 'processed');
  const reportDir = path.resolve('docs', 'reports');
  const regexStr = args.get('subject-regex');
  const maxStr = args.get('max-per-class');

  return {
    dataset,
    inputDir,
    outputDir,
    reportDir,
    subjectRegex: regexStr ? new RegExp(regexStr, 'i') : null,
    maxPerClass: maxStr ? Number.parseInt(maxStr, 10) : null,
  };
}

interface DiscoveredImage {
  filePath: string;
  label: string;
  subjectId: string | null;
}

/**
 * Supports two common folder layouts:
 *   1) <inputDir>/<LABEL>/<image>
 *   2) <inputDir>/<SUBJECT_ID>/<LABEL>/<image>
 * Also extracts subjectId via --subject-regex if matched against relative path.
 */
function discoverImages(
  rootDir: string,
  subjectRegex: RegExp | null
): DiscoveredImage[] {
  if (!fs.existsSync(rootDir)) {
    throw new Error(`Input directory does not exist: ${rootDir}`);
  }

  const discovered: DiscoveredImage[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      const relPath = path.relative(rootDir, fullPath);
      const parts = relPath.split(path.sep);
      if (parts.length < 2) continue;

      const parentFolder = parts[parts.length - 2].toUpperCase();
      if (!VALID_LETTERS.has(parentFolder)) {
        // Skip non-letter classes (e.g. 'nothing', 'space', 'del')
        continue;
      }

      let subjectId: string | null = null;
      if (subjectRegex) {
        const match = relPath.match(subjectRegex);
        if (match && match[1]) {
          subjectId = match[1];
        }
      } else if (parts.length >= 3) {
        // Assume <subject>/<LETTER>/<file> layout
        subjectId = parts[parts.length - 3];
      }

      discovered.push({
        filePath: fullPath,
        label: parentFolder,
        subjectId,
      });
    }
  }

  walk(rootDir);
  return discovered;
}

/**
 * Normalize landmarks by wrist origin (0) and palm length (0 -> 9)
 * strictly for fast near-duplicate detection during ingestion.
 */
function normalizeForDedup(landmarks: Point3D[]): Point3D[] {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmScale =
    Math.hypot(
      middleMcp.x - wrist.x,
      middleMcp.y - wrist.y,
      middleMcp.z - wrist.z
    ) || 1e-6;

  return landmarks.map((pt) => ({
    x: (pt.x - wrist.x) / palmScale,
    y: (pt.y - wrist.y) / palmScale,
    z: (pt.z - wrist.z) / palmScale,
  }));
}

function meanLandmarkDistance(a: Point3D[], b: Point3D[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y, a[i].z - b[i].z);
  }
  return sum / a.length;
}

function isNearDuplicate(
  candidateNorm: Point3D[],
  existingNorms: Point3D[][]
): boolean {
  // Compare against recent accepted samples first (most duplicates are sequential)
  for (let i = existingNorms.length - 1; i >= 0; i--) {
    if (
      meanLandmarkDistance(candidateNorm, existingNorms[i]) <
      NEAR_DUPLICATE_THRESHOLD
    ) {
      return true;
    }
  }
  return false;
}

async function createImageHandLandmarker(): Promise<HandLandmarker> {
  const wasmDir = path.resolve('public', 'mediapipe', 'wasm');
  const modelPath = path.resolve(
    'public',
    'mediapipe',
    'hand_landmarker.task'
  );

  if (!fs.existsSync(modelPath)) {
    throw new Error(
      `Missing MediaPipe model at ${modelPath}. Complete Step 2 asset setup first.`
    );
  }

  const vision = await FilesetResolver.forVisionTasks(wasmDir);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    numHands: 1,
  });
}

async function loadImageAsImageData(filePath: string): Promise<ImageData> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return new NodeImageData(
    new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    info.width,
    info.height
  ) as unknown as ImageData;
}

function writeDropoutCsv(csvPath: string, rows: LetterDropoutRow[]) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const header = [
    'dataset',
    'label',
    'total_images',
    'detected_images',
    'no_hand_count',
    'no_hand_rate_pct',
    'duplicate_count',
    'accepted_count',
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.dataset,
      r.label,
      r.totalImages,
      r.detectedImages,
      r.noHandCount,
      r.noHandRatePct.toFixed(2),
      r.duplicateCount,
      r.acceptedCount,
    ].join(',')
  );

  fs.writeFileSync(csvPath, [header, ...lines].join('\n') + '\n', 'utf-8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(`[ingest] Scanning dataset "${opts.dataset}" in ${opts.inputDir}`);

  const allImages = discoverImages(opts.inputDir, opts.subjectRegex);
  if (allImages.length === 0) {
    console.error(`[ingest] No valid letter images found in ${opts.inputDir}`);
    process.exit(1);
  }

  const hasSubjectIds = allImages.some((img) => img.subjectId !== null);
  if (!hasSubjectIds) {
    console.warn(
      `[WARN] Dataset "${opts.dataset}" has NO subject IDs! ` +
        `Leave-one-subject-out evaluation will be skipped for this dataset; ` +
        `use cross-dataset evaluation only (Rule 9).`
    );
  }

  const landmarker = await createImageHandLandmarker();

  const samples: LandmarkSample[] = [];
  const acceptedNormByGroup = new Map<string, Point3D[][]>();
  const statsByLabel = new Map<
    string,
    { total: number; noHand: number; duplicate: number; accepted: number }
  >();

  for (const letter of VALID_LETTERS) {
    statsByLabel.set(letter, {
      total: 0,
      noHand: 0,
      duplicate: 0,
      accepted: 0,
    });
  }

  let totalScanned = 0;

  for (const item of allImages) {
    const labelStats = statsByLabel.get(item.label)!;
    if (
      opts.maxPerClass !== null &&
      labelStats.accepted >= opts.maxPerClass
    ) {
      continue;
    }

    totalScanned++;
    labelStats.total++;

    let imageData: ImageData;
    try {
      imageData = await loadImageAsImageData(item.filePath);
    } catch (err) {
      console.warn(`[ingest] Failed to decode ${item.filePath}:`, err);
      labelStats.noHand++;
      continue;
    }

    const result = landmarker.detect(imageData);
    const landmarks = result.landmarks?.[0];

    if (!landmarks || landmarks.length !== 21) {
      labelStats.noHand++;
      continue;
    }

    const cleanLandmarks: Point3D[] = landmarks.map((pt) => ({
      x: Number(pt.x.toFixed(6)),
      y: Number(pt.y.toFixed(6)),
      z: Number(pt.z.toFixed(6)),
    }));

    const groupKey = `${item.label}::${item.subjectId ?? 'unknown'}`;
    const normPts = normalizeForDedup(cleanLandmarks);
    const groupHistory = acceptedNormByGroup.get(groupKey) ?? [];

    if (isNearDuplicate(normPts, groupHistory)) {
      labelStats.duplicate++;
      continue;
    }

    groupHistory.push(normPts);
    acceptedNormByGroup.set(groupKey, groupHistory);

    const category = result.handednesses?.[0]?.[0];
    const handedness: HandednessLabel =
      category?.categoryName === 'Left' || category?.categoryName === 'Right'
        ? category.categoryName
        : 'Unknown';

    labelStats.accepted++;
    samples.push({
      id: `${opts.dataset}:${item.label}:${String(labelStats.accepted).padStart(5, '0')}`,
      label: item.label,
      sourceDataset: opts.dataset,
      subjectId: item.subjectId,
      handedness,
      confidence: Number((category?.score ?? 0).toFixed(4)),
      landmarks: cleanLandmarks,
    });

    if (totalScanned % 500 === 0) {
      console.log(
        `[ingest] Processed ${totalScanned} images -> ${samples.length} accepted...`
      );
    }
  }

  landmarker.close();

  const dropoutRows: LetterDropoutRow[] = [];
  let totalNoHand = 0;
  let totalDuplicate = 0;

  for (const [label, st] of statsByLabel.entries()) {
    if (st.total === 0) continue;
    totalNoHand += st.noHand;
    totalDuplicate += st.duplicate;
    dropoutRows.push({
      dataset: opts.dataset,
      label,
      totalImages: st.total,
      detectedImages: st.total - st.noHand,
      noHandCount: st.noHand,
      noHandRatePct: (st.noHand / st.total) * 100,
      duplicateCount: st.duplicate,
      acceptedCount: st.accepted,
    });
  }

  const outputPayload: ProcessedDatasetFile = {
    schemaVersion: '1.0.0',
    dataset: opts.dataset,
    generatedAt: new Date().toISOString(),
    hasSubjectIds,
    totalImagesScanned: totalScanned,
    totalAccepted: samples.length,
    totalDroppedNoHand: totalNoHand,
    totalDroppedDuplicate: totalDuplicate,
    samples,
  };

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const outJsonPath = path.join(opts.outputDir, `${opts.dataset}.json`);
  fs.writeFileSync(outJsonPath, JSON.stringify(outputPayload, null, 2), 'utf-8');

  const outCsvPath = path.join(
    opts.reportDir,
    `${opts.dataset}-dropout.csv`
  );
  writeDropoutCsv(outCsvPath, dropoutRows);

  console.log(`\n[ingest] Complete for "${opts.dataset}":`);
  console.log(`  Scanned:    ${totalScanned}`);
  console.log(`  Accepted:   ${samples.length}`);
  console.log(`  No Hand:    ${totalNoHand}`);
  console.log(`  Duplicates: ${totalDuplicate}`);
  console.log(`  JSON saved: ${outJsonPath}`);
  console.log(`  CSV saved:  ${outCsvPath}`);
}

main().catch((err) => {
  console.error('[ingest] Fatal error:', err);
  process.exit(1);
});
