// Presentation-only lifecycle boundary. The domain keeps its repository and application logic.
// A ShadowRoot isolates existing domain styles without a second document, router or sidebar.
export function createWorkspaceEnvironment(root, { language, view, onNavigate }) {
  const native = root.ownerDocument, host = root.host;
  const lifetime = new AbortController(), timers = new Set(), cleanups = new Set();
  let disposed = false;
  const listen = (target, type, listener, options) => target.addEventListener(type, listener, { ...(typeof options === 'boolean' ? { capture: options } : options), signal: lifetime.signal });
  const scopedDocument = {
    getElementById: id => root.getElementById(id),
    querySelector: selector => root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
    createElement: (...args) => native.createElement(...args),
    createElementNS: (...args) => native.createElementNS(...args),
    addEventListener: (type, listener, options) => listen(root, type, listener, options),
    get activeElement() { return root.activeElement; },
    get documentElement() { return host; },
    get body() { return root; },
    get fonts() { return native.fonts; },
    set title(value) { if (!disposed) native.title = value; },
  };
  return {
    document: scopedDocument,
    window: {
      addEventListener: (type, listener, options) => listen(globalThis.window, type, listener, options),
      matchMedia: query => { const media = globalThis.matchMedia(query); return { get matches() { return media.matches; }, addEventListener: (type, listener) => listen(media, type, listener) }; },
      scrollTo: () => host.scrollIntoView({ block: 'start' }),
    },
    location: { hash: '#' + view, search: '?lang=' + language, reload: () => globalThis.location.reload() },
    history: { replaceState: (_state, _unused, url) => onNavigate(String(url).split('#')[1]) },
    language, view, onNavigate,
    fetch: (url, options = {}) => globalThis.fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, lifetime.signal]) : lifetime.signal }),
    setTimeout: (fn, delay) => { const timer = globalThis.setTimeout(() => { timers.delete(timer); if (!disposed) fn(); }, delay); timers.add(timer); return timer; },
    clearTimeout: timer => { timers.delete(timer); globalThis.clearTimeout(timer); },
    onDispose(fn) { if(disposed)fn();else cleanups.add(fn); },
    dispose() { disposed = true; for(const cleanup of cleanups)cleanup(); cleanups.clear(); lifetime.abort(); for (const timer of timers) globalThis.clearTimeout(timer); timers.clear(); root.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); },
  };
}
