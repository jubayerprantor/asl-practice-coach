import type { FingerName } from '../engine';

export interface PracticeAttemptRecord {
  id?: number;
  mode: 'check' | 'learn';
  language: string;
  sign: string;
  success: boolean;
  /** Milliseconds from prompt start until hold completed (null if not completed) */
  timeToSuccessMs: number | null;
  /** Total active practice duration on this attempt in milliseconds */
  durationMs: number;
  /** Most frequent failing finger during needs_correction frames, or null if none */
  mostCommonFailingFinger: FingerName | null;
  /** Breakdown of failing frame counts per finger */
  fingerErrorCounts: Partial<Record<FingerName, number>>;
  completedAt: string;
}

const DB_NAME = 'asl_practice_coach_db';
const DB_VERSION = 1;
const STORE_ATTEMPTS = 'attempts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const store = db.createObjectStore(STORE_ATTEMPTS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by_sign', 'sign', { unique: false });
        store.createIndex('by_completedAt', 'completedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export async function logPracticeAttempt(
  record: Omit<PracticeAttemptRecord, 'id'>
): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
    const store = tx.objectStore(STORE_ATTEMPTS);
    const req = store.add(record);

    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to log practice attempt.'));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllPracticeAttempts(): Promise<PracticeAttemptRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
    const store = tx.objectStore(STORE_ATTEMPTS);
    const req = store.getAll();

    req.onsuccess = () =>
      resolve((req.result as PracticeAttemptRecord[]) ?? []);
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to read practice attempts.'));
    tx.oncomplete = () => db.close();
  });
}

export async function clearAllPracticeData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
    const store = tx.objectStore(STORE_ATTEMPTS);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to clear IndexedDB store.'));
    tx.oncomplete = () => db.close();
  });
}
