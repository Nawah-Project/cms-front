import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  GitBranch,
  LockKeyhole,
  Map,
  Save,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth/store/authStore';
import { canAdminAccess } from '../admin/adminAccess';
import { read, write, type Localized } from './api';
import { Field, useText, useUnsaved, when } from './shared';
import './roadmaps.css';
type Stage = {
  id: string;
  lane: string;
  title: Localized;
  aim: Localized;
  questions: Localized[];
  output: Localized;
  gate: Localized;
  tool: Localized;
  references: string[];
};
type Template = {
  version: string;
  title: Localized;
  nodes: Stage[];
  edges: { from: string; to: string; return: boolean }[];
  session: Localized[];
};
type MapContent = {
  context: string;
  observations: { kind: string; text: string; source: string }[];
  sources: {
    title: string;
    url: string;
    checked: string;
    status: string;
    summary: string;
  }[];
  notes: Record<string, string>;
};
type SavedMap = {
  id: string;
  title: string;
  content: MapContent;
  revision: number;
  retentionUntil: string;
  updatedAt: string;
};
const path = '/admin/career-consulting/roadmaps';
const blank = (): MapContent => ({
  context: '',
  observations: [],
  sources: [],
  notes: {},
});
export function Roadmaps() {
  const { t } = useText(),
    { user } = useAuth(),
    qc = useQueryClient();
  const [params, setParams] = useSearchParams(),
    selected = params.get('map') ?? '';
  const [page, setPage] = useState(1);
  const [newTitle, setNewTitle] = useState(''),
    [creating, setCreating] = useState(false),
    [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const createKey = useRef({ title: '', requestId: '', retentionUntil: '' });
  const template = useQuery({
    queryKey: ['consulting-map-template', user?.id],
    queryFn: () => read<Template>(path + '/template'),
  });
  const list = useQuery({
    queryKey: ['consulting-maps', user?.id, page],
    queryFn: () =>
      read<{ items: Omit<SavedMap, 'content'>[]; total: number }>(
        path + '?page=' + page,
      ),
  });
  const detail = useQuery({
    queryKey: ['consulting-map', user?.id, selected],
    queryFn: () => read<SavedMap>(path + '/' + selected),
    enabled: !!selected,
    retry: false,
  });
  const canWrite = canAdminAccess(user, 'CAREER_CONSULTING', 'WRITE');
  const change = (id: string) =>
    setParams({ view: 'maps', ...(id ? { map: id } : {}) });
  const reload = async () => {
    await qc.invalidateQueries({ queryKey: ['consulting-maps', user?.id] });
    await qc.invalidateQueries({ queryKey: ['consulting-map', user?.id] });
  };
  return (
    <section aria-label={t('مخططات الاستشارة', 'Consulting roadmaps')}>
      <div className="cc-card soft">
        <div className="cc-actions">
          <Map size={24} />
          <h2>{t('خريطة عملك كمستشار', 'Your consulting practice map')}</h2>
        </div>
        <p>
          {t(
            'ابدأ بالسؤال، واجمع أدلة من الشخص والسوق، واختبر تفسيرك قبل تقديم التوصية. المسارات تتفرع وتعود؛ ليست برنامجًا ثابتًا ولا مراحل أنجزها الشخص.',
            'Start with the question, gather person and market evidence, and test your understanding before recommending. Paths branch and return; this is neither a fixed programme nor recorded client progress.',
          )}
        </p>
        <p className="cc-map-privacy">
          <LockKeyhole size={16} />
          {t(
            'تحضير خاص بالمستشار المالك وRoot فقط. لا دعوة أو حالة أو موافقة تُنشأ من الخريطة؛ لا تُرسل للشخص أو لتحليلات التسويق والبحث.',
            'Private to the owning consultant and Root. No invitation, case or consent is created by this map; it is not sent to the person or marketing/research analytics.',
          )}
        </p>
      </div>
      <div className="cc-actions cc-map-selector">
        <Field name={t('اختر خريطة تحضير', 'Choose a preparation map')}>
          <select value={selected} onChange={(e) => change(e.target.value)}>
            <option value="">
              {t(
                'خريطة الممارسة العامة — بلا بيانات أشخاص',
                'General practice map — no personal data',
              )}
            </option>
            {list.data?.items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
            {selected &&
              !list.data?.items.some((m) => m.id === selected) &&
              detail.data && (
                <option value={selected}>{detail.data.title}</option>
              )}
          </select>
        </Field>
        {canWrite && (
          <button onClick={() => setCreating(!creating)}>
            {t('خريطة خاصة جديدة', 'New private map')}
          </button>
        )}
        {list.data && list.data.total > 30 && (
          <>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              {t('السابق', 'Previous')}
            </button>
            <span>{page}</span>
            <button
              disabled={page * 30 >= list.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('التالي', 'Next')}
            </button>
          </>
        )}
      </div>
      {list.isError && (
        <p role="alert">
          {t('تعذر تحميل قائمة المخططات.', 'Could not load roadmaps.')}
        </p>
      )}
      {creating && canWrite && (
        <form
          className="cc-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError('');
            try {
              if (
                createKey.current.title !== newTitle ||
                !createKey.current.requestId
              )
                createKey.current = {
                  title: newTitle,
                  requestId: crypto.randomUUID(),
                  retentionUntil: new Date(
                    Date.now() + 90 * 86400000,
                  ).toISOString(),
                };
              const m = await write<SavedMap>(path, {
                ...createKey.current,
                content: blank(),
              });
              await reload();
              setCreating(false);
              setNewTitle('');
              createKey.current = {
                title: '',
                requestId: '',
                retentionUntil: '',
              };
              change(m.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Save failed');
            } finally {
              setPending(false);
            }
          }}
        >
          <Field
            name={t(
              'عنوان خاص بلا بيانات اتصال',
              'Private title, without contact details',
            )}
          >
            <input
              required
              minLength={3}
              maxLength={160}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </Field>
          <p>
            {t(
              'تُحفظ 90 يومًا ثم تُحذف تلقائيًا وفق سياسة الاحتفاظ، وتظل نسخها الاحتياطية خاضعة لدورة النسخ الحالية. لا تنشئ هذه الخطوة حسابًا أو موافقة أو حالة.',
              'Retained for 90 days, then automatically deleted under retention policy; backups follow the existing backup cycle. This creates no account, consent or case.',
            )}
          </p>
          <button className="primary" disabled={pending}>
            {t('إنشاء التحضير الخاص', 'Create private preparation')}
          </button>
        </form>
      )}
      {error && (
        <p className="cc-notice cc-error" role="alert">
          {error}
        </p>
      )}
      {template.isPending || (selected && detail.isPending) ? (
        <p role="status">{t('تحميل الخريطة…', 'Loading map…')}</p>
      ) : template.isError || (selected && detail.isError) ? (
        <p role="alert">
          {t(
            'تعذر فتح الخريطة أو ليست متاحة لهذا الحساب.',
            'Could not open this map or it is unavailable to this account.',
          )}
        </p>
      ) : (
        template.data && (
          <MapWorkspace
            key={selected || 'general'}
            template={template.data}
            saved={selected ? detail.data : undefined}
            canWrite={canWrite}
            onSaved={reload}
            onRemoved={() => {
              change('');
              void reload();
            }}
          />
        )
      )}
    </section>
  );
}
function MapWorkspace({
  template,
  saved,
  canWrite,
  onSaved,
  onRemoved,
}: {
  template: Template;
  saved?: SavedMap;
  canWrite: boolean;
  onSaved: () => Promise<void>;
  onRemoved: () => void;
}) {
  const { t, tr, locale } = useText();
  const [stageId, setStageId] = useState('prepare'),
    [content, setContent] = useState<MapContent>(() =>
      structuredClone(saved?.content ?? blank()),
    );
  const [title, setTitle] = useState(saved?.title ?? ''),
    [revision, setRevision] = useState(saved?.revision ?? 0);
  const baseline = useRef(
    JSON.stringify({
      title: saved?.title ?? '',
      content: saved?.content ?? blank(),
    }),
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const dirty =
    !!saved && JSON.stringify({ title, content }) !== baseline.current;
  useUnsaved(dirty);
  const [pendingSave, setPendingSave] = useState<{
    key: string;
    hash: string;
  } | null>(null);
  const stage = template.nodes.find((n) => n.id === stageId)!;
  const kindLabel = (k: string) =>
    ({
      OBSERVED: t('ملاحظة مباشرة', 'Observed'),
      SELF_REPORT: t('مذكور بالمصدر — يحتاج توضيحًا', 'Reported — clarify'),
      QUESTION: t('سؤال مفتوح', 'Open question'),
      HYPOTHESIS: t('احتمال للتحقق', 'Hypothesis to test'),
    })[k] ?? k;
  const note = content.notes[stageId] ?? '';
  async function save() {
    if (!saved) return;
    setBusy(true);
    setError('');
    setMessage('');
    const hash = JSON.stringify({ title, content, revision });
    const key =
      pendingSave?.hash === hash ? pendingSave.key : crypto.randomUUID();
    setPendingSave({ key, hash });
    try {
      const result = await write<SavedMap>(
        path + '/' + saved.id,
        { requestId: key, title, content, revision },
        'PATCH',
      );
      setRevision(result.revision);
      baseline.current = JSON.stringify({ title, content });
      setPendingSave(null);
      setMessage(
        t(
          'حُفظ التحضير على الخادم. لم تُنشأ حالة ولم يُنشر شيء للشخص.',
          'Preparation saved on the server. No case was created and nothing was published to the person.',
        ),
      );
      await onSaved();
    } catch (e) {
      setError(
        t(
          'تعذر الحفظ. النص ما زال هنا. إذا تغيرت النسخة على الخادم انسخ تعديلاتك ثم أعد تحميل الصفحة قبل الحفظ. ',
          'Save failed. Your text remains here. If the server version changed, copy your edits and reload before saving. ',
        ) + (e instanceof Error ? e.message : ''),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {saved && (
        <article className="cc-card cc-map-preparation">
          <span className="cc-pill">
            {t(
              'تحضير قبل المقابلة — ليس خلاصة متفقًا عليها',
              'Pre-intake preparation — not an agreed finding',
            )}
          </span>
          <h2>{saved.title}</h2>
          <p className="cc-content">{content.context}</p>
          <small>
            {t('نسخة محفوظة', 'Saved revision')} {revision} ·{' '}
            {t('احتفاظ حتى', 'Retained until')}{' '}
            {when(saved.retentionUntil, locale)}
          </small>
          {!canWrite && (
            <p className="cc-readonly">{t('قراءة فقط', 'Read only')}</p>
          )}
          {content.observations.length > 0 && (
            <details open>
              <summary>
                {t('ما نعرفه وما يحتاج سؤالًا', 'Evidence and open questions')}
              </summary>
              <div className="cc-map-observations">
                {content.observations.map((o, i) => (
                  <div className="cc-map-observation" key={i}>
                    <span className="cc-pill">{kindLabel(o.kind)}</span>
                    <p className="cc-content">{o.text}</p>
                    <small>{o.source}</small>
                  </div>
                ))}
              </div>
            </details>
          )}
        </article>
      )}
      <div className="cc-map-heading">
        <div>
          <span className="cc-kicker">
            {t(
              'خطة قابلة للتكييف · اضغط أي محطة لشرحها',
              'Adaptable plan · select a stage for guidance',
            )}
          </span>
          <h2>{tr(template.title)}</h2>
          <p>
            {t(
              'خط متصل: اتجاه مقترح · خط متقطع: رجوع عند نقص الأدلة أو تغير الهدف. الفرعان لا يلزمان بنشاطين أو بجلستين.',
              'Solid line: suggested direction · dashed line: return when evidence or goals change. Parallel branches do not mandate two activities or sessions.',
            )}
          </p>
        </div>
        <GitBranch size={28} aria-hidden />
      </div>
      <div className={'cc-map-viewport' + (expanded ? ' expanded' : '')}>
        <Diagram
          template={template}
          stageId={stageId}
          select={(id) => {
            setStageId(id);
            setTimeout(
              () => detailRef.current?.focus({ preventScroll: false }),
              0,
            );
          }}
        />
      </div>
      <div className="cc-map-expand">
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? <ArrowUp size={17} /> : <ArrowDown size={17} />}
          {expanded
            ? t('تصغير مساحة الخريطة', 'Collapse map area')
            : t('إظهار الخريطة كاملة', 'Show the full map')}
        </button>
      </div>
      <article
        ref={detailRef}
        tabIndex={-1}
        className="cc-card cc-map-stage"
        aria-labelledby="cc-map-stage-title"
      >
        <div className="cc-actions">
          <span className="cc-pill">
            {t(
              'شرح المحطة — إرشاد للمستشار',
              'Stage guide — for the consultant',
            )}
          </span>
        </div>
        <h2 id="cc-map-stage-title">{tr(stage.title)}</h2>
        <p>{tr(stage.aim)}</p>
        <div className="cc-row">
          <section>
            <h3>{t('تسأل وتستمع لـ', 'Ask and listen for')}</h3>
            <ul className="cc-list">
              {stage.questions.map((q, i) => (
                <li key={i}>{tr(q)}</li>
              ))}
            </ul>
            <h3>{t('نخرج بإيه؟', 'Expected evidence')}</h3>
            <p>{tr(stage.output)}</p>
          </section>
          <section>
            <h3>{t('نكمل إمتى أو نرجع؟', 'Continue or return?')}</h3>
            <p>{tr(stage.gate)}</p>
            <h3>{t('تستخدم إيه في نواة؟', 'Use in Nawah')}</h3>
            <p>{tr(stage.tool)}</p>
            <a className="cc-button" href="/admin/career-consulting?view=cases">
              {t('الحالات والمتابعة', 'Cases & follow-up')}
            </a>
            <small className="cc-map-tool-note">
              {t(
                'الرابط يفتح قائمة الحالات؛ لا ينقل هذا التحضير إلى أي حالة. احفظ تعديلاتك قبل الانتقال.',
                'Opens the case list; this preparation is not transferred to any case. Save before leaving.',
              )}
            </small>
          </section>
        </div>
        <div className="cc-detail">
          <h3>
            <BookOpen size={17} />{' '}
            {t('قراءة مساعدة لهذه المرحلة', 'Reading for this stage')}
          </h3>
          <ul className="cc-list" dir="ltr">
            {stage.references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <small>
            {t(
              'أرقام الصفحات المطبوعة في الكتب المرفقة؛ الصياغة هنا أصلية ومكيّفة للاستشارة المهنية غير التشخيصية.',
              'Printed page numbers in the supplied books. This original guidance is adapted to non-diagnostic career consulting.',
            )}
          </small>
        </div>
        {saved && (
          <Field
            name={t(
              'تحضيرك الخاص لهذه المحطة — ليس محضر جلسة',
              'Your private preparation for this stage — not a session record',
            )}
          >
            <textarea
              aria-label={t(
                'تحضيرك الخاص لهذه المحطة — ليس محضر جلسة',
                'Your private preparation for this stage — not a session record',
              )}
              rows={7}
              maxLength={5000}
              readOnly={!canWrite}
              value={note}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  notes: { ...c.notes, [stageId]: e.target.value },
                }))
              }
            />
          </Field>
        )}
      </article>
      <details className="cc-card">
        <summary>
          {t(
            'الجلسة الأولى: دليل مرن للاستخدام أمامك',
            'First session: a flexible desk guide',
          )}
        </summary>
        <p>
          {t(
            'نحو 60–75 دقيقة إن ناسبكما؛ هذا تقدير تنظيمي لا بروتوكولًا إلزاميًا. اتفقا على الوقت والاستراحات.',
            'About 60–75 minutes if suitable; a planning estimate, not a required protocol. Agree timing and breaks.',
          )}
        </p>
        <ol className="cc-list">
          {template.session.map((s, i) => (
            <li key={i}>{tr(s)}</li>
          ))}
        </ol>
        <p>
          {t(
            'لا تبدأ بإعادة كتابة CV أو نصيحة ترك المجال. لو لم تتضح الأولوية، اجعل الخطوة التالية جمع معلومة لا فرض قرار.',
            'Do not start by rewriting the CV or advising a career exit. If the priority is unclear, gather information rather than force a decision.',
          )}
        </p>
      </details>
      {saved && content.sources.length > 0 && (
        <details className="cc-card">
          <summary>
            {t(
              'المصادر ومراجعة السوق — بتاريخها وحدودها',
              'Sources and market review — dated and qualified',
            )}
          </summary>
          <p>
            {t(
              'عينة قصدية وليست إحصاء للسوق أو قائمة فرص مضمونة. راجع حالة الإعلان والأهلية قبل أي تقديم. المصدر غير المتاح لم تتم مراجعته كاملًا.',
              'A purposive sample, not market statistics or guaranteed leads. Recheck availability and eligibility before applying. Unavailable sources were not fully reviewed.',
            )}
          </p>
          <div className="cc-map-sources">
            {content.sources.map((s, i) => (
              <article key={i}>
                <h3>{s.title}</h3>
                <span className="cc-pill">{s.status}</span>
                <p className="cc-content">{s.summary}</p>
                <small>
                  {t('تم الفحص', 'Checked')} <bdi>{s.checked}</bdi>
                </small>
                {safeUrl(s.url) && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cc-button"
                  >
                    <ExternalLink size={15} />
                    {t('المصدر الأصلي', 'Original source')}
                  </a>
                )}
              </article>
            ))}
          </div>
        </details>
      )}
      {saved && canWrite && (
        <details className="cc-card">
          <summary>
            {t(
              'تحرير عنوان وسياق التحضير',
              'Edit preparation title and context',
            )}
          </summary>
          <Field name={t('العنوان الخاص', 'Private title')}>
            <input
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field name={t('سياق التحضير', 'Preparation context')}>
            <textarea
              rows={6}
              maxLength={6000}
              value={content.context}
              onChange={(e) =>
                setContent((c) => ({ ...c, context: e.target.value }))
              }
            />
          </Field>
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  t(
                    'حذف خريطة التحضير الخاصة فقط؟ لا يتغير أي حساب أو حالة. تتبع النسخ الاحتياطية دورة الاحتفاظ الحالية.',
                    'Delete only this private preparation map? Accounts and cases are unchanged. Backups follow the existing retention cycle.',
                  ),
                )
              )
                return;
              setBusy(true);
              try {
                await write(path + '/' + saved.id, {}, 'DELETE');
                onRemoved();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Delete failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('حذف التحضير', 'Delete preparation')}
          </button>
        </details>
      )}
      {error && (
        <p role="alert" className="cc-notice cc-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="cc-notice">
          {message}
        </p>
      )}
      {saved && canWrite && (
        <div className="cc-map-save">
          <span>
            {dirty
              ? t('تعديلات غير محفوظة', 'Unsaved changes')
              : t(
                  'تحضير محفوظ — غير منشور للشخص',
                  'Saved preparation — not published to the person',
                )}
          </span>
          <button
            className="primary"
            disabled={busy || !dirty || title.trim().length < 3}
            onClick={() => void save()}
          >
            <Save size={16} />
            {busy
              ? t('جارٍ الحفظ…', 'Saving…')
              : t('حفظ التحضير الخاص', 'Save private preparation')}
          </button>
        </div>
      )}
      <p className="muted">
        {t(
          'المراجع: Dugger، Foundations of Career Counseling؛ Tang، Career Development and Counseling؛ Rochat، Mapping Career Counseling Interventions؛ Capuzzi & Stauffer، Career Counseling. أنشطة نوعية ومتابعة مهنية؛ ليست تشخيصًا أو اختبارًا مقننًا أو ضمان توظيف.',
          'References: Dugger, Foundations of Career Counseling; Tang, Career Development and Counseling; Rochat, Mapping Career Counseling Interventions; Capuzzi & Stauffer, Career Counseling. Qualitative professional support, not diagnosis, standardised testing or a hiring guarantee.',
        )}
      </p>
    </>
  );
}
function safeUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
const rows = [
  ['prepare', 'agreement', 'question'],
  ['self', 'market'],
  ['understand', 'choose'],
  ['ux-test', 'alternative-test'],
  ['review', 'decide', 'followup'],
];
function Diagram({
  template,
  stageId,
  select,
}: {
  template: Template;
  stageId: string;
  select: (id: string) => void;
}) {
  const { t, tr, locale } = useText(),
    ref = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ d: string; back: boolean }[]>([]),
    [size, setSize] = useState({ w: 1, h: 1 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const outer = el.getBoundingClientRect();
      setSize({ w: el.clientWidth, h: el.clientHeight });
      const mobile = el.clientWidth < 650;
      setPaths(
        template.edges.map((e) => {
          const a = el
              .querySelector<HTMLElement>(`[data-stage="${e.from}"]`)!
              .getBoundingClientRect(),
            b = el
              .querySelector<HTMLElement>(`[data-stage="${e.to}"]`)!
              .getBoundingClientRect();
          const sameRow = Math.abs(a.top - b.top) < 3;
          let ax: number, ay: number, bx: number, by: number, d: string;
          if (sameRow && !mobile && !e.return) {
            const forward = a.left < b.left;
            ax = (forward ? a.right : a.left) - outer.left;
            bx = (forward ? b.left : b.right) - outer.left;
            ay = a.top + a.height / 2 - outer.top;
            by = b.top + b.height / 2 - outer.top;
            d = `M${ax},${ay} C${(ax + bx) / 2},${ay} ${(ax + bx) / 2},${by} ${bx},${by}`;
          } else if (e.return) {
            ax = a.left - outer.left;
            ay = a.top + a.height / 2 - outer.top;
            bx = b.left - outer.left;
            by = b.top + b.height / 2 - outer.top;
            const rail = mobile ? 9 : 14;
            d = `M${ax},${ay} C${rail},${ay} ${rail},${ay} ${rail},${ay - 30} L${rail},${by + 30} Q${rail},${by} ${bx},${by}`;
          } else {
            ax = a.left + a.width / 2 - outer.left;
            ay = a.bottom - outer.top;
            bx = b.left + b.width / 2 - outer.left;
            by = b.top - outer.top;
            const mid = (ay + by) / 2;
            d = `M${ax},${ay} C${ax},${mid} ${bx},${mid} ${bx},${by}`;
          }
          return { d, back: e.return };
        }),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const n of el.querySelectorAll('[data-stage]')) observer.observe(n);
    measure();
    return () => observer.disconnect();
  }, [template, locale]);
  return (
    <div className="cc-practice-map" ref={ref}>
      <svg
        className="cc-map-wires"
        aria-hidden="true"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
      >
        <defs>
          <marker
            id="cc-map-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10z" fill="#719682" />
          </marker>
        </defs>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.back ? '#a48a47' : '#719682'}
            strokeWidth={p.back ? 1.5 : 2}
            strokeDasharray={p.back ? '5 6' : undefined}
            markerEnd="url(#cc-map-arrow)"
          />
        ))}
      </svg>
      {rows.map((r, index) => (
        <div className={'cc-map-row row-' + r.length} key={index}>
          {r.map((id) => {
            const n = template.nodes.find((n) => n.id === id)!;
            return (
              <button
                data-stage={id}
                key={id}
                aria-pressed={stageId === id}
                onClick={() => select(id)}
                className={'cc-map-node lane-' + n.lane}
              >
                <span className="cc-map-number" aria-hidden>
                  {String(template.nodes.indexOf(n) + 1).padStart(2, '0')}
                </span>
                <strong>{tr(n.title)}</strong>
                <small>{tr(n.aim)}</small>
                <span className="cc-map-open">
                  {t('الأسئلة والأداة والمراجع', 'Questions, tool & reading')} ←
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
