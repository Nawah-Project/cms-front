import http from 'node:http';
const adminPath = path => path === '/admin' || path.startsWith('/admin/') || path === '/admin-assets' || path.startsWith('/admin-assets/') || path.startsWith('/founder-workspace/');
export function isAdminRequest(value) {
  const url = new URL(value, 'http://local');
  if (adminPath(url.pathname)) return true;
  return url.pathname === '/__manifest' && url.searchParams.getAll('p').some(adminPath);
}
const hop = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
export function proxyAdmin(req, res, origin) {
  const target = new URL(origin);
  if (target.protocol !== 'http:' || target.username || target.password || target.pathname !== '/') throw new Error('Invalid internal admin origin');
  const headers = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !hop.has(key.toLowerCase())));
  headers['x-forwarded-host'] = req.headers.host;
  const upstream = http.request({ hostname: target.hostname, port: target.port || 80, path: req.originalUrl || req.url, method: req.method, headers }, response => {
    res.statusCode = response.statusCode || 502;
    for (const [name, value] of Object.entries(response.headers)) if (!hop.has(name.toLowerCase()) && value !== undefined) res.setHeader(name, value);
    response.pipe(res);
  });
  upstream.setTimeout(30000, () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) { res.statusCode = 503; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<main dir="rtl"><h1>مساحة الإدارة غير متاحة مؤقتًا</h1><p>حاول مرة أخرى. تجربة الأعضاء مستقلة.</p><a href="/">العودة إلى نواة</a></main>'); } else res.destroy(); });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableFinished) upstream.destroy(); });
  req.pipe(upstream);
}
