import { fetchApi } from "../../lib/api-client";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpLeft,
  BarChart3,
  Check,
  ChevronDown,
  Compass,
  Download,
  FlaskConical,
  GitBranch,
  Layers,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { useToast } from "../../components/ui/ToastProvider";
import { Modal } from "../../components/ui/Modal";
import { adminApi, type AdminMember } from "./api/adminApi";
import {
  labApi,
  METRIC_LABELS,
  type CreateExperiment,
  type LabConfig,
  type LabExperiment,
  type LabReport,
} from "../ux-lab/labApi";
import type { SectionId } from "../ux-lab/SectionExperience";
import { JourneyTopologyCanvas } from "./components/JourneyTopologyCanvas";
import { MemberInspectorDrawer } from "./components/MemberInspectorDrawer";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import "./ux-lab.css";

function labError(error: unknown, ar: boolean) {
  const message = error instanceof Error ? error.message : "";
  if (!ar) return message || "Unable to save the change";
  const labels: Record<string, string> = {
    "This section has no implemented B design yet":
      "التصميم B لهذا القسم لم يُنفذ بعد.",
    "Choose a metric implemented in this section":
      "اختر نتيجة متاحة للقياس داخل هذا القسم.",
    "Choose one non-empty audience":
      "حدد مجموعة أو باحثين، أو اختر كل الباحثين المؤهلين.",
    "Invalid or excluded audience member":
      "بعض عناصر الجمهور غير متاحة. حدث البيانات وأعد الاختيار.",
    "Experiment status changed; refresh first":
      "تغيرت حالة التجربة. حدث البيانات أولًا.",
    "Finish the other experiment in this section first":
      "أنه التجربة الأخرى في هذا القسم أولًا.",
    "Restore section A before testing A against B":
      "أعد نشر A لهذا القسم قبل بدء مقارنة A وB.",
    "Complete the section experiment before publishing":
      "أنه تجربة هذا القسم قبل نشر تصميمه.",
    "Release changed; refresh before publishing":
      "تغير التصميم المنشور. حدث البيانات ثم راجع النشر.",
    "Design is not implemented": "التصميم المطلوب غير منفذ بعد.",
    "A meaningful title and hypothesis are required":
      "اكتب اسمًا واضحًا وفرضية قابلة للاختبار.",
  };
  return (
    labels[message] || "تعذر حفظ التغيير. راجع الحقول المحددة ثم أعد المحاولة."
  );
}
type Tab = "MAP" | "ACTIVATION" | "LAB" | "BEHAVIOR";
async function allMembers() {
  const first = await adminApi.users({ limit: 100 });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      adminApi.users({ page: i + 2, limit: 100 }),
    ),
  );
  return [...first.items, ...rest.flatMap((p) => p.items)].filter(
    (m) => m.role === "USER" && m.id !== "aeef0606-17bb-47b6-a239-4a44526303b4",
  );
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <article className="lab-card lab-stat">
      <p className="lab-muted text-xs">{label}</p>
      <strong>{value}</strong>
      {detail && <p className="lab-muted text-xs leading-5">{detail}</p>}
    </article>
  );
}
function NoEvidence({ children }: { children: ReactNode }) {
  return (
    <div className="lab-empty">
      <Activity size={24} />
      <p>{children}</p>
    </div>
  );
}
const statusLabels: Record<string, [string, string]> = {
  DRAFT: ["مسودة", "Draft"],
  RUNNING: ["تعمل الآن", "Running"],
  PAUSED: ["متوقفة مؤقتًا", "Paused"],
  COMPLETED: ["منتهية", "Completed"],
};
export default function AdminUxLabPage() {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("MAP");
  const [days, setDays] = useState(30);
  const [groupId, setGroup] = useState("");
  const [experimentId, setExperiment] = useState("");
  const [inspect, setInspect] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Pick<
    AdminMember,
    "id" | "name"
  > | null>(null);
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState<{
    section: SectionId;
    version: string;
  } | null>(null);
  const [sectionDetail, setSectionDetail] = useState<SectionId | null>(null);
  const config = useQuery({
    queryKey: ["lab-config"],
    queryFn: labApi.config,
    enabled: tab !== "MAP",
  });
  const report = useQuery({
    queryKey: ["lab-report", days, groupId, experimentId],
    enabled: tab !== "MAP",
    queryFn: () =>
      labApi.report(days, groupId || undefined, experimentId || undefined),
  });
  const directory = useQuery({
    queryKey: ["lab-directory"],
    enabled: tab !== "MAP",
    queryFn: async () => {
      const [members, groups, nodes, guidances] = await Promise.all([
        allMembers(),
        adminApi.groups(),
        adminApi.journeyNodes(),
        adminApi.plotGuidance(),
      ]);
      return { members, groups: groups.items, nodes, guidances };
    },
  });
  const [video, setVideo] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const legacyConfig = useQuery({
    queryKey: ["lab-video-config"],
    enabled: tab === "LAB",
    queryFn: () => fetchApi<{ introVideoUrl: string }>("/ux-analytics/config"),
  });
  const metric = (id: string) => METRIC_LABELS[id]?.[ar ? 0 : 1] ?? id;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["journey-observatory"] });
    void queryClient.invalidateQueries({ queryKey: ["journey-observations"] });
    void queryClient.invalidateQueries({ queryKey: ["lab-config"] });
    void queryClient.invalidateQueries({ queryKey: ["lab-report"] });
    void queryClient.invalidateQueries({ queryKey: ["lab-directory"] });
  };
  const action = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      refresh();
      toast.success(text("تم حفظ التغيير", "Change saved"));
    } catch (e) {
      toast.error(labError(e, ar));
    } finally {
      setBusy(false);
    }
  };
  const data = report.data,
    cfg = config.data,
    dir = directory.data;
  const selected =
    cfg?.experiments.find((e) => e.id === experimentId) ?? cfg?.experiments[0];
  const comparison = data?.comparisons.find(
    (c) => c.experimentId === selected?.id,
  );
  const sectionTitle = (id: string) => {
    const s = cfg?.registry.find((s) => s.id === id);
    return s ? text(s.titleAr, s.titleEn) : id;
  };
  const ready = config.data && report.data && directory.data;
  const error = config.error || report.error || directory.error;
  const exportMetrics = () => {
    if (!data) return;
    const rows = [
      [
        "section",
        "version",
        "event",
        "unique_users",
        "events",
        "active_seconds",
      ],
      ...data.rollup.map((r) => [
        r.section,
        r.version,
        r.name,
        r.users,
        r.events,
        r.seconds,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + rows.map((row) => row.join(",")).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nawah-ux-metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={`ux-lab space-y-6 ${tab === "MAP" ? "journey-map-page" : ""}`} dir={ar ? "rtl" : "ltr"}>
      <header className="lab-heading">
        <div>
          <p className="lab-eyebrow">
            {text(
              "مركز قيادة المنصة / أبحاث تجربة الاستخدام",
              "Platform control / Experience research",
            )}
          </p>
          <h1>
            {text("تحليلات التجربة والسلوك", "Experience & behavior research")}
          </h1>
          <p className="lab-muted mt-3 max-w-3xl text-sm leading-7">
            {text(
              "راقب أين يصل الباحثون، وما ينجزونه داخل كل قسم، وقارن تغييرًا محددًا بنتيجة قابلة للقياس.",
              "See where members are, what they achieve in each section, and compare a specific design change against a measurable outcome.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="lab-badge">
            <span className="h-2 w-2 rounded-full bg-[#155546]" />
            {text("المرجع الحالي", "Current baseline")} A
          </span>
          <button
            className="lab-icon"
            aria-label={text("تحديث البيانات", "Refresh data")}
            disabled={report.isFetching}
            onClick={refresh}
          >
            <RefreshCw
              className={report.isFetching ? "animate-spin" : ""}
              size={17}
            />
          </button>
        </div>
      </header>
      <nav
        className="lab-tabs"
        aria-label={text("تحليلات التجربة", "Experience analytics")}
      >
        {(
          [
            { id: "MAP", a: "خريطة الرحلة", e: "Journey map", icon: Compass },
            {
              id: "ACTIVATION",
              a: "التفعيل والعوائق",
              e: "Activation & blockers",
              icon: GitBranch,
            },
            {
              id: "LAB",
              a: "معمل التجارب",
              e: "Experiment lab",
              icon: FlaskConical,
            },
            {
              id: "BEHAVIOR",
              a: "سلوك الاستخدام",
              e: "Usage behavior",
              icon: Activity,
            },
          ] as const
        ).map((x) => (
          <button
            key={x.id}
            aria-current={tab === x.id ? "page" : undefined}
            onClick={() => setTab(x.id)}
          >
            <x.icon size={18} />
            {text(x.a, x.e)}
          </button>
        ))}
      </nav>
      {tab === "MAP" ? (
        <JourneyTopologyCanvas
          onInspectMember={setInspect}
          onSendFeedback={setFeedback}
        />
      ) : error ? (
        <div className="lab-card" role="alert">
          <h2>
            {text("تعذر تحميل بيانات المرصد", "Unable to load research data")}
          </h2>
          <p className="lab-muted mt-2">
            {text(
              "لم نستبدل البيانات المفقودة بأرقام تقديرية. أعد المحاولة.",
              "Missing data has not been replaced with estimates. Please retry.",
            )}
          </p>
          <button className="lab-primary mt-4" onClick={refresh}>
            {text("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : !data || !cfg || !dir ? (
        <div
          className="lab-card min-h-64 grid place-content-center"
          role="status"
        >
          <RefreshCw className="animate-spin mx-auto" />
          <p className="mt-4">
            {text("تحميل البيانات الفعلية…", "Loading real data…")}
          </p>
        </div>
      ) : (
        <>
          {(
            <section
              className="lab-card flex flex-wrap items-end justify-between gap-4 !p-4"
              aria-label={text("نطاق القياس", "Measurement scope")}
            >
              <div className="flex flex-wrap gap-4">
                {tab !== "ACTIVATION" && (
                  <>
                    <label className="lab-field">
                      {text(
                        "الفترة / أحداث بتوقيت UTC",
                        "Period / events in UTC",
                      )}
                      <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                      >
                        {[7, 30, 90].map((d) => (
                          <option key={d} value={d}>
                            {number(d)} {text("يومًا", "days")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <label className="lab-field">
                  {text("المجموعة", "Group")}
                  <select
                    value={groupId}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="">
                      {text("كل المجموعات", "All groups")}
                    </option>
                    {dir.groups.map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                {tab !== "ACTIVATION" && (
                  <>
                    <label className="lab-field">
                      {text("أحداث التجربة", "Experiment events")}
                      <select
                        value={experimentId}
                        onChange={(e) => setExperiment(e.target.value)}
                      >
                        <option value="">
                          {text("كل القياس الجديد", "All new measurements")}
                        </option>
                        {cfg.experiments.map((e) => (
                          <option value={e.id} key={e.id}>
                            {e.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
              <p className="lab-muted w-full text-xs leading-6">
                {text(
                  tab === "ACTIVATION"
                    ? "لقطة تراكمية طوال الوقت حسب العضوية الحالية."
                    : "الأحداث حسب المجموعة وقت التفاعل؛ حالة الجولات حسب العضوية الحالية.",
                  tab === "ACTIVATION"
                    ? "All-time snapshot using current group membership."
                    : "Events use the group at interaction time; guide states use current membership.",
                )}
              </p>
              <p className="lab-muted text-xs">
                {text("آخر تحديث: ", "Updated: ")}
                {new Date(data.generatedAt).toLocaleTimeString(
                  ar ? "ar-EG" : "en-GB",
                  { hour: "2-digit", minute: "2-digit", timeZone: "UTC" },
                )}{" "}
                UTC
              </p>
            </section>
          )}
          {tab === "ACTIVATION" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label={text(
                    "حسابات الباحثين في النطاق",
                    "Member accounts in scope",
                  )}
                  value={number(data.activation.total)}
                  detail={text(
                    "لقطة تراكمية للحسابات الحالية؛ تستبعد حساب الاختبار والإدارة.",
                    "Cumulative account snapshot; excludes the QA account and admins.",
                  )}
                />
                <Stat
                  label={text("أكملوا المهمة صفر", "Task 0 completed")}
                  value={number(
                    data.activation.stages.find((s) => s.code === "TASK_0")
                      ?.count ?? 0,
                  )}
                  detail={text(
                    "من سجل الرحلة المحفوظ، وليس من عدد الطلبات القديمة.",
                    "From saved journey completion, not historical application counts.",
                  )}
                />
                <Stat
                  label={text(
                    "لم يُكملوا البداية بعد",
                    "Start not yet complete",
                  )}
                  value={number(data.activation.waiting.length)}
                  detail={text(
                    "قائمة للفحص؛ ليست حكمًا بأن المستخدم انسحب.",
                    "An inspection list, not a claim that users abandoned the journey.",
                  )}
                />
              </div>
              <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                <section className="lab-card">
                  <p className="lab-eyebrow">
                    {text("معالم البداية", "Starting milestones")}
                  </p>
                  <h2 className="mt-2">
                    {text(
                      "من الحساب إلى الانطلاقة",
                      "From account to momentum",
                    )}
                  </h2>
                  <p className="lab-muted mt-2 text-sm leading-7">
                    {text(
                      "كل شريط يعرض معلمًا محفوظًا من إجمالي الحسابات. هذه لقطة حالية، وليست قمعًا زمنيًا أو قياسًا لسبب التوقف.",
                      "Each bar shows a saved milestone out of all accounts. This is a current snapshot, not a sequential causal funnel.",
                    )}
                  </p>
                  <div className="mt-7 space-y-7">
                    {data.activation.stages.map((s, i) => (
                      <article key={s.code}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="flex gap-3">
                            <b className="lab-step">{i + 1}</b>
                            {text(s.titleAr, s.titleEn)}
                          </span>
                          <strong>
                            {number(s.count)}{" "}
                            <small className="lab-muted font-normal">
                              / {number(data.activation.total)}
                            </small>
                          </strong>
                        </div>
                        <div className="lab-bar">
                          <span style={{ width: `${s.percent ?? 0}%` }} />
                        </div>
                        <p className="lab-muted mt-1 text-end text-xs">
                          {s.percent === null ? "—" : number(s.percent) + "%"}
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="lab-footnote">
                    {text(
                      "الأسابيع اللاحقة لا تُحسب كتسرّب قبل استيفاء شروط الوقت والعمل. افحصها من خريطة الرحلة. هذه المعالم لا تتأثر بفلتر الفترة أو التجربة.",
                      "Future weeks are not drop-off before their time and work requirements are met. Inspect them on the map. Milestones are not filtered by event period or experiment.",
                    )}
                  </p>
                </section>
                <section className="lab-card">
                  <p className="lab-eyebrow">
                    {text("الخطوة التالية في البحث", "Next research step")}
                  </p>
                  <h2 className="mt-2">
                    {text(
                      "افحص العائق قبل التدخل",
                      "Inspect the blocker before intervening",
                    )}
                  </h2>
                  <p className="lab-muted mt-2 text-sm leading-7">
                    {text(
                      "بيانات الملف، إكمال الجولة، ثم عمل المهمة صفر. افتح حسابًا لفهم سياقه قبل إعداد توجيه.",
                      "Inspect profile readiness, the required guide and Task 0 work. Open an account to understand its context before drafting guidance.",
                    )}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["PROFILE", "GUIDE", "TASK_0"].map((reason) => (
                      <span className="lab-badge" key={reason}>
                        {text(
                          reason === "PROFILE"
                            ? "الملف"
                            : reason === "GUIDE"
                              ? "الجولة"
                              : "المهمة صفر",
                          reason === "PROFILE"
                            ? "Profile"
                            : reason === "GUIDE"
                              ? "Guide"
                              : "Task 0",
                        )}{" "}
                        ·{" "}
                        {number(
                          data.activation.waiting.filter(
                            (x) => x.reason === reason,
                          ).length,
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 max-h-[420px] overflow-auto">
                    {data.activation.waiting.map((u) => (
                      <article className="lab-person" key={u.id}>
                        <div>
                          <strong>{u.name}</strong>
                          <p className="lab-muted mt-1 text-xs">
                            {text(
                              u.reason === "PROFILE"
                                ? "الملف يحتاج استكمالًا"
                                : u.reason === "GUIDE"
                                  ? "الجولة لم تكتمل"
                                  : "متطلبات المهمة صفر لم تكتمل",
                              u.reason === "PROFILE"
                                ? "Profile incomplete"
                                : u.reason === "GUIDE"
                                  ? "Guide incomplete"
                                  : "Task 0 work incomplete",
                            )}{" "}
                            ·{" "}
                            {u.days === null
                              ? "—"
                              : number(u.days) +
                                " " +
                                text("يوم بالمحطة", "days at station")}
                          </p>
                        </div>
                        <button
                          className="lab-button"
                          onClick={() => setInspect(u.id)}
                        >
                          {text("فحص", "Inspect")}
                        </button>
                      </article>
                    ))}
                    {!data.activation.waiting.length && (
                      <NoEvidence>
                        {text(
                          "لا توجد حسابات منتظرة في البداية.",
                          "No accounts waiting at the start.",
                        )}
                      </NoEvidence>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "LAB" && (
            <>
              <section className="lab-release">
                <div>
                  <p className="lab-eyebrow">
                    {text(
                      "خريطة التصميم المنشور",
                      "Published design composition",
                    )}
                  </p>
                  <h2 className="mt-2">
                    {text(
                      "كل قسم له نسخته. الرحلة تظل محفوظة.",
                      "Every section has its version. Journey progress stays saved.",
                    )}
                  </h2>
                  <p className="lab-muted mt-2 max-w-3xl text-sm leading-7">
                    {text(
                      "A هي تجربة المنصة المعتمدة حاليًا بالكامل. يمكنك اختبار قسم واحد ثم نشر B له فقط؛ تبقى الأقسام الأخرى على A دون إعادة جولات المستخدم.",
                      "A is the complete current approved experience. Test one section and publish its B independently, keeping the other sections on A without replaying guides.",
                    )}
                  </p>
                </div>
                <div className="lab-release-grid">
                  {cfg.registry.map((s) => (
                    <article key={s.id}>
                      <div className="flex justify-between gap-2">
                        <h3>{sectionTitle(s.id)}</h3>
                        <b className="lab-version">
                          {cfg.releases[s.id].version}
                        </b>
                      </div>
                      <p className="lab-muted mt-2 text-xs">
                        {s.versions.includes("B")
                          ? text(
                              "A: جدول · B: بطاقات تقدم",
                              "A: table · B: progress cards",
                            )
                          : text(
                              "A جاهزة · B تحتاج تصميمًا وتنفيذًا",
                              "A ready · B requires design and implementation",
                            )}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {s.versions.map((v) => (
                          <button
                            className="lab-button"
                            key={v}
                            disabled={busy || v === cfg.releases[s.id].version}
                            onClick={() =>
                              setPublish({ section: s.id, version: v })
                            }
                          >
                            {v === cfg.releases[s.id].version ? (
                              <Check size={13} />
                            ) : null}
                            {v === cfg.releases[s.id].version
                              ? text("منشور ", "Published ")
                              : text("نشر ", "Publish ")}
                            {v}
                          </button>
                        ))}
                        {s.id === "members-progress" && (
                          <a
                            className="lab-text-link"
                            target="_blank"
                            rel="noreferrer"
                            href="/members-progress?labPreview=members-progress:B"
                          >
                            {text("معاينة B", "Preview B")} ↗
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="lab-card">
                <header className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="lab-eyebrow">
                      {text(
                        "اختبار مضبوط، وقرار مفهوم",
                        "A controlled test, an understandable decision",
                      )}
                    </p>
                    <h2 className="mt-2">
                      {text("تجارب الأقسام", "Section experiments")}
                    </h2>
                  </div>
                  <button
                    className="lab-primary"
                    onClick={() => setCreate(true)}
                  >
                    <Plus size={17} />
                    {text("تجربة جديدة", "New experiment")}
                  </button>
                </header>
                <div className="lab-experiment-workspace mt-6">
                  <aside className="lab-experiment-list">
                    {cfg.experiments.map((e) => (
                      <button
                        key={e.id}
                        className={selected?.id === e.id ? "selected" : ""}
                        onClick={() => setExperiment(e.id)}
                      >
                        <span className="lab-badge">
                          {text(
                            ...(statusLabels[e.status] as [string, string]),
                          )}
                        </span>
                        <strong className="mt-3 block">{e.title}</strong>
                        <small className="lab-muted mt-2 block">
                          {sectionTitle(e.section)} · A / B
                        </small>
                      </button>
                    ))}
                    {!cfg.experiments.length && (
                      <p className="lab-muted p-4 text-sm leading-7">
                        {text(
                          "لا توجد تجربة جديدة بعد. سجل فرضية ونتيجة أساسية، ثم حدد من سيشارك.",
                          "No new experiments yet. Define a hypothesis, primary outcome and audience.",
                        )}
                      </p>
                    )}
                  </aside>
                  <div>
                    {selected ? (
                      <>
                        <div className="flex flex-wrap justify-between gap-4">
                          <div>
                            <span className="lab-badge">
                              {sectionTitle(selected.section)}
                            </span>
                            <h3 className="mt-3 text-xl font-bold">
                              {selected.title}
                            </h3>
                            <p className="lab-muted mt-2 max-w-2xl text-sm leading-7">
                              {selected.hypothesis}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-start gap-2">
                            {(selected.status === "DRAFT" ||
                              selected.status === "PAUSED") && (
                              <button
                                className="lab-primary"
                                disabled={busy}
                                onClick={() =>
                                  action(() =>
                                    labApi.status(selected.id, "RUNNING"),
                                  )
                                }
                              >
                                {text(
                                  selected.status === "DRAFT"
                                    ? "بدء التجربة"
                                    : "استئناف",
                                  selected.status === "DRAFT"
                                    ? "Start test"
                                    : "Resume",
                                )}
                              </button>
                            )}
                            {selected.status === "RUNNING" && (
                              <button
                                className="lab-button"
                                disabled={busy}
                                onClick={() =>
                                  action(() =>
                                    labApi.status(selected.id, "PAUSED"),
                                  )
                                }
                              >
                                {text("إيقاف مؤقت", "Pause")}
                              </button>
                            )}
                            {selected.status !== "COMPLETED" && (
                              <button
                                className="lab-button"
                                disabled={busy}
                                onClick={() =>
                                  action(() =>
                                    labApi.status(selected.id, "COMPLETED"),
                                  )
                                }
                              >
                                {text("إنهاء التجربة", "End test")}
                              </button>
                            )}
                          </div>
                        </div>
                        <dl className="lab-test-plan">
                          <div>
                            <dt>{text("الجمهور", "Audience")}</dt>
                            <dd>
                              {selected.audience === "ALL"
                                ? text(
                                    "كل الباحثين المؤهلين",
                                    "All eligible members",
                                  )
                                : selected.audience === "GROUPS"
                                  ? selected.groupIds
                                      .map(
                                        (id) =>
                                          dir.groups.find((g) => g.id === id)
                                            ?.name ??
                                          text(
                                            "مجموعة محذوفة",
                                            "Deleted group",
                                          ),
                                      )
                                      .join("، ")
                                  : text(
                                      `${selected.userIds.length} باحث محدد`,
                                      `${selected.userIds.length} selected members`,
                                    )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {text(
                                "توزيع ثابت للحساب",
                                "Stable account allocation",
                              )}
                            </dt>
                            <dd>
                              A {100 - selected.allocation}% / B{" "}
                              {selected.allocation}%
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {text("النتيجة الأساسية", "Primary outcome")}
                            </dt>
                            <dd>{metric(selected.primaryMetric)}</dd>
                          </div>
                          <div>
                            <dt>
                              {text(
                                "حد العينة المخطط / نسخة",
                                "Planned sample / arm",
                              )}
                            </dt>
                            <dd>
                              {number(selected.minSample)}{" "}
                              {text("مشاهد فعلي", "exposed users")}
                            </dd>
                          </div>
                        </dl>
                        {comparison ? (
                          <>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {comparison.arms.map((arm) => (
                                <article className="lab-arm" key={arm.version}>
                                  <header>
                                    <b className="lab-version">{arm.version}</b>
                                    <strong>
                                      {arm.rate === null
                                        ? "—"
                                        : number(arm.rate) + "%"}
                                    </strong>
                                  </header>
                                  <p className="lab-muted mt-3 text-xs">
                                    {metric(selected.primaryMetric)}
                                  </p>
                                  <div className="lab-bar mt-3">
                                    <span
                                      style={{ width: `${arm.rate ?? 0}%` }}
                                    />
                                  </div>
                                  <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <dt className="lab-muted">
                                        {text("شاهدوا القسم", "Exposed")}
                                      </dt>
                                      <dd className="mt-1 text-lg font-bold">
                                        {number(arm.exposed)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="lab-muted">
                                        {text("حققوا النتيجة", "Converted")}
                                      </dt>
                                      <dd className="mt-1 text-lg font-bold">
                                        {number(arm.converted)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="lab-muted">
                                        {text(
                                          "واجهوا خطأ",
                                          "Experienced error",
                                        )}
                                      </dt>
                                      <dd className="mt-1 font-semibold">
                                        {number(arm.errors)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="lab-muted">
                                        {text(
                                          "وسيط زمن النتيجة",
                                          "Median time to outcome",
                                        )}
                                      </dt>
                                      <dd className="mt-1 font-semibold">
                                        {arm.medianSeconds === null
                                          ? "—"
                                          : number(
                                              Math.round(arm.medianSeconds),
                                            ) +
                                            " " +
                                            text("ث", "s")}
                                      </dd>
                                    </div>
                                  </dl>
                                </article>
                              ))}
                            </div>
                            <div className="lab-evidence mt-4">
                              <strong>
                                {comparison.sufficient
                                  ? text(
                                      "تجاوزنا الحد المخطط؛ راجع السياق قبل القرار",
                                      "Planned sample reached; review context before deciding",
                                    )
                                  : text(
                                      "العينة لم تصل إلى الحد المخطط بعد",
                                      "Planned sample not reached yet",
                                    )}
                              </strong>
                              <p className="mt-2 text-sm leading-7">
                                {text("الفرق B − A: ", "Difference B − A: ")}
                                {comparison.deltaPoints === null
                                  ? "—"
                                  : number(comparison.deltaPoints) +
                                    " " +
                                    text("نقطة مئوية", "percentage points")}
                                {text(
                                  " · مقارنة وصفية، وليست إثباتًا إحصائيًا أو إعلان فائز.",
                                  " · Descriptive comparison, not statistical proof or a winner declaration.",
                                )}
                              </p>
                              <p className="lab-muted mt-2 text-xs leading-6">
                                {text(
                                  "المقام: حسابات شاهدت القسم فعلًا في هذه التجربة والفترة. البسط: من حقق النتيجة بعدها في نفس سياق التجربة. التعيين وحده لا يُعد مشاهدة.",
                                  "Denominator: accounts actually exposed to this experiment in the selected period. Numerator: those who subsequently achieved the outcome in the same experiment context. Assignment alone is not exposure.",
                                )}
                              </p>
                            </div>
                          </>
                        ) : null}
                        <p className="lab-footnote">
                          {text(
                            "عند الإيقاف المؤقت يرجع القسم إلى التصميم المنشور، ويُحفظ تعيين A/B عند الاستئناف. لا يبدأ اختبار آخر أو نشر تصميم في نفس القسم قبل إنهاء الاختبار الحالي.",
                            "Pausing restores the published section design and retains the A/B allocation on resume. Finish this section’s test before starting another or publishing a release.",
                          )}
                        </p>
                      </>
                    ) : (
                      <NoEvidence>
                        {text(
                          "ابدأ بفرضية واحدة. التصميم الحالي A يظل كما هو حتى تبدأ تجربة صراحة.",
                          "Start with one hypothesis. The current A experience stays unchanged until you explicitly start a test.",
                        )}
                      </NoEvidence>
                    )}
                  </div>
                </div>
              </section>
              <section className="lab-card">
                <h2>
                  {text("فيديو التعريف بالمنصة", "Platform introduction video")}
                </h2>
                <p className="lab-muted mt-2 text-sm">
                  {text(
                    "إعداد المحتوى مستقل عن نسخ التصميم والتجارب.",
                    "Content configuration is independent of design versions and experiments.",
                  )}
                </p>
                <form
                  className="mt-4 flex flex-wrap gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setVideoBusy(true);
                    try {
                      await adminApi.updateUxConfig({
                        introVideoUrl:
                          video ?? legacyConfig.data?.introVideoUrl ?? "",
                      });
                      toast.success(text("تم حفظ الرابط", "Video URL saved"));
                      void queryClient.invalidateQueries({
                        queryKey: ["lab-video-config"],
                      });
                    } catch {
                      toast.error(
                        text("تعذر حفظ الرابط", "Unable to save URL"),
                      );
                    } finally {
                      setVideoBusy(false);
                    }
                  }}
                >
                  <input
                    className="min-w-0 grow"
                    type="url"
                    aria-label={text(
                      "رابط فيديو التعريف",
                      "Introduction video URL",
                    )}
                    dir="ltr"
                    value={video ?? legacyConfig.data?.introVideoUrl ?? ""}
                    onChange={(e) => setVideo(e.target.value)}
                    placeholder="https://…"
                  />
                  <button
                    className="lab-primary"
                    disabled={videoBusy || legacyConfig.isPending}
                  >
                    {text("حفظ الرابط", "Save URL")}
                  </button>
                </form>
              </section>
            </>
          )}
          {tab === "BEHAVIOR" && (
            <>
              <header className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="lab-eyebrow">
                    {text(
                      "من المشاهدة إلى إنجاز العمل",
                      "From viewing to completing work",
                    )}
                  </p>
                  <h2 className="mt-2">
                    {text(
                      "هل الأقسام تساعد المستخدم على الإنجاز؟",
                      "Do sections help members accomplish their work?",
                    )}
                  </h2>
                </div>
                <button className="lab-button" onClick={exportMetrics}>
                  <Download size={16} />
                  {text("تصدير المقاييس", "Export metrics")}
                </button>
              </header>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label={text("مشاهدات أقسام", "Section views")}
                  value={number(
                    data.rollup
                      .filter((r) => r.name === "view")
                      .reduce((n, r) => n + r.events, 0),
                  )}
                  detail={text(
                    "الزيارات المتكررة محسوبة؛ المستخدمون الفريدون داخل كل قسم أدناه.",
                    "Includes repeat visits; unique users per section appear below.",
                  )}
                />
                <Stat
                  label={text("نتائج عمل مسجلة", "Recorded outcomes")}
                  value={number(
                    data.rollup
                      .filter(
                        (r) =>
                          ![
                            "view",
                            "engaged",
                            "request_failed",
                            "validation_failed",
                          ].includes(r.name),
                      )
                      .reduce((n, r) => n + r.events, 0),
                  )}
                  detail={text(
                    "عمليات مكتملة، مثل حفظ طلب أو تحميل سجل زميل.",
                    "Completed operations, such as saving an application or loading member history.",
                  )}
                />
                <Stat
                  label={text("دقائق تفاعل نشط", "Active engagement minutes")}
                  value={number(
                    Math.round(
                      data.sections.reduce((n, s) => n + s.engagedSeconds, 0) /
                        60,
                    ),
                  )}
                  detail={text(
                    "الوقت الظاهر فقط؛ يتوقف بعد دقيقة بلا تفاعل أو عند إخفاء التبويب.",
                    "Visible time only; pauses after one idle minute or when the tab is hidden.",
                  )}
                />
              </div>
              <section className="lab-card">
                <header>
                  <h2>{text("النشاط اليومي", "Daily activity")}</h2>
                  <p className="lab-muted mt-2 text-sm">
                    {text(
                      "ارتفاع الزيارات وحده لا يعني تحسن التجربة. قارن المشاهدات بالإنجازات والأخطاء.",
                      "More visits alone do not establish better UX. Compare views with outcomes and errors.",
                    )}
                  </p>
                </header>
                <DailyChart data={data} ar={ar} />
              </section>
              <section className="lab-card !p-0 overflow-hidden">
                <header className="p-5">
                  <h2>{text("أداء كل قسم", "Section performance")}</h2>
                  <p className="lab-muted mt-2 text-sm">
                    {text(
                      "افتح القسم لرؤية نوع النتائج والأخطاء المسجلة. لا نعرض أصفارًا كنسبة نجاح عند غياب المشاهدات.",
                      "Inspect a section for its recorded outcomes and errors. No success rate is shown without exposure.",
                    )}
                  </p>
                </header>
                <div className="overflow-auto">
                  <table className="lab-table">
                    <thead>
                      <tr>
                        {[
                          text("القسم", "Section"),
                          text("زوار فريدون", "Unique visitors"),
                          text("أنجزوا عملًا", "Completed work"),
                          text("نسبة الإنجاز", "Outcome rate"),
                          text("واجهوا خطأ", "Experienced error"),
                          text("وسيط زمن أول نتيجة", "Median first outcome"),
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.sections.map((s) => (
                        <tr key={s.section}>
                          <th>
                            <button
                              className="lab-text-link"
                              onClick={() =>
                                setSectionDetail(
                                  sectionDetail === s.section
                                    ? null
                                    : s.section,
                                )
                              }
                              aria-expanded={sectionDetail === s.section}
                            >
                              {sectionTitle(s.section)}{" "}
                              <ChevronDown size={13} />
                            </button>
                          </th>
                          <td>{number(s.visitors)}</td>
                          <td>{number(s.actedUsers)}</td>
                          <td>
                            {s.actionRate === null
                              ? "—"
                              : number(s.actionRate) + "%"}
                          </td>
                          <td>{number(s.errorUsers)}</td>
                          <td>
                            {s.medianFirstActionSeconds === null
                              ? "—"
                              : number(Math.round(s.medianFirstActionSeconds)) +
                                " " +
                                text("ث", "s")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sectionDetail && (
                  <div className="border-t border-neutral-200 p-5">
                    <h3 className="font-bold">
                      {sectionTitle(sectionDetail)} ·{" "}
                      {text("تفصيل النتائج", "Outcome detail")}
                    </h3>
                    {data.rollup
                      .filter(
                        (r) =>
                          r.section === sectionDetail &&
                          !["view", "engaged"].includes(r.name),
                      )
                      .map((r) => (
                        <div
                          className="mt-3 flex justify-between gap-4 text-sm"
                          key={r.name + r.version}
                        >
                          <span>
                            {metric(r.name)} · {r.version}
                          </span>
                          <span>
                            {number(r.users)} {text("مستخدم", "users")} /{" "}
                            {number(r.events)} {text("حدث", "events")}
                          </span>
                        </div>
                      ))}
                    {!data.rollup.some(
                      (r) =>
                        r.section === sectionDetail &&
                        !["view", "engaged"].includes(r.name),
                    ) && (
                      <p className="lab-muted mt-3 text-sm">
                        {text(
                          "لم تسجل نتائج أو أخطاء لهذا القسم في النطاق المحدد.",
                          "No outcomes or errors recorded for this section in this scope.",
                        )}
                      </p>
                    )}
                  </div>
                )}
              </section>
              <section className="lab-card">
                <h2>
                  {text("صحة الجولات التعليمية", "Guide completion health")}
                </h2>
                <p className="lab-muted mt-2 text-sm leading-7">
                  {text(
                    "حالة كل حساب المحفوظة طوال الوقت، ضمن المجموعة الحالية. لا تتأثر بفلتر الفترة أو تجربة التصميم. التخطي اختيار مسجل؛ ليس فشلًا في الاستخدام.",
                    "All-time saved account state, within current group membership. Unaffected by event period or design experiment. Skipping is a recorded choice, not a usability failure.",
                  )}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[...new Set(data.guides.map((g) => g.flowKey))].map(
                    (key) => (
                      <article
                        key={key}
                        className="rounded-xl border border-neutral-300 p-4"
                      >
                        <h3 className="text-sm font-semibold">
                          {guideTitle(key, ar)}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                          {["COMPLETED", "SKIPPED", "IN_PROGRESS"].map(
                            (status) => (
                              <span key={status}>
                                {text(
                                  status === "COMPLETED"
                                    ? "أكمل"
                                    : status === "SKIPPED"
                                      ? "تخطّى"
                                      : "بدأ",
                                  status === "COMPLETED"
                                    ? "Completed"
                                    : status === "SKIPPED"
                                      ? "Skipped"
                                      : "Started",
                                )}{" "}
                                <b>
                                  {number(
                                    data.guides.find(
                                      (g) =>
                                        g.flowKey === key &&
                                        g.status === status,
                                    )?.count ?? 0,
                                  )}
                                </b>
                              </span>
                            ),
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
                {!data.guides.length && (
                  <NoEvidence>
                    {text(
                      "لا توجد حالات جولات محفوظة في هذا النطاق بعد.",
                      "No saved guide states in this scope yet.",
                    )}
                  </NoEvidence>
                )}
              </section>
            </>
          )}
          <footer className="lab-method">
            <Layers size={18} />
            <div>
              <strong>
                {text("حدود البيانات واضحة", "Clear data boundaries")}
              </strong>
              <p>
                {text(
                  "يبدأ قياس الأقسام الجديد عند نشر هذا الإصدار. لا تُخلط نتائج A/B/C القديمة معه. لا نسجل محتوى السيرة الذاتية أو قيم النماذج أو ضغطات المفاتيح. الأحداث الجديدة منفصلة عن حالة الرحلة والجولات.",
                  "New section measurements begin with this release. Historical A/B/C results are kept separate. CV content, form values and keystrokes are not recorded. Research events are separate from journey and guide state.",
                )}
              </p>
            </div>
          </footer>
        </>
      )}
      <MemberInspectorDrawer
        memberId={inspect}
        onClose={() => setInspect(null)}
        onMemberUpdated={refresh}
      />
      {feedback && (
        <FeedbackFormDialog
          post={null}
          onClose={() => setFeedback(null)}
          onSaved={() => setFeedback(null)}
          initialTargetUserId={feedback.id}
          initialTargetName={feedback.name}
        />
      )}
      {create && cfg && dir && (
        <ExperimentEditor
          config={cfg}
          members={dir.members}
          groups={dir.groups}
          onClose={() => setCreate(false)}
          onCreated={(id) => {
            setExperiment(id);
            setCreate(false);
            refresh();
          }}
        />
      )}
      {publish && cfg && (
        <Modal
          isOpen
          onClose={() => setPublish(null)}
          title={text(
            "مراجعة نشر تصميم القسم",
            "Review section design release",
          )}
        >
          <div className="ux-lab space-y-5">
            <p className="text-sm leading-7">
              {text("سيصبح التصميم المنشور لقسم ", "The published design for ")}
              <strong>{sectionTitle(publish.section)}</strong> {publish.version}
              .{" "}
              {text(
                "التغيير يخص هذا القسم فقط. سجل الرحلة والطلبات والجولات المكتملة سيبقى محفوظًا.",
                "This changes only this section. Journey history, applications and completed guides remain saved.",
              )}
            </p>
            <div className="grid gap-2">
              {cfg.registry.map((s) => (
                <div
                  className="flex justify-between rounded-lg border border-neutral-300 p-3 text-sm"
                  key={s.id}
                >
                  <span>{sectionTitle(s.id)}</span>
                  <strong>
                    {s.id === publish.section
                      ? publish.version
                      : cfg.releases[s.id].version}
                  </strong>
                </div>
              ))}
            </div>
            <button
              className="lab-primary w-full"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await labApi.publish(
                    publish.section,
                    publish.version,
                    cfg.releases[publish.section].context,
                  );
                  setPublish(null);
                })
              }
            >
              {text("تأكيد نشر هذا القسم", "Confirm section release")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function guideTitle(key: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    "first-application-v1": [
      "الجولة الإلزامية: أول طلب",
      "Required first application",
    ],
    "cv-filter-week1-v1": ["فلتر نسخ السيرة الذاتية", "CV version filter"],
    "explorer-intro-week1-v1": [
      "التعريف بمكتشف الوظائف",
      "Job explorer introduction",
    ],
    "explorer-filters-week1-v1": [
      "فلاتر مكتشف الوظائف",
      "Job explorer filters",
    ],
    "groups-week1-v1": ["تقدم المجموعة", "Group progress"],
    "analytics-week1-v1": ["تحليل الأداء", "Performance analytics"],
    "analytics-unlocked-v1": ["فتح تحليل الأداء", "Analytics unlock"],
    "journey-coachmark-v1": ["درج المهام", "Task drawer"],
    "journey-continue-v1": ["متابعة الرحلة", "Continue journey"],
  };
  return labels[key]?.[ar ? 0 : 1] ?? key;
}
function DailyChart({ data, ar }: { data: LabReport; ar: boolean }) {
  const rows = useMemo(
    () =>
      Array.from({ length: data.days }, (_, i) => {
        const d = new Date(data.generatedAt);
        d.setUTCDate(d.getUTCDate() - (data.days - 1 - i));
        const day = d.toISOString().slice(0, 10);
        return (
          data.daily.find((x) => x.day === day) ?? {
            day,
            views: 0,
            actions: 0,
            errors: 0,
            users: 0,
          }
        );
      }),
    [data],
  );
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.views, r.actions, r.errors]),
  );
  if (!rows.some((r) => r.views || r.actions || r.errors))
    return (
      <NoEvidence>
        {ar
          ? "لا توجد أحداث أقسام جديدة في هذه الفترة. ستظهر الرسوم بعد استخدام المنصة."
          : "No new section events in this period. Charts appear as members use the platform."}
      </NoEvidence>
    );
  return (
    <>
      <div
        className="lab-chart"
        dir="ltr"
        role="img"
        aria-label={
          ar
            ? "مقارنة يومية للمشاهدات والإنجازات والأخطاء. التفاصيل في الجدول التالي."
            : "Daily views, outcomes and errors. Exact values are available below."
        }
      >
        <div className="lab-chart-scale">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="lab-chart-bars">
          {rows.map((r, i) => (
            <div
              key={r.day}
              className="lab-chart-day"
              title={`${r.day}: ${r.views} views, ${r.actions} outcomes, ${r.errors} errors`}
            >
              <div className="lab-chart-columns">
                {(["views", "actions", "errors"] as const).map((k) => (
                  <i
                    key={k}
                    className={"lab-series-" + k}
                    style={{ height: `${(r[k] / max) * 100}%` }}
                  />
                ))}
              </div>
              {(i === 0 ||
                i === rows.length - 1 ||
                i === Math.floor(rows.length / 2)) && (
                <span>{r.day.slice(5)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="lab-chart-legend">
        {[
          ["views", ar ? "مشاهدات" : "Views"],
          ["actions", ar ? "نتائج عمل" : "Outcomes"],
          ["errors", ar ? "أخطاء" : "Errors"],
        ].map(([key, label]) => (
          <span key={key}>
            <i className={"lab-series-" + key} />
            {label}
          </span>
        ))}
      </div>
      <details className="mt-5 text-sm">
        <summary className="cursor-pointer font-semibold">
          {ar ? "عرض الأرقام اليومية" : "Show daily values"}
        </summary>
        <div className="max-h-64 overflow-auto mt-3">
          <table className="lab-table">
            <thead>
              <tr>
                {[
                  ar ? "التاريخ" : "Date",
                  ar ? "مشاهدات" : "Views",
                  ar ? "نتائج" : "Outcomes",
                  ar ? "أخطاء" : "Errors",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td>{r.day}</td>
                  <td>{r.views}</td>
                  <td>{r.actions}</td>
                  <td>{r.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function ExperimentEditor({
  config,
  members,
  groups,
  onClose,
  onCreated,
}: {
  config: LabConfig;
  members: AdminMember[];
  groups: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const first = config.registry.find((s) => s.versions.includes("B"))!;
  const [form, setForm] = useState<CreateExperiment>({
    title: "",
    hypothesis: "",
    section: first.id,
    audience: "GROUPS",
    groupIds: [],
    userIds: [],
    allocation: 50,
    primaryMetric: first.metrics[0],
    minSample: 30,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const patch = (part: Partial<CreateExperiment>) =>
    setForm((f) => ({ ...f, ...part }));
  const targets =
    form.audience === "GROUPS"
      ? groups
      : members.filter((m) =>
          m.name.toLowerCase().includes(search.toLowerCase()),
        );
  const chosen = form.audience === "GROUPS" ? form.groupIds : form.userIds;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const experiment = await labApi.create(form);
      onCreated(experiment.id);
    } catch (e) {
      setError(labError(e, ar));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={text("خطة تجربة جديدة", "Plan a new experiment")}
      size="lg"
    >
      <form className="ux-lab space-y-5" onSubmit={submit}>
        <p className="lab-muted text-sm leading-7">
          {text(
            "تُحفظ كمسودة أولًا. الجمهور لن يتغير حتى تضغط بدء التجربة من المعمل.",
            "Saved as a draft first. Members are unaffected until you start it from the lab.",
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="lab-field">
            {text("اسم التجربة", "Test name")}
            <input
              required
              minLength={3}
              maxLength={120}
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label className="lab-field">
            {text("القسم والتصميم البديل", "Section and alternative design")}
            <select
              value={form.section}
              onChange={(e) => {
                const s = config.registry.find((s) => s.id === e.target.value)!;
                patch({ section: s.id, primaryMetric: s.metrics[0] });
              }}
            >
              {config.registry.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={!s.versions.includes("B")}
                >
                  {text(s.titleAr, s.titleEn)}{" "}
                  {s.versions.includes("B")
                    ? "A / B"
                    : text("— B غير منفذة", "— B not implemented")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="lab-field">
          {text("الفرضية", "Hypothesis")}
          <textarea
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            value={form.hypothesis}
            onChange={(e) => patch({ hypothesis: e.target.value })}
            placeholder={text(
              "نتوقع أن يساعد عرض البطاقات على الوصول لسجل الزميل بسهولة أكبر…",
              "We expect cards to help members reach their peers’ application history more easily…",
            )}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="lab-field">
            {text("نتيجة النجاح الأساسية", "Primary success outcome")}
            <select
              value={form.primaryMetric}
              onChange={(e) => patch({ primaryMetric: e.target.value })}
            >
              {config.registry
                .find((s) => s.id === form.section)
                ?.metrics.map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABELS[m]?.[ar ? 0 : 1] ?? m}
                  </option>
                ))}
            </select>
          </label>
          <label className="lab-field">
            {text(
              "حد المشاهدين المخطط لكل نسخة",
              "Planned exposed users per arm",
            )}
            <input
              required
              type="number"
              min={10}
              max={10000}
              value={form.minSample}
              onChange={(e) => patch({ minSample: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="lab-field">
          {text("نسبة الجمهور المعيّن للنسخة B", "Audience allocated to B")}
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={form.allocation}
            onChange={(e) => patch({ allocation: Number(e.target.value) })}
          />
          <span className="lab-muted text-xs">
            A {100 - form.allocation}% · B {form.allocation}%{" "}
            {text("· تعيين ثابت على الحساب", "· stable account assignment")}
          </span>
        </label>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            {text("من يدخل التجربة؟", "Who enters this test?")}
          </legend>
          <div className="flex flex-wrap gap-4">
            {(["GROUPS", "USERS", "ALL"] as const).map((a) => (
              <label className="flex items-center gap-2 text-sm" key={a}>
                <input
                  type="radio"
                  name="audience"
                  checked={form.audience === a}
                  onChange={() =>
                    patch({ audience: a, groupIds: [], userIds: [] })
                  }
                />
                {text(
                  a === "GROUPS"
                    ? "مجموعات محددة"
                    : a === "USERS"
                      ? "باحثون محددون"
                      : "كل الباحثين المؤهلين",
                  a === "GROUPS"
                    ? "Selected groups"
                    : a === "USERS"
                      ? "Selected members"
                      : "All eligible members",
                )}
              </label>
            ))}
          </div>
          {form.audience !== "ALL" && (
            <div className="mt-4 rounded-xl border border-neutral-300 p-3">
              {form.audience === "USERS" && (
                <input
                  className="mb-3 w-full"
                  aria-label={text("بحث عن باحث", "Search members")}
                  placeholder={text("بحث بالاسم", "Search by name")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              )}
              <div className="grid max-h-40 gap-3 overflow-auto sm:grid-cols-2">
                {targets.map((x) => (
                  <label className="flex items-center gap-2 text-sm" key={x.id}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(x.id)}
                      onChange={() =>
                        patch(
                          form.audience === "GROUPS"
                            ? {
                                groupIds: chosen.includes(x.id)
                                  ? chosen.filter((id) => id !== x.id)
                                  : [...chosen, x.id],
                              }
                            : {
                                userIds: chosen.includes(x.id)
                                  ? chosen.filter((id) => id !== x.id)
                                  : [...chosen, x.id],
                              },
                        )
                      }
                    />
                    {x.name}
                  </label>
                ))}
              </div>
              <p className="lab-muted mt-3 text-xs">
                {text("تم تحديد: ", "Selected: ")}
                {chosen.length}
              </p>
            </div>
          )}
        </fieldset>
        <div className="lab-evidence text-sm leading-7">
          {text(
            "المقارنة A: الجدول الحالي، B: بطاقات تقدم بنفس البيانات والوظائف. نحسب نجاح النتيجة للمشاهدين الفعليين، ونراقب الأخطاء وزمن الوصول للنتيجة. لا تغير هذه التجربة مسار المستخدم أو مهامه.",
            "Compare A, the current table, with B, progress cards using the same data and functionality. Measure outcomes among exposed users, with errors and time to outcome as guardrails. This test does not alter journey rules or tasks.",
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        )}
        <button
          className="lab-primary w-full"
          disabled={busy || (form.audience !== "ALL" && !chosen.length)}
        >
          {busy
            ? text("جارٍ الحفظ…", "Saving…")
            : text("حفظ خطة التجربة كمسودة", "Save experiment draft")}
        </button>
      </form>
    </Modal>
  );
}
