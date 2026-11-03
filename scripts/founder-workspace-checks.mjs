import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createSeed } from '../public/founder-workspace/domain/seed.mjs';
import { Workspace } from '../public/founder-workspace/application/workspace.mjs';
import { ApiRepository } from '../public/founder-workspace/infrastructure/api-repository.mjs';
const root = resolve('public/founder-workspace');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]);
test('workspace modules parse and imports respect domain/application/adapter/UI layers', () => {
  const allowed = { domain: ['domain'], application: ['domain', 'application'], infrastructure: ['domain', 'infrastructure'], ui: ['ui', 'domain', 'application', 'infrastructure'] };
  for (const f of walk(root).filter(f => f.endsWith('.mjs'))) {
    execFileSync(process.execPath, ['--check', f]);
    const layer = relative(root, f).split('/')[0], source = readFileSync(f, 'utf8');
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('.')); const target = relative(root, resolve(dirname(f), match[1])); assert.ok(!target.startsWith('..')); assert.ok(allowed[layer].includes(target.split('/')[0]));
    }
    if (layer === 'domain') assert.ok(!/\b(document\.|window\.|localStorage|fetch\s*\()/.test(source.replace(/\/\/[^\n]*/g, '')));
  }
});
test('non-admin source modules do not import admin implementation', () => {
  for (const f of walk(resolve('src/app')).filter(f => /\.(ts|tsx)$/.test(f) && !f.includes('/features/admin/'))) {
    const s = readFileSync(f, 'utf8');
    for (const match of s.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) assert.ok(!resolve(dirname(f), match[1]).includes('/features/admin/'), f);
  }
});
test('application waits for durable persistence and leaves drafts untouched on failure', async () => {
  let saved = null, fail = false;
  const port = { read: async () => saved, save: async d => { if (fail) throw Error('network'); saved = structuredClone(d); return saved; } };
  const w = new Workspace(port, createSeed); await w.load(); fail = true;
  await assert.rejects(() => w.transact('Edit', d => { d.tasks[0].title = 'Unsaved'; }));
  assert.notEqual(w.document.tasks[0].title, 'Unsaved'); assert.equal(w.pending.payload.tasks[0].title, 'Unsaved');
  const time = w.pending.payload.history.at(-1).at; fail = false;
  await w.transact('Edit', d => { d.tasks[0].title = 'Unsaved'; });
  assert.equal(saved.history.at(-1).at, time); assert.equal(w.document.tasks[0].title, 'Unsaved');
});
function transport() {
  const calls = []; let stored = null, fail = false;
  return { calls, set fail(v) { fail = v; }, get stored() { return stored; }, fetch: async (url, options) => {
    calls.push({ url, options });
    const route = new URL(url).pathname;
    if (route.endsWith('/access')) return Response.json({ canWrite: true, actorId: 'actor' });
    if (route.endsWith('/template')) return Response.json(createSeed());
    if (route.endsWith('/plans') && options.method === 'GET') return Response.json({ items: stored ? [{ id: stored.id }] : [] });
    if (options.method === 'POST' || options.method === 'PATCH') {
      if (fail) throw Error('Synthetic failure'); const body = JSON.parse(options.body); stored = { id: 'server-plan', document: { ...body.document, id: 'server-plan', revision: options.method === 'POST' ? 0 : body.expectedRevision + 1 } }; return Response.json({ ...stored, revision: stored.document.revision });
    }
    return Response.json(stored);
  } };
}
test('API adapter keeps private documents server-side and uses authenticated requests', async () => {
  const t = transport(), repo = new ApiRepository('https://api.example.test', t.fetch), w = new Workspace(repo, createSeed); await w.load();
  assert.equal(w.document.id, 'server-plan'); await w.transact('Edit', d => { d.tasks[0].title = 'Saved'; });
  assert.equal(t.stored.document.tasks[0].title, 'Saved'); assert.ok(t.calls.every(c => c.options.credentials === 'include'));
  repo.channel?.close();
});
test('failed network retry reuses its exact idempotency key', async () => {
  const t = transport(), repo = new ApiRepository('https://api.example.test', t.fetch); await repo.read(); t.fail = true;
  await assert.rejects(() => repo.save(createSeed(), -1)); const id = repo.attempt.requestId; t.fail = false; await repo.save(createSeed(), -1);
  const writes = t.calls.filter(c => c.options.method === 'POST'); assert.equal(writes.length, 2); assert.equal(JSON.parse(writes[1].options.body).requestId, id); repo.channel?.close();
});
test('simultaneous first tabs use the same account-scoped bootstrap key', async () => {
  const t = transport(), a = new ApiRepository('https://api.example.test', t.fetch), b = new ApiRepository('https://api.example.test', t.fetch);
  await a.read(); await b.read(); await Promise.all([a.save(createSeed(), -1), b.save(createSeed(), -1)]);
  const ids = t.calls.filter(c => c.options.method === 'POST').map(c => JSON.parse(c.options.body).requestId);
  assert.equal(new Set(ids).size, 1); a.channel?.close(); b.channel?.close();
});
test('READ and forbidden server responses cannot be bypassed through the UI adapter', async () => {
  const repo = new ApiRepository('https://api.example.test', async () => new Response('{}', { status: 403 }));
  await assert.rejects(() => repo.read(), e => e.code === 'AUTH'); await assert.rejects(() => repo.save(createSeed(), -1), e => e.code === 'READ_ONLY'); repo.channel?.close();
});
test('conflicting server writes retain the attempted request for deliberate recovery', async () => {
  const repo = new ApiRepository('https://api.example.test', async () => new Response('{}', { status: 409 })); repo.canWrite = true;
  await assert.rejects(() => repo.save(createSeed(), 0), e => e.code === 'CONFLICT'); assert.ok(repo.attempt.requestId); repo.channel?.close();
});
