/**
 * IndexedDB offline cache & sync queue for PsicoOne.
 * Caches critical read data and queues write operations for replay when back online.
 */

const DB_NAME = "psicoone-offline";
const DB_VERSION = 2;

const STORES = {
  cache: "cache",
  syncQueue: "sync-queue",
  drafts: "drafts",
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.cache)) {
        db.createObjectStore(STORES.cache, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, { keyPath: "id", autoIncrement: true });
        store.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.drafts)) {
        const store = db.createObjectStore(STORES.drafts, { keyPath: "draft_key" });
        store.createIndex("updated_at", "updated_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Draft store (Zero Data Loss layer) ──

export interface LocalDraftRecord {
  draft_key: string;
  entity_type: string;
  entity_id?: string | null;
  user_id?: string | null;
  payload: any;
  version: number;
  device_id: string;
  updated_at: number;
  last_synced_at?: number | null;
  label?: string | null;
}

export async function idbDraftPut(record: LocalDraftRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.drafts, "readwrite");
    tx.objectStore(STORES.drafts).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDraftGet(draftKey: string): Promise<LocalDraftRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.drafts, "readonly");
    const req = tx.objectStore(STORES.drafts).get(draftKey);
    req.onsuccess = () => resolve((req.result as LocalDraftRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDraftGetAll(): Promise<LocalDraftRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.drafts, "readonly");
    const req = tx.objectStore(STORES.drafts).getAll();
    req.onsuccess = () => resolve((req.result as LocalDraftRecord[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDraftDelete(draftKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.drafts, "readwrite");
    tx.objectStore(STORES.drafts).delete(draftKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


// ── Cache helpers ──

export async function cacheSet(key: string, data: any, ttlMs = 1000 * 60 * 30): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readwrite");
    tx.objectStore(STORES.cache).put({ key, data, expiresAt: Date.now() + ttlMs });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readonly");
    const req = tx.objectStore(STORES.cache).get(key);
    req.onsuccess = () => {
      const entry = req.result;
      if (!entry) return resolve(null);
      if (entry.expiresAt < Date.now()) {
        // expired – clean up lazily
        cacheDelete(key).catch(() => {});
        return resolve(null);
      }
      resolve(entry.data as T);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readwrite");
    tx.objectStore(STORES.cache).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Sync Queue ──

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, any>;
  created_at: number;
}

export async function enqueueSync(item: Omit<SyncQueueItem, "id" | "created_at">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, "readwrite");
    tx.objectStore(STORES.syncQueue).add({ ...item, created_at: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, "readonly");
    const req = tx.objectStore(STORES.syncQueue).index("created_at").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeSyncItem(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, "readwrite");
    tx.objectStore(STORES.syncQueue).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, "readwrite");
    tx.objectStore(STORES.syncQueue).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
