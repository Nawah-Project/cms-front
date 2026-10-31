import test from 'node:test';
import assert from 'node:assert/strict';
import { marketingSession, SESSION_TIMEOUT_MS } from '../src/app/utils/marketingSession.ts';
const fixture = () => {
  const values = new Map(); let counter = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  return (path, now, referrer = '') => marketingSession(storage, new URL(path, 'https://nawah-project.com'), referrer, now, () => `session-${++counter}`);
};
test('navigation, reloads and other tabs share a visit, then expire after inactivity', () => {
  const visit = fixture();
  assert.equal(visit('/auth/login', 0).isNew, true);
  assert.equal(visit('/auth/register', 100).session.id, 'session-1');
  assert.equal(visit('/auth/login', 200).isNew, false);
  assert.equal(visit('/auth/login', 200 + SESSION_TIMEOUT_MS).session.id, 'session-2');
});
test('different videos have separate attribution; auth redirect preserves the selected campaign', () => {
  const visit = fixture();
  assert.equal(visit('/?utm_source=youtube&utm_content=one', 0).session.attribution.utmContent, 'one');
  assert.equal(visit('/auth/register', 100, 'https://accounts.google.com/').session.attribution.utmSource, 'youtube');
  const other = visit('/?utm_source=instagram&utm_content=two', 200);
  assert.equal(other.isNew, true);
  assert.equal(other.session.attribution.utmContent, 'two');
  assert.equal(visit('/', 200 + SESSION_TIMEOUT_MS).session.attribution.utmSource, undefined);
});
test('records only an external referrer hostname without its path or query', () => {
  assert.deepEqual(fixture()('/', 0, 'https://example.com/private?email=private').session.attribution, { referrerHost: 'example.com' });
});
