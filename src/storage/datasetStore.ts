import type { RawReading } from '../utils/types';

const DB_NAME = 'pressure-log';
const DB_VERSION = 1;
const STORE_NAME = 'dataset';
const RECORD_KEY = 'current';

interface StoredDataset {
  savedAt: number;
  readings: RawReading[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void =>
      reject(request.error ?? new Error('Could not open IndexedDB'));
  });
}

export async function saveDataset(readings: RawReading[]): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record: StoredDataset = { savedAt: Date.now(), readings };
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void =>
        reject(tx.error ?? new Error('Could not save dataset'));
      tx.onabort = (): void =>
        reject(tx.error ?? new Error('Could not save dataset'));
    });
  } finally {
    db.close();
  }
}

export async function loadDataset(): Promise<RawReading[] | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(RECORD_KEY);
      request.onsuccess = (): void => {
        const record = request.result as StoredDataset | undefined;
        resolve(record?.readings ?? null);
      };
      request.onerror = (): void =>
        reject(request.error ?? new Error('Could not load dataset'));
    });
  } finally {
    db.close();
  }
}

export async function clearDataset(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void =>
        reject(tx.error ?? new Error('Could not clear dataset'));
    });
  } finally {
    db.close();
  }
}
