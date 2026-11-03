// Appearance preferences only. No account or workspace contents are stored here.
export const FOUNDER_APPEARANCE_KEY = 'nawah.founder.appearance.v1';
export const DEFAULT_FOUNDER_APPEARANCE = 'dark';
export const normalizeAppearance = value => ['light','dark','system'].includes(value) ? value : DEFAULT_FOUNDER_APPEARANCE;
export const resolveAppearance = (value, prefersDark) => normalizeAppearance(value) === 'system' ? (prefersDark ? 'dark' : 'light') : normalizeAppearance(value);
export const isFounderPath = path => path === '/admin/founder-workspace' || path.startsWith('/admin/founder-workspace/');
export function readAppearance(storage) { try { return normalizeAppearance(storage.getItem(FOUNDER_APPEARANCE_KEY)); } catch { return DEFAULT_FOUNDER_APPEARANCE; } }
// Constant, self-contained pre-paint bootstrap. Values from storage are whitelisted.
export const FOUNDER_APPEARANCE_BOOTSTRAP = `(()=>{try{const p=location.pathname;if(p!='/admin/founder-workspace'&&!p.startsWith('/admin/founder-workspace/'))return;let m=localStorage.getItem('${FOUNDER_APPEARANCE_KEY}');if(!['light','dark','system'].includes(m))m='dark';document.documentElement.dataset.founderTheme=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;}catch{document.documentElement.dataset.founderTheme='dark';}})();`;
