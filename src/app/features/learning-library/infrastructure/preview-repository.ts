import { blank, execute, LearningError } from "../domain/model.mjs";
import type { Command, LibraryDocument } from "../domain/types";
import type { LearningRepository } from "./repository";
// Review-only adapter. Never stores PDF bytes and never runs in a production build.
export async function openPreviewRepository(
  owner: string,
): Promise<LearningRepository> {
  if (!import.meta.env.DEV || import.meta.env.VITE_LEARNING_PREVIEW !== "true")
    throw Error("Preview repository unavailable");
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("nawah-learning-review-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel("nawah-learning-review-" + owner)
      : null;
  const listeners = new Set<() => void>();
  channel?.addEventListener("message", () => listeners.forEach((fn) => fn()));
  const read = () =>
    new Promise<LibraryDocument>((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const r = tx.objectStore("documents").get(owner);
      r.onsuccess = () => resolve(r.result || blank());
      r.onerror = () => reject(r.error);
    });
  return {
    mode: "preview",
    load: read,
    commit: (expectedRevision, command) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("documents", "readwrite"),
          store = tx.objectStore("documents"),
          r = store.get(owner);
        let next: LibraryDocument;
        r.onsuccess = () => {
          try {
            const current: LibraryDocument = r.result || blank();
            if (current.revision !== expectedRevision)
              throw new LearningError("REVISION_CONFLICT");
            next = execute(current, command);
            store.put(next, owner);
          } catch (error) {
            tx.abort();
            reject(error);
          }
        };
        tx.oncomplete = () => {
          channel?.postMessage({ revision: next.revision });
          resolve(next);
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () =>
          reject(tx.error || new LearningError("SAVE_ABORTED"));
      }),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close: () => {
      channel?.close();
      db.close();
    },
  };
}
