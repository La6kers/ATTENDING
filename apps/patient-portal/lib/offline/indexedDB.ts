// ============================================================
// COMPASS - IndexedDB Offline Storage
// apps/patient-portal/lib/offline/indexedDB.ts
//
// Persistent storage for offline-first functionality
// Stores assessments, clinical data, and pending requests
// ============================================================

const DB_NAME = 'compass-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  ASSESSMENTS: 'assessments',
  PENDING_REQUESTS: 'pending-requests',
  CLINICAL_DATA: 'clinical-data',
  USER_PREFERENCES: 'user-preferences',
  EMERGENCY_CONTACTS: 'emergency-contacts',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

let dbInstance: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Handle database close
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Assessments store
      if (!db.objectStoreNames.contains(STORES.ASSESSMENTS)) {
        const assessmentStore = db.createObjectStore(STORES.ASSESSMENTS, {
          keyPath: 'id',
        });
        assessmentStore.createIndex('status', 'status', { unique: false });
        assessmentStore.createIndex('createdAt', 'createdAt', { unique: false });
        assessmentStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Pending requests store
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        const requestStore = db.createObjectStore(STORES.PENDING_REQUESTS, {
          keyPath: 'timestamp',
        });
        requestStore.createIndex('url', 'url', { unique: false });
        requestStore.createIndex('method', 'method', { unique: false });
      }

      // Clinical data cache store
      if (!db.objectStoreNames.contains(STORES.CLINICAL_DATA)) {
        const clinicalStore = db.createObjectStore(STORES.CLINICAL_DATA, {
          keyPath: 'key',
        });
        clinicalStore.createIndex('type', 'type', { unique: false });
        clinicalStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // User preferences store
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
        db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      }

      // Emergency contacts store
      if (!db.objectStoreNames.contains(STORES.EMERGENCY_CONTACTS)) {
        const contactStore = db.createObjectStore(STORES.EMERGENCY_CONTACTS, {
          keyPath: 'id',
        });
        contactStore.createIndex('isPrimary', 'isPrimary', { unique: false });
      }
    };
  });
}

// ============================================================
// GENERIC CRUD OPERATIONS
// ============================================================

export async function getItem<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function setItem<T extends object>(
  storeName: StoreName,
  item: T
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(
  storeName: StoreName,
  key: IDBValidKey
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllItems<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getItemsByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function countItems(storeName: StoreName): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// ASSESSMENT-SPECIFIC OPERATIONS
// ============================================================

export interface OfflineAssessment {
  id: string;
  patientId?: string;
  sessionId: string;
  status: 'in-progress' | 'completed' | 'submitted';
  syncStatus: 'pending' | 'synced' | 'failed';
  data: {
    symptoms: Array<{
      name: string;
      severity?: number;
      duration?: string;
      location?: string;
    }>;
    responses: Record<string, unknown>;
    vitalSigns?: Record<string, number>;
    photos?: string[]; // Base64 encoded
    voiceNotes?: string[]; // Base64 encoded
  };
  triageLevel?: number;
  redFlags?: string[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  syncAttempts: number;
  lastSyncError?: string;
}

export async function saveAssessment(
  assessment: OfflineAssessment
): Promise<void> {
  assessment.updatedAt = new Date().toISOString();
  await setItem(STORES.ASSESSMENTS, assessment);
}

export async function getAssessment(id: string): Promise<OfflineAssessment | null> {
  return getItem<OfflineAssessment>(STORES.ASSESSMENTS, id);
}

export async function getPendingAssessments(): Promise<OfflineAssessment[]> {
  return getItemsByIndex<OfflineAssessment>(
    STORES.ASSESSMENTS,
    'syncStatus',
    'pending'
  );
}

export async function getInProgressAssessments(): Promise<OfflineAssessment[]> {
  return getItemsByIndex<OfflineAssessment>(
    STORES.ASSESSMENTS,
    'status',
    'in-progress'
  );
}

export async function markAssessmentSynced(
  id: string,
  serverId?: string
): Promise<void> {
  const assessment = await getAssessment(id);
  if (assessment) {
    assessment.syncStatus = 'synced';
    assessment.updatedAt = new Date().toISOString();
    if (serverId) {
      (assessment as any).serverId = serverId;
    }
    await saveAssessment(assessment);
  }
}

export async function markAssessmentFailed(
  id: string,
  error: string
): Promise<void> {
  const assessment = await getAssessment(id);
  if (assessment) {
    assessment.syncStatus = 'failed';
    assessment.syncAttempts += 1;
    assessment.lastSyncError = error;
    assessment.updatedAt = new Date().toISOString();
    await saveAssessment(assessment);
  }
}

// ============================================================
// CLINICAL DATA CACHE
// ============================================================

export interface CachedClinicalData {
  key: string;
  type: 'symptoms' | 'body-parts' | 'red-flags' | 'medications' | 'conditions';
  data: unknown;
  version: string;
  cachedAt: string;
  expiresAt: string;
}

const CACHE_DURATIONS: Record<string, number> = {
  symptoms: 24 * 60 * 60 * 1000, // 24 hours
  'body-parts': 7 * 24 * 60 * 60 * 1000, // 7 days
  'red-flags': 7 * 24 * 60 * 60 * 1000, // 7 days — safety-critical, never delete on expiry
  medications: 24 * 60 * 60 * 1000, // 24 hours
  conditions: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function cacheClinicalData(
  type: CachedClinicalData['type'],
  data: unknown,
  version: string = '1.0'
): Promise<void> {
  const now = Date.now();
  const expiresAt = new Date(now + CACHE_DURATIONS[type]).toISOString();
  
  const cacheItem: CachedClinicalData = {
    key: type,
    type,
    data,
    version,
    cachedAt: new Date(now).toISOString(),
    expiresAt,
  };
  
  await setItem(STORES.CLINICAL_DATA, cacheItem);
}

export async function getCachedClinicalData(
  type: CachedClinicalData['type']
): Promise<unknown | null> {
  const cached = await getItem<CachedClinicalData>(STORES.CLINICAL_DATA, type);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (new Date(cached.expiresAt) < new Date()) {
    await deleteItem(STORES.CLINICAL_DATA, type);
    return null;
  }
  
  return cached.data;
}

/**
 * Get cached clinical data with staleness metadata instead of deleting expired items.
 * Critical for red flags: stale data is infinitely better than no data.
 */
export async function getCachedClinicalDataWithStaleness(
  type: CachedClinicalData['type']
): Promise<{ data: unknown; isStale: boolean; cachedAt: string; version: string } | null> {
  const cached = await getItem<CachedClinicalData>(STORES.CLINICAL_DATA, type);

  if (!cached) {
    return null;
  }

  const isStale = new Date(cached.expiresAt) < new Date();
  // Do NOT delete — return with stale flag
  return { data: cached.data, isStale, cachedAt: cached.cachedAt, version: cached.version };
}

export async function clearExpiredCache(): Promise<void> {
  const allCached = await getAllItems<CachedClinicalData>(STORES.CLINICAL_DATA);
  const now = new Date();
  
  for (const item of allCached) {
    // Never delete red-flags cache — stale rules are better than no rules
    if (item.type === 'red-flags') continue;
    if (new Date(item.expiresAt) < now) {
      await deleteItem(STORES.CLINICAL_DATA, item.key);
    }
  }
}

// ============================================================
// PENDING REQUEST QUEUE
// ============================================================

export interface PendingRequest {
  timestamp: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

export async function queueRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown
): Promise<PendingRequest> {
  const request: PendingRequest = {
    timestamp: Date.now(),
    url,
    method,
    headers,
    body: JSON.stringify(body),
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };
  
  await setItem(STORES.PENDING_REQUESTS, request);
  return request;
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  return getAllItems<PendingRequest>(STORES.PENDING_REQUESTS);
}

export async function removePendingRequest(timestamp: number): Promise<void> {
  await deleteItem(STORES.PENDING_REQUESTS, timestamp);
}

export async function incrementRetryCount(timestamp: number): Promise<boolean> {
  const request = await getItem<PendingRequest>(STORES.PENDING_REQUESTS, timestamp);
  
  if (!request) {
    return false;
  }
  
  request.retryCount += 1;
  
  if (request.retryCount >= request.maxRetries) {
    await removePendingRequest(timestamp);
    return false;
  }
  
  await setItem(STORES.PENDING_REQUESTS, request);
  return true;
}

// ============================================================
// STORAGE STATS
// ============================================================

export interface StorageStats {
  assessmentCount: number;
  pendingRequestCount: number;
  cachedDataCount: number;
  estimatedSize: number;
  lastSync?: string;
}

export async function getStorageStats(): Promise<StorageStats> {
  const [assessments, requests, cached] = await Promise.all([
    countItems(STORES.ASSESSMENTS),
    countItems(STORES.PENDING_REQUESTS),
    countItems(STORES.CLINICAL_DATA),
  ]);
  
  // Estimate storage size
  let estimatedSize = 0;
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    estimatedSize = estimate.usage || 0;
  }
  
  return {
    assessmentCount: assessments,
    pendingRequestCount: requests,
    cachedDataCount: cached,
    estimatedSize,
  };
}

// ============================================================
// DATABASE CLEANUP
// ============================================================

export async function cleanupOldData(maxAgeDays: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
  
  for (const assessment of assessments) {
    if (
      assessment.syncStatus === 'synced' &&
      new Date(assessment.createdAt) < cutoffDate
    ) {
      await deleteItem(STORES.ASSESSMENTS, assessment.id);
    }
  }
  
  await clearExpiredCache();
}

// ============================================================
// EXPORT DATABASE
// ============================================================

export async function exportDatabase(): Promise<string> {
  const [assessments, preferences, contacts] = await Promise.all([
    getAllItems(STORES.ASSESSMENTS),
    getAllItems(STORES.USER_PREFERENCES),
    getAllItems(STORES.EMERGENCY_CONTACTS),
  ]);
  
  const exportData = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    assessments,
    preferences,
    emergencyContacts: contacts,
  };
  
  return JSON.stringify(exportData, null, 2);
}
