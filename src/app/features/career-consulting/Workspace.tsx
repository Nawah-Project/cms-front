import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  BriefcaseBusiness,
  Compass,
  Handshake,
  Map,
  Plus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router';
import { ApiError } from '../../lib/api-client';
import { canAdminAccess } from '../../platform/access/adminAccess';
import { useAuth } from '../auth/store/authStore';
import {
  base,
  read,
  write,
  type CaseData,
  type CaseSummary,
  type Catalog,
} from './api';
import { Roadmaps } from './Roadmaps';
import { CaseWorkspace } from './CaseWorkspace';
import './consulting.css';
import { Learning, LessonView } from './PracticeGuide';
import {
  Empty,
  Field,
  unsavedEditors,
  useText,
  when,
  type Perform,
} from './shared';
export default function ConsultingWorkspace({
  member = false,
}: {
  member?: boolean;
}) {
  const { t, locale, label } = useText();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selected = params.get('case') ?? '';
  const view = member ? 'cases' : (params.get('view') ?? 'cases');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [help, setHelp] = useState('');
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      unsavedEditors.size > 0 &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (
        window.confirm(
          t(
            'توجد تعديلات غير محفوظة. اتركها وانتقل؟',
            'There are unsaved changes. Leave them and continue?',
          ),
        )
      )
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, locale]);
  useEffect(() => {
    if (!help) return;
    document.getElementById('consulting-help')?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelp('');
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [help]);
  const canWrite =
    !member && canAdminAccess(user, 'CAREER_CONSULTING', 'WRITE');
  const list = useQuery({
    queryKey: ['consulting', user?.id, member, 'list', search, page],
    queryFn: () =>
      read<{ items: CaseSummary[]; total: number }>(
        `${base(member)}/cases?search=${encodeURIComponent(search)}&page=${page}`,
      ),
  });
  const detail = useQuery({
    queryKey: ['consulting', user?.id, member, selected],
    queryFn: () => read<CaseData>(`${base(member)}/cases/${selected}`),
    enabled: !!selected,
    retry: false,
  });
  const catalog = useQuery({
    queryKey: ['consulting-catalog', user?.id],
    queryFn: () => read<Catalog>('/admin/career-consulting/catalog'),
    enabled: !member,
  });
  const perform: Perform = useCallback(
    async (action) => {
      setBusy(true);
      setError('');
      setNotice('');
      try {
        const result = await action();
        await qc.invalidateQueries({ queryKey: ['consulting', user?.id] });
        setNotice(t('تم الحفظ على الخادم.', 'Saved on the server.'));
        return result;
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 409
            ? t(
                'حصل تعارض مع نسخة أحدث. نصك ما زال هنا: انسخه أو راجعه، ثم أعد تحميل النسخة قبل الحفظ. لا تعيد الإرسال بنسخة قديمة.',
                'A newer version conflicts with your draft. Your text remains here: copy or review it, then reload the current version before saving.',
              )
            : e instanceof Error
              ? e.message
              : t('تعذر الحفظ. أعد المحاولة.', 'Save failed. Try again.'),
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [qc, user?.id, locale],
  );
  const select = (id: string) => {
    setParams({
      ...(view !== 'cases' ? { view } : {}),
      ...(id ? { case: id } : {}),
    });
    setError('');
    setNotice('');
  };
  return (
    <div className="cc" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="cc-hero">
        <div>
          <div className="cc-kicker">NAWAH · CAREER CONSULTING</div>
          <h1>
            {member
              ? t('استشارتي المهنية', 'My career consultation')
              : t('الاستشارات المهنية', 'Career Consulting')}
          </h1>
          <p>
            {member
              ? t(
                  'مساحة اتفاقاتك وعملك المشترك مع المستشار. قرارك لك، وطلب التعديل متاح أثناء العمل.',
                  'Your agreements and shared work with your consultant. The decision is yours; you can ask to revise the direction.',
                )
              : t(
                  'افهم الطلب، اتفق على اتجاه، اختر مساعدة لها سبب، وراجع فائدتها مع الشخص.',
                  'Understand the request, agree a direction, choose purposeful support, and review its value with the person.',
                )}
          </p>
        </div>
        {member ? (
          <Handshake size={44} aria-hidden />
        ) : (
          <Compass size={44} aria-hidden />
        )}
      </div>
      {!member && (
        <nav
          className="cc-nav"
          aria-label={t('أقسام الاستشارة', 'Consulting sections')}
        >
          {[
            ['cases', 'الحالات والمتابعة', 'Cases & follow-up', Users],
            ['learn', 'تعلّم الممارسة', 'Learn the practice', BookOpen],
            [
              'reference',
              'مرجع الأنشطة',
              'Activity reference',
              BriefcaseBusiness,
            ],
            ['maps', 'مخططات', 'Roadmaps', Map],
          ].map(([id, a, b, Icon]) => {
            const I = Icon as typeof Users;
            return (
              <button
                key={String(id)}
                aria-pressed={view === id}
                onClick={() =>
                  setParams({
                    view: String(id),
                    ...(selected ? { case: selected } : {}),
                  })
                }
              >
                <I size={17} />
                {t(String(a), String(b))}
              </button>
            );
          })}
        </nav>
      )}
      {error && (
        <div className="cc-notice cc-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="cc-notice" role="status">
          {notice}
        </div>
      )}
      {view === 'maps' && !member ? (
        <Roadmaps />
      ) : view !== 'cases' && !member ? (
        catalog.isPending ? (
          <p role="status">{t('تحميل الدليل…', 'Loading guide…')}</p>
        ) : catalog.data ? (
          <Learning catalog={catalog.data} mode={view} onHelp={setHelp} />
        ) : (
          <div role="alert">
            {t(
              'تعذر تحميل مرجع الممارسة.',
              'Could not load the practice reference.',
            )}
          </div>
        )
      ) : (
        <>
          {!selected ? (
            <>
              <div className="cc-actions">
                <Field name={t('ابحث عن حالة', 'Find a case')}>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </Field>
                {canWrite && (
                  <button
                    className="primary"
                    onClick={() => setCreating(!creating)}
                  >
                    <Plus size={16} />
                    {t('حالة جديدة', 'New case')}
                  </button>
                )}
              </div>
              {creating && (
                <CreateCase
                  perform={perform}
                  busy={busy}
                  onCreated={(id) => {
                    setCreating(false);
                    select(id);
                  }}
                />
              )}
              {list.isPending ? (
                <p role="status">{t('تحميل الحالات…', 'Loading cases…')}</p>
              ) : list.error ? (
                <div className="cc-notice cc-error" role="alert">
                  {t('تعذر تحميل الحالات.', 'Could not load cases.')}{' '}
                  <button onClick={() => list.refetch()}>
                    {t('أعد المحاولة', 'Retry')}
                  </button>
                </div>
              ) : !list.data?.items.length ? (
                <Empty>
                  {member
                    ? t(
                        'لا توجد دعوة استشارة متاحة لحسابك حاليًا.',
                        'There is no consultation invitation available for your account.',
                      )
                    : t(
                        'ابدأ بمسودة لشخص تختاره. لا تُرسل دعوة أو تمنح وصولًا قبل الإجراء الصريح.',
                        'Start with a draft for a person you choose. Invitations and access require an explicit action.',
                      )}
                </Empty>
              ) : (
                <>
                  <div className="cc-grid">
                    {list.data.items.map((c) => (
                      <article className="cc-card" key={c.id}>
                        <span className="cc-pill">{label(c.status)}</span>
                        <h2 className="mt-3">{c.user.name}</h2>
                        <p>{c.title}</p>
                        <small>
                          {t('المستشار', 'Consultant')}: {c.owner.name}
                        </small>
                        <p className="muted">
                          {t('آخر تحديث', 'Updated')}:{' '}
                          {when(c.updatedAt, locale)}
                        </p>
                        {!member && (
                          <p>
                            {c._count.submissions}{' '}
                            {t(
                              'تسليم ينتظر المراجعة',
                              'submission(s) awaiting review',
                            )}
                          </p>
                        )}
                        <button
                          className="primary"
                          onClick={() => select(c.id)}
                        >
                          {t('افتح مساحة الحالة', 'Open case workspace')}
                        </button>
                      </article>
                    ))}
                  </div>
                  <div className="cc-actions">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('السابق', 'Previous')}
                    </button>
                    <span>{page}</span>
                    <button
                      disabled={page * 30 >= list.data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t('التالي', 'Next')}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <button className="link" onClick={() => select('')}>
                {t('العودة للحالات والمتابعة', 'Back to cases & follow-up')}
              </button>
              {detail.isPending ? (
                <p role="status">{t('تحميل الحالة…', 'Loading case…')}</p>
              ) : detail.data ? (
                <CaseWorkspace
                  key={selected}
                  c={detail.data}
                  member={member}
                  catalog={catalog.data}
                  perform={perform}
                  busy={busy}
                  onHelp={setHelp}
                />
              ) : (
                <div className="cc-notice cc-error" role="alert">
                  {t(
                    'الحالة غير متاحة أو لا تملك صلاحية الوصول.',
                    'This case is unavailable or you do not have access.',
                  )}
                  <button onClick={() => detail.refetch()}>
                    {t('إعادة التحميل', 'Reload')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {help && catalog.data && (
        <div
          className="cc-help"
          id="consulting-help"
          tabIndex={-1}
          role="region"
          aria-label={t('مرجع أثناء العمل', 'In-context reference')}
        >
          <button onClick={() => setHelp('')}>
            {t(
              'إغلاق المرجع — استمر في عملك',
              'Close reference · continue working',
            )}
          </button>
          <LessonView catalog={catalog.data} id={help} />
        </div>
      )}
    </div>
  );
}

export function CreateCase({
  perform,
  busy,
  onCreated,
}: {
  perform: Perform;
  busy: boolean;
  onCreated: (id: string) => void;
}) {
  const { t } = useText();
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [days, setDays] = useState(90);
  const candidates = useQuery({
    queryKey: ['consulting-candidates', search],
    queryFn: () =>
      read<
        {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          targetJobTitle: string | null;
        }[]
      >(
        '/admin/career-consulting/candidates?search=' +
          encodeURIComponent(search),
      ),
  });
  return (
    <form
      className="cc-card soft"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await perform(() =>
          write('/admin/career-consulting/cases', {
            userId,
            title,
            purpose,
            retentionUntil: new Date(
              Date.now() + days * 86400000,
            ).toISOString(),
          }),
        );
        if (r) onCreated(r.id);
      }}
    >
      <h2>{t('مسودة اتفاق خدمة', 'Draft service agreement')}</h2>
      <p>
        {t(
          'الاستشارة مستقلة عن البحث. إنشاء المسودة لا يضيف الشخص إلى دراسة ولا يغير رحلته.',
          'Consulting is separate from research. Creating a draft does not enroll the person in research or change their journey.',
        )}
      </p>
      <div className="cc-row">
        <Field name={t('ابحث بالاسم أو البريد', 'Search by name or email')}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field name={t('الشخص', 'Person')}>
          <select
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">{t('اختر حسابًا', 'Choose an account')}</option>
            {candidates.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.email} ·{' '}
                {u.targetJobTitle ?? t('التخصص غير محدد', 'No specialism')}{' '}
                {!u.emailVerified
                  ? t('· البريد غير مؤكد', '· email not verified')
                  : ''}
              </option>
            ))}
          </select>
          {candidates.isError && (
            <span role="alert">
              {t('تعذر تحميل الحسابات', 'Could not load accounts')}
            </span>
          )}
        </Field>
      </div>
      <Field name={t('عنوان مفهوم للشخص', 'A title the person understands')}>
        <input
          required
          minLength={3}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field
        name={t(
          'سبب الدعوة ونطاق الخدمة',
          'Invitation purpose & service scope',
        )}
      >
        <textarea
          required
          minLength={5}
          maxLength={3000}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </Field>
      <Field
        name={t(
          'مدة الاحتفاظ بالأيام، لا تُمدد تلقائيًا',
          'Retention in days, never extended automatically',
        )}
      >
        <input
          type="number"
          min={1}
          max={365}
          required
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
      </Field>
      <button className="primary" disabled={busy}>
        {t(
          'احفظ المسودة بدون إرسال دعوة',
          'Save draft without sending an invitation',
        )}
      </button>
    </form>
  );
}
