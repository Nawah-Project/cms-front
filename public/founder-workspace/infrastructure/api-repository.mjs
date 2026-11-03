import { validateDocument, copy, DomainError } from '../domain/model.mjs';

// Persistence port adapter. Never stores plan content or identity in browser storage.
export class ApiRepository {
  constructor(apiUrl, transport = globalThis.fetch.bind(globalThis)) {
    const url = new URL(apiUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new DomainError('AUTH');
    this.base = url.href.replace(/\/$/, ''); this.transport = transport;
    this.planId = null; this.canWrite = false; this.attempt = null;
    this.channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('nawah-founder-workspace:revisions') : null;
    this.channel?.unref?.();
  }
  async request(path, method = 'GET', body, retried = false) {
    let response;
    try {
      response = await this.transport(this.base + path, { method, credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    } catch { throw new DomainError('NETWORK'); }
    if (response.status === 401 && !retried) {
      try { const refresh = await this.transport(this.base + '/auth/refresh', { method: 'POST', credentials: 'include' }); if (refresh.ok) return this.request(path, method, body, true); } catch {}
    }
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      if ([401, 403].includes(response.status)) throw new DomainError('AUTH');
      if (response.status === 409) throw new DomainError('CONFLICT');
      throw new DomainError(details.code || 'STORAGE_WRITE');
    }
    return response.json();
  }
  async read() {
    const access = await this.request('/admin/founder-workspace/access'); this.canWrite = access.canWrite; this.actorId = access.actorId;
    if (!this.planId) {
      const list = await this.request('/admin/founder-workspace/plans'); this.planId = list.items[0]?.id || null;
    }
    if (!this.planId) { this.template = await this.request('/admin/founder-workspace/template'); return null; }
    const result = await this.request('/admin/founder-workspace/plans/' + encodeURIComponent(this.planId));
    return validateDocument(result.document);
  }
  async save(document, expectedRevision) {
    if (!this.canWrite) throw new DomainError('READ_ONLY');
    const signature = JSON.stringify({ document, expectedRevision });
    const creating = expectedRevision === -1;
    if (!this.attempt || this.attempt.signature !== signature) {
      let requestId = crypto.randomUUID();
      if (creating) {
        // One canonical bootstrap attempt per account, including simultaneous first tabs.
        const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nawah-founder-default-v1:' + this.actorId))).slice(0, 16);
        bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        requestId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
      this.attempt = { signature, requestId };
    }
    const result = await this.request('/admin/founder-workspace/plans' + (creating ? '' : '/' + encodeURIComponent(this.planId)), creating ? 'POST' : 'PATCH', {
      requestId: this.attempt.requestId, document: copy(document), ...(!creating ? { expectedRevision } : {}),
    });
    const next = validateDocument(result.document); this.planId = result.id; this.attempt = null;
    this.channel?.postMessage({ actorId: this.actorId, planId: this.planId, revision: result.revision });
    return next;
  }
  export(document) { return JSON.stringify(validateDocument(document), null, 2); }
  subscribe(listener) {
    if (this.channel) this.channel.onmessage = event => {
      const message = event.data;
      if (message?.actorId === this.actorId && message.planId === this.planId && Number.isSafeInteger(message.revision)) listener(message.revision);
    };
  }
}
