import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const target = process.env.NAWAH_FRONTEND_APP;
assert.ok(['member', 'admin'].includes(target));
const build = await import(pathToFileURL(resolve('build/server/index.js')));
const ids = Object.keys(build.routes);
if (target === 'member') {
  assert.ok(!ids.some(id => /features\/(admin|founder-workspace|strategic-relationships|learning-library)\//.test(id)), 'Member build contains admin routes');
  assert.ok(!existsSync('build/client/strategic-relationships'),'Relationships assets leaked into member build');
  assert.ok(!existsSync('build/client/founder-workspace'), 'Founder assets leaked into member build');
  assert.ok(ids.some(id => id.endsWith('routes/applications')));
} else {
  assert.ok(!ids.some(id => /routes\/(applications|IndexRedirect|application-details)$/.test(id)), 'Admin build contains member routes');
  assert.ok(ids.some(id => id.includes('FounderWorkspacePage')));
  assert.ok(existsSync('build/client/founder-workspace/index.html'));
  assert.ok(ids.some(id=>id.includes('StrategicRelationshipsPage')));
  assert.ok(ids.some(id=>id.includes('LearningLibraryPage')));
  assert.ok(existsSync('build/client/learning-pdf-assets/wasm'));
  assert.ok(!existsSync('build/client/preview'));
  assert.ok(existsSync('build/client/strategic-relationships/infrastructure/api-repository.mjs'));
  assert.ok(!existsSync('build/client/strategic-relationships/infrastructure/browser-repository.mjs'));
}
console.log(JSON.stringify({ target, routeCount: ids.length, separated: true }));
