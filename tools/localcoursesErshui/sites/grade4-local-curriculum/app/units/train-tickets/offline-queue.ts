"use client";

export type QueuedEvent = {
  id: string;
  attemptId: string;
  token: string;
  event: Record<string, unknown>;
};

const DB_NAME = "ershui-local-curriculum";
const STORE_NAME = "ticket-events";
const DB_VERSION = 1;

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueEvent(item: QueuedEvent): Promise<void> {
  const db = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function listQueuedEvents(): Promise<QueuedEvent[]> {
  const db = await openQueue();
  const result = await new Promise<QueuedEvent[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedEvent[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result.sort(
    (a, b) => Number(a.event.seq ?? 0) - Number(b.event.seq ?? 0),
  );
}

export async function removeQueuedEvent(id: string): Promise<void> {
  const db = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
