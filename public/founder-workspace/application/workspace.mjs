import { copy, validateDocument, DomainError } from '../domain/model.mjs';

// Application service depends on a repository port, not browser storage or Nawah services.
export class Workspace {
  constructor(repository, seed) { this.repository = repository; this.seed = seed; this.document = null; this.readOnly = false; this.unpersisted = false; }
  async load() {
    const existing = await this.repository.read();
    if (existing) this.document = existing;
    else this.document = await this.repository.save(this.seed(), -1);
    this.unpersisted = false;
    return copy(this.document);
  }
  async transact(label, change) {
    if (this.readOnly) throw new DomainError('READ_ONLY');
    if (this.saving) throw new DomainError('BUSY');
    const next = copy(this.document);
    const result = change(next) || next;
    const signature = JSON.stringify(result);
    if (this.pending?.label === label && this.pending.signature === signature) return this.persist(this.pending.payload);
    result.history.push({ label, at: new Date().toISOString() });
    if (result.history.length > 2000) result.history = result.history.slice(-2000);
    validateDocument(result);
    this.pending = { label, signature, payload: result };
    return this.persist(result);
  }
  async persist(result) {
    this.saving = true;
    try {
      this.document = await this.repository.save(result, this.document.revision);
      this.pending = null;
      return copy(this.document);
    } finally { this.saving = false; }
  }
  async import(document) {
    return this.transact('Import plan', current => ({ ...copy(validateDocument(document)), id: current.id, revision: current.revision }));
  }
}
