// Appearance preferences only. No account or workspace contents are stored here.
export const ADMIN_APPEARANCE_KEY = 'nawah.admin.appearance.v1';
export const DEFAULT_ADMIN_APPEARANCE = 'dark';
export const normalizeAppearance = value => ['light','dark','system'].includes(value) ? value : DEFAULT_ADMIN_APPEARANCE;
export const resolveAppearance = (value, prefersDark) => normalizeAppearance(value) === 'system' ? (prefersDark ? 'dark' : 'light') : normalizeAppearance(value);
export const isAdminPath = path => path === '/admin' || path.startsWith('/admin/');
export function readAppearance(storage) { try { return normalizeAppearance(storage.getItem(ADMIN_APPEARANCE_KEY) ?? storage.getItem('nawah.founder.appearance.v1')); } catch { return DEFAULT_ADMIN_APPEARANCE; } }
// Constant, self-contained pre-paint bootstrap. Values from storage are whitelisted.
export const ADMIN_APPEARANCE_BOOTSTRAP = `(()=>{try{const p=location.pathname;if(p!='/admin'&&!p.startsWith('/admin/'))return;let m=localStorage.getItem('${ADMIN_APPEARANCE_KEY}')??localStorage.getItem('nawah.founder.appearance.v1');if(!['light','dark','system'].includes(m))m='dark';document.documentElement.dataset.adminTheme=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;}catch{document.documentElement.dataset.adminTheme='dark';}})();`;
