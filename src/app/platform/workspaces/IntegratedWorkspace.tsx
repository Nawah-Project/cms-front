import { useEffect, useRef, useState } from 'react';
import { Navigate, useBlocker, useLocation, useNavigate, useParams } from 'react-router';
import { useI18n } from '../../i18n';
import { workspaceViews, type WorkspaceName } from './views';
// @ts-expect-error The lifecycle adapter is a framework-independent browser module.
import { createWorkspaceEnvironment } from './runtime.mjs';

type Controller = { isDirty(): boolean; update(view: string, language: string): void | Promise<void>; destroy(): void };
export function IntegratedWorkspace({ name }: { name: WorkspaceName }) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const { view } = useParams(), location = useLocation(), navigate = useNavigate();
  const { locale } = useI18n();
  const available = workspaceViews[name];
  const legacyView = location.hash.slice(1);
  const current = view || (available.some(item => item[0] === legacyView) ? legacyView : available[0][0]);
  const valid = available.some(item => item[0] === current);
  const latest = useRef({ current, locale }); latest.current = { current, locale };
  const [failure, setFailure] = useState(false), [retry, setRetry] = useState(0);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname && !!controller.current?.isDirty());
  useEffect(() => {
    if (blocker.state === 'blocked') confirm.current?.showModal();
    else confirm.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    if (!host.current || !valid) return;
    let cancelled = false, instance: Controller | null = null;
    const shadow = host.current.shadowRoot || host.current.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<link rel="stylesheet" href="/${name}/ui/styles.css"><div id="app"><p role="status">جارٍ التحميل… / Loading…</p></div><dialog id="editor" aria-labelledby="dialog-title"></dialog><div id="announcer" class="sr-only" aria-live="polite"></div><div id="notifications" role="status" aria-live="polite"></div>`;
    const environment = createWorkspaceEnvironment(shadow, { language: latest.current.locale, view: latest.current.current,
      onNavigate: (next: string) => { if (available.some(item => item[0] === next)) navigate(`/admin/${name}/${next}`); } });
    setFailure(false);
    // These self-hosted modules are shipped only in the administrator image.
    const url = `/${name}/ui/app.mjs`;
    import(/* @vite-ignore */ url).then(module => {
      if (cancelled) return null;
      return module.mountWorkspace(environment) as Promise<Controller>;
    }).then(async value => {
      if (!value) return;
      instance = value;
      if (cancelled) { instance.destroy(); return; }
      controller.current = instance;
      await instance.update(latest.current.current, latest.current.locale);
    }).catch(() => { if (!cancelled) { environment.dispose(); setFailure(true); } });
    return () => { cancelled = true; controller.current = null; instance?.destroy(); environment.dispose(); shadow.replaceChildren(); };
    // A subview/locale change updates the same instance, preserving forms and presentation state.
  }, [name, retry, valid]);
  useEffect(() => { let active = true; Promise.resolve(controller.current?.update(current, locale)).catch(() => { if (active) setFailure(true); }); return () => { active = false; }; }, [current, locale]);
  useEffect(() => { if (location.hash && valid) navigate(`/admin/${name}/${current}`, { replace: true }); }, [location.hash, valid, current, name, navigate]);
  if (!valid) return <Navigate to={`/admin/${name}/${available[0][0]}`} replace />;

  return <>
    {failure && <div role="alert" className="rounded-xl border border-red-200 p-5">
      <p>{locale === 'ar' ? 'تعذر تحميل القسم. لم تتغير بياناتك المحفوظة.' : 'The workspace could not load. Saved data is unchanged.'}</p>
      <button type="button" onClick={() => setRetry(value => value + 1)}>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
    </div>}
    <div ref={host} data-integrated-workspace={name} className="min-w-0" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} />
    <dialog ref={confirm} aria-labelledby="workspace-leave-title" onCancel={event => { event.preventDefault(); if (blocker.state === 'blocked') blocker.reset(); }} className="m-auto max-w-md rounded-2xl border border-border bg-white p-6 text-text-primary shadow-xl backdrop:bg-black/40">
      <h2 id="workspace-leave-title" className="text-lg font-bold">{locale === 'ar' ? 'عندك تعديل لم يُحفظ' : 'You have unsaved changes'}</h2>
      <p className="my-4">{locale === 'ar' ? 'ارجع لحفظ المسودة أو تصديرها. المغادرة تتخلّى عن التعديل غير المحفوظ، ولا تتراجع عن طلب حفظ أُرسل للسيرفر.' : 'Stay to save or export your draft. Leaving discards unsaved changes and does not undo a save already sent to the server.'}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg bg-emerald-900 px-4 py-2 text-white" onClick={() => { if (blocker.state === 'blocked') blocker.reset(); }}>{locale === 'ar' ? 'ابقَ مع المسودة' : 'Stay with draft'}</button>
        <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); }}>{locale === 'ar' ? 'غادر دون الاحتفاظ بالمسودة' : 'Leave without draft'}</button>
      </div>
    </dialog>
  </>;
}
