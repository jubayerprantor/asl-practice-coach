export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type HandednessLabel = 'Left' | 'Right' | 'Unknown';

export interface LandmarkSample {
  id: string;
  label: string;
  sourceDataset: string;
  subjectId: string | null;
  handedness: HandednessLabel;
  confidence: number;
  landmarks: Point3D[]; // Length 21
}

export interface ProcessedDatasetFile {
  schemaVersion: '1.0.0';
  dataset: string;
  generatedAt: string;
  hasSubjectIds: boolean;
  totalImagesScanned: number;
  totalAccepted: number;
  totalDroppedNoHand: number;
  totalDroppedDuplicate: number;
  samples: LandmarkSample[];
}

export interface LetterDropoutRow {
  dataset: string;
  label: string;
  totalImages: number;
  detectedImages: number;
  noHandCount: number;
  noHandRatePct: number;
  duplicateCount: number;
  acceptedCount: number;
}
