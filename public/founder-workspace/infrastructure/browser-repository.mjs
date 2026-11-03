import { copy, validateDocument, DomainError } from '../domain/model.mjs';

// The only storage adapter. Replace this port with a protected API adapter later.
export const STORAGE_KEY = 'nawah-founder-preview:v1';
export class BrowserRepository {
  constructor(storage, key = STORAGE_KEY) { this.storage = storage; this.key = key; }
  read() {
    try { const raw = this.storage.getItem(this.key); if (raw === null) return null; return validateDocument(JSON.parse(raw)); }
    catch (error) { if (error?.code) throw error; throw new DomainError('STORAGE_READ'); }
  }
  save(document, expectedRevision) {
    const current = this.read();
    if ((current?.revision ?? -1) !== expectedRevision) throw new DomainError('CONFLICT');
    const next = copy(document); next.revision = expectedRevision + 1;
    validateDocument(next);
    try { this.storage.setItem(this.key, JSON.stringify(next)); }
    catch { throw new DomainError('STORAGE_WRITE'); }
    return next;
  }
  export(document) { return JSON.stringify(validateDocument(document), null, 2); }
}
