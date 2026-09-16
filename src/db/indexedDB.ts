import { 
  WorkSession, 
  LocationRecord, 
  FieldVisit, 
  PhotoRecord, 
  SyncStatus 
} from '../types';

const DB_NAME = 'fieldtrack_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('userId', 'userId', { unique: false });
        sessionStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        sessionStore.createIndex('date', 'date', { unique: false });
      }

      // Location records store
      if (!db.objectStoreNames.contains('location_records')) {
        const locStore = db.createObjectStore('location_records', { keyPath: 'id' });
        locStore.createIndex('userId', 'userId', { unique: false });
        locStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        locStore.createIndex('capturedAt', 'capturedAt', { unique: false });
        locStore.createIndex('sessionId', 'sessionId', { unique: false });
      }

      // Field visits store
      if (!db.objectStoreNames.contains('field_visits')) {
        const visitStore = db.createObjectStore('field_visits', { keyPath: 'id' });
        visitStore.createIndex('userId', 'userId', { unique: false });
        visitStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        visitStore.createIndex('capturedAt', 'capturedAt', { unique: false });
        visitStore.createIndex('sessionId', 'sessionId', { unique: false });
      }

      // Photos store (blobs/base64)
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('userId', 'userId', { unique: false });
        photoStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        photoStore.createIndex('relatedRecordId', 'relatedRecordId', { unique: false });
      }

      // Local app settings/state
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

// Generic transaction helper
async function performTx<T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  callback: (store: IDBObjectStore) => Promise<T> | IDBRequest
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let resultPromise: Promise<T> | IDBRequest;
    try {
      resultPromise = callback(store);
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => {
      if ('result' in resultPromise) {
        resolve(resultPromise.result);
      }
    };

    tx.onerror = () => {
      reject(tx.error);
    };

    if (resultPromise instanceof Promise) {
      resultPromise.then(resolve).catch(reject);
    } else if ('onsuccess' in resultPromise) {
      resultPromise.onsuccess = () => {
        resolve(resultPromise.result);
      };
      resultPromise.onerror = () => {
        reject(resultPromise.error);
      };
    }
  });
}

// Session Operations
export async function saveLocalSession(session: WorkSession): Promise<void> {
  await performTx('sessions', 'readwrite', (store) => store.put(session));
}

export async function getActiveLocalSession(userId: string): Promise<WorkSession | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const store = tx.objectStore('sessions');
    const index = store.createIndex ? store.index('userId') : null;
    
    const request = index ? index.getAll(userId) : store.getAll();
    request.onsuccess = () => {
      const sessions = (request.result || []) as WorkSession[];
      const active = sessions.find(s => s.userId === userId && s.status === 'ACTIVE');
      resolve(active || null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Location Record Operations
export async function saveLocalLocationRecord(record: LocationRecord): Promise<void> {
  await performTx('location_records', 'readwrite', (store) => store.put(record));
}

export async function getLocalLocationRecords(userId?: string): Promise<LocationRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('location_records', 'readonly');
    const store = tx.objectStore('location_records');
    const request = store.getAll();
    request.onsuccess = () => {
      let records = (request.result || []) as LocationRecord[];
      if (userId) {
        records = records.filter(r => r.userId === userId);
      }
      records.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

// Visit Operations
export async function saveLocalVisit(visit: FieldVisit): Promise<void> {
  await performTx('field_visits', 'readwrite', (store) => store.put(visit));
}

export async function getLocalVisits(userId?: string): Promise<FieldVisit[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('field_visits', 'readonly');
    const store = tx.objectStore('field_visits');
    const request = store.getAll();
    request.onsuccess = () => {
      let visits = (request.result || []) as FieldVisit[];
      if (userId) {
        visits = visits.filter(v => v.userId === userId);
      }
      visits.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      resolve(visits);
    };
    request.onerror = () => reject(request.error);
  });
}

// Photo Operations
export async function saveLocalPhoto(photo: PhotoRecord): Promise<void> {
  await performTx('photos', 'readwrite', (store) => store.put(photo));
}

export async function getLocalPhoto(id: string): Promise<PhotoRecord | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Pending Sync Query
export interface PendingSyncPayload {
  sessions: WorkSession[];
  locations: LocationRecord[];
  visits: FieldVisit[];
  photos: PhotoRecord[];
  totalCount: number;
}

export async function getPendingSyncData(userId?: string): Promise<PendingSyncPayload> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'location_records', 'field_visits', 'photos'], 'readonly');
    
    const sessReq = tx.objectStore('sessions').getAll();
    const locReq = tx.objectStore('location_records').getAll();
    const visitReq = tx.objectStore('field_visits').getAll();
    const photoReq = tx.objectStore('photos').getAll();

    tx.oncomplete = () => {
      const isPending = (status: SyncStatus) => status === 'PENDING' || status === 'RETRY_PENDING' || status === 'FAILED';

      let sessions = (sessReq.result as WorkSession[]).filter(s => isPending(s.syncStatus));
      let locations = (locReq.result as LocationRecord[]).filter(l => isPending(l.syncStatus));
      let visits = (visitReq.result as FieldVisit[]).filter(v => isPending(v.syncStatus));
      let photos = (photoReq.result as PhotoRecord[]).filter(p => isPending(p.syncStatus));

      if (userId) {
        sessions = sessions.filter(s => s.userId === userId);
        locations = locations.filter(l => l.userId === userId);
        visits = visits.filter(v => v.userId === userId);
        photos = photos.filter(p => p.userId === userId);
      }

      const totalCount = sessions.length + locations.length + visits.length + photos.length;
      resolve({ sessions, locations, visits, photos, totalCount });
    };

    tx.onerror = () => reject(tx.error);
  });
}

// Mark Synced
export async function markLocalRecordsSynced(syncedIds: string[]): Promise<void> {
  if (!syncedIds || syncedIds.length === 0) return;
  const idSet = new Set(syncedIds);
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'location_records', 'field_visits', 'photos'], 'readwrite');
    
    const sessStore = tx.objectStore('sessions');
    const locStore = tx.objectStore('location_records');
    const visitStore = tx.objectStore('field_visits');
    const photoStore = tx.objectStore('photos');

    // Update sessions
    const sessReq = sessStore.getAll();
    sessReq.onsuccess = () => {
      (sessReq.result as WorkSession[]).forEach(item => {
        if (idSet.has(item.id)) {
          item.syncStatus = 'SYNCED';
          sessStore.put(item);
        }
      });
    };

    // Update locations
    const locReq = locStore.getAll();
    locReq.onsuccess = () => {
      (locReq.result as LocationRecord[]).forEach(item => {
        if (idSet.has(item.id)) {
          item.syncStatus = 'SYNCED';
          locStore.put(item);
        }
      });
    };

    // Update visits
    const visitReq = visitStore.getAll();
    visitReq.onsuccess = () => {
      (visitReq.result as FieldVisit[]).forEach(item => {
        if (idSet.has(item.id)) {
          item.syncStatus = 'SYNCED';
          visitStore.put(item);
        }
      });
    };

    // Update photos
    const photoReq = photoStore.getAll();
    photoReq.onsuccess = () => {
      (photoReq.result as PhotoRecord[]).forEach(item => {
        if (idSet.has(item.id)) {
          item.syncStatus = 'SYNCED';
          photoStore.put(item);
        }
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// App State (Key-Value)
export async function setAppState(key: string, value: unknown): Promise<void> {
  await performTx('app_state', 'readwrite', (store) => store.put({ key, value }));
}

export async function getAppState<T>(key: string): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('app_state', 'readonly');
    const store = tx.objectStore('app_state');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}
