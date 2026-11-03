import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useI18n } from '../../i18n';
// @ts-expect-error Framework-independent, whitelisted preference helpers.
import { ADMIN_APPEARANCE_KEY, readAppearance, resolveAppearance } from './admin-appearance.mjs';
type Appearance = 'dark' | 'light' | 'system';
export function AdminAppearance({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [mode, setMode] = useState<Appearance>('dark');
  const [prefersDark, setPrefersDark] = useState(false);
  const [temporary, setTemporary] = useState(false);
  useLayoutEffect(() => {
    let stored: Appearance = 'dark';
    try { stored = readAppearance(window.localStorage); } catch { /* Session appearance still works. */ }
    setMode(stored);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(media.matches);
    const changed = () => setPrefersDark(media.matches);
    const storedElsewhere = (event: StorageEvent) => { if (event.key === ADMIN_APPEARANCE_KEY || event.key === 'nawah.founder.appearance.v1' || event.key === null) setMode(readAppearance(window.localStorage)); };
    media.addEventListener('change', changed); window.addEventListener('storage', storedElsewhere);
    return () => { media.removeEventListener('change', changed); window.removeEventListener('storage', storedElsewhere); delete document.documentElement.dataset.adminTheme; };
  }, []);
  useLayoutEffect(() => { document.documentElement.dataset.adminTheme = resolveAppearance(mode, prefersDark); }, [mode, prefersDark]);
  // Keep display preferences separate from saved workspace documents and API revisions.
  const choose = (next: Appearance) => {
    setMode(next);
    try { localStorage.setItem(ADMIN_APPEARANCE_KEY, next); setTemporary(false); } catch { setTemporary(true); }
  };
  const choices = [
    { id: 'dark' as const, ar: 'ليلي', en: 'Dark', Icon: Moon },
    { id: 'light' as const, ar: 'نهاري', en: 'Light', Icon: Sun },
    { id: 'system' as const, ar: 'حسب الجهاز', en: 'System', Icon: Monitor },
  ];
  return <>
    <section className="admin-appearance-bar" aria-label={locale === 'ar' ? 'مظهر الإدارة' : 'Admin appearance'}>
      <div>
        <h2>{locale === 'ar' ? 'مظهر الإدارة' : 'Admin appearance'}</h2>
        <p>{locale === 'ar' ? 'اختيارك يسري على أقسام الإدارة ومحفوظ في هذا المتصفح.' : 'Your preference applies across administration and is saved in this browser.'}</p>
      </div>
      <div className="admin-appearance-options" role="group" aria-label={locale === 'ar' ? 'اختيار المظهر' : 'Appearance options'}>
        {choices.map(({ id, ar, en, Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => choose(id)}><Icon size={17} aria-hidden="true" /><span>{locale === 'ar' ? ar : en}</span></button>)}
      </div>
      {temporary && <p role="status" className="admin-appearance-note">{locale === 'ar' ? 'المظهر متاح لهذه الجلسة؛ المتصفح لم يسمح بحفظ التفضيل.' : 'Appearance is active for this session; the browser could not save the preference.'}</p>}
    </section>
    {children}
  </>;
}
