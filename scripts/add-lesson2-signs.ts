import fs from 'fs';
import path from 'path';
import {
  FIXTURE_LETTER_C_RIGHT,
  FIXTURE_LETTER_O_RIGHT,
  FIXTURE_LETTER_D_RIGHT,
  FIXTURE_LETTER_F_RIGHT,
} from '../tests/fixtures/handFixtures';
import type { ReferencePackFile, ThresholdsPackFile, CurriculumPackFile } from '../src/packs/schema';

const refPath = path.resolve('src/packs/asl/reference.json');
const threshPath = path.resolve('src/packs/asl/thresholds.json');
const currPath = path.resolve('src/packs/asl/curriculum.json');

const ref = JSON.parse(fs.readFileSync(refPath, 'utf8')) as ReferencePackFile;
const thresh = JSON.parse(fs.readFileSync(threshPath, 'utf8')) as ThresholdsPackFile;
const curr = JSON.parse(fs.readFileSync(currPath, 'utf8')) as CurriculumPackFile;

// 1. Add Reference entries
ref.signs['C'] = {
  sign: 'C',
  authoredByHuman: true,
  summary: "Curve all four fingers and thumb into a gentle half-circle, resembling the letter 'C'.",
  fingerNotes: {
    thumb: 'Curved outward and forward opposing the fingers, forming the lower curve.',
    index: 'Curved smoothly forward along with middle, ring, and pinky.',
    middle: 'Curved smoothly forward aligned with index.',
    ring: 'Curved smoothly forward aligned with middle.',
    pinky: 'Curved smoothly forward aligned with ring.',
  },
  orientationNote: 'Palm faces toward the viewer with an upright wrist.',
  canonicalLandmarks: FIXTURE_LETTER_C_RIGHT,
};

ref.signs['O'] = {
  sign: 'O',
  authoredByHuman: true,
  summary: "Form an 'O' by bringing the tips of all four fingers down to meet the tip of your thumb.",
  fingerNotes: {
    thumb: 'Curved upward so its tip touches or meets the index and middle fingertips.',
    index: 'Curled forward and down to touch the thumb tip.',
    middle: 'Curled forward and down to meet the thumb tip.',
    ring: 'Curled forward in line with middle and index.',
    pinky: 'Curled forward in line with the other fingers.',
  },
  orientationNote: 'Palm faces outward slightly angled, maintaining a clear circular opening visible to the viewer.',
  canonicalLandmarks: FIXTURE_LETTER_O_RIGHT,
};

ref.signs['D'] = {
  sign: 'D',
  authoredByHuman: true,
  summary: 'Point your index finger straight up while your middle, ring, and pinky curl down so the middle finger touches your thumb.',
  fingerNotes: {
    thumb: 'Curved against the pad of your curled middle finger to complete the circle at the base.',
    index: 'Extended straight up toward the ceiling.',
    middle: 'Curled into a circle, touching the tip of your thumb.',
    ring: 'Curled down into the palm alongside the middle finger.',
    pinky: 'Curled down into the palm alongside the ring finger.',
  },
  orientationNote: 'Palm faces outward toward the viewer with an upright wrist.',
  canonicalLandmarks: FIXTURE_LETTER_D_RIGHT,
};

ref.signs['F'] = {
  sign: 'F',
  authoredByHuman: true,
  summary: "Touch the tips of your thumb and index finger together to form an 'OK' circle, while extending your middle, ring, and pinky fingers straight up.",
  fingerNotes: {
    thumb: 'Touches the tip of your index finger forming a circle.',
    index: 'Curled down to meet the tip of your thumb.',
    middle: 'Extended straight up and slightly spread.',
    ring: 'Extended straight up and slightly spread.',
    pinky: 'Extended straight up and slightly spread.',
  },
  orientationNote: 'Palm faces outward toward the viewer with an upright wrist.',
  canonicalLandmarks: FIXTURE_LETTER_F_RIGHT,
};

// 2. Add Threshold entries
thresh.signs['C'] = {
  sign: 'C',
  status: 'provisional',
  derivedFromDataset: 'canonical_fixtures',
  checkedAgainstDataset: null,
  sampleCount: 1,
  conditions: [
    {
      id: 'thumb_curl',
      feature: 'curl_thumb_deg',
      finger: 'thumb',
      label: 'thumb curl angle',
      feedbackKeyBelow: 'thumb_curl_more',
      feedbackKeyAbove: 'thumb_extend_more',
      priority: 2,
      min: 25,
      max: 110,
    },
    {
      id: 'index_curl',
      feature: 'curl_index_deg',
      finger: 'index',
      label: 'index curl angle',
      feedbackKeyBelow: 'index_curl_more',
      feedbackKeyAbove: 'index_extend_more',
      priority: 1,
      min: 45,
      max: 125,
    },
    {
      id: 'middle_curl',
      feature: 'curl_middle_deg',
      finger: 'middle',
      label: 'middle curl angle',
      feedbackKeyBelow: 'middle_curl_more',
      feedbackKeyAbove: 'middle_extend_more',
      priority: 1,
      min: 40,
      max: 120,
    },
    {
      id: 'ring_curl',
      feature: 'curl_ring_deg',
      finger: 'ring',
      label: 'ring curl angle',
      feedbackKeyBelow: 'ring_curl_more',
      feedbackKeyAbove: 'ring_extend_more',
      priority: 2,
      min: 35,
      max: 115,
    },
    {
      id: 'pinky_curl',
      feature: 'curl_pinky_deg',
      finger: 'pinky',
      label: 'pinky curl angle',
      feedbackKeyBelow: 'pinky_curl_more',
      feedbackKeyAbove: 'pinky_extend_more',
      priority: 2,
      min: 25,
      max: 105,
    },
    {
      id: 'thumb_index_spacing',
      feature: 'dist_thumb_index',
      finger: 'thumb',
      secondaryFinger: 'index',
      label: 'thumb-index spacing',
      feedbackKeyBelow: 'thumb_index_apart',
      feedbackKeyAbove: 'thumb_index_closer',
      priority: 2,
      min: 0.35,
      max: 1.20,
    },
  ],
};

thresh.signs['O'] = {
  sign: 'O',
  status: 'provisional',
  derivedFromDataset: 'canonical_fixtures',
  checkedAgainstDataset: null,
  sampleCount: 1,
  conditions: [
    {
      id: 'thumb_curl',
      feature: 'curl_thumb_deg',
      finger: 'thumb',
      label: 'thumb curl angle',
      feedbackKeyBelow: 'thumb_curl_more',
      feedbackKeyAbove: 'thumb_extend_more',
      priority: 2,
      min: 25,
      max: 100,
    },
    {
      id: 'index_curl',
      feature: 'curl_index_deg',
      finger: 'index',
      label: 'index curl angle',
      feedbackKeyBelow: 'index_curl_more',
      feedbackKeyAbove: 'index_extend_more',
      priority: 1,
      min: 110,
      max: 200,
    },
    {
      id: 'middle_curl',
      feature: 'curl_middle_deg',
      finger: 'middle',
      label: 'middle curl angle',
      feedbackKeyBelow: 'middle_curl_more',
      feedbackKeyAbove: 'middle_extend_more',
      priority: 1,
      min: 115,
      max: 205,
    },
    {
      id: 'ring_curl',
      feature: 'curl_ring_deg',
      finger: 'ring',
      label: 'ring curl angle',
      feedbackKeyBelow: 'ring_curl_more',
      feedbackKeyAbove: 'ring_extend_more',
      priority: 2,
      min: 110,
      max: 200,
    },
    {
      id: 'pinky_curl',
      feature: 'curl_pinky_deg',
      finger: 'pinky',
      label: 'pinky curl angle',
      feedbackKeyBelow: 'pinky_curl_more',
      feedbackKeyAbove: 'pinky_extend_more',
      priority: 2,
      min: 95,
      max: 190,
    },
    {
      id: 'thumb_index_spacing',
      feature: 'dist_thumb_index',
      finger: 'thumb',
      secondaryFinger: 'index',
      label: 'thumb-index spacing',
      feedbackKeyBelow: 'thumb_index_apart',
      feedbackKeyAbove: 'thumb_index_closer',
      priority: 1,
      min: 0.0,
      max: 0.22,
    },
    {
      id: 'thumb_middle_spacing',
      feature: 'dist_thumb_middle',
      finger: 'thumb',
      secondaryFinger: 'middle',
      label: 'thumb-middle spacing',
      feedbackKeyBelow: 'thumb_middle_apart',
      feedbackKeyAbove: 'thumb_middle_closer',
      priority: 2,
      min: 0.0,
      max: 0.25,
    },
  ],
};

thresh.signs['D'] = {
  sign: 'D',
  status: 'provisional',
  derivedFromDataset: 'canonical_fixtures',
  checkedAgainstDataset: null,
  sampleCount: 1,
  conditions: [
    {
      id: 'index_curl',
      feature: 'curl_index_deg',
      finger: 'index',
      label: 'index curl angle',
      feedbackKeyBelow: 'index_curl_more',
      feedbackKeyAbove: 'index_extend_more',
      priority: 1,
      min: 0,
      max: 45,
    },
    {
      id: 'middle_curl',
      feature: 'curl_middle_deg',
      finger: 'middle',
      label: 'middle curl angle',
      feedbackKeyBelow: 'middle_curl_more',
      feedbackKeyAbove: 'middle_extend_more',
      priority: 1,
      min: 120,
      max: 260,
    },
    {
      id: 'ring_curl',
      feature: 'curl_ring_deg',
      finger: 'ring',
      label: 'ring curl angle',
      feedbackKeyBelow: 'ring_curl_more',
      feedbackKeyAbove: 'ring_extend_more',
      priority: 2,
      min: 120,
      max: 260,
    },
    {
      id: 'pinky_curl',
      feature: 'curl_pinky_deg',
      finger: 'pinky',
      label: 'pinky curl angle',
      feedbackKeyBelow: 'pinky_curl_more',
      feedbackKeyAbove: 'pinky_extend_more',
      priority: 2,
      min: 115,
      max: 260,
    },
    {
      id: 'thumb_middle_spacing',
      feature: 'dist_thumb_middle',
      finger: 'thumb',
      secondaryFinger: 'middle',
      label: 'thumb-middle spacing',
      feedbackKeyBelow: 'thumb_middle_apart',
      feedbackKeyAbove: 'thumb_middle_closer',
      priority: 1,
      min: 0.0,
      max: 0.25,
    },
    {
      id: 'thumb_index_spacing',
      feature: 'dist_thumb_index',
      finger: 'thumb',
      secondaryFinger: 'index',
      label: 'thumb-index spacing',
      feedbackKeyBelow: 'thumb_index_apart',
      feedbackKeyAbove: 'thumb_index_closer',
      priority: 2,
      min: 0.50,
      max: 2.0,
    },
  ],
};

thresh.signs['F'] = {
  sign: 'F',
  status: 'provisional',
  derivedFromDataset: 'canonical_fixtures',
  checkedAgainstDataset: null,
  sampleCount: 1,
  conditions: [
    {
      id: 'thumb_index_spacing',
      feature: 'dist_thumb_index',
      finger: 'thumb',
      secondaryFinger: 'index',
      label: 'thumb-index spacing',
      feedbackKeyBelow: 'thumb_index_apart',
      feedbackKeyAbove: 'thumb_index_closer',
      priority: 1,
      min: 0.0,
      max: 0.22,
    },
    {
      id: 'index_curl',
      feature: 'curl_index_deg',
      finger: 'index',
      label: 'index curl angle',
      feedbackKeyBelow: 'index_curl_more',
      feedbackKeyAbove: 'index_extend_more',
      priority: 1,
      min: 90,
      max: 200,
    },
    {
      id: 'middle_curl',
      feature: 'curl_middle_deg',
      finger: 'middle',
      label: 'middle curl angle',
      feedbackKeyBelow: 'middle_curl_more',
      feedbackKeyAbove: 'middle_extend_more',
      priority: 1,
      min: 0,
      max: 50,
    },
    {
      id: 'ring_curl',
      feature: 'curl_ring_deg',
      finger: 'ring',
      label: 'ring curl angle',
      feedbackKeyBelow: 'ring_curl_more',
      feedbackKeyAbove: 'ring_extend_more',
      priority: 2,
      min: 0,
      max: 50,
    },
    {
      id: 'pinky_curl',
      feature: 'curl_pinky_deg',
      finger: 'pinky',
      label: 'pinky curl angle',
      feedbackKeyBelow: 'pinky_curl_more',
      feedbackKeyAbove: 'pinky_extend_more',
      priority: 2,
      min: 0,
      max: 50,
    },
  ],
};

// 3. Update curriculum Lesson 2 signs
const l2 = curr.lessons.find((l) => l.id === 'lesson-2');
if (l2) {
  l2.signs = ['C', 'O', 'D', 'F'];
}

fs.writeFileSync(refPath, JSON.stringify(ref, null, 2), 'utf8');
fs.writeFileSync(threshPath, JSON.stringify(thresh, null, 2), 'utf8');
fs.writeFileSync(currPath, JSON.stringify(curr, null, 2), 'utf8');

console.log('Successfully updated reference.json, thresholds.json, and curriculum.json for Lesson 2 (C, O, D, F)!');
