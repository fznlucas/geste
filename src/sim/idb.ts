/**
 * The history cache in IndexedDB (docs/admin-v2/01 §2): database "geste-sim", one entry per key (seed +
 * engine + sources), the snapshot of the last complete day. Writing a key deletes the others (another
 * seed or an older build). Every failure (private window, blocked storage, quota) reads as "no cache".
 */
import type { SimSnapshot } from "./generate";
import type { SnapshotStore } from "./prime";

const DB = "geste-sim";
const STORE = "history";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** The IndexedDB store, or null where there is no IndexedDB. */
export function idbStore(): SnapshotStore | null {
  if (typeof indexedDB === "undefined") return null;
  return {
    async get(key) {
      const db = await open();
      try {
        return await new Promise<SimSnapshot | null>((resolve, reject) => {
          const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
          req.onsuccess = () => resolve((req.result as SimSnapshot | undefined) ?? null);
          req.onerror = () => reject(req.error);
        });
      } finally {
        db.close();
      }
    },
    async put(key, snapshot) {
      const db = await open();
      try {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        store.clear();
        // put() clones the snapshot now: the engine can run on.
        store.put(snapshot, key);
        await done(tx);
      } finally {
        db.close();
      }
    },
  };
}
