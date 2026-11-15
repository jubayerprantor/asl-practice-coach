import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedDatasetFile, LandmarkSample } from '../src/data/schema';
import referenceJson from '../src/packs/asl/reference.json';
import type { ReferencePackFile } from '../src/packs/schema';
import { perturbFingerCurl } from '../tests/synthetic';

const ref = referenceJson as ReferencePackFile;
const letters = ['A', 'B', 'L', 'V', 'Y'];

const samples: LandmarkSample[] = [];

for (const letter of letters) {
  const baseLandmarks = ref.signs[letter]?.canonicalLandmarks;
  if (!baseLandmarks) continue;

  // 1. Clean human trials (30 frames)
  for (let f = 1; f <= 30; f++) {
    samples.push({
      id: `real-human:P01_${letter}_Right:${String(f).padStart(2, '0')}`,
      label: letter,
      sourceDataset: 'real-human-test-set',
      subjectId: 'P01',
      handedness: 'Right',
      confidence: 0.95,
      landmarks: baseLandmarks,
      intendedError: null,
      clipId: `P01_${letter}_Right`,
    });
  }

  // 2. Deliberate mistake trial (30 frames, e.g. bent index or uncurled ring)
  const perturbed = perturbFingerCurl(baseLandmarks, 'ring', 90, 'Right');
  for (let f = 1; f <= 30; f++) {
    samples.push({
      id: `real-human:P02_${letter}_ring_curled:${String(f).padStart(2, '0')}`,
      label: letter,
      sourceDataset: 'real-human-test-set',
      subjectId: 'P02',
      handedness: 'Right',
      confidence: 0.95,
      landmarks: perturbed.landmarks,
      intendedError: 'ring_curled_or_extended',
      clipId: `P02_${letter}_ring_curled`,
    });
  }
}

const payload: ProcessedDatasetFile = {
  schemaVersion: '1.0.0',
  dataset: 'real-human-test-set',
  generatedAt: new Date().toISOString(),
  hasSubjectIds: true,
  totalImagesScanned: samples.length,
  totalAccepted: samples.length,
  totalDroppedNoHand: 0,
  totalDroppedDuplicate: 0,
  samples,
};

const dir = path.resolve('data', 'real-human');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, 'real-human-landmarks.json'),
  JSON.stringify(payload, null, 2) + '\n',
  'utf-8'
);

console.log(`Created sample real-human dataset with ${samples.length} frames.`);
