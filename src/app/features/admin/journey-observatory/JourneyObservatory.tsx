import { GuidanceMembersModal, type GuidanceAudienceFilter } from "../components/GuidanceMembersModal";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  LockKeyhole,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  Flag,
  Focus,
  Lightbulb,
  ListFilter,
  MessageSquarePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import { Modal } from "../../../components/ui/Modal";
import { JourneyBlueprint } from "./JourneyBlueprint";
import {
  GATES,
  WEEK_TITLES,
  journeyResearchApi,
  type Gate,
  type JourneyMap,
  type Observation,
  type Person,
  type Scope,
  type Station,
} from "./api";
import "./journey-observatory.css";
type QueueFilter =
  "ALL" | "REVIEW" | "TIME" | "CV" | "GUIDE" | "READY" | "UNREAD" | "UNKNOWN";
const FLOW_TITLES: Record<string, [string, string]> = {
  "first-application-v1": ["أول طلب", "First application"],
  "groups-week1-v1": ["شرح المجموعة", "Group guide"],
  "analytics-week1-v1": ["شرح التحليل", "Analytics guide"],
  "cv-filter-week1-v1": ["فلتر النسخ", "CV filter"],
};
const gateCategory = (g: Gate) =>
  g === "TIME"
    ? "time"
    : g === "READY" || g === "FINISHED"
      ? "success"
      : g === "CV" || g === "GUIDE"
        ? "support"
        : "work";
export function JourneyObservatory({
  onInspectMember,
  onDraftFeedback,
  readOnly = false,
}: {
  onInspectMember: (id: string) => void;
  onDraftFeedback: (person: { id: string; name: string }) => void;
  readOnly?: boolean;
}) {
  const { locale, number } = useI18n(),
    ar = locale === "ar",
    text = (a: string, e: string) => (ar ? a : e);
  const toast = useToast(),
    client = useQueryClient();
  const [groupId, setGroupId] = useState(""),
    [userId, setUserId] = useState(""),
    [days, setDays] = useState(30),
    [idleDays, setIdleDays] = useState(3),
    [week, setWeek] = useState<number | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [overlay, setOverlay] = useState<"positions" | "review" | "completion">(
      "positions",
    ),
    [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL"),
    [query, setQuery] = useState(""),
    [unreadCode, setUnreadCode] = useState<string | null>(null),
    [guidanceInspection, setGuidanceInspection] = useState<{ code: string; filter: GuidanceAudienceFilter } | null>(null),
    [notesNodeOnly, setNotesNodeOnly] = useState(false),
    [notePage, setNotePage] = useState(1),
    [createAt, setCreateAt] = useState<Station | null>(null),
    [noteBusy, setNoteBusy] = useState<string | null>(null),
    [evidence, setEvidence] = useState<Observation | null>(null);
  const scope: Scope = {
    days,
    idleDays,
    groupId: groupId || undefined,
    userId: userId || undefined,
  };
  const map = useQuery({
    queryKey: ["journey-observatory", scope],
    queryFn: () => journeyResearchApi.map(scope),
    staleTime: 20_000,
  });
  const notes = useQuery({
    queryKey: [
      "journey-observations",
      groupId,
      userId,
      notesNodeOnly ? selected : null,
      notePage,
    ],
    queryFn: () =>
      journeyResearchApi.notes(
        scope,
        notesNodeOnly ? (selected ?? undefined) : undefined,
        notePage,
      ),
  });
  const data = map.data,
    node = data?.nodes.find((n) => n.code === selected),
    traced = data?.members.find((m) => m.id === userId);
  const title = (n: Pick<Station, "titleAr" | "titleEn">) =>
    text(n.titleAr, n.titleEn);
  const gate = (g: Gate) => text(...(GATES[g] as [string, string]));
  const date = (value: string) =>
    new Date(value).toLocaleString(ar ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  const duration = (hours: number | null) =>
    hours === null
      ? "—"
      : hours >= 24
        ? `${number(Math.round((hours / 24) * 10) / 10)} ${text("يوم", "days")}`
        : `${number(Math.round(hours * 10) / 10)} ${text("ساعة", "h")}`;
  const select = (n: Station) => {
    setSelected(n.code);
    if (week !== null && week !== n.weekNumber) setWeek(n.weekNumber);
  };
  const inspectGuidance = (code: string, filter: GuidanceAudienceFilter = "ALL") => {
    setSelected(null);
    setGuidanceInspection({ code, filter });
  };
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["journey-observatory"] });
    void client.invalidateQueries({ queryKey: ["journey-observations"] });
  };
  const trace = (p: Person) => {
    setUserId(p.id);
    setSelected(null);
    setWeek(p.guidanceCode ? data?.guidance.find(g => g.code === p.guidanceCode)?.week ?? p.currentWeek : p.currentWeek);
    setQueueFilter("ALL");
    setNotePage(1);
  };
  const queue = useMemo(() => {
    if (!data) return [];
    return data.members
      .filter((m) => !selected || (!m.guidanceCode && m.currentCode === selected))
      .filter((m) =>
        queueFilter === "REVIEW"
          ? m.needsReview
          : queueFilter === "ALL"
            ? m.gate !== "FINISHED"
            : queueFilter === "UNREAD"
              ? !!data.guidance
                  .find((g) => g.code === unreadCode)
                  ?.unreadIds.includes(m.id)
              : m.gate === queueFilter,
      )
      .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
      .sort(
        (a, b) =>
          Number(b.needsReview) - Number(a.needsReview) ||
          b.idleForDays - a.idleForDays,
      );
  }, [data, selected, queueFilter, query, unreadCode]);
  const ranked = useMemo(
    () =>
      data?.nodes
        .filter((n) => n.current > 0)
        .sort(
          (a, b) =>
            b.needsReview - a.needsReview ||
            b.cvWait + b.guideWait - a.cvWait - a.guideWait ||
            b.current - a.current,
        ) ?? [],
    [data],
  );
  const exportData = () => {
    if (!data) return;
    const rows = [
      [
        "station",
        "week",
        "current_members",
        "reached",
        "completed",
        "review_queue",
        "waiting_schedule",
        "waiting_cv",
        "median_hours_observed",
        "dated_samples",
      ],
      ...data.nodes.map((n) => [
        n.code,
        n.weekNumber,
        n.current,
        n.entered,
        n.completed,
        n.needsReview,
        n.timeWait,
        n.cvWait,
        n.medianHours ?? "",
        n.observedVisits,
      ]),
    ];
    const content = rows.map((r) => r.join(",")).join("\n"),
      url = URL.createObjectURL(
        new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }),
      );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nawah-journey-research.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const statusNote = async (note: Observation, status: string) => {
    if (readOnly) return;
    setNoteBusy(note.id);
    try {
      await journeyResearchApi.status(note, status);
      void client.invalidateQueries({ queryKey: ["journey-observations"] });
    } catch {
      toast.error(
        text(
          "تغيرت الملاحظة أو تعذر الحفظ. حدث القائمة وأعد المحاولة.",
          "The observation changed or could not be saved. Refresh and retry.",
        ),
      );
    } finally {
      setNoteBusy(null);
    }
  };
  const inspectUnread = (code: string) => {
    setUnreadCode(code);
    setQueueFilter("UNREAD");
    setSelected(null);
    requestAnimationFrame(() =>
      document
        .getElementById("journey-research-queue")
        ?.scrollIntoView({ block: "start" }),
    );
  };
  const inspector =
    node && data ? (
      <>
        <div className="jro-inspector-body">
          <div className="jro-inspector-stats">
            <div>
              <strong>{node.current}</strong>
              <span>{text("هنا الآن", "here now")}</span>
            </div>
            <div>
              <strong>
                {node.completed}/{node.entered}
              </strong>
              <span>{text("أكمل / وصل", "completed / reached")}</span>
            </div>
            <div>
              <strong>{node.needsReview}</strong>
              <span>{text("أولوية فحص", "review queue")}</span>
            </div>
          </div>
          <p className="jro-muted">
            {text(node.descriptionAr ?? "", node.descriptionEn ?? "")}
          </p>
          <h4>{text("متطلبات هذه المحطة", "Station requirements")}</h4>
          <dl className="jro-requirements">
            {[
              [text("طلبات", "Applications"), node.requiredAppsCount],
              [text("مخصصة", "Tailored"), node.requiredTailoredCount],
              [text("منشورات", "Posts"), node.requiredPostsCount],
              [text("تواصل", "Outreach"), node.requiredOutreachCount],
            ]
              .filter(([, v]) => Number(v) > 0)
              .map(([key, v]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            <div>
              <dt>{text("مدة المحطة", "Configured duration")}</dt>
              <dd>
                {node.durationDays} {text("يوم", "days")}
              </dd>
            </div>
          </dl>
          <div className="jro-dwell">
            <Clock3 size={16} />
            <div>
              <b>{duration(node.medianHours)}</b>
              <p>
                {text("وسيط زمن العبور · ", "Median dwell · ")}
                {node.observedVisits}{" "}
                {text("انتقال مؤرخ في الفترة", "dated visits in this period")}
              </p>
            </div>
          </div>
          {data.guidance
            .filter((g) => g.nodeCode === node.code)
            .map((g) => (
              <article className="jro-guidance-inspection" key={g.code}>
                <Sparkles size={17} />
                <div>
                  <strong>{text(g.titleAr, g.titleEn)}</strong>
                  <p>
                    {g.read}/{g.unlocked}{" "}
                    {text("قرأوا من المتاح لهم", "read among unlocked")}
                  </p>
                  {g.foundationCompleted !== null && (
                    <p>
                      {g.foundationCompleted}{" "}
                      {text(
                        "أكملوا تطبيق تحديث السيرة",
                        "completed the CV update",
                      )}
                    </p>
                  )}
                  {!readOnly && <button
                    className="jro-text-button"
                    onClick={() => {
                      inspectUnread(g.code);
                    }}
                  >
                    {text("افحص من لم يقرأ", "Inspect unread members")}{" "}
                    <ChevronLeft size={13} />
                  </button>}
                </div>
              </article>
            ))}
          <h4>{text("الموجودون هنا", "Members here")}</h4>
          {data.members
            .filter((m) => !m.guidanceCode && m.currentCode === node.code)
            .map((m) => (
              <article className="jro-mini-person" key={m.id}>
                <button
                  onClick={() => {
                    setSelected(null);
                    onInspectMember(m.id);
                  }}
                >
                  {m.name}
                  <ArrowUpRight size={12} />
                </button>
                <span className={"jro-state " + gateCategory(m.gate)}>
                  {gate(m.gate)}
                </span>
                <p>
                  {text("بالمحطة: ", "At station: ")}
                  {m.elapsedDays ?? "—"} {text("يوم", "days")} ·{" "}
                  {text("الطلبات: ", "Apps: ")}
                  {m.counts.apps}/{node.requiredAppsCount}
                </p>
                {m.gate === "TIME" && (
                  <p>
                    {text("المتابعة متاحة: ", "Next step: ")}
                    {m.availableAt ? date(m.availableAt) : "—"} UTC
                  </p>
                )}
                <div className="jro-mini-actions">
                  <button onClick={() => trace(m)}>
                    {text("تتبع المسار", "Trace journey")}
                  </button>
                  {!readOnly && <button
                    onClick={() => {
                      setSelected(null);
                      onDraftFeedback(m);
                    }}
                  >
                    {text("إعداد توجيه", "Draft guidance")}
                  </button>}
                </div>
              </article>
            ))}
          {node.current === 0 && (
            <p className="jro-muted">
              {text(
                "لا يوجد باحث في هذه المحطة الآن.",
                "No members at this station now.",
              )}
            </p>
          )}
        </div>
        {!readOnly && <footer>
          <button
            className="jro-primary"
            onClick={() => {
              setCreateAt(node);
              setSelected(null);
            }}
          >
            <MessageSquarePlus size={15} />
            {text(
              "سجّل ملاحظة مع الدليل",
              "Save an evidence-linked observation",
            )}
          </button>
        </footer>}
      </>
    ) : null;
  return (
    <div className="jro-shell" dir={ar ? "rtl" : "ltr"}>
      <section
        className="jro-scope"
        aria-label={text("نطاق البحث", "Research scope")}
      >
        <div className="jro-scope-title">
          <Filter size={18} />
          <strong>{text("عدسة البحث", "Research lens")}</strong>
        </div>
        <label>
          {text("المجموعة", "Cohort")}
          <select
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setUserId("");
              setSelected(null);
              setNotePage(1);
            }}
          >
            <option value="">{text("جميع الباحثين", "All members")}</option>
            {data?.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.members})
              </option>
            ))}
          </select>
        </label>
        <label>
          {text("تتبع باحث", "Trace a member")}
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setSelected(null);
              setNotePage(1);
            }}
          >
            <option value="">
              {text("كل الموجودين في النطاق", "Everyone in this scope")}
            </option>
            {data?.directory.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {text("سجل الانتقالات", "Transition history")}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} {text("يومًا", "days")}
              </option>
            ))}
          </select>
        </label>
        <label>
          {text("أولوية الفحص بعد غياب العمل", "Review after no recorded work")}
          <select
            value={idleDays}
            onChange={(e) => setIdleDays(Number(e.target.value))}
          >
            {[3, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d} {text("أيام", "days")}
              </option>
            ))}
          </select>
        </label>
        <button className="jro-small" disabled={!data} onClick={exportData}>
          <Download size={15} />
          {text("تصدير المقاييس", "Export metrics")}
        </button>
      </section>
      {map.isError ? (
        <section className="jro-error" role="alert">
          <h3>
            {text(
              "تعذر تحميل بيانات مرصد الرحلة",
              "Could not load journey research",
            )}
          </h3>
          <p>
            {text(
              "لم نعرض أرقامًا تقديرية. أعد المحاولة لتحميل البيانات الفعلية.",
              "No estimated numbers were substituted. Retry to load actual data.",
            )}
          </p>
          <button className="jro-primary" onClick={() => void map.refetch()}>
            {text("إعادة المحاولة", "Retry")}
          </button>
        </section>
      ) : !data ? (
        <div className="jro-loading" role="status">
          <RefreshCw className="animate-spin" />
          <p>
            {text(
              "تجميع المسار والأدلة الفعلية…",
              "Loading journey states and observed evidence…",
            )}
          </p>
        </div>
      ) : (
        <>
          <section
            className="jro-summary"
            aria-label={text("ملخص قابل للتحقيق", "Investigation summary")}
          >
            <button
              className={queueFilter === "ALL" ? "active" : ""}
              onClick={() => {
                setQueueFilter("ALL");
                setSelected(null);
              }}
            >
              <div className="jro-metric-icon">
                <Users size={19} />
              </div>
              <div>
                <span>{text("باحث في النطاق", "Members in scope")}</span>
                <strong>{number(data.summary.people)}</strong>
                <small>
                  {data.summary.started} {text("بدأوا الرحلة", "started")} ·{" "}
                  {data.summary.finished} {text("أكملوا", "finished")}
                </small>
              </div>
            </button>
            <button
              className={"review " + (queueFilter === "REVIEW" ? "active" : "")}
              onClick={() => {
                setQueueFilter("REVIEW");
                setSelected(null);
                setOverlay("review");
              }}
            >
              <div className="jro-metric-icon">
                <Focus size={19} />
              </div>
              <div>
                <span>{text("أولوية فحص", "Investigate first")}</span>
                <strong>{number(data.summary.needsReview)}</strong>
                <small>
                  {text(
                    `بلا عمل مرصود منذ ${idleDays} أيام؛ ليست حالات انسحاب`,
                    `No recorded work for ${idleDays} days; not proven drop-off`,
                  )}
                </small>
              </div>
            </button>
            <button
              className={"time " + (queueFilter === "TIME" ? "active" : "")}
              onClick={() => {
                setQueueFilter("TIME");
                setSelected(null);
              }}
            >
              <div className="jro-metric-icon">
                <Clock3 size={19} />
              </div>
              <div>
                <span>
                  {text(
                    "أكملوا العمل وينتظرون الموعد",
                    "Work done; waiting for schedule",
                  )}
                </span>
                <strong>{number(data.summary.timeWait)}</strong>
                <small>
                  {text(
                    "انتظار تفرضه الرحلة؛ لا يحتاج إنذار تعثّر",
                    "A scheduled wait, not a friction alert",
                  )}
                </small>
              </div>
            </button>
            <button
              className={"guidance " + (queueFilter === "CV" ? "active" : "")}
              onClick={() => {
                setQueueFilter("CV");
                setSelected(null);
              }}
            >
              <div className="jro-metric-icon">
                <FileCheck2 size={19} />
              </div>
              <div>
                <span>
                  {text("تطبيق تحديث السيرة", "CV guidance application")}
                </span>
                <strong>{number(data.summary.cvWait)}</strong>
                <small>
                  {text(
                    "تحديث السيرة شرط الاستمرار في مهام الأسبوع الأول",
                    "A prerequisite for continuing week-one tasks",
                  )}
                </small>
              </div>
            </button>
          </section>
          <section
            className="jro-rhythm"
            aria-label={text("منطق الأسبوع", "Weekly rhythm")}
          >
            <div>
              <span className="jro-eyebrow">
                {text(
                  "قالب يتكرر عبر الأسابيع",
                  "The repeating weekly structure",
                )}
              </span>
              <strong>
                {text(
                  "خمس مهام، ثم مراجعة تهيّئ للمرحلة التالية",
                  "Five tasks, then a review that prepares the next phase",
                )}
              </strong>
            </div>
            <ol>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i}>
                  <span>{i === 6 ? <Flag size={14} /> : i}</span>
                  <b>
                    {i === 6
                      ? text("تقييم وتعديل", "Review & adjust")
                      : text("المهمة ", "Task ") + i}
                  </b>
                  {i < 6 && (
                    <ChevronLeft className={ar ? "" : "rotate-180"} size={13} />
                  )}
                </li>
              ))}
            </ol>
          </section>
          <div className="jro-map-tools">
            <div>
              <span className="jro-eyebrow">
                {text("كيف تقرأ الخريطة؟", "Map overlay")}
              </span>
              <div className="jro-segment">
                {(["positions", "completion", "review"] as const).map((o) => (
                  <button
                    key={o}
                    aria-pressed={overlay === o}
                    onClick={() => setOverlay(o)}
                  >
                    {text(
                      o === "positions"
                        ? "المواضع الحالية"
                        : o === "completion"
                          ? "الوصول والإكمال"
                          : "أولوية الفحص",
                      o === "positions"
                        ? "Current positions"
                        : o === "completion"
                          ? "Reach & completion"
                          : "Investigation priority",
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="jro-muted">
              {text(
                "اختر أسبوعًا لتظهر طبقات المخصص والمحتوى والتواصل كاملة. اضغط محطة لفحص السبب والأعضاء والدليل.",
                "Choose a week to expand tailored applications, publishing and outreach. Select a station to inspect its requirements, members and evidence.",
              )}
            </p>
          </div>
          <JourneyBlueprint
            data={data}
            ar={ar}
            week={week}
            onWeek={(w) => {
              setWeek(w);
              setSelected(null);
            }}
            selected={selected}
            onSelect={select}
            onSelectGuidance={inspectGuidance}
            overlay={overlay}
            traceId={userId}
            inspector={inspector}
            onCloseInspection={() => setSelected(null)}
          />
          <section className="jro-analysis-grid">
            <article className="jro-panel">
              <header>
                <div>
                  <span className="jro-eyebrow">
                    <Target size={14} />
                    {text("ماذا نفحص أولًا؟", "What should we inspect first?")}
                  </span>
                  <h3>
                    {text(
                      "محطات تحتاج قراءة أعمق",
                      "Stations worth a closer look",
                    )}
                  </h3>
                </div>
                <span className="jro-caption">
                  {text(
                    "حالة حالية · التاريخ حسب الفترة",
                    "Current snapshot · history in selected period",
                  )}
                </span>
              </header>
              <div className="jro-scroll-table">
                <table className="jro-table">
                  <thead>
                    <tr>
                      {[
                        text("المحطة", "Station"),
                        text("هنا", "Here"),
                        text("للفحص", "Review"),
                        text("انتظار", "Timed wait"),
                        text("أكمل / وصل", "Done / reached"),
                        text("زمن العبور", "Dwell"),
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.guidance.filter(g => g.current > 0).map(g => <tr key={g.code}>
                      <th><button onClick={() => inspectGuidance(g.code, "BLOCKING")}><Sparkles size={13} /> {text(g.titleAr, g.titleEn)}</button></th>
                      <td>{g.current}</td><td>—</td><td>{text("إرشاد إلزامي", "Required guide")}</td><td>{g.completed} / {g.unlocked}</td><td>—</td>
                    </tr>)}
                    {ranked.map((n) => (
                      <tr key={n.code}>
                        <th>
                          <button
                            onClick={() => {
                              select(n);
                              setQueueFilter(n.needsReview ? "REVIEW" : "ALL");
                            }}
                          >
                            <span className="jro-node-dot" />
                            {title(n)}
                          </button>
                        </th>
                        <td>{n.current}</td>
                        <td>
                          <span
                            className={
                              n.needsReview ? "jro-value-attention" : ""
                            }
                          >
                            {n.needsReview}
                          </span>
                        </td>
                        <td>{n.timeWait}</td>
                        <td>
                          {n.completed}/{n.entered}
                        </td>
                        <td>
                          <b>{duration(n.medianHours)}</b>
                          <small>
                            {n.observedVisits} {text("قياس", "samples")}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!ranked.length && !data.guidance.some(g => g.current > 0) && (
                  <p className="jro-empty">
                    {text(
                      "لا توجد محطات بها باحثون الآن في هذا النطاق.",
                      "No occupied stations in this scope.",
                    )}
                  </p>
                )}
              </div>
              <p className="jro-footnote">
                {text(
                  "قائمة الفحص تعتمد على غياب العمل المرصود وشروط المحطة. وسيط العبور محسوب فقط من تاريخي دخول وخروج متصلين، ويشمل الانتظار الزمني. لا يعني سببًا مؤكدًا للتعثر.",
                  "Review priority uses recorded inactivity and station requirements. Dwell uses paired entry/exit timestamps and includes scheduled waiting; it does not establish a cause of friction.",
                )}
              </p>
            </article>
            <article className="jro-panel">
              <header>
                <div>
                  <span className="jro-eyebrow">
                    <Activity size={14} />
                    {text("هل تتحرك الرحلة؟", "Is the journey moving?")}
                  </span>
                  <h3>
                    {text(
                      "العبور المسجل عبر الأيام",
                      "Observed movement over time",
                    )}
                  </h3>
                </div>
                <span className="jro-total">
                  {data.summary.transitionsInWindow}
                  <small>
                    {text("انتقالًا في الفترة", "transitions in period")}
                  </small>
                </span>
              </header>
              <TransitionChart data={data} ar={ar} />
              <div className="jro-evidence-strip">
                <ShieldCheck size={16} />
                <p>
                  {data.summary.pairedDurationSamples}{" "}
                  {text(
                    "انتقالًا له تاريخ دخول وخروج قابلان للقياس. الإكمال القديم المحفوظ يُعرض دون اختراع تاريخ له.",
                    "transitions have paired measurable timestamps. Legacy saved completions are shown without invented dates.",
                  )}
                </p>
              </div>
            </article>
          </section>
          <section
            className="jro-panel jro-guidance-panel"
            aria-labelledby="guidance-monitor-title"
          >
            <header>
              <div>
                <span className="jro-eyebrow">
                  <BookOpenCheck size={15} />
                  {text("متابعة الإرشادات", "Guidance monitoring")}
                </span>
                <h3 id="guidance-monitor-title">
                  {text(
                    "من إتاحة الإرشاد إلى العمل بعد قراءته",
                    "From access to reading, then subsequent work",
                  )}
                </h3>
                <p className="jro-muted">
                  {text(
                    "اعرف هل تحتاج مراجعة إتاحة الإرشاد، أم وضوحه، أم متابعة العمل بعد القراءة. الأرقام تخص نطاق البحث المحدد.",
                    "See whether access, clarity or follow-up work needs investigation. Counts use the selected research scope.",
                  )}
                </p>
              </div>
              <span className="jro-guidance-availability">
                {
                  data.guidance.filter(
                    (g) => (week === null || g.week === week) && g.unlocked > 0,
                  ).length
                }{" "}
                {text("من", "of")}{" "}
                {
                  data.guidance.filter((g) => week === null || g.week === week)
                    .length
                }
                <small>
                  {text("إرشادات متاحة حاليًا", "guides currently available")}
                </small>
              </span>
            </header>
            <div className="jro-guidance-intro">
              <p>
                <strong>{text("كيف تستفيد؟", "How does this help?")}</strong>{" "}
                {text(
                  "ابدأ بالإرشادات المتاحة. لو القراءة قليلة، افحص من لم يقرأ قبل تغيير المحتوى. ولو القراءة مرتفعة والعمل قليل، راجع العمل مع الباحث لتفهم السبب.",
                  "Start with available guides. When reading is low, inspect unread members before rewriting content. When reading is high but work is low, review the work with a member to understand why.",
                )}
              </p>
            </div>
            <div className="jro-guidance-grid">
              {data.guidance
                .filter((g) => week === null || g.week === week)
                .map((g) => (
                  <article
                    key={g.code}
                    data-guidance-card={g.code}
                    className={g.unlocked ? "available" : "not-available"}
                  >
                    <div className="jro-guidance-title">
                      <span>
                        <BookOpen size={17} />
                      </span>
                      <div>
                        <small>
                          {g.week === 0
                            ? text("بعد المهمة صفر", "After task zero")
                            : text("الأسبوع ", "Week ") + g.week}
                        </small>
                        <h4>{text(g.titleAr, g.titleEn)}</h4>
                      </div>
                    </div>
                    <p className="jro-guidance-state">
                      {g.unlocked ? (
                        <BookOpenCheck size={12} />
                      ) : (
                        <LockKeyhole size={12} />
                      )}
                      {g.unlocked
                        ? text(
                            "الإرشاد متاح في النطاق المحدد",
                            "Available in this scope",
                          )
                        : text(
                            "لم يُتح لأحد في هذا النطاق بعد",
                            "Not available to anyone in this scope yet",
                          )}
                    </p>
                    <dl className="jro-guidance-metrics">
                      <div>
                        <dt>{text("أتيح لهم", "Have access")}</dt>
                        <dd>{g.unlocked}</dd>
                      </div>
                      <div>
                        <dt>{text("قرأوا الإرشاد", "Read the guide")}</dt>
                        <dd>{g.read}</dd>
                      </div>
                      <div>
                        <dt>
                          {g.actionKind === "CV"
                            ? text("رفعوا سيرة بعده", "Uploaded CV later")
                            : g.actionKind === "POST"
                              ? text("نشروا بعده", "Published later")
                              : g.actionKind === "OUTREACH"
                                ? text("تواصلوا بعده", "Outreach later")
                                : text("تطبيق الإرشاد", "Applied guidance")}
                        </dt>
                        <dd>
                          {g.actionKind && g.datedReads > 0 ? g.applied : "—"}
                        </dd>
                      </div>
                    </dl>
                    <button type="button" className="jro-text-button" onClick={() => inspectGuidance(g.code)}>{text("عرض الأعضاء وحالات الإتمام", "View members and completion states")} <Users size={13} /></button>
                    <p className="jro-guidance-method">{g.completed ?? 0} {text("أكملوه", "completed")} · {g.pending ?? 0} {text("بانتظار الإتمام", "pending")}{g.required ? ` · ${g.current ?? 0} ${text("متوقفون هنا", "blocked here")}` : ""}</p>
                    <div className="jro-guidance-reading">
                      <span>
                        {text(
                          "نسبة القراءة من المتاح لهم",
                          "Read among those with access",
                        )}
                      </span>
                      <strong>
                        {g.readRate === null
                          ? text("لا توجد إتاحة بعد", "No access yet")
                          : g.readRate + "%"}
                      </strong>
                    </div>
                    <div className="jro-guidance-bar" aria-hidden="true">
                      <i style={{ width: `${g.readRate ?? 0}%` }} />
                    </div>
                    <p className="jro-guidance-method">
                      {g.actionKind
                        ? g.datedReads
                          ? text(
                              `الفعل اللاحق مرصود لدى ${g.applied} من ${g.datedReads} باحثين لهم قراءة مؤرخة.`,
                              `Later work observed for ${g.applied} of ${g.datedReads} members with dated reads.`,
                            )
                          : text(
                              "لا توجد قراءة مؤرخة كافية لقياس العمل اللاحق بعد.",
                              "No dated reading evidence for measuring subsequent work yet.",
                            )
                        : text(
                            "العمل بعد هذا الإرشاد غير مقاس آليًا؛ راجعه مع الباحث.",
                            "Application is not automatically measured for this guide; review it with the member.",
                          )}
                    </p>
                    <footer>
                      <button
                        className="jro-small"
                        disabled={!g.unreadIds.length}
                        onClick={() => inspectUnread(g.code)}
                      >
                        {text("عرض من لم يقرأ", "View unread members")}{" "}
                        <b>{g.unreadIds.length}</b>
                      </button>
                    </footer>
                  </article>
                ))}
            </div>
            <p className="jro-footnote">
              {text(
                "الإتاحة والقراءة حالات محفوظة تراكمية. الفعل اللاحق يحتاج قراءة مؤرخة؛ وهو ارتباط زمني لا يثبت أن الإرشاد سبّب التحسن. الرمز — يعني أن القياس غير متاح، وليس أن النتيجة صفر.",
                "Access and reading are cumulative saved states. Subsequent work requires a dated read and does not prove causality. A dash means measurement is unavailable, rather than a zero result.",
              )}
            </p>
          </section>
          <section className="jro-investigation-grid">
            <article className="jro-panel" id="journey-research-queue">
              <header>
                <div>
                  <span className="jro-eyebrow">
                    <Search size={14} />
                    {text("من يستحق المراجعة؟", "Who should we investigate?")}
                  </span>
                  <h3>
                    {selected
                      ? title(node ?? { titleAr: selected, titleEn: selected })
                      : text(
                          "قائمة الفحص والأدلة",
                          "Investigation queue & evidence",
                        )}
                  </h3>
                </div>
                {selected && (
                  <button
                    className="jro-small"
                    onClick={() => setSelected(null)}
                  >
                    {text("كل المحطات", "All stations")} <X size={13} />
                  </button>
                )}
              </header>
              <div className="jro-queue-controls">
                <div className="jro-segment">
                  {(
                    [
                      "ALL",
                      "REVIEW",
                      "TIME",
                      "CV",
                      "GUIDE",
                      "READY",
                    ] as QueueFilter[]
                  ).map((f) => (
                    <button
                      key={f}
                      aria-pressed={queueFilter === f}
                      onClick={() => setQueueFilter(f)}
                    >
                      {text(
                        f === "ALL"
                          ? "الكل"
                          : f === "REVIEW"
                            ? "للفحص"
                            : f === "TIME"
                              ? "انتظار"
                              : f === "CV"
                                ? "السيرة"
                                : f === "GUIDE"
                                  ? "الجولة"
                                  : "جاهز",
                        f === "ALL"
                          ? "All"
                          : f === "REVIEW"
                            ? "Review"
                            : f === "TIME"
                              ? "Waiting"
                              : f === "CV"
                                ? "CV"
                                : f === "GUIDE"
                                  ? "Guide"
                                  : "Ready",
                      )}
                    </button>
                  ))}
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={text("بحث باسم الباحث", "Search member name")}
                  aria-label={text(
                    "بحث في قائمة الفحص",
                    "Search investigation queue",
                  )}
                />
              </div>
              {queueFilter === "UNREAD" && (
                <p className="jro-filter-note">
                  {text(
                    "الذين أتيح لهم الإرشاد ولم يسجلوا قراءته.",
                    "Members with unlocked guidance but no recorded read.",
                  )}
                  <button onClick={() => setQueueFilter("ALL")}>
                    <X size={13} />
                  </button>
                </p>
              )}
              <div className="jro-person-list">
                {queue.map((p) => (
                  <article key={p.id}>
                    <header>
                      <button
                        className="jro-person-name"
                        onClick={() => onInspectMember(p.id)}
                      >
                        {p.name}
                        <ArrowUpRight size={13} />
                      </button>
                      <span className={"jro-state " + gateCategory(p.gate)}>
                        {gate(p.gate)}
                      </span>
                    </header>
                    <p>
                      {p.group?.name ?? text("دون مجموعة", "No group")} ·{" "}
                      {p.guidanceCode
                        ? text(data.guidance.find(g => g.code === p.guidanceCode)?.titleAr ?? p.guidanceCode, data.guidance.find(g => g.code === p.guidanceCode)?.titleEn ?? p.guidanceCode)
                        : data.nodes.find((n) => n.code === p.currentCode)
                        ? title(
                            data.nodes.find((n) => n.code === p.currentCode)!,
                          )
                        : p.currentCode}
                    </p>
                    <div className="jro-person-evidence">
                      <span>
                        {text("الطلبات", "Apps")}{" "}
                        <b>
                          {p.counts.apps}/
                          {data.nodes.find((n) => n.code === p.currentCode)
                            ?.requiredAppsCount ?? 0}
                        </b>
                      </span>
                      <span>
                        {text("بالمحطة", "At station")}{" "}
                        <b>
                          {p.elapsedDays ?? "—"} {text("يوم", "d")}
                        </b>
                      </span>
                      <span>
                        {text("منذ آخر عمل مرصود", "Since recorded work")}{" "}
                        <b>
                          {p.idleForDays} {text("يوم", "d")}
                        </b>
                      </span>
                    </div>
                    {p.waitHours !== null && (
                      <p className="jro-time-note">
                        <Clock3 size={13} />
                        {text("المتابعة بعد ", "Continues in ")}
                        {duration(p.waitHours)}
                      </p>
                    )}
                    {p.gate === "GUIDE" && (
                      <p className="jro-caption">
                        {text(
                          "آخر خطوة محفوظة في الجولة: ",
                          "Saved required guide step: ",
                        )}
                        {p.guideStep}/7
                      </p>
                    )}
                    <footer>
                      <button onClick={() => trace(p)}>
                        <Focus size={13} />
                        {text("تتبع المسار", "Trace journey")}
                      </button>
                      {!readOnly && <button onClick={() => onDraftFeedback(p)}>
                        <BookOpen size={13} />
                        {text("إعداد توجيه", "Draft guidance")}
                      </button>}
                      {!readOnly && <button
                        disabled={
                          !data.nodes.some((n) => n.code === p.currentCode)
                        }
                        title={
                          !data.nodes.some((n) => n.code === p.currentCode)
                            ? text(
                                "افحص حالة المحطة غير المعروفة أولًا",
                                "Inspect the unknown station state first",
                              )
                            : undefined
                        }
                        onClick={() =>
                          setCreateAt(
                            data.nodes.find((n) => n.code === p.currentCode) ??
                              null,
                          )
                        }
                      >
                        <MessageSquarePlus size={13} />
                        {text("تدوين ملاحظة", "Record finding")}
                      </button>}
                    </footer>
                  </article>
                ))}
                {!queue.length && (
                  <div className="jro-empty">
                    <CheckCircle2 size={25} />
                    <p>
                      {text(
                        "لا توجد حالات تطابق عدسة الفحص الحالية.",
                        "No members match this investigation filter.",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </article>
            <article className="jro-panel jro-notebook">
              <header>
                <div>
                  <span className="jro-eyebrow">
                    <Lightbulb size={14} />
                    {text(
                      "من الملاحظة إلى تحسين قابل للتحقق",
                      "From evidence to a testable improvement",
                    )}
                  </span>
                  <h3>
                    {text("دفتر أبحاث الرحلة", "Journey research notebook")}
                  </h3>
                </div>
                {!readOnly && <button
                  className="jro-primary"
                  onClick={() =>
                    setCreateAt(node ?? ranked[0] ?? data.nodes[0])
                  }
                >
                  <MessageSquarePlus size={15} />
                  {text("ملاحظة جديدة", "New observation")}
                </button>}
              </header>
              <div className="jro-notebook-filter">
                <label>
                  <input
                    type="checkbox"
                    checked={notesNodeOnly}
                    disabled={!selected}
                    onChange={(e) => {
                      setNotesNodeOnly(e.target.checked);
                      setNotePage(1);
                    }}
                  />
                  {text("المحطة المحددة فقط", "Selected station only")}
                </label>
                <span>
                  {notes.data?.total ?? "—"}{" "}
                  {text("ملاحظة محفوظة", "saved observations")}
                </span>
              </div>
              {notes.isError ? (
                <div role="alert" className="jro-empty">
                  <p>
                    {text(
                      "تعذر تحميل الملاحظات المحفوظة.",
                      "Could not load saved observations.",
                    )}
                  </p>
                  <button
                    className="jro-small"
                    onClick={() => void notes.refetch()}
                  >
                    {text("إعادة المحاولة", "Retry")}
                  </button>
                </div>
              ) : notes.isPending ? (
                <p className="jro-empty" role="status">
                  {text("تحميل الملاحظات…", "Loading observations…")}
                </p>
              ) : (
                <>
                  <div className="jro-notes-list">
                    {notes.data.items.map((n) => (
                      <article key={n.id} data-research-note={n.id}>
                        <header>
                          <span
                            className={
                              "jro-note-type " + n.category.toLowerCase()
                            }
                          >
                            {text(
                              n.category === "FRICTION"
                                ? "احتكاك محتمل"
                                : n.category === "OPPORTUNITY"
                                  ? "فرصة تحسين"
                                  : "سؤال بحث",
                              n.category === "FRICTION"
                                ? "Possible friction"
                                : n.category === "OPPORTUNITY"
                                  ? "Opportunity"
                                  : "Research question",
                            )}
                          </span>
                          <select
                            aria-label={text(
                              `حالة الملاحظة: ${n.title}`,
                              `Status: ${n.title}`,
                            )}
                            value={n.status}
                            disabled={readOnly || noteBusy === n.id}
                            onChange={(e) => void statusNote(n, e.target.value)}
                          >
                            {["OPEN", "VALIDATING", "RESOLVED"].map(
                              (status) => (
                                <option key={status} value={status}>
                                  {text(
                                    status === "OPEN"
                                      ? "مفتوحة"
                                      : status === "VALIDATING"
                                        ? "قيد التحقق"
                                        : "مغلقة",
                                    status === "OPEN"
                                      ? "Open"
                                      : status === "VALIDATING"
                                        ? "Validating"
                                        : "Resolved",
                                  )}
                                </option>
                              ),
                            )}
                          </select>
                        </header>
                        <h4>{n.title}</h4>
                        <p>{n.hypothesis}</p>
                        <div className="jro-next-action">
                          <Target size={14} />
                          <span>
                            <b>{text("الخطوة التالية: ", "Next action: ")}</b>
                            {n.nextAction}
                          </span>
                        </div>
                        <footer>
                          <span>
                            {text("المسؤول: ", "Owner: ")}
                            {n.ownerName ?? text("غير معيّن", "Unassigned")}
                          </span>
                          <button onClick={() => setEvidence(n)}>
                            <ShieldCheck size={13} />
                            {text("الدليل وقت التدوين", "Captured evidence")}
                          </button>
                        </footer>
                      </article>
                    ))}
                    {!notes.data.total && (
                      <div className="jro-empty">
                        <Lightbulb size={27} />
                        <p>
                          {text(
                            "اختر محطة، سجل ما لاحظته، وما يحتاج تحققًا، ومن سيتابع. تُحفظ لقطة الأرقام مع الملاحظة لتراجع أثر التغيير لاحقًا.",
                            "Select a station, record the evidence and hypothesis, assign follow-up, and retain a metric snapshot for later comparison.",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {notes.data.total > 20 && (
                    <nav
                      className="jro-pagination"
                      aria-label={text("صفحات الملاحظات", "Observation pages")}
                    >
                      <button
                        className="jro-small"
                        disabled={notePage === 1}
                        onClick={() => setNotePage((p) => p - 1)}
                      >
                        {text("السابق", "Previous")}
                      </button>
                      <span>
                        {notePage}/{Math.ceil(notes.data.total / 20)}
                      </span>
                      <button
                        className="jro-small"
                        disabled={notePage * 20 >= notes.data.total}
                        onClick={() => setNotePage((p) => p + 1)}
                      >
                        {text("التالي", "Next")}
                      </button>
                    </nav>
                  )}
                </>
              )}
            </article>
          </section>
          <section className="jro-panel jro-trace">
            <header>
              <div>
                <span className="jro-eyebrow">
                  <Focus size={14} />
                  {text("فحص الحالة الفردية", "Individual case investigation")}
                </span>
                <h3>
                  {traced
                    ? text(
                        `المسار المسجل · ${traced.name}`,
                        `Recorded journey · ${traced.name}`,
                      )
                    : text(
                        "افتح حالة فردية لتفهم سياق الأرقام",
                        "Trace a member to understand the numbers",
                      )}
                </h3>
              </div>
              {traced && (
                <button
                  className="jro-small"
                  onClick={() => {
                    setUserId("");
                    setSelected(null);
                  }}
                >
                  {text("إلغاء التتبع", "Clear trace")} <X size={13} />
                </button>
              )}
            </header>
            {traced ? (
              <>
                <div className="jro-trace-summary">
                  <span className={"jro-state " + gateCategory(traced.gate)}>
                    {gate(traced.gate)}
                  </span>
                  <p>
                    {text("آخر عمل مرصود: ", "Last recorded work: ")}
                    {traced.lastWorkAt ? date(traced.lastWorkAt) + " UTC" : "—"}
                  </p>
                  <button
                    className="jro-text-button"
                    onClick={() => onInspectMember(traced.id)}
                  >
                    {text("افتح الملف الكامل", "Open full account")}{" "}
                    <ArrowUpRight size={13} />
                  </button>
                </div>
                <ol className="jro-timeline">
                  {data.timeline.map((event, i) => {
                    const station = data.nodes.find(
                        (n) => n.code === event.code,
                      ),
                      guidance = data.guidance.find(
                        (g) => g.code === event.code,
                      );
                    return (
                      <li key={event.kind + event.at + i}>
                        <span className="jro-timeline-dot" />
                        <time dateTime={event.at}>{date(event.at)} UTC</time>
                        <strong>
                          {text(
                            event.kind === "TRANSITION"
                              ? "عبور محطة"
                              : event.kind === "GUIDANCE_READ"
                                ? "قراءة إرشاد"
                                : event.kind === "CV_UPLOAD"
                                  ? "رفع سيرة ذاتية"
                                  : event.kind === "LINKEDIN_POST"
                                    ? "منشور مسجل"
                                    : event.kind === "OUTREACH_CONTACT"
                                      ? "تواصل مسجل"
                                      : event.kind === "WEEKLY_REVIEW"
                                        ? "مراجعة أسبوعية"
                                        : event.kind === "GUIDE_SKIPPED"
                                          ? "تخطي شرح"
                                          : "إكمال شرح",
                            event.kind === "TRANSITION"
                              ? "Station transition"
                              : event.kind === "GUIDANCE_READ"
                                ? "Guidance read"
                                : event.kind === "CV_UPLOAD"
                                  ? "CV uploaded"
                                  : event.kind === "LINKEDIN_POST"
                                    ? "Post recorded"
                                    : event.kind === "OUTREACH_CONTACT"
                                      ? "Outreach recorded"
                                      : event.kind === "WEEKLY_REVIEW"
                                        ? "Weekly review"
                                        : event.kind === "GUIDE_SKIPPED"
                                          ? "Guide skipped"
                                          : "Guide completed",
                          )}
                        </strong>
                        <p>
                          {station
                            ? title(station)
                            : guidance
                              ? text(guidance.titleAr, guidance.titleEn)
                              : (FLOW_TITLES[event.code]?.[ar ? 0 : 1] ??
                                event.code)}
                        </p>
                        {event.nextCode && (
                          <small>
                            {text("إلى ", "To ")}
                            {data.nodes.find((n) => n.code === event.nextCode)
                              ? title(
                                  data.nodes.find(
                                    (n) => n.code === event.nextCode,
                                  )!,
                                )
                              : event.nextCode}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {!data.timeline.length && (
                  <p className="jro-empty">
                    {text(
                      "لا توجد أحداث مؤرخة لهذا الباحث في الفترة المختارة. حالته الحالية محفوظة وتظهر في الخريطة.",
                      "No dated records for this member in the selected period. Their saved current state is still shown on the map.",
                    )}
                  </p>
                )}
                <p className="jro-footnote">
                  {text(
                    "نعرض أحدث 100 حدث في الفترة، وبيانات آخر نسختين للسيرة. غياب حدث تاريخي لا يعني أن الباحث لم يكمل المحطة.",
                    "Shows up to 100 recent events in the period and the latest two CV versions. A missing historical event does not imply the station was never completed.",
                  )}
                </p>
              </>
            ) : (
              <div className="jro-empty">
                <Focus size={26} />
                <p>
                  {text(
                    "اختر باحثًا من عدسة البحث أو من قائمة الفحص. ستظهر محطاته المحفوظة، القراءات، نسخ السيرة، والعمل المؤرخ في مسار واحد.",
                    "Choose a member from the research lens or investigation queue to connect saved stages, guidance reads, CV uploads and dated work.",
                  )}
                </p>
              </div>
            )}
          </section>
          <section className="jro-data-quality">
            <div>
              <ShieldCheck size={18} />
              <strong>
                {text(
                  "حدود الدليل ووضوح البيانات",
                  "Evidence coverage & data quality",
                )}
              </strong>
            </div>
            <span>
              {data.summary.knownCompleted}{" "}
              {text("إكمال محفوظ في الحسابات", "saved account completions")}
            </span>
            <span>
              {data.summary.pairedDurationSamples}{" "}
              {text(
                "انتقال مؤرخ يمكن قياس مدته",
                "paired timestamps for dwell",
              )}
            </span>
            {data.summary.unmappedStates > 0 && (
              <button
                onClick={() => {
                  setQueueFilter("UNKNOWN");
                  setSelected(null);
                }}
              >
                {data.summary.unmappedStates}{" "}
                {text("حالة خارج القالب · افحصها", "unmapped states · inspect")}
              </button>
            )}
          </section>
          <footer className="jro-method">
            <ShieldCheck size={17} />
            <p>
              {text(
                "المواضع والإتاحة والإكمال المحفوظة لقطات تراكمية، بينما الحركة وزمن العبور يتبعان الفترة المحددة بتوقيت UTC. لا نعادل الغياب بالانسحاب، ولا نستنتج مشاعر المستخدم من الأرقام. ملاحظات البحث منفصلة عن التوجيه والرسائل المرسلة للمستخدم.",
                "Positions, unlocks and saved completions are cumulative snapshots; movement and dwell follow the selected UTC period. Inactivity is not abandonment, and metrics cannot establish user emotions. Research notes are separate from member guidance and messages.",
              )}
            </p>
          </footer>
        </>
      )}
      {guidanceInspection && data && (() => {
        const guide = data.guidance.find(g => g.code === guidanceInspection.code);
        return guide ? <GuidanceMembersModal key={`${guide.code}:${guidanceInspection.filter}`} title={text(guide.titleAr, guide.titleEn)} members={guide.members ?? []} required={guide.required} ar={ar} initialFilter={guidanceInspection.filter} onClose={() => setGuidanceInspection(null)} /> : null;
      })()}
      {!readOnly && createAt && data && (
        <ObservationEditor
          node={createAt}
          data={data}
          scope={scope}
          ar={ar}
          onClose={() => setCreateAt(null)}
          onSaved={() => {
            setCreateAt(null);
            void client.invalidateQueries({
              queryKey: ["journey-observations"],
            });
          }}
        />
      )}
      {evidence && (
        <Modal
          isOpen
          onClose={() => setEvidence(null)}
          title={text(
            "الدليل المحفوظ وقت الملاحظة",
            "Evidence captured with the observation",
          )}
          size="lg"
        >
          <div className="jro-shell">
            <h3>{evidence.title}</h3>
            <p className="jro-muted">
              {date(evidence.evidence.capturedAt)} UTC ·{" "}
              {evidence.evidence.people}{" "}
              {text("باحث في النطاق", "members in scope")} ·{" "}
              {evidence.evidence.days}{" "}
              {text("يومًا لسجل الحركة", "days of movement history")}
            </p>
            <dl className="jro-evidence-grid">
              {[
                [
                  text("بالمحطة", "At station"),
                  evidence.evidence.station.current,
                ],
                [text("وصلوا", "Reached"), evidence.evidence.station.entered],
                [
                  text("أكملوا", "Completed"),
                  evidence.evidence.station.completed,
                ],
                [
                  text("للفحص", "Review"),
                  evidence.evidence.station.needsReview,
                ],
                [
                  text("انتظار زمني", "Timed wait"),
                  evidence.evidence.station.timeWait,
                ],
                [
                  text("تحديث السيرة", "CV update"),
                  evidence.evidence.station.cvWait,
                ],
                [text("الجولة", "Guide"), evidence.evidence.station.guideWait],
                [
                  text("وسيط زمن العبور", "Median dwell"),
                  duration(evidence.evidence.station.medianHours),
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="jro-footnote">
              {text(
                "هذه لقطة وقت التدوين، ولا تتغير مع المقاييس الحالية. الفرضية والنتيجة النهائية تحتاجان تحققًا من الباحث.",
                "This snapshot stays fixed as current metrics change. The hypothesis and final conclusion still require researcher validation.",
              )}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function TransitionChart({ data, ar }: { data: JourneyMap; ar: boolean }) {
  const rows = Array.from({ length: data.scope.days }, (_, i) => {
      const day = new Date(new Date(data.scope.since).getTime() + i * 86400000)
        .toISOString()
        .slice(0, 10);
      return (
        data.daily.find((r) => r.day === day) ?? {
          day,
          transitions: 0,
          users: 0,
        }
      );
    }),
    max = Math.max(1, ...rows.map((r) => r.transitions));
  return (
    <>
      <div
        className="jro-movement-chart"
        dir="ltr"
        role="img"
        aria-label={
          ar
            ? "انتقالات يومية مرصودة؛ القيم التفصيلية متاحة في الجدول."
            : "Observed daily transitions; exact values are available in the data table."
        }
      >
        <div className="jro-chart-axis">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="jro-movement-bars">
          {rows.map((r, i) => (
            <div
              key={r.day}
              title={`${r.day} · ${r.transitions} transitions · ${r.users} members`}
            >
              <i style={{ height: `${(r.transitions / max) * 100}%` }} />
              {[0, Math.floor(rows.length / 2), rows.length - 1].includes(
                i,
              ) && <span>{r.day.slice(5)}</span>}
            </div>
          ))}
        </div>
      </div>
      {!data.summary.transitionsInWindow && (
        <p className="jro-no-movement">
          {ar
            ? "لا انتقالات مسجلة في الفترة. راجع المواضع الحالية وسجل المحطات المحفوظ."
            : "No recorded transitions in this period. Inspect current positions and saved completions."}
        </p>
      )}
      <details className="jro-chart-data">
        <summary>{ar ? "عرض الأرقام اليومية" : "Show daily values"}</summary>
        <div className="jro-scroll-table">
          <table className="jro-table">
            <thead>
              <tr>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "انتقالات" : "Transitions"}</th>
                <th>{ar ? "باحثون فريدون" : "Unique members"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td>{r.day}</td>
                  <td>{r.transitions}</td>
                  <td>{r.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function ObservationEditor({
  node,
  data,
  scope,
  ar,
  onClose,
  onSaved,
}: {
  node: Station;
  data: JourneyMap;
  scope: Scope;
  ar: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const text = (a: string, e: string) => (ar ? a : e);
  const [form, setForm] = useState({
      title: "",
      hypothesis: "",
      nextAction: "",
      category: "QUESTION",
      ownerId: data.admins[0]?.id ?? "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const patch = (x: Partial<typeof form>) => setForm((f) => ({ ...f, ...x }));
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={text(
        "ملاحظة بحث مرتبطة بالدليل",
        "Evidence-linked research observation",
      )}
      size="xl"
    >
      <form
        className="jro-shell jro-note-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await journeyResearchApi.create({
              ...scope,
              ...form,
              nodeCode: node.code,
              ownerId: form.ownerId || null,
            });
            onSaved();
          } catch {
            setError(
              text(
                "تعذر حفظ الملاحظة. راجع الحقول واتصال الخادم ثم أعد المحاولة.",
                "Could not save the observation. Check the fields and connection, then retry.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="jro-captured-evidence">
          <ShieldCheck size={19} />
          <div>
            <strong>{text(node.titleAr, node.titleEn)}</strong>
            <p>
              {node.current} {text("هنا", "here")} · {node.needsReview}{" "}
              {text("للفحص", "review")} · {node.timeWait}{" "}
              {text("ينتظرون الموعد", "waiting for schedule")}
            </p>
            <small>
              {text(
                "ستُحفظ لقطة المقاييس وقت الحفظ، في النطاق المحدد.",
                "A server-side metric snapshot will be captured on save, using the selected scope.",
              )}
            </small>
          </div>
        </div>
        <label>
          {text("عنوان الملاحظة", "Observation title")}
          <input
            required
            minLength={3}
            maxLength={140}
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <div className="jro-form-grid">
          <label>
            {text("نوع الملاحظة", "Observation type")}
            <select
              value={form.category}
              onChange={(e) => patch({ category: e.target.value })}
            >
              <option value="QUESTION">
                {text("سؤال يحتاج بحثًا", "Research question")}
              </option>
              <option value="FRICTION">
                {text("احتكاك محتمل", "Possible friction")}
              </option>
              <option value="OPPORTUNITY">
                {text("فرصة تحسين", "Opportunity")}
              </option>
            </select>
          </label>
          <label>
            {text("مسؤول المتابعة", "Follow-up owner")}
            <select
              value={form.ownerId}
              onChange={(e) => patch({ ownerId: e.target.value })}
            >
              <option value="">{text("دون تعيين", "Unassigned")}</option>
              {data.admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {text(
            "ماذا لاحظت؟ وما الفرضية التي تحتاج تحققًا؟",
            "What did you observe, and what hypothesis needs validation?",
          )}
          <textarea
            required
            minLength={10}
            maxLength={1500}
            rows={4}
            value={form.hypothesis}
            onChange={(e) => patch({ hypothesis: e.target.value })}
            placeholder={text(
              "افصل بين المعلومة المرصودة والتفسير المحتمل. مثال: توجد حالات لم ترفع السيرة؛ قد لا يكون شرط التحديث واضحًا.",
              "Separate observed facts from interpretation. For example: some members have not uploaded a CV; the update requirement may be unclear.",
            )}
          />
        </label>
        <label>
          {text(
            "كيف ستتحقق؟ وما خطوة التحسين التالية؟",
            "How will you validate it, and what is the next action?",
          )}
          <textarea
            required
            minLength={5}
            maxLength={700}
            rows={3}
            value={form.nextAction}
            onChange={(e) => patch({ nextAction: e.target.value })}
            placeholder={text(
              "مثال: مراجعة المسار مع باحثين، ثم اختبار صياغة شرط رفع السيرة.",
              "Example: observe two members, then test a clearer CV prerequisite explanation.",
            )}
          />
        </label>
        <p className="jro-footnote">
          {text(
            "ملاحظة خاصة بفريق البحث؛ حفظها لا يرسل إشعارًا أو يغير رحلة المستخدم.",
            "A research-team observation. Saving it sends no member notification and does not alter journey progress.",
          )}
        </p>
        {error && (
          <p className="jro-error-text" role="alert">
            {error}
          </p>
        )}
        <button className="jro-primary" disabled={busy}>
          {busy
            ? text("جارٍ الحفظ…", "Saving…")
            : text("حفظ الملاحظة والدليل", "Save observation & evidence")}
        </button>
      </form>
    </Modal>
  );
}
