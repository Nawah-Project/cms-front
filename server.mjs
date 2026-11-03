import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { createRequestHandler } from '@react-router/express';
import { proxyAdmin, isAdminRequest } from './server/admin-proxy.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.NAWAH_FRONTEND_APP || 'member';
if (!['member', 'admin'].includes(target)) throw new Error('Invalid production frontend target');
const app = express(); app.disable('x-powered-by'); app.use(compression());
app.get('/__frontend-health', (_req, res) => res.json({ status: 'ok', target }));
if (target === 'member') app.use((req, res, next) => isAdminRequest(req.originalUrl) ? proxyAdmin(req, res, process.env.ADMIN_FRONTEND_ORIGIN || 'http://admin:3000') : next());
if (target === 'admin') {
  app.get('/founder-workspace/config.json', (_req, res) => { res.setHeader('Cache-Control', 'private, no-store'); res.json({ apiUrl: process.env.VITE_API_URL }); });
  app.use('/founder-workspace', (_req, res, next) => {
    const origin = new URL(process.env.VITE_API_URL).origin;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${origin}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`);
    next();
  });
  app.get('/strategic-relationships/config.json', (_req, res) => { res.setHeader('Cache-Control', 'private, no-store'); res.json({ apiUrl: process.env.VITE_API_URL }); });
  app.use('/strategic-relationships', (_req, res, next) => {
    const origin = new URL(process.env.VITE_API_URL).origin;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${origin}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`);
    next();
  });
}
const assetsBase = target === 'admin' ? '/admin-assets' : '';
app.use(assetsBase + '/assets', express.static(path.join(root, 'build/client/assets'), { immutable: true, maxAge: '1y' }));
app.use(assetsBase || '/', express.static(path.join(root, 'build/client'), { maxAge: '1h', setHeaders(res, file) { if (file.includes('/founder-workspace/') || file.includes('/strategic-relationships/')) res.setHeader('Cache-Control', 'no-store'); } }));
// Public shared media retain their original URLs on both frontends.
if (target === 'admin') app.use(express.static(path.join(root, 'build/client'), { maxAge: '1h' }));
const build = await import('./build/server/index.js');
app.use(createRequestHandler({ build, mode: 'production' }));
const server = http.createServer(app);
server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); });
