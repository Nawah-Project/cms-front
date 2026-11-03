import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { isAdminRequest, proxyAdmin } from '../server/admin-proxy.mjs';
test('admin paths, assets and route manifests are routed without catching member paths', () => {
  for (const p of ['/admin', '/admin/ux-lab?view=map', '/admin-assets/assets/main.js', '/strategic-relationships/ui/app.mjs', '/strategic-relationships/config.json', '/founder-workspace/ui/app.mjs', '/__manifest?p=%2Fadmin%2Fjourney', '/__manifest?paths=%2Fadmin%2Fstrategic-relationships%2Fpeople%2C%2Fadmin%2Ffounder-workspace%2Ftoday&version=synthetic', '/__manifest?paths=%2Fprofile%2C%2Fadmin%2Fjourney']) assert.ok(isAdminRequest(p), p);
  for (const p of ['/', '/auth/login', '/career-consulting', '/applications', '/administer', '/__manifest?p=%2Fapplications', '/__manifest?paths=%2Fapplications%2C%2Fprofile', '/__manifest?paths=%2Fadminister']) assert.ok(!isAdminRequest(p), p);
});
test('streaming proxy preserves paths, queries, credentials and response headers', async () => {
  const origin = http.createServer((req, res) => { assert.equal(req.url, '/admin/ux-lab?view=map'); assert.equal(req.headers.cookie, 'synthetic=qa'); res.setHeader('Cache-Control', 'private, no-store'); res.end('admin page'); });
  origin.listen(0, '127.0.0.1'); await once(origin, 'listening');
  const gateway = http.createServer((req, res) => proxyAdmin(req, res, `http://127.0.0.1:${origin.address().port}`)); gateway.listen(0, '127.0.0.1'); await once(gateway, 'listening');
  try { const r = await fetch(`http://127.0.0.1:${gateway.address().port}/admin/ux-lab?view=map`, { headers: { Cookie: 'synthetic=qa' } }); assert.equal(r.status, 200); assert.equal(r.headers.get('Cache-Control'), 'private, no-store'); assert.equal(await r.text(), 'admin page'); }
  finally { gateway.closeAllConnections(); origin.closeAllConnections(); await Promise.all([new Promise(r => gateway.close(r)), new Promise(r => origin.close(r))]); }
});
test('unavailable admin fails its route without turning member routes into admin requests', async () => {
  const gateway = http.createServer((req, res) => isAdminRequest(req.url) ? proxyAdmin(req, res, 'http://127.0.0.1:1') : res.end('members ok')); gateway.listen(0, '127.0.0.1'); await once(gateway, 'listening');
  try { const base = `http://127.0.0.1:${gateway.address().port}`; assert.equal((await fetch(base + '/admin')).status, 503); const member = await fetch(base + '/applications'); assert.equal(member.status, 200); assert.equal(await member.text(), 'members ok'); }
  finally { gateway.closeAllConnections(); await new Promise(r => gateway.close(r)); }
});
