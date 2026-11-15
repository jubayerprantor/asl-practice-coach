import type { LandmarkSample, ProcessedDatasetFile } from '../data/schema';

const RECORDER_DB_NAME = 'asl_human_landmark_recorder_db';
const RECORDER_DB_VERSION = 1;
const STORE_CLIPS = 'recorded_clips';

export interface RecordedClipRecord {
  clipId: string;
  participantId: string;
  label: string;
  handedness: 'Left' | 'Right';
  intendedError: string | null;
  recordedAt: string;
  samples: LandmarkSample[]; // 30 stable landmark frames
}

function openRecorderDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECORDER_DB_NAME, RECORDER_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        db.createObjectStore(STORE_CLIPS, { keyPath: 'clipId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to open recorder IndexedDB.'));
  });
}

export async function saveRecordedClip(
  clip: RecordedClipRecord
): Promise<void> {
  const db = await openRecorderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    tx.objectStore(STORE_CLIPS).put(clip);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save recorded clip.'));
    };
  });
}

export async function getAllRecordedClips(): Promise<RecordedClipRecord[]> {
  const db = await openRecorderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readonly');
    const req = tx.objectStore(STORE_CLIPS).getAll();
    req.onsuccess = () => resolve((req.result as RecordedClipRecord[]) ?? []);
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to read recorded clips.'));
    tx.oncomplete = () => db.close();
  });
}

export async function deleteRecordedClip(clipId: string): Promise<void> {
  const db = await openRecorderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    tx.objectStore(STORE_CLIPS).delete(clipId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete clip.'));
    };
  });
}

export async function clearAllRecordedClips(): Promise<void> {
  const db = await openRecorderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    tx.objectStore(STORE_CLIPS).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to clear recorder database.'));
    };
  });
}

/**
 * Exports all recorded clips into the exact ProcessedDatasetFile JSON schema
 * used by the offline evaluation harness. Landmarks only — zero video or images.
 */
export function buildRealHumanDatasetExport(
  clips: readonly RecordedClipRecord[]
): ProcessedDatasetFile {
  const allSamples: LandmarkSample[] = clips.flatMap((c) => c.samples);

  return {
    schemaVersion: '1.0.0',
    dataset: 'real-human-test-set',
    generatedAt: new Date().toISOString(),
    hasSubjectIds: true,
    totalImagesScanned: allSamples.length,
    totalAccepted: allSamples.length,
    totalDroppedNoHand: 0,
    totalDroppedDuplicate: 0,
    samples: allSamples,
  };
}
