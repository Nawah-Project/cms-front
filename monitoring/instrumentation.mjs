import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client';

const registry = new Registry();
registry.setDefaultLabels({ environment: process.env.OBSERVABILITY_ENV ?? 'unknown', service: 'frontend' });
collectDefaultMetrics({ register: registry, prefix: 'nawah_' });
const requests = new Counter({ name: 'http_requests_total', help: 'Completed frontend HTTP requests by normalized route, method, and status code.', labelNames: ['route', 'method', 'status_code'], registers: [registry] });
const duration = new Histogram({ name: 'http_request_duration_seconds', help: 'Frontend HTTP request duration in seconds by normalized route, method, and status code.', labelNames: ['route', 'method', 'status_code'], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], registers: [registry] });
const inFlight = new Gauge({ name: 'http_requests_in_flight', help: 'Current frontend HTTP requests in flight by normalized route and method.', labelNames: ['route', 'method'], registers: [registry] });
const routePatterns = [/^\/$/, /^\/auth\/login\/?$/, /^\/auth\/register\/?$/, /^\/applications\/?$/, /^\/applications\/[^/]+\/?$/, /^\/professional-development\/?$/, /^\/professional-development\/feedback\/?$/, /^\/members-progress\/?$/, /^\/profile\/?$/, /^\/admin\/?$/, /^\/admin\/members\/?$/, /^\/admin\/professional-development\/?$/, /^\/admin\/groups\/?$/, /^\/admin\/activity\/?$/];
const routeNames = ['/', '/auth/login', '/auth/register', '/applications', '/applications/:id', '/professional-development', '/professional-development/feedback', '/members-progress', '/profile', '/admin', '/admin/members', '/admin/professional-development', '/admin/groups', '/admin/activity'];
function normalizedRoute(rawUrl) {
  let pathname = '/';
  try { pathname = new URL(rawUrl ?? '/', 'http://localhost').pathname; } catch {}
  const match = routePatterns.findIndex((pattern) => pattern.test(pathname));
  return match < 0 ? 'unmatched' : routeNames[match];
}
function normalizedMethod(value) {
  const method = String(value ?? 'GET').toUpperCase();
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method) ? method : 'OTHER';
}
const token = process.env.METRICS_TOKEN ?? '';
if (!token) throw new Error('METRICS_TOKEN is required to expose the protected /metrics endpoint');
const originalEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function instrumentHttp(event, ...args) {
  if (event !== 'request') return originalEmit.call(this, event, ...args);
  const [request, response] = args;
  if (request.url?.split('?', 1)[0] === '/metrics') {
    const supplied = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { response.statusCode = 401; response.end(); return true; }
    void registry.metrics().then((body) => { response.statusCode = 200; response.setHeader('Content-Type', registry.contentType); response.end(body); }).catch(() => { response.statusCode = 500; response.end(); });
    return true;
  }
  const route = normalizedRoute(request.url);
  const method = normalizedMethod(request.method);
  const started = process.hrtime.bigint();
  inFlight.labels(route, method).inc();
  let recorded = false;
  const record = (status) => {
    if (recorded) return;
    recorded = true;
    const labels = { route, method, status_code: String(status) };
    requests.labels(labels).inc();
    duration.labels(labels).observe(Number(process.hrtime.bigint() - started) / 1e9);
    inFlight.labels(route, method).dec();
  };
  response.once('finish', () => record(response.statusCode));
  response.once('close', () => record(response.statusCode >= 400 ? response.statusCode : 499));
  return originalEmit.call(this, event, ...args);
};
