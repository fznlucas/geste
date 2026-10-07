/**
 * The history cache in IndexedDB (docs/admin-v2/01 §2): database "geste-sim", one record per key (seed +
 * engine + sources): the last day generated and its two JSON buffers. Reading bytes back is a copy,
 * not a rebuild of objects, so it is cheap on the page too. Writing a key deletes the others. Every
 * failure (private window, blocked storage, quota) reads as "no cache".
 */
import type { HistoryRecord, HistoryStore } from "./prime";

const DB = "geste-sim";
const STORE = "history";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      // Version 1 kept engine snapshots as objects: start again with bytes.
      if (req.result.objectStoreNames.contains(STORE)) req.result.deleteObjectStore(STORE);
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
}

/** The IndexedDB store, or null where there is no IndexedDB. */
export function idbStore(): HistoryStore | null {
  if (typeof indexedDB === "undefined") return null;
  return {
    async get(key) {
      const db = await open();
      try {
        return await new Promise<HistoryRecord | null>((resolve, reject) => {
          const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
          req.onsuccess = () => resolve((req.result as HistoryRecord | undefined) ?? null);
          req.onerror = () => reject(req.error);
        });
      } finally {
        db.close();
      }
    },
    async put(key, record) {
      const db = await open();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          store.clear();
          store.put(record, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
  };
}
