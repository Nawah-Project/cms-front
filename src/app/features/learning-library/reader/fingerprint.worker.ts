import { sha256 } from "@noble/hashes/sha2.js";
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const file = event.data.file,
      hash = sha256.create(),
      step = 1024 * 1024;
    for (let offset = 0; offset < file.size; offset += step) {
      hash.update(
        new Uint8Array(await file.slice(offset, offset + step).arrayBuffer()),
      );
      self.postMessage({ progress: Math.min(1, (offset + step) / file.size) });
    }
    self.postMessage({
      fingerprint: Array.from(hash.digest(), (x) =>
        x.toString(16).padStart(2, "0"),
      ).join(""),
    });
  } catch {
    self.postMessage({ error: "HASH_FAILED" });
  }
};
