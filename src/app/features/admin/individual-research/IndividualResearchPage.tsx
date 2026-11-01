import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical,
  Plus,
  Search,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  LockKeyhole,
  ExternalLink,
  Flag,
  FileText,
} from 'lucide-react';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../auth/store/authStore';
import { canAdminAccess } from '../adminAccess';
import { Modal } from '../../../components/ui/Modal';
import { JOURNEY_INSIGHTS_CATALOG } from '../../journey/lib/journey-insights-catalog';
import { studioApi, type CaseDetail, type CaseRow, type Person } from './api';
import './individual-research.css';
const TABS = [
  ['overview', 'نظرة عامة', 'Overview'],
  ['plan', 'الخطة الفردية', 'Individual plan'],
  ['sessions', 'الجلسات', 'Sessions'],
  ['observations', 'الملاحظات', 'Observations'],
  ['interventions', 'التدخلات والتوجيه', 'Interventions'],
  ['controls', 'الإتاحة الفردية', 'Journey controls'],
  ['timeline', 'الخط الزمني', 'Timeline'],
  ['review', 'المراجعة والتعلّم', 'Review'],
] as const;
type Tab = (typeof TABS)[number][0];
type EditorKind =
  | 'create'
  | 'consent'
  | 'case'
  | 'session'
  | 'observation'
  | 'plan'
  | 'intervention'
  | 'grant'
  | 'review'
  | 'permissions'
  | 'withdraw'
  | 'delete'
  | 'followUp';
const LABELS: Record<string, [string, string]> = {
  DRAFT: ['مسودة', 'Draft'],
  ACTIVE: ['نشطة', 'Active'],
  PAUSED: ['متوقفة مؤقتًا', 'Paused'],
  COMPLETED: ['مكتملة', 'Completed'],
  GIVEN: ['موثقة', 'Recorded'],
  NOT_RECORDED: ['غير موثقة', 'Not recorded'],
  WITHDRAWN: ['مسحوبة', 'Withdrawn'],
  CONSULTING: ['استشارة مهنية', 'Consulting'],
  COACHING: ['توجيه مهني', 'Coaching'],
  RESEARCH: ['جلسة بحث', 'Research'],
  PARTICIPANT_STATEMENT: ['ما صرّح به المشارك', 'Participant statement'],
  RESEARCHER_OBSERVATION: ['ما لاحظه الباحث', 'Researcher observation'],
  HYPOTHESIS: ['فرضية غير مثبتة', 'Hypothesis'],
  ACTION: ['إجراء نختبره', 'Action'],
  OUTCOME: ['نتيجة حدثت فعلًا', 'Outcome'],
  ABILITIES: ['القدرات والمهارات', 'Abilities & skills'],
  USER_IMPACT: ['الأثر على المستفيد', 'User impact'],
  BUSINESS_IMPACT: ['قيمة المؤسسة', 'Business impact'],
  OTHER: ['جانب آخر', 'Other'],
  NEEDS_EVIDENCE: ['يحتاج دليلًا', 'Needs evidence'],
  OPEN: ['مفتوحة', 'Open'],
  RESOLVED: ['عولجت', 'Resolved'],
  DOING: ['قيد التنفيذ', 'In progress'],
  DONE: ['تم التحقق من إنجازها', 'Verified complete'],
  BLOCKED: ['بها عائق', 'Blocked'],
  PENDING: ['متابعة معلقة', 'Pending'],
  CANCELLED: ['ألغيت', 'Cancelled'],
  NORMAL: ['متاحة بالرحلة الطبيعية', 'Normal journey'],
  ADMIN: ['إتاحة فردية من الأدمن', 'Granted by administrator'],
  SCHEDULED: ['مجدولة', 'Scheduled'],
  EXPIRED: ['انتهت', 'Expired'],
  REVOKED: ['أُلغيت', 'Revoked'],
  LOCKED: ['مقفولة / الحالة غير نشطة', 'Locked / inactive case'],
  VIEW: ['مشاهدة فقط', 'View only'],
  INTERACT: ['مشاهدة وتفاعل', 'View & interact'],
  FEATURE: ['قسم أو ميزة', 'Feature'],
  GUIDANCE: ['إرشاد محدد', 'Specific guidance'],
  WEEKLY_REPORT: ['تقرير أسبوع', 'Weekly report'],
  PERFORMANCE_ANALYTICS: ['تحليلات الأداء', 'Performance analytics'],
  FINAL_REPORT: ['التقرير النهائي', 'Final report'],
  CASE_CREATED: ['إنشاء الحالة', 'Case created'],
  CASE_VIEWED: ['اطلاع مصرح به', 'Authorized view'],
  CASE_UPDATED: ['تحديث الحالة / الخطة / المراجعة', 'Case updated'],
  CONSENT_RECORDED: ['توثيق الموافقة', 'Consent recorded'],
  CONSENT_WITHDRAWN: ['سحب الموافقة', 'Consent withdrawn'],
  SESSION_RECORDED: ['تسجيل جلسة', 'Session recorded'],
  OBSERVATION_RECORDED: ['تسجيل ملاحظة', 'Observation recorded'],
  OBSERVATION_UPDATED: ['تحديث متابعة ملاحظة', 'Observation updated'],
  PLAN_ITEM_CREATED: ['إضافة خطوة للخطة', 'Plan item created'],
  PLAN_STATUS_UPDATED: ['تحديث خطوة فردية', 'Plan item updated'],
  INTERVENTION_PUBLISHED: ['تدخل موجّه للمشارك', 'Member-facing intervention'],
  ACCESS_GRANTED: ['إتاحة استثنائية', 'Access granted'],
  ACCESS_REVOKED: ['إلغاء إتاحة', 'Access revoked'],
  SESSION_FOLLOW_UP: ['تحديث متابعة الجلسة', 'Session follow-up'],
};
const uid = () => crypto.randomUUID();
const dateInput = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
export default function IndividualResearchPage() {
  const { locale } = useI18n(),
    { user } = useAuth();
  const ar = locale === 'ar';
  const text = (a: string, e: string) => (ar ? a : e);
  const label = (s: string) => LABELS[s]?.[ar ? 0 : 1] ?? s;
  const resourceName = (type: string, id: string) => {
    if (type === 'GUIDANCE') {
      const g = JOURNEY_INSIGHTS_CATALOG.find((g) => g.code === id);
      return g ? (ar ? g.titleAr : g.titleEn) : id;
    }
    if (type === 'FEATURE')
      return (
        (
          {
            analytics: text('تحليلات الأداء', 'Performance analytics'),
            professionalTasks: text('المهام المهنية', 'Professional tasks'),
            tableView: text('جدول طلبات التقديم', 'Application table'),
          } as Record<string, string>
        )[id] ?? id
      );
    if (type === 'WEEKLY_REPORT') return text('الأسبوع ', 'Week ') + id;
    return type === 'FINAL_REPORT'
      ? text('عرض التقرير النهائي', 'Final report view')
      : text('الأداء المسجل', 'Recorded performance');
  };
  const canWrite = canAdminAccess(user, 'INDIVIDUAL_RESEARCH', 'WRITE');
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selected = params.get('case');
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [tab, setTab] = useState<Tab>('overview');
  const [editor, setEditor] = useState<{
      kind: EditorKind;
      sessionId?: string;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [showViews, setShowViews] = useState(false);
  const list = useQuery({
    queryKey: ['individual-research', 'cases', user?.id, search, status, page],
    queryFn: () => studioApi.list({ search, status, page }),
  });
  const detail = useQuery({
    queryKey: ['individual-research', 'case', user?.id, selected],
    queryFn: () => studioApi.detail(selected!),
    enabled: Boolean(selected),
    staleTime: 0,
  });
  const staff = useQuery({
    queryKey: ['individual-research', 'staff', user?.id],
    queryFn: studioApi.staff,
  });
  const c = detail.data;
  const writable = Boolean(canWrite && c?.canWrite);
  const collecting = Boolean(
    writable &&
    c?.status === 'ACTIVE' &&
    c?.consentStatus === 'GIVEN' &&
    new Date(c.retentionUntil) > new Date(),
  );
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : text('غير محدد', 'Not set');
  const choose = (id: string | null) => {
    setTab('overview');
    setError('');
    setParams(id ? { case: id } : {});
  };
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['individual-research'] });
    await qc.invalidateQueries({ queryKey: ['journey'] });
  };
  async function run(action: () => Promise<unknown>) {
    setError('');
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : text('تعذر الحفظ', 'Could not save'),
      );
    } finally {
      setBusy(false);
    }
  }
  function open(kind: EditorKind, sessionId?: string) {
    setEditor({ kind, sessionId });
  }
  const actorName = (id: string | null) =>
    staff.data?.find((p) => p.id === id)?.name ??
    text('مسؤول مصرح له', 'Authorized administrator');
  return (
    <div className="ies" dir={ar ? 'rtl' : 'ltr'}>
      <header className="ies-hero">
        <div>
          <span className="ies-eyebrow">
            <FlaskConical size={16} />
            {text('مساحة بحث وإرشاد فردي', 'Individual Experience Studio')}
          </span>
          <h1>{text('التجارب الفردية', 'Individual research')}</h1>
          <p>
            {text(
              'حالة واحدة، أدلة واضحة، وخطوة تالية مناسبة — مع فصل الإتاحة عن الإنجاز.',
              'One participant, clear evidence and a next step — access stays separate from actual progress.',
            )}
          </p>
        </div>
        <div className="ies-actions">
          {canAdminAccess(user, 'UX_LAB') && (
            <Link className="ies-hero-link" to="/admin/ux-lab">
              {text('معمل التجارب', 'UX Lab')}
            </Link>
          )}
          {canWrite && (
            <button
              className="ies-primary ies-light"
              onClick={() => open('create')}
            >
              <Plus size={17} />
              {text('تجربة فردية جديدة', 'New individual case')}
            </button>
          )}
        </div>
      </header>
      <div className={`ies-grid ${selected ? 'has-case' : ''}`}>
        <aside
          className="ies-list"
          aria-label={text('قائمة التجارب', 'Case list')}
        >
          <div className="ies-search">
            <Search size={17} />
            <input
              aria-label={text(
                'ابحث باسم المشارك أو التجربة',
                'Search participant or case',
              )}
              placeholder={text('ابحث عن تجربة…', 'Search cases…')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label={text('حالة التجربة', 'Case status')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{text('كل الحالات', 'All statuses')}</option>
            {['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          {list.isPending ? (
            <p role="status">{text('تحميل التجارب…', 'Loading cases…')}</p>
          ) : list.isError ? (
            <div role="alert">
              {text('تعذر تحميل التجارب', 'Could not load cases')}
              <button onClick={() => void list.refetch()}>
                {text('حاول مجددًا', 'Retry')}
              </button>
            </div>
          ) : !list.data?.items.length ? (
            <div className="ies-empty">
              <FlaskConical size={28} />
              <p>
                {text(
                  'مفيش تجارب متاحة بعد. ابدأ بمشارك موجود وهدف قابل للتحقق.',
                  'No cases yet. Start with an existing member and a testable goal.',
                )}
              </p>
            </div>
          ) : (
            list.data.items.map((row) => (
              <button
                key={row.id}
                className={`ies-case-row ${selected === row.id ? 'is-selected' : ''}`}
                onClick={() => choose(row.id)}
              >
                <span className="ies-row-top">
                  <strong>{row.user.name}</strong>
                  <span className={`ies-badge status-${row.status}`}>
                    {label(row.status)}
                  </span>
                </span>
                <span className="ies-case-title">{row.title}</span>
                <span>{row.goal}</span>
                <small>
                  {text('المسؤول: ', 'Owner: ')}
                  {row.owner.name} · {formatDate(row.updatedAt)}
                </small>
                <small>
                  {text('التالي: ', 'Next: ')}
                  {row.nextStep ||
                    text('حدد الخطوة التالية', 'Set a next step')}
                </small>
                {row.followUpAt && (
                  <small>
                    <CalendarDays size={13} /> {formatDate(row.followUpAt)}
                  </small>
                )}
                {row._count.observations > 0 && (
                  <span className="ies-barrier">
                    {row._count.observations}{' '}
                    {text('عوائق تحتاج متابعة', 'barriers to follow up')}
                  </span>
                )}
              </button>
            ))
          )}
          {list.data && list.data.total > list.data.limit && (
            <div className="ies-actions">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {text('السابق', 'Previous')}
              </button>
              <span>{page}</span>
              <button
                disabled={page * list.data.limit >= list.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                {text('التالي', 'Next')}
              </button>
            </div>
          )}
        </aside>
        <section
          className="ies-workspace"
          aria-label={text('مساحة التجربة', 'Case workspace')}
        >
          {!selected ? (
            <div className="ies-empty ies-welcome">
              <ShieldCheck size={40} />
              <h2>
                {text(
                  'اختَر تجربة علشان تكمل من مكانك',
                  'Choose a case to continue',
                )}
              </h2>
              <p>
                {text(
                  'الجلسات والملاحظات خاصة بالمسؤولين المصرح لهم. أي محتوى موجّه للمشارك يحتاج نشرًا صريحًا.',
                  'Sessions and observations are private to authorized staff. Member-facing feedback requires explicit publication.',
                )}
              </p>
            </div>
          ) : detail.isPending ? (
            <p role="status">
              {text('تحميل مساحة التجربة…', 'Loading workspace…')}
            </p>
          ) : detail.isError || !c ? (
            <div className="ies-empty" role="alert">
              <p>
                {text(
                  'الحالة غير متاحة أو لا تملك إذن الاطلاع عليها.',
                  'This case is unavailable or you are not authorized to view it.',
                )}
              </p>
              <button onClick={() => choose(null)}>
                {text('العودة للقائمة', 'Back to cases')}
              </button>
            </div>
          ) : (
            <>
              <div className="ies-case-header">
                <button
                  className="ies-mobile-back"
                  onClick={() => choose(null)}
                >
                  <ArrowRight size={16} />
                  {text('قائمة التجارب', 'Case list')}
                </button>
                <div className="ies-row-top">
                  <div>
                    <p className="ies-eyebrow">
                      {c.user.name} ·{' '}
                      {c.user.targetJobTitle ||
                        text('التخصص غير محدد', 'Specialization not set')}
                    </p>
                    <h2>{c.title}</h2>
                  </div>
                  <span className={`ies-badge status-${c.status}`}>
                    {label(c.status)}
                  </span>
                </div>
                <div className="ies-actions">
                  {canAdminAccess(user, 'MENTORING') && (
                    <Link
                      to={`/admin/mentoring?memberId=${c.userId}&researchCase=${c.id}`}
                      className="ies-link"
                    >
                      <ExternalLink size={14} />
                      {text('Mentoring لهذا المشارك', 'Participant mentoring')}
                    </Link>
                  )}
                  {writable && (
                    <button onClick={() => open('case')}>
                      {text('الحالة والخطوة التالية', 'Status & next step')}
                    </button>
                  )}
                </div>
              </div>
              <div
                className={`ies-consent ${c.consentStatus === 'GIVEN' ? 'recorded' : ''}`}
              >
                <LockKeyhole size={18} />
                <div>
                  <strong>
                    {text('موافقة المشاركة: ', 'Participation consent: ')}
                    {label(c.consentStatus)}
                  </strong>
                  <span>
                    {text(
                      'موعد حذف بيانات البحث: ',
                      'Research retention ends: ',
                    )}
                    {formatDate(c.retentionUntil)}
                  </span>
                </div>
                {writable && c.consentStatus === 'NOT_RECORDED' && (
                  <button onClick={() => open('consent')}>
                    {text('توثيق موافقة صريحة', 'Record explicit consent')}
                  </button>
                )}
                {writable && c.consentStatus === 'GIVEN' && (
                  <button onClick={() => open('withdraw')}>
                    {text('سحب الموافقة', 'Withdraw consent')}
                  </button>
                )}
              </div>
              {!collecting && (
                <p className="ies-hint">
                  {text(
                    'تسجيل الجلسات والملاحظات والتدخلات والإتاحة يعمل في الحالة النشطة وبموافقة سارية فقط. المراجعة والسجل يظلان متاحين للمصرح لهم.',
                    'Collection and access grants require an active case with current consent. Authorized review and history remain available.',
                  )}
                </p>
              )}
              <nav
                className="ies-tabs"
                aria-label={text('أجزاء التجربة', 'Workspace sections')}
              >
                {TABS.map(([key, a, e]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {text(a, e)}
                  </button>
                ))}
              </nav>
              <div className="ies-tab-content">
                {error && (
                  <p className="ies-error" role="alert">
                    {error}
                  </p>
                )}
                {tab === 'overview' && (
                  <>
                    <div className="ies-two">
                      <article className="ies-card">
                        <h3>{text('هدف التجربة', 'Case goal')}</h3>
                        <p>{c.goal}</p>
                        <h4>
                          {text(
                            'الفرضية — تحتاج اختبارًا',
                            'Hypothesis — to be tested',
                          )}
                        </h4>
                        <p>{c.hypothesis}</p>
                      </article>
                      <article className="ies-card">
                        <h3>
                          {text('التقدم الحقيقي', 'Actual journey progress')}
                        </h3>
                        <p>
                          <code>
                            {c.user.journeyState?.currentNodeCode ?? 'TASK_0'}
                          </code>{' '}
                          · {text('الأسبوع', 'Week')}{' '}
                          {c.user.journeyState?.currentWeek ?? 0}
                        </p>
                        <p>
                          {c.user.journeyState?.completedNodeCodes.length ?? 0}{' '}
                          {text(
                            'محطات مكتملة فعليًا',
                            'actually completed milestones',
                          )}
                        </p>
                        <p>
                          {c.user._count.applications}{' '}
                          {text('طلبات تقديم مسجلة', 'recorded applications')} ·{' '}
                          {c.user._count.assignedTasks}{' '}
                          {text('مهام مسجلة', 'recorded tasks')}
                        </p>
                        <p>
                          {text('CV الحالي: ', 'Current CV: ')}
                          {c.user.cv?.originalName ??
                            text('لم يرفع ملفًا', 'No file uploaded')}
                        </p>
                        {c.user.portfolioUrl && (
                          <a
                            href={c.user.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {text('البورتفوليو', 'Portfolio')}
                          </a>
                        )}
                        <p className="ies-hint">
                          {text(
                            'فتح مورد مبكرًا لا يغيّر هذه الأرقام أو حالة الرحلة.',
                            'Early access never changes these counts or journey completion.',
                          )}
                        </p>
                      </article>
                    </div>
                    <article className="ies-card">
                      <h3>{text('الخطوة القادمة', 'Next agreed step')}</h3>
                      <p>{c.nextStep || text('لم تُحدد بعد', 'Not set yet')}</p>
                      <p>{formatDate(c.followUpAt)}</p>
                      <p>
                        {text('المسؤول: ', 'Owner: ')}
                        {actorName(c.ownerId)}
                      </p>
                    </article>
                  </>
                )}
                {tab === 'plan' && (
                  <>
                    <SectionHead
                      title={text(
                        'خطة فردية مرتبطة بالرحلة',
                        'Individual plan alongside the journey',
                      )}
                      action={collecting ? () => open('plan') : undefined}
                      actionLabel={text('أضف خطوة', 'Add a step')}
                    />
                    <p className="ies-hint">
                      {text(
                        'التحقق من خطوة هنا لا يكمل JourneyNode عامة. فتح الخطوات آليًا بالأحداث مؤجل لـP1.',
                        'Verifying a plan item does not complete a global JourneyNode. Event-based plan unlocking is deferred to P1.',
                      )}
                    </p>
                    {!c.planItems.length ? (
                      <Empty ar={ar} />
                    ) : (
                      c.planItems.map((item) => (
                        <article className="ies-card" key={item.id}>
                          <div className="ies-row-top">
                            <h3>{item.title}</h3>
                            <span className="ies-badge">
                              {label(item.status)}
                            </span>
                          </div>
                          <p>{item.goal}</p>
                          <p className="ies-pre">{item.activity}</p>
                          <p>
                            <strong>
                              {text(
                                'دليل الإكمال المتفق عليه: ',
                                'Agreed completion evidence: ',
                              )}
                            </strong>
                            {item.completionCondition}
                          </p>
                          {item.nodeCode && <code>{item.nodeCode}</code>}
                          {item.resourceUrl && (
                            <p>
                              <a
                                href={item.resourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {text('افتح المورد', 'Open resource')}
                              </a>
                            </p>
                          )}
                          <LinkedResources item={item} ar={ar} />
                          <small>{formatDate(item.dueAt)}</small>
                          {collecting && (
                            <select
                              aria-label={text(
                                'حالة الخطوة',
                                'Plan item status',
                              )}
                              value={item.status}
                              disabled={busy}
                              onChange={(e) =>
                                void run(() =>
                                  studioApi.patchResource(
                                    c.id,
                                    'plan/' + item.id,
                                    {
                                      requestId: uid(),
                                      status: e.target.value,
                                    },
                                  ),
                                )
                              }
                            >
                              {['OPEN', 'DOING', 'BLOCKED', 'DONE'].map((x) => (
                                <option key={x} value={x}>
                                  {label(x)}
                                </option>
                              ))}
                            </select>
                          )}
                        </article>
                      ))
                    )}
                  </>
                )}
                {tab === 'sessions' && (
                  <>
                    <SectionHead
                      title={text(
                        'جلسات الاستشارة والتوجيه والبحث',
                        'Consulting, coaching and research sessions',
                      )}
                      action={collecting ? () => open('session') : undefined}
                      actionLabel={text('سجّل جلسة', 'Record session')}
                    />
                    <p className="ies-hint">
                      {text(
                        'سجّل ما صرّح به المشارك منفصلًا عن ملاحظتك وتفسيرك. لا تشخيصات أو تسجيلات تلقائية.',
                        'Keep participant statements separate from observation and interpretation. No diagnosis or automatic recordings.',
                      )}
                    </p>
                    {!c.sessions.length ? (
                      <Empty ar={ar} />
                    ) : (
                      c.sessions.map((s) => (
                        <article key={s.id} className="ies-card">
                          <div className="ies-row-top">
                            <h3>
                              {label(s.kind)} · {s.goal}
                            </h3>
                            <span className="ies-badge">
                              {label(s.followUpStatus)}
                            </span>
                          </div>
                          <small>{formatDate(s.heldAt)}</small>
                          {s.topics.length > 0 && <p>{s.topics.join(' · ')}</p>}
                          {(
                            [
                              [
                                'participantStatements',
                                'تصريحات المشارك',
                                'Participant statements',
                              ],
                              [
                                'researcherObservations',
                                'ملاحظات الباحث',
                                'Researcher observations',
                              ],
                              [
                                'barriers',
                                'العوائق المذكورة',
                                'Reported barriers',
                              ],
                              [
                                'hypotheses',
                                'فرضيات لم تثبت بعد',
                                'Unverified hypotheses',
                              ],
                              [
                                'agreements',
                                'الاتفاقات والقرارات',
                                'Agreements',
                              ],
                              [
                                'nextActions',
                                'الإجراءات التالية',
                                'Next actions',
                              ],
                              ['outcome', 'ما حدث فعلًا', 'Observed outcome'],
                            ] as const
                          ).map(([key, a, e]) =>
                            s[key] ? (
                              <div className="ies-record-part" key={key}>
                                <h4>{text(a, e)}</h4>
                                <p className="ies-pre">{s[key]}</p>
                              </div>
                            ) : null,
                          )}
                          <p>
                            {text('المتابعة: ', 'Follow-up: ')}
                            {formatDate(s.followUpAt)}
                          </p>
                          {collecting && (
                            <button onClick={() => open('followUp', s.id)}>
                              {text(
                                'حدّث المتابعة والنتيجة',
                                'Update follow-up & outcome',
                              )}
                            </button>
                          )}
                        </article>
                      ))
                    )}
                  </>
                )}
                {tab === 'observations' && (
                  <>
                    <SectionHead
                      title={text(
                        'الملاحظات والأدلة والفرضيات',
                        'Observations, evidence and hypotheses',
                      )}
                      action={
                        collecting ? () => open('observation') : undefined
                      }
                      actionLabel={text(
                        'أضف ملاحظة خاصة',
                        'Add private observation',
                      )}
                    />
                    <p className="ies-hint">
                      {text(
                        'القدرات ← أثر المستفيد ← أثر المؤسسة: مساحة أمثلة وأدلة، وليست درجات ثقة أو أحكامًا على الشخصية.',
                        'Abilities, user impact and business value: record examples and evidence, not confidence scores or personality judgments.',
                      )}
                    </p>
                    {!c.observations.length ? (
                      <Empty ar={ar} />
                    ) : (
                      c.observations.map((o) => (
                        <article className="ies-card" key={o.id}>
                          <div className="ies-row-top">
                            <h3>{label(o.kind)}</h3>
                            <span className="ies-badge">{label(o.lens)}</span>
                          </div>
                          {o.isBarrier && (
                            <span className="ies-barrier">
                              {text(
                                'عائق يحتاج متابعة',
                                'Barrier to follow up',
                              )}
                            </span>
                          )}
                          <p className="ies-pre">{o.content}</p>
                          <h4>
                            {text('الدليل أو مصدره', 'Evidence or source')}
                          </h4>
                          <p className="ies-pre">
                            {o.evidence ||
                              text(
                                'غير مسجل؛ لا نعتبره حقيقة مثبتة.',
                                'Not recorded; this is not established as fact.',
                              )}
                          </p>
                          <div className="ies-row-top">
                            <small>{formatDate(o.createdAt)}</small>
                            {collecting ? (
                              <select
                                aria-label={text(
                                  'حالة الملاحظة',
                                  'Observation status',
                                )}
                                value={o.status}
                                disabled={busy}
                                onChange={(e) =>
                                  void run(() =>
                                    studioApi.patchResource(
                                      c.id,
                                      'observations/' + o.id,
                                      {
                                        requestId: uid(),
                                        status: e.target.value,
                                      },
                                    ),
                                  )
                                }
                              >
                                {['NEEDS_EVIDENCE', 'OPEN', 'RESOLVED'].map(
                                  (x) => (
                                    <option key={x} value={x}>
                                      {label(x)}
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <span>{label(o.status)}</span>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </>
                )}
                {tab === 'interventions' && (
                  <>
                    <SectionHead
                      title={text(
                        'تدخلات موجّهة للمشارك',
                        'Member-facing interventions',
                      )}
                      action={
                        collecting ? () => open('intervention') : undefined
                      }
                      actionLabel={text(
                        'إسناد أو ربط تدخل',
                        'Assign or link intervention',
                      )}
                    />
                    <p className="ies-hint">
                      {text(
                        'نستخدم المهام وDIRECT Feedback الموجودين. المحتوى الخاص لا يُنسخ إليهما تلقائيًا، ولا يُرسل بريد من هذه المساحة.',
                        'Uses existing Tasks and DIRECT Feedback. Private notes are never copied automatically; no email is sent from this workspace.',
                      )}
                    </p>
                    {c.planItems
                      .filter((p) => p.task || p.feedback)
                      .map((p) => (
                        <article className="ies-card" key={p.id}>
                          <h3>{p.title}</h3>
                          <LinkedResources item={p} ar={ar} />
                        </article>
                      ))}
                    {!c.planItems.some((p) => p.task || p.feedback) && (
                      <Empty ar={ar} />
                    )}
                  </>
                )}
                {tab === 'controls' && (
                  <>
                    <article className="ies-card">
                      <h3>
                        {text(
                          'الإتاحة الفعلية — الرحلة والإستثناءات معًا',
                          'Effective access — normal journey and individual grants',
                        )}
                      </h3>
                      <p className="ies-hint">
                        {text(
                          'السياسة العامة تظل سارية. الإتاحة الفردية تضيف وصولًا محددًا فقط؛ إلغاؤها لا يسحب ما فتحته الرحلة الطبيعية.',
                          'Normal journey access always remains valid. Individual grants add specific access; revoking them does not remove normally earned access.',
                        )}
                      </p>
                      <div className="ies-access-grid">
                        {c.accessOverview.map((a) => (
                          <div
                            className="ies-access-item"
                            key={a.resourceType + ':' + a.resourceId}
                          >
                            <strong>
                              {resourceName(a.resourceType, a.resourceId)}
                            </strong>
                            <span className="ies-badge">{label(a.source)}</span>
                            <small>
                              {a.view
                                ? text('مشاهدة متاحة', 'Viewing allowed')
                                : text('مشاهدة مقفولة', 'Viewing locked')}
                              {a.interact
                                ? ' · ' +
                                  text('التفاعل متاح', 'Interaction allowed')
                                : ''}
                            </small>
                          </div>
                        ))}
                      </div>
                    </article>
                    <SectionHead
                      title={text(
                        'الإتاحة الفردية الفعلية',
                        'Effective individual access',
                      )}
                      action={collecting ? () => open('grant') : undefined}
                      actionLabel={text(
                        'امنح إتاحة محددة',
                        'Grant specific access',
                      )}
                    />
                    <p className="ies-hint">
                      <strong>
                        {text(
                          'الإتاحة ليست إنجازًا. ',
                          'Access is not completion. ',
                        )}
                      </strong>
                      {text(
                        'المنح يضيف حقًا فقط؛ السياسة الطبيعية تظل سارية. إيقاف الحالة أو سحب الموافقة أو انتهاء الوقت يلغي الاستثناء، ولا يغير المحطة الحالية.',
                        'A grant only adds a right. Normal policy remains. Pausing, withdrawing consent or expiry disables the exception without changing the current node.',
                      )}
                    </p>
                    {!c.overrides.length ? (
                      <Empty ar={ar} />
                    ) : (
                      c.overrides.map((g) => (
                        <article className="ies-card" key={g.id}>
                          <div className="ies-row-top">
                            <h3>
                              {label(g.resourceType)} ·{' '}
                              <code>{g.resourceId}</code>
                            </h3>
                            <span className="ies-badge">
                              {label(g.effectiveSource)}
                            </span>
                          </div>
                          <p>{label(g.permission)}</p>
                          <p>{g.reason}</p>
                          <p>
                            {text('من ', 'From ')}
                            {formatDate(g.startsAt)} · {text('حتى ', 'Until ')}
                            {g.endsAt
                              ? formatDate(g.endsAt)
                              : text(
                                  'نهاية احتفاظ الحالة كحد أقصى',
                                  'Case retention at the latest',
                                )}
                          </p>
                          <small>
                            {text('أصدرها: ', 'Issued by: ')}
                            {actorName(g.issuedBy)}
                          </small>
                          {writable && g.status !== 'REVOKED' && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  studioApi.action(
                                    c.id,
                                    'overrides/' + g.id + '/revoke',
                                    { requestId: uid() },
                                  ),
                                )
                              }
                            >
                              {text('إلغاء الإتاحة', 'Revoke')}
                            </button>
                          )}
                        </article>
                      ))
                    )}
                    {writable && c.canManageAccess && (
                      <button onClick={() => open('permissions')}>
                        {text(
                          'المسؤولون المصرح لهم بهذه الحالة',
                          'Who may access this private case',
                        )}
                      </button>
                    )}
                    <p className="ies-hint">
                      {text(
                        'المنح لا يتجاوز خصوصية مستخدم آخر أو عضوية المجموعة، ولا يسمح بإنهاء التقرير النهائي.',
                        'Grants never bypass another member’s privacy or group membership, and never grant final-report completion.',
                      )}
                    </p>
                  </>
                )}
                {tab === 'timeline' && (
                  <>
                    <SectionHead
                      title={text(
                        'سجل الحالة والتدخلات',
                        'Case and intervention timeline',
                      )}
                    />
                    <label className="ies-check">
                      <input
                        type="checkbox"
                        checked={showViews}
                        onChange={(e) => setShowViews(e.target.checked)}
                      />
                      {text(
                        'أظهر عمليات الاطلاع المصرح بها',
                        'Include authorized views',
                      )}
                    </label>
                    <p className="ies-hint">
                      {text(
                        'أحدث 200 حدث محفوظة للعرض هنا. السجل الكامل محفوظ داخل مدة الاحتفاظ.',
                        'Displays the latest 200 events. Full history remains stored within retention.',
                      )}
                    </p>
                    <ol className="ies-timeline">
                      {c.events
                        .filter((e) => showViews || e.action !== 'CASE_VIEWED')
                        .map((e) => (
                          <li key={e.id}>
                            <span className="ies-dot" />
                            <div>
                              <strong>{label(e.action)}</strong>
                              <p>
                                {actorName(e.actorId)} ·{' '}
                                {formatDate(e.createdAt)}
                              </p>
                              {e.metadata?.changedFields?.length ? (
                                <small>
                                  {text(
                                    'حقول تم تعديلها: ',
                                    'Changed fields: ',
                                  )}
                                  {e.metadata.changedFields.join(' · ')}
                                </small>
                              ) : null}
                              {e.metadata?.entityStatus && (
                                <span className="ies-badge">
                                  {label(e.metadata.entityStatus)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                    </ol>
                  </>
                )}
                {tab === 'review' && (
                  <>
                    <SectionHead
                      title={text('ما تعلّمناه من التجربة', 'What we learned')}
                      action={writable ? () => open('review') : undefined}
                      actionLabel={text('اكتب المراجعة', 'Write review')}
                    />
                    {c.review ? (
                      <article className="ies-card">
                        {(
                          [
                            [
                              'observedChange',
                              'ما تغير فعلًا',
                              'Observed change',
                            ],
                            ['learning', 'ما تعلمناه', 'Learning'],
                            [
                              'insufficientEvidence',
                              'ما لا تكفي أدلته',
                              'Insufficient evidence',
                            ],
                          ] as const
                        ).map(([key, a, e]) => (
                          <div className="ies-record-part" key={key}>
                            <h3>{text(a, e)}</h3>
                            <p className="ies-pre">{c.review![key]}</p>
                          </div>
                        ))}
                      </article>
                    ) : (
                      <Empty ar={ar} />
                    )}
                    <p className="ies-hint">
                      {text(
                        'تجربة شخص واحد تصف ما لوحظ، ولا تثبت أن التدخل سبب النتيجة. لا نستنتج مشاعر أو مهارات من فتح صفحة.',
                        'One-person observations do not establish causation. Opening a page does not establish feelings or skill mastery.',
                      )}
                    </p>
                    {writable && (
                      <button
                        className="ies-danger"
                        onClick={() => open('delete')}
                      >
                        {text(
                          'حذف بيانات هذه التجربة نهائيًا',
                          'Permanently delete this research case',
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {editor && (
        <StudioEditor
          kind={editor.kind}
          sessionId={editor.sessionId}
          c={c}
          staff={staff.data ?? []}
          ar={ar}
          initialMember={params.get('member') ?? ''}
          onClose={() => setEditor(null)}
          onSaved={async (id) => {
            setEditor(null);
            await refresh();
            if (id) choose(id);
          }}
          onDeleted={() => choose(null)}
        />
      )}
    </div>
  );
}
function SectionHead({
  title,
  action,
  actionLabel,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="ies-section-heading">
      <h3>{title}</h3>
      {action && (
        <button className="ies-primary" onClick={action}>
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
function Empty({ ar }: { ar: boolean }) {
  return (
    <div className="ies-empty">
      <FileText size={26} />
      <p>
        {ar
          ? 'لسه مفيش سجلات في المساحة دي.'
          : 'No records in this section yet.'}
      </p>
    </div>
  );
}
function LinkedResources({
  item,
  ar,
}: {
  item: CaseDetail['planItems'][number];
  ar: boolean;
}) {
  return (
    <div className="ies-linked">
      {item.task && (
        <p>
          {ar ? 'المهمة المرتبطة: ' : 'Linked task: '}
          {item.task.title} · <code>{item.task.status}</code>
        </p>
      )}
      {item.feedback && (
        <p>
          {ar ? 'التوجيه المنشور: ' : 'Published feedback: '}
          {item.feedback.title} ·{' '}
          {item.feedback.reads.length
            ? ar
              ? 'قُرئ فعلًا'
              : 'Actually read'
            : ar
              ? 'لا توجد قراءة مسجلة'
              : 'No read recorded'}
        </p>
      )}
    </div>
  );
}
function StudioEditor({
  kind,
  sessionId,
  c,
  staff,
  ar,
  initialMember,
  onClose,
  onSaved,
  onDeleted,
}: {
  kind: EditorKind;
  sessionId?: string;
  c?: CaseDetail;
  staff: Person[];
  ar: boolean;
  initialMember: string;
  onClose: () => void;
  onSaved: (id?: string) => Promise<void>;
  onDeleted: () => void;
}) {
  const t = (a: string, e: string) => (ar ? a : e);
  const lab = (s: string) => LABELS[s]?.[ar ? 0 : 1] ?? s;
  const requestId = useRef(uid());
  const session = c?.sessions.find((s) => s.id === sessionId);
  type Values = Record<string, string | boolean | string[]>;
  const [v, setV] = useState<Values>(() => ({
    userId: initialMember,
    title: kind === 'case' ? (c?.title ?? '') : '',
    goal: kind === 'case' ? (c?.goal ?? '') : '',
    hypothesis: c?.hypothesis ?? '',
    retentionUntil:
      c?.retentionUntil?.slice(0, 10) ??
      new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    ownerId: c?.ownerId ?? '',
    allowedAdminIds: c?.allowedAdminIds ?? [],
    status: kind === 'observation' ? 'NEEDS_EVIDENCE' : (c?.status ?? 'DRAFT'),
    nextStep: c?.nextStep ?? '',
    followUpAt: (
      kind === 'followUp'
        ? session?.followUpAt
        : kind === 'case'
          ? c?.followUpAt
          : null
    )
      ? dateInput(
          new Date(
            (kind === 'followUp' ? session?.followUpAt : c?.followUpAt)!,
          ),
        )
      : '',
    consentAt: dateInput(),
    method: 'WRITTEN',
    confirmed: false,
    publishConfirmed: false,
    heldAt: dateInput(),
    kind:
      kind === 'observation'
        ? 'PARTICIPANT_STATEMENT'
        : kind === 'intervention'
          ? 'TASK'
          : 'CONSULTING',
    lens: 'OTHER',
    resourceType: 'PERFORMANCE_ANALYTICS',
    resourceId: 'performance',
    permission: 'VIEW',
    startsAt: dateInput(),
    endsAt: '',
    observedChange: c?.review?.observedChange ?? '',
    learning: c?.review?.learning ?? '',
    insufficientEvidence: c?.review?.insufficientEvidence ?? '',
    followUpStatus: session?.followUpStatus ?? 'PENDING',
    outcome: session?.outcome ?? '',
  }));
  const [search, setSearch] = useState(''),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const candidates = useQuery({
    queryKey: ['individual-research', 'candidates', search],
    queryFn: () => studioApi.candidates(search),
    enabled: kind === 'create',
  });
  const get = (key: string) =>
    typeof v[key] === 'string' ? (v[key] as string) : '';
  const put = (key: string, value: string | boolean | string[]) =>
    setV((x) => ({ ...x, [key]: value }));
  const iso = (key: string) =>
    get(key) ? new Date(get(key)).toISOString() : undefined;
  const titles: Record<EditorKind, [string, string]> = {
    create: ['تجربة فردية جديدة', 'New individual case'],
    consent: ['توثيق موافقة المشاركة', 'Record participant consent'],
    case: ['الحالة والخطوة التالية', 'Case status & next step'],
    session: ['تسجيل جلسة خاصة', 'Record private session'],
    observation: ['ملاحظة بحثية خاصة', 'Private research observation'],
    plan: ['خطوة في الخطة الفردية', 'Individual plan item'],
    intervention: ['إسناد أو ربط تدخل للمشارك', 'Publish or link intervention'],
    grant: ['إتاحة فردية محددة', 'Specific individual access'],
    review: ['مراجعة التجربة', 'Case review'],
    permissions: ['من يطّلع على هذه الحالة؟', 'Who may access this case?'],
    withdraw: ['سحب موافقة المشاركة', 'Withdraw research consent'],
    delete: ['حذف بيانات التجربة', 'Delete research data'],
    followUp: ['متابعة الجلسة', 'Session follow-up'],
  };
  function field(
    key: string,
    a: string,
    e: string,
    type = 'text',
    required = false,
    maxLength = 3000,
  ) {
    return (
      <label className="ies-field" key={key}>
        <span>
          {t(a, e)}
          {required ? ' *' : ''}
        </span>
        {type === 'textarea' ? (
          <textarea
            aria-label={t(a, e)}
            value={get(key)}
            onChange={(event) => put(key, event.target.value)}
            required={required}
            maxLength={maxLength}
            rows={4}
          />
        ) : (
          <input
            type={type}
            aria-label={t(a, e)}
            value={get(key)}
            onChange={(event) => put(key, event.target.value)}
            required={required}
            maxLength={maxLength}
          />
        )}
      </label>
    );
  }
  function select(
    key: string,
    a: string,
    e: string,
    options: readonly (readonly [string, string])[],
    required = false,
  ) {
    return (
      <label className="ies-field" key={key}>
        <span>
          {t(a, e)}
          {required ? ' *' : ''}
        </span>
        <select
          aria-label={t(a, e)}
          value={get(key)}
          onChange={(event) => put(key, event.target.value)}
          required={required}
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function checkbox(key: string, a: string, e: string, required = false) {
    return (
      <label className="ies-check">
        <input
          type="checkbox"
          checked={Boolean(v[key])}
          onChange={(event) => put(key, event.target.checked)}
          required={required}
        />
        <span>{t(a, e)}</span>
      </label>
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const base = { requestId: requestId.current };
    try {
      if (kind === 'create') {
        const result = await studioApi.create({
          ...base,
          userId: get('userId'),
          ownerId: get('ownerId') || undefined,
          title: get('title'),
          goal: get('goal'),
          hypothesis: get('hypothesis'),
          retentionUntil: new Date(
            get('retentionUntil') + 'T23:59:59',
          ).toISOString(),
        });
        await onSaved(result.id);
        return;
      }
      if (!c) throw new Error(t('اختَر حالة أولًا', 'Choose a case first'));
      if (kind === 'consent')
        await studioApi.action(c.id, 'consent', {
          ...base,
          confirmed: v.confirmed,
          method: get('method'),
          consentAt: iso('consentAt'),
          evidence: get('evidence'),
        });
      if (kind === 'case')
        await studioApi.patch(c.id, {
          ...base,
          status: get('status'),
          title: get('title'),
          hypothesis: get('hypothesis'),
          nextStep: get('nextStep'),
          followUpAt: iso('followUpAt'),
        });
      if (kind === 'session')
        await studioApi.action(c.id, 'sessions', {
          ...base,
          kind: get('kind'),
          heldAt: iso('heldAt'),
          goal: get('goal'),
          topics: get('topics')
            .split(/[,،\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          ...Object.fromEntries(
            [
              'participantStatements',
              'researcherObservations',
              'barriers',
              'hypotheses',
              'agreements',
              'nextActions',
              'outcome',
            ].map((key) => [key, get(key) || undefined]),
          ),
          followUpAt: iso('followUpAt'),
          followUpStatus: get('followUpStatus'),
        });
      if (kind === 'observation')
        await studioApi.action(c.id, 'observations', {
          ...base,
          kind: get('kind'),
          lens: get('lens'),
          content: get('content'),
          evidence: get('evidence') || undefined,
          status: get('status'),
          isBarrier: Boolean(v.isBarrier),
          sessionId: get('sessionId') || undefined,
        });
      if (kind === 'plan')
        await studioApi.action(c.id, 'plan', {
          ...base,
          title: get('title'),
          goal: get('goal') || undefined,
          activity: get('activity') || undefined,
          completionCondition: get('completionCondition'),
          resourceUrl: get('resourceUrl') || undefined,
          nodeCode: get('nodeCode') || undefined,
          taskId: get('taskId') || undefined,
          feedbackId: get('feedbackId') || undefined,
          dueAt: iso('dueAt'),
        });
      if (kind === 'intervention')
        await studioApi.action(c.id, 'interventions', {
          ...base,
          kind: get('kind'),
          existingId: get('existingId') || undefined,
          title: get('title'),
          content: get('content'),
          publishConfirmed: Boolean(v.publishConfirmed),
        });
      if (kind === 'grant')
        await studioApi.action(c.id, 'overrides', {
          ...base,
          resourceType: get('resourceType'),
          resourceId: get('resourceId'),
          permission: get('permission'),
          reason: get('reason'),
          startsAt: iso('startsAt'),
          endsAt: iso('endsAt'),
        });
      if (kind === 'review')
        await studioApi.patch(c.id, {
          ...base,
          review: {
            observedChange: get('observedChange'),
            learning: get('learning'),
            insufficientEvidence: get('insufficientEvidence'),
          },
        });
      if (kind === 'permissions')
        await studioApi.patch(c.id, {
          ...base,
          ownerId: get('ownerId'),
          allowedAdminIds: v.allowedAdminIds,
        });
      if (kind === 'followUp')
        await studioApi.patchResource(c.id, 'sessions/' + sessionId, {
          ...base,
          followUpStatus: get('followUpStatus'),
          followUpAt: iso('followUpAt'),
          outcome: get('outcome'),
        });
      if (kind === 'withdraw' || kind === 'delete') {
        if (
          get('confirmText') !== (kind === 'withdraw' ? 'WITHDRAW' : 'DELETE')
        )
          throw new Error(
            t('اكتب كلمة التأكيد كما هي', 'Type the confirmation word exactly'),
          );
        if (kind === 'withdraw') await studioApi.action(c.id, 'withdraw', base);
        else {
          await studioApi.remove(c.id);
          onDeleted();
        }
      }
      await onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              'تعذر الحفظ، البيانات ما زالت هنا.',
              'Could not save. Your draft is preserved.',
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      isOpen
      title={titles[kind][ar ? 0 : 1]}
      onClose={onClose}
      disableClose={saving}
    >
      <form
        className="ies ies-editor"
        dir={ar ? 'rtl' : 'ltr'}
        onSubmit={submit}
      >
        {kind === 'create' && (
          <>
            <p className="ies-hint">
              {t(
                'تبدأ الحالة مسودة. لن تُفعّل الإتاحة أو جمع الجلسات قبل توثيق موافقة صريحة. عنوان الحالة وهدفها ظاهران للمشارك.',
                'The case starts as a draft. No access or session collection before explicit recorded consent. The case title and goal are visible to the participant.',
              )}
            </p>
            <label className="ies-field">
              <span>{t('ابحث عن المشارك', 'Find participant')}</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('اسم العضو', 'Member name')}
              />
            </label>
            {select(
              'userId',
              'المشارك',
              'Participant',
              [
                ['', t('اختَر عضوًا موجودًا', 'Choose an existing member')],
                ...(initialMember &&
                !candidates.data?.some((p) => p.id === initialMember)
                  ? ([
                      [
                        initialMember,
                        t(
                          'المشارك المحدد من شاشة العضو',
                          'Participant selected from member view',
                        ),
                      ],
                    ] as [string, string][])
                  : []),
                ...(candidates.data ?? []).map(
                  (p) =>
                    [p.id, `${p.name} · ${p.targetJobTitle ?? ''}`] as [
                      string,
                      string,
                    ],
                ),
              ],
              true,
            )}
            {field('title', 'عنوان التجربة', 'Case title', 'text', true, 160)}
            {field(
              'goal',
              'هدف قابل للتحقق',
              'Testable goal',
              'textarea',
              true,
            )}
            {field(
              'hypothesis',
              'فرضية تحتاج اختبارًا',
              'Hypothesis to test',
              'textarea',
              true,
            )}
            {select('ownerId', 'المسؤول', 'Owner', [
              ['', t('أنا المسؤول', 'Assign to me')],
              ...staff
                .filter((p) => p.canOwn)
                .map((p) => [p.id, p.name] as [string, string]),
            ])}
            {field(
              'retentionUntil',
              'تاريخ حذف بيانات البحث',
              'Research data deletion date',
              'date',
              true,
            )}
          </>
        )}
        {kind === 'consent' && (
          <>
            <p className="ies-hint">
              {t(
                'وثّق الموافقة التي حصلت عليها فعلًا: الغرض، تسجيل الملاحظات، من يطّلع عليها، مدة الاحتفاظ وحق السحب. لا ترفع تسجيلًا أو بيانات علاجية.',
                'Record actual consent covering purpose, notes, authorized staff, retention and withdrawal. Do not upload recordings or clinical data.',
              )}
            </p>
            {select('method', 'وسيلة توثيق الموافقة', 'Consent method', [
              ['WRITTEN', t('مكتوبة', 'Written')],
              ['VERBAL', t('شفهية موثقة', 'Documented verbal')],
            ])}
            {field(
              'consentAt',
              'تاريخ الموافقة الفعلي',
              'Actual consent date',
              'datetime-local',
              true,
            )}
            {field(
              'evidence',
              'دليل مختصر / كيف تأكدت من الموافقة',
              'Brief evidence / how consent was obtained',
              'textarea',
              true,
              2000,
            )}
            {checkbox(
              'confirmed',
              'أؤكد أن المشارك وافق صراحة على البحث وتوثيق الجلسات والشروط السابقة.',
              'I confirm explicit consent to research, session notes and the terms above.',
              true,
            )}
          </>
        )}
        {kind === 'case' && (
          <>
            {field('title', 'عنوان التجربة', 'Case title', 'text', true, 160)}
            {field(
              'hypothesis',
              'الفرضية الحالية — تفسير غير مثبت',
              'Current hypothesis — unverified',
              'textarea',
              true,
            )}
            <p className="ies-hint">
              {t(
                'تغيير الغرض أو زيادة مدة الاحتفاظ بعد الموافقة يحتاج تجربة جديدة وموافقة صريحة. العنوان والفرضية يمكن مراجعتهما هنا.',
                'A different purpose or longer retention after consent requires a new case with explicit consent. You may revise the title and hypothesis here.',
              )}
            </p>
            {select(
              'status',
              'حالة التجربة',
              'Case status',
              ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
            {field(
              'nextStep',
              'الخطوة القادمة المتفق عليها',
              'Agreed next step',
              'textarea',
              false,
              2000,
            )}
            {field(
              'followUpAt',
              'موعد المتابعة',
              'Follow-up date',
              'datetime-local',
            )}
            <p className="ies-hint">
              {t(
                'الاكتمال هنا ينهي تجربة البحث ولا يكمل رحلة المستخدم. إيقاف الحالة يعطل إتاحاتها الاستثنائية.',
                'Completion here ends the research case, not the member journey. Pausing disables exceptional access.',
              )}
            </p>
          </>
        )}
        {kind === 'session' && (
          <>
            {select(
              'kind',
              'نوع الجلسة',
              'Session type',
              ['CONSULTING', 'COACHING', 'RESEARCH'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
            {field(
              'heldAt',
              'تاريخ الجلسة',
              'Session date',
              'datetime-local',
              true,
            )}
            {field(
              'goal',
              'هدف الجلسة',
              'Session goal',
              'textarea',
              true,
              2000,
            )}
            {field(
              'topics',
              'المحاور — افصل بفاصلة أو سطر',
              'Topics — comma or newline separated',
              'textarea',
            )}
            <div className="ies-two">
              {field(
                'participantStatements',
                'ما صرّح به المشارك فعلًا',
                'Participant statements',
                'textarea',
                false,
                6000,
              )}
              {field(
                'researcherObservations',
                'ما لاحظته دون تفسير',
                'Researcher observations',
                'textarea',
                false,
                6000,
              )}
            </div>
            {field(
              'barriers',
              'المشكلات والعوائق التي ذكرها',
              'Reported problems and barriers',
              'textarea',
            )}
            {field(
              'hypotheses',
              'تفسيرات محتملة لم تثبت بعد',
              'Unverified hypotheses',
              'textarea',
            )}
            {field(
              'agreements',
              'الاتفاقات والقرارات',
              'Agreements and decisions',
              'textarea',
            )}
            {field(
              'nextActions',
              'الإجراءات التالية',
              'Next actions',
              'textarea',
            )}
            {field(
              'outcome',
              'النتيجة الفعلية إن وجدت',
              'Observed outcome, if any',
              'textarea',
            )}
            {field(
              'followUpAt',
              'موعد المتابعة',
              'Follow-up date',
              'datetime-local',
            )}
            {select(
              'followUpStatus',
              'حالة المتابعة',
              'Follow-up status',
              ['PENDING', 'DONE', 'CANCELLED'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
          </>
        )}
        {kind === 'observation' && (
          <>
            <p className="ies-hint">
              {t(
                'هذه ملاحظة داخلية فقط، وليست رسالة للعضو. لا نفترض نوايا أو مشاعر ولا نكتب تشخيصًا.',
                'Private research note, not a member message. Do not infer intent/emotion or record diagnoses.',
              )}
            </p>
            {select(
              'kind',
              'نوع السجل',
              'Record type',
              [
                'PARTICIPANT_STATEMENT',
                'RESEARCHER_OBSERVATION',
                'HYPOTHESIS',
                'ACTION',
                'OUTCOME',
              ].map((x) => [x, lab(x)] as [string, string]),
            )}
            {select(
              'lens',
              'محور القيمة المهنية',
              'Professional value lens',
              ['ABILITIES', 'USER_IMPACT', 'BUSINESS_IMPACT', 'OTHER'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
            {select(
              'sessionId',
              'الجلسة المرتبطة — اختياري',
              'Linked session — optional',
              [
                ['', t('بدون ربط', 'No session')],
                ...(c?.sessions ?? []).map(
                  (s) => [s.id, s.goal] as [string, string],
                ),
              ],
            )}
            {field(
              'content',
              'النص الوصفي',
              'Descriptive text',
              'textarea',
              true,
              6000,
            )}
            {field(
              'evidence',
              'الدليل / المصدر / حدود الاستنتاج',
              'Evidence / source / limits',
              'textarea',
            )}
            {select(
              'status',
              'حالة التحقق أو المتابعة',
              'Evidence / follow-up status',
              ['NEEDS_EVIDENCE', 'OPEN', 'RESOLVED'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
            {checkbox(
              'isBarrier',
              'يمثل عائقًا يحتاج متابعة',
              'This is a barrier requiring follow-up',
            )}
          </>
        )}
        {kind === 'plan' && (
          <>
            {field('title', 'عنوان الخطوة', 'Step title', 'text', true, 200)}
            {field('goal', 'الهدف', 'Goal', 'textarea', false, 2000)}
            {field(
              'activity',
              'نشاط أو تمرين أو مورد',
              'Activity / exercise / resource',
              'textarea',
            )}
            {field(
              'completionCondition',
              'ما الدليل الواضح على اكتمالها؟',
              'What observable evidence completes this step?',
              'textarea',
              true,
              2000,
            )}
            {field(
              'resourceUrl',
              'رابط مورد HTTPS — اختياري',
              'HTTPS resource — optional',
              'url',
              false,
              2048,
            )}
            {field(
              'nodeCode',
              'كود المحطة المرتبطة — اختياري',
              'Linked journey node code — optional',
              'text',
              false,
              100,
            )}
            {select(
              'taskId',
              'ربط مهمة موجودة',
              'Link an existing assigned task',
              [
                ['', t('بدون ربط', 'No task')],
                ...(c?.resourceOptions.assignedTasks ?? []).map(
                  (r) => [r.id, r.title] as [string, string],
                ),
              ],
            )}
            {select(
              'feedbackId',
              'ربط توجيه مباشر موجود',
              'Link existing DIRECT feedback',
              [
                ['', t('بدون ربط', 'No feedback')],
                ...(c?.resourceOptions.directFeedback ?? []).map(
                  (r) => [r.id, r.title] as [string, string],
                ),
              ],
            )}
            {field('dueAt', 'موعد المتابعة', 'Due date', 'datetime-local')}
          </>
        )}
        {kind === 'intervention' && (
          <>
            <p className="ies-hint">
              {t(
                'النص هنا للمشارك. اكتب محتوى مناسبًا للنشر؛ ملاحظات البحث لا تُنسخ أو تُرسل تلقائيًا.',
                'This text is member-facing. Write publishable content; research notes are never copied or sent automatically.',
              )}
            </p>
            {select('kind', 'نوع التدخل', 'Intervention type', [
              ['TASK', t('مهمة من النظام الحالي', 'Existing Tasks system')],
              ['FEEDBACK', t('توجيه مباشر للمشارك', 'DIRECT Feedback')],
            ])}
            {select(
              'existingId',
              'اربط موردًا قائمًا أو أنشئ جديدًا',
              'Link existing or create a new resource',
              [
                ['', t('أنشئ جديدًا', 'Create new')],
                ...(get('kind') === 'TASK'
                  ? (c?.resourceOptions.assignedTasks ?? [])
                  : (c?.resourceOptions.directFeedback ?? [])
                ).map((r) => [r.id, r.title] as [string, string]),
              ],
            )}
            {field(
              'title',
              'عنوان التدخل',
              'Intervention title',
              'text',
              true,
              200,
            )}
            {field(
              'content',
              'المحتوى الموجّه للمشارك',
              'Member-facing content',
              'textarea',
              true,
            )}
            {checkbox(
              'publishConfirmed',
              'أؤكد أن هذا المحتوى موجه للمشارك ومناسب للنشر في مهامه أو Feedback الخاص به.',
              'I confirm this content is intended for this participant and suitable for their Tasks or Feedback.',
              true,
            )}
          </>
        )}
        {kind === 'grant' && (
          <>
            <p className="ies-hint">
              {t(
                'منح مشاهدة لا يسجّل قراءة أو إنجازًا. التقارير VIEW فقط، والإنهاء الفعلي يظل بشروط الرحلة.',
                'Viewing access records no read or completion. Reports are VIEW only; completion still requires actual journey conditions.',
              )}
            </p>
            <label className="ies-field">
              <span>{t('نوع المورد', 'Resource type')}</span>
              <select
                value={get('resourceType')}
                onChange={(e) => {
                  const value = e.target.value;
                  setV((x) => ({
                    ...x,
                    resourceType: value,
                    resourceId:
                      value === 'PERFORMANCE_ANALYTICS'
                        ? 'performance'
                        : value === 'FINAL_REPORT'
                          ? 'final'
                          : value === 'WEEKLY_REPORT'
                            ? '1'
                            : value === 'FEATURE'
                              ? 'professionalTasks'
                              : 'INSIGHT_W1_INTERVIEW_BASIC',
                    permission: 'VIEW',
                  }));
                }}
              >
                {[
                  'FEATURE',
                  'GUIDANCE',
                  'WEEKLY_REPORT',
                  'PERFORMANCE_ANALYTICS',
                  'FINAL_REPORT',
                ].map((x) => (
                  <option key={x} value={x}>
                    {lab(x)}
                  </option>
                ))}
              </select>
            </label>
            {get('resourceType') === 'FEATURE'
              ? select('resourceId', 'الميزة', 'Feature', [
                  [
                    'professionalTasks',
                    t('المهام المهنية', 'Professional tasks'),
                  ],
                  ['analytics', t('تحليلات الأداء', 'Analytics')],
                  ['tableView', t('عرض جدول الطلبات', 'Application table')],
                ])
              : get('resourceType') === 'GUIDANCE'
                ? select(
                    'resourceId',
                    'الإرشاد المحدد',
                    'Specific guidance',
                    JOURNEY_INSIGHTS_CATALOG.map(
                      (g) =>
                        [g.code, ar ? g.titleAr : g.titleEn] as [
                          string,
                          string,
                        ],
                    ),
                  )
                : get('resourceType') === 'WEEKLY_REPORT'
                  ? select(
                      'resourceId',
                      'الأسبوع',
                      'Report week',
                      [1, 2, 3, 4].map(
                        (w) =>
                          [String(w), t('الأسبوع ', 'Week ') + w] as [
                            string,
                            string,
                          ],
                      ),
                    )
                  : field(
                      'resourceId',
                      'معرف التقرير',
                      'Report identifier',
                      'text',
                      true,
                      100,
                    )}
            {select('permission', 'نوع الإتاحة', 'Permission', [
              ['VIEW', lab('VIEW')],
              ...(get('resourceType') === 'GUIDANCE' ||
              (get('resourceType') === 'FEATURE' &&
                get('resourceId') === 'professionalTasks')
                ? ([['INTERACT', lab('INTERACT')]] as [string, string][])
                : []),
            ])}
            {field(
              'reason',
              'سبب الإتاحة — خاص بالمسؤولين',
              'Reason — private to authorized staff',
              'textarea',
              true,
              2000,
            )}
            {field('startsAt', 'تبدأ من', 'Starts at', 'datetime-local', true)}
            {field(
              'endsAt',
              'تنتهي في — اختياري',
              'Ends at — optional',
              'datetime-local',
            )}
          </>
        )}
        {kind === 'review' && (
          <>
            {field(
              'observedChange',
              'ما الذي تغير بالفعل؟ وما دليله؟',
              'What changed, and what is the evidence?',
              'textarea',
              false,
              6000,
            )}
            {field(
              'learning',
              'ماذا تعلمنا؟',
              'What did we learn?',
              'textarea',
              false,
              6000,
            )}
            {field(
              'insufficientEvidence',
              'ما الذي لا تكفي أدلته وما الخطوة القادمة؟',
              'Where is evidence insufficient? What next?',
              'textarea',
              false,
              6000,
            )}
          </>
        )}
        {kind === 'permissions' && (
          <>
            {select(
              'ownerId',
              'المسؤول الأساسي',
              'Case owner',
              staff
                .filter((s) => s.canOwn)
                .map((s) => [s.id, s.name] as [string, string]),
            )}
            <fieldset className="ies-fieldset">
              <legend>
                {t(
                  'مسؤولون إضافيون مصرح لهم',
                  'Additional authorized administrators',
                )}
              </legend>
              {staff.map((s) => (
                <label className="ies-check" key={s.id}>
                  <input
                    type="checkbox"
                    checked={(v.allowedAdminIds as string[]).includes(s.id)}
                    onChange={(e) =>
                      put(
                        'allowedAdminIds',
                        e.target.checked
                          ? [...(v.allowedAdminIds as string[]), s.id]
                          : (v.allowedAdminIds as string[]).filter(
                              (id) => id !== s.id,
                            ),
                      )
                    }
                  />
                  {s.name} ·{' '}
                  {s.canOwn
                    ? t('قراءة وكتابة', 'Read / write')
                    : t('قراءة فقط', 'Read only')}
                </label>
              ))}
            </fieldset>
            <p className="ies-hint">
              {t(
                'صلاحية القسم وحدها لا تكفي لقراءة الحالة. root يظل مخولًا، والآخرون يحتاجون أن يكونوا مسؤولين عن الحالة أو ضمن هذه القائمة.',
                'Section access alone cannot read this case. Root remains authorized; others must own the case or be listed here.',
              )}
            </p>
          </>
        )}
        {kind === 'followUp' && (
          <>
            {select(
              'followUpStatus',
              'حالة المتابعة',
              'Follow-up status',
              ['PENDING', 'DONE', 'CANCELLED'].map(
                (x) => [x, lab(x)] as [string, string],
              ),
            )}
            {field(
              'followUpAt',
              'الموعد التالي',
              'Next follow-up',
              'datetime-local',
            )}
            {field(
              'outcome',
              'ما حدث فعلًا نتيجة المتابعة',
              'Actual follow-up outcome',
              'textarea',
            )}
          </>
        )}
        {(kind === 'withdraw' || kind === 'delete') && (
          <>
            <p className="ies-hint">
              {kind === 'withdraw'
                ? t(
                    'سيتم إيقاف المشاركة وإلغاء جميع إتاحات هذه الحالة. يبقى السجل للمصرح لهم حتى موعد الاحتفاظ، ولا يتغير تقدم الرحلة الطبيعي.',
                    'Participation stops and all case overrides are revoked. Authorized records remain until retention; natural journey progress is unchanged.',
                  )
                : t(
                    'سيتم حذف الجلسات والملاحظات والخطة والإتاحات وسجل البحث لهذه التجربة نهائيًا. حساب المشارك ومهامه وتوجيهاته المنشورة تظل ضمن المنصة.',
                    'Permanently deletes this case, sessions, observations, plan, overrides and audit. The participant account and published Tasks/Feedback remain in the platform.',
                  )}
            </p>
            {field(
              'confirmText',
              kind === 'withdraw'
                ? 'اكتب WITHDRAW للتأكيد'
                : 'اكتب DELETE للتأكيد',
              kind === 'withdraw'
                ? 'Type WITHDRAW to confirm'
                : 'Type DELETE to confirm',
              'text',
              true,
              20,
            )}
          </>
        )}
        {error && (
          <p role="alert" className="ies-error">
            {error}
          </p>
        )}
        <div className="ies-editor-actions">
          <button
            className={kind === 'delete' ? 'ies-danger' : 'ies-primary'}
            type="submit"
            disabled={saving}
          >
            {saving
              ? t('جارٍ الحفظ…', 'Saving…')
              : kind === 'intervention'
                ? t(
                    'تأكيد التدخل للمشارك',
                    'Confirm member-facing intervention',
                  )
                : t('حفظ', 'Save')}
          </button>
          <button type="button" disabled={saving} onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
