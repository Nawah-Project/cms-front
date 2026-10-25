import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Plus, TrendingUp, FileText } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import { apiClient } from "../../../lib/api-client";
import { journeyApi } from "../../journey/api/journeyApi";

export function meta() {
  return [{ title: "Reports | Nawah" }];
}
interface Metrics {
  logged: number;
  tailored: number;
  positive: number;
  positiveRate: number | null;
  interviews: number;
  unknownInterviews: number;
  assignments: number;
  rejected: number;
  withdrawn: number;
  noResponse: number;
  accepted: number;
  posts: number;
  outreach: number;
  reviews: number;
}
interface Report {
  asOf: string;
  overall: Metrics;
  weeks: (Metrics & { week: number })[];
  daily: { date: string; logged: number; positiveEvents: number }[];
  cvs: {
    id: string;
    versionNumber: number;
    originalName: string;
    uploadedAt: string;
  }[];
  tasks: { id: string; title: string; completedAt: string | null }[];
  activities: {
    id: string;
    week: number;
    type: string;
    summary: string | null;
    postUrl: string | null;
    postTopic: string | null;
    contactName: string | null;
    companyName: string | null;
    createdAt: string;
    legacyChange: boolean;
  }[];
  readInsightCodes: string[];
  completedNodeCodes: string[];
  currentNodeCode: string;
  currentWeek: number;
  finalAvailable: boolean;
  completed: boolean;
}

export default function ReportsPage() {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["journey", "reports"],
    queryFn: () => apiClient.get<Report>("/journey/reports"),
  });
  const [scope, setScope] = useState<number | null>(null);
  const [changeOpen, setChangeOpen] = useState(false),
    [note, setNote] = useState("");
  const [pending, setPending] = useState(false),
    [saveError, setSaveError] = useState("");
  const [detail, setDetail] = useState<"activities" | "cvs" | null>(null);
  const [series, setSeries] = useState<"logged" | "positiveEvents">("logged");
  const [cumulative, setCumulative] = useState(false);
  const data = query.data;
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["journey"] });
  }
  async function saveChange(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !note.trim()) return;
    setPending(true);
    setSaveError("");
    try {
      await journeyApi.submitSideTask({
        nodeCode: data.currentNodeCode,
        type: "USER_CHANGE",
        reviewSummary: note.trim(),
        sharedInGroup: false,
      });
      await refresh();
      setNote("");
      setChangeOpen(false);
    } catch {
      setSaveError(
        text(
          "الحفظ فشل. الكلام لسه موجود؛ حاول تاني.",
          "Saving failed. Your text is preserved; please retry.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  async function complete() {
    setPending(true);
    setSaveError("");
    try {
      await apiClient.post("/journey/final-report/complete");
      await refresh();
    } catch {
      setSaveError(
        text(
          "تعذر حفظ الإكمال؛ حاول تاني.",
          "Completion could not be saved; please retry.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  if (query.isPending)
    return (
      <div role="status" className="p-8">
        {text("بنحمّل التقرير…", "Loading report…")}
      </div>
    );
  if (query.isError || !data)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <p>{text("تعذر تحميل التقرير.", "Could not load report.")}</p>
        <button
          className="button-primary mt-3"
          onClick={() => void query.refetch()}
        >
          {text("حاول تاني", "Retry")}
        </button>
      </div>
    );
  const m =
    scope === null ? data.overall : data.weeks.find((w) => w.week === scope)!;
  const previous =
    scope !== null && scope > 0
      ? data.weeks.find((w) => w.week === scope - 1)
      : undefined;
  let sum = 0;
  const points = data.daily.map((d) => {
    sum += d[series];
    return { date: d.date, value: cumulative ? sum : d[series] };
  });
  const max = Math.max(1, ...points.map((d) => d.value));
  const path = points
    .map(
      (d, i) =>
        `${i ? "L" : "M"} ${points.length > 1 ? (i / (points.length - 1)) * 700 : 350} ${160 - (d.value / max) * 145}`,
    )
    .join(" ");
  const activities = data.activities.filter(
    (a) => scope === null || a.week === scope,
  );
  const labels: [keyof Metrics, string, string][] = [
    ["logged", "طلبات مسجلة", "Logged applications"],
    ["tailored", "طلبات مخصصة", "Tailored applications"],
    ["positive", "تقدم إيجابي موثّق", "Recorded positive progression"],
    ["interviews", "وصلت لمقابلة", "Interview reached"],
    ["assignments", "اختبار/تكليف", "Assignment received"],
    ["accepted", "قبول/عرض", "Accepted / offer"],
    ["rejected", "رفض", "Rejected"],
    ["withdrawn", "انسحاب", "Withdrawn"],
    ["noResponse", "أُغلقت بلا رد", "Closed: no response"],
    ["posts", "منشورات LinkedIn", "LinkedIn posts"],
    ["outreach", "محاولات تواصل", "Outreach contacts"],
    ["reviews", "مراجعات أسبوعية", "Weekly reflections"],
  ];
  return (
    <main className="space-y-6 pb-8">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {text("تقارير رحلة نواة", "Nawah journey reports")}
          </h1>
          <p className="text-sm text-text-secondary">
            {text("البيانات المحفوظة لحد", "Recorded data as of")}{" "}
            {new Date(data.asOf).toLocaleString(locale)}
          </p>
        </div>
        {data.currentWeek >= 3 && (
          <button
            className="button-primary"
            onClick={() => {
              setSaveError("");
              setChangeOpen(true);
            }}
          >
            <Plus className="inline h-4 w-4" />{" "}
            {text("سجّل تغيير مهني", "Log a professional change")}
          </button>
        )}
      </header>
      <nav
        aria-label={text("نطاق التقرير", "Report scope")}
        className="flex flex-wrap gap-2"
      >
        {[null, 0, 1, 2, 3, 4].map((w) => (
          <button
            key={w ?? "all"}
            className={scope === w ? "button-primary" : "button-secondary"}
            aria-pressed={scope === w}
            onClick={() => setScope(w)}
          >
            {w === null
              ? text("الرحلة بالكامل", "Whole journey")
              : w === 0
                ? text("التفعيل", "Activation")
                : text(`الأسبوع ${w}`, `Week ${w}`)}
          </button>
        ))}
      </nav>
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-2">
        <h2 className="font-bold">
          <Activity className="inline h-4 w-4" />{" "}
          {scope === null
            ? text("ملخص الرحلة بالكامل", "Whole journey summary")
            : text("مجموعة طلبات الأسبوع", "Application cohort")}
        </h2>
        <p className="text-sm text-text-secondary">
          {text(
            "الطلبات متجمّعة حسب أسبوع تسجيلها في الرحلة. النتائج هي حالتها الحالية، حتى لو الرد وصل بعد الأسبوع. المقابلات والتكليفات تشمل السجل السابق المتاح.",
            "Applications are grouped by their recorded journey week. Outcomes reflect the current state, including late responses. Interviews and assignments include available transition history.",
          )}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {labels.map(([key, a, e]) => (
            <div key={key} className="rounded-xl border border-border p-3">
              <p className="text-xs text-text-secondary">{text(a, e)}</p>
              <strong className="text-xl">{number(m[key] ?? 0)}</strong>
            </div>
          ))}
        </div>
        <p>
          {text(
            "نسبة التقدم الإيجابي الموثق",
            "Recorded positive progression rate",
          )}
          : {m.positiveRate === null ? "—" : `${number(m.positiveRate)}%`}
        </p>
        <p className="text-xs text-text-secondary">
          {text(
            "التقدم الإيجابي: دليل على تكليف أو مقابلة أو قرار أو قبول؛ الإغلاق بلا رد والانسحاب مستبعدين. الرفض لوحده مش دليل على تقدم إيجابي. الأعداد متداخلة ومش مجموعها إجمالي الطلبات.",
            "Positive progression requires assignment, interview, decision or acceptance evidence; no-response and withdrawal are excluded. Rejection alone is insufficient. Categories overlap and do not sum to total applications.",
          )}
        </p>
        {m.unknownInterviews > 0 && (
          <p role="note">
            {text(
              "طلبات مفيش دليل كافي يحدد هل سبق لها مقابلة:",
              "Applications with insufficient evidence to determine earlier interviews:",
            )}{" "}
            {number(m.unknownInterviews)}
          </p>
        )}
        {previous && (
          <p>
            {text(
              "مقارنة بالأسبوع السابق: فرق الطلبات",
              "Compared with the previous cohort: application difference",
            )}{" "}
            {number(m.logged - previous.logged)}؛{" "}
            {text("فرق التقدم الموثق", "positive progression difference")}{" "}
            {number(m.positive - previous.positive)}.{" "}
            {text(
              "ده وصف للبيانات الحالية، مش مقارنة متساوية في وقت انتظار الرد.",
              "This describes current records, without equalizing response waiting time.",
            )}
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-bold">
          <TrendingUp className="inline h-4 w-4" />{" "}
          {text(
            "النشاط حسب التاريخ الفعلي — الرحلة بالكامل",
            "Activity by actual date — whole journey",
          )}
        </h2>
        <div className="flex flex-wrap gap-3">
          <label>
            {text("المقياس", "Metric")}{" "}
            <select
              className="field-control"
              value={series}
              onChange={(e) => setSeries(e.target.value as typeof series)}
            >
              <option value="logged">
                {text("تسجيل الطلبات", "Applications logged")}
              </option>
              <option value="positiveEvents">
                {text("أحداث تقدم إيجابي", "Positive progression events")}
              </option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cumulative}
              onChange={(e) => setCumulative(e.target.checked)}
            />
            {text("تراكمي", "Cumulative")}
          </label>
        </div>
        {points.length ? (
          <>
            <svg
              role="img"
              aria-label={text(
                "منحنى النشاط المسجّل",
                "Recorded activity curve",
              )}
              viewBox="0 0 700 170"
              className="w-full max-h-60 text-emerald-600"
            >
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              {points.length === 1 && (
                <circle
                  cx="350"
                  cy={160 - (points[0].value / max) * 145}
                  r="4"
                  fill="currentColor"
                />
              )}
            </svg>
            <p className="text-xs">
              {points[0].date} — {points.at(-1)?.date}
            </p>
            <details>
              <summary>{text("عرض أرقام الرسم", "View chart data")}</summary>
              <div className="max-h-48 overflow-auto">
                {points.map((p) => (
                  <p key={p.date}>
                    {p.date}: {number(p.value)}
                  </p>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p>{text("لسه مفيش بيانات.", "No recorded data yet.")}</p>
        )}
        <p className="text-xs text-text-secondary">
          {text(
            "أحداث الرد حسب وقت انتقال المرحلة، وممكن يتكرر للطلب أكتر من حدث. الأحداث القديمة بلا تاريخ مش بنخترع لها تواريخ. الرسم مستقل عن تبويب مجموعة الأسبوع.",
            "Response events use stage-transition timestamps; one application can have several events. Missing historical event dates are not invented. This chart is separate from the weekly cohort tabs.",
          )}
        </p>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-2">
        <h2 className="font-bold">
          {text("ملاحظات مبنية على المتاح", "Evidence and next steps")}
        </h2>
        <p>
          {m.logged === 0
            ? text(
                "ابدأ بتسجيل طلباتك علشان يظهر نشاط قابل للمراجعة.",
                "Log your applications to start reviewing activity.",
              )
            : m.logged < 20
              ? text(
                  "العينة صغيرة. الأرقام وصف مبدئي، ومش دليل على جودة السيرة أو سبب الاستجابة.",
                  "This is a small sample. Counts are preliminary and cannot establish CV quality or causes.",
                )
              : text(
                  "دي نتائج مسجلة، مش تفسير لأسبابها. راجع ملاءمة الوظائف والتخصيص ووقت انتظار الرد قبل استنتاج نمط.",
                  "These are recorded outcomes, not causal explanations. Review job fit, tailoring and response waiting time before drawing patterns.",
                )}
        </p>
        <p>
          {text(
            "تغيير السيرة ما يثبتش إنها اتستخدمت في طلب بعينه، ولا إن تغيير النتيجة سببه السيرة وحدها.",
            "A CV update does not establish which applications used it or that it caused outcome changes.",
          )}
        </p>
        <Link
          className="text-emerald-700 underline"
          to={data.completed ? "/applications" : "/applications"}
        >
          {data.completed
            ? text(
                "كمل تسجيل طلباتك ومراجعة نتائجك",
                "Continue tracking applications and outcomes",
              )
            : text("ارجع للمهمة الحالية", "Return to your current quest")}
        </Link>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-bold">
          <FileText className="inline h-4 w-4" />{" "}
          {text("السجل والمراحل المحفوظة", "Persisted history and milestones")}
        </h2>
        <p>
          {text("نسخ السيرة الفعلية", "Actual CV versions")}:{" "}
          {number(data.cvs.length)} · {text("إرشادات مقروءة", "Guidance read")}:{" "}
          {number(data.readInsightCodes.length)} ·{" "}
          {text("مهام مهنية مكتملة", "Professional tasks completed")}:{" "}
          {number(data.tasks.length)}
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="button-secondary" onClick={() => setDetail("cvs")}>
            {text("سجل السيرة", "CV history")}
          </button>
          <button
            className="button-secondary"
            onClick={() => setDetail("activities")}
          >
            {text(
              "المراجعات والتغييرات والنشاط",
              "Reviews, changes and activity",
            )}
          </button>
        </div>
        <details>
          <summary>
            {text("الإرشادات والمهام المكتملة", "Completed guidance and tasks")}
          </summary>
          <ul>
            {data.readInsightCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
            {data.tasks.map((t) => (
              <li key={t.id}>
                {t.title} —{" "}
                {t.completedAt
                  ? new Date(t.completedAt).toLocaleDateString(locale)
                  : text("تاريخ غير متاح", "Date unavailable")}
              </li>
            ))}
          </ul>
        </details>
      </section>
      {(data.finalAvailable || data.completed) && (
        <section className="rounded-2xl border border-border bg-surface border-emerald-500 p-5 space-y-3">
          <h2 className="font-bold">
            {text(
              "التقرير النهائي — الرحلة بالكامل",
              "Final report — whole journey",
            )}
          </h2>
          <p>
            {text(
              "تبويب الرحلة بالكامل يشمل التفعيل وكل الأسابيع، ومش هو تقرير الأسبوع الرابع وحده.",
              "The whole-journey tab includes activation and all weeks; it is distinct from week four.",
            )}
          </p>
          <button className="button-secondary" onClick={() => setScope(null)}>
            {text("اعرض ملخص الرحلة بالكامل", "Show whole journey summary")}
          </button>
          {data.completed ? (
            <p role="status">
              {text(
                "إكمال الرحلة محفوظ. تقدر تكمل التقديم ومتابعة نتائجك.",
                "Journey completion is saved. Continue applying and tracking outcomes.",
              )}
            </p>
          ) : (
            <button
              disabled={pending || scope !== null}
              className="button-primary"
              onClick={() => void complete()}
            >
              {text(
                "قرأت التقرير الكامل — أكمل الرحلة",
                "I have read the complete report — finish journey",
              )}
            </button>
          )}
          {saveError && <p role="alert">{saveError}</p>}
        </section>
      )}
      <Modal
        isOpen={changeOpen}
        onClose={() => {
          if (!pending) setChangeOpen(false);
        }}
        disableClose={pending}
        title={text("تسجيل تغيير مهني", "Log a professional change")}
      >
        <form className="p-5 space-y-3" onSubmit={saveChange}>
          <label className="block">
            {text(
              "إيه اللي غيرته؟ ده سجل يدوي ومش نسخة CV جديدة.",
              "What changed? This is a manual log, not a new CV version.",
            )}
            <textarea
              className="field-control"
              required
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {saveError && <p role="alert">{saveError}</p>}
          <button className="button-primary" disabled={pending}>
            {pending ? text("بنحفظ…", "Saving…") : text("احفظ", "Save")}
          </button>
        </form>
      </Modal>
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={
          detail === "cvs"
            ? text("نسخ السيرة المحفوظة", "Persisted CV versions")
            : text(
                "النشاط المحفوظ — النطاق المختار",
                "Persisted activity — selected scope",
              )
        }
      >
        <div className="p-5 space-y-4">
          {detail === "cvs" ? (
            data.cvs.length ? (
              data.cvs.map((c) => (
                <article key={c.id}>
                  <strong>CV v{number(c.versionNumber)}</strong>
                  <p>
                    {c.originalName} —{" "}
                    {new Date(c.uploadedAt).toLocaleString(locale)}
                  </p>
                </article>
              ))
            ) : (
              <p>{text("مفيش نسخ محفوظة.", "No persisted versions.")}</p>
            )
          ) : activities.length ? (
            activities.map((a) => (
              <article key={a.id} className="border-b border-border pb-3">
                <strong>
                  {a.legacyChange
                    ? text(
                        "سجل تغيير قديم — مش مراجعة ولا إثبات CV",
                        "Legacy change log — not a review or CV evidence",
                      )
                    : a.type === "WEEKLY_REVIEW"
                      ? text("مراجعة أسبوعية", "Weekly reflection")
                      : a.type === "USER_CHANGE"
                        ? text("تغيير مهني", "Professional change")
                        : a.type}
                </strong>
                <p className="whitespace-pre-wrap break-words">
                  {a.summary ||
                    a.postTopic ||
                    [a.contactName, a.companyName].filter(Boolean).join(" — ")}
                </p>
                {a.postUrl && (
                  <a
                    className="underline break-all"
                    href={a.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {a.postUrl}
                  </a>
                )}
                <p className="text-xs">
                  {text("الأسبوع", "Week")} {number(a.week)} —{" "}
                  {new Date(a.createdAt).toLocaleString(locale)}
                </p>
              </article>
            ))
          ) : (
            <p>
              {text(
                "مفيش نشاط محفوظ في النطاق ده.",
                "No persisted activity in this scope.",
              )}
            </p>
          )}
        </div>
      </Modal>
    </main>
  );
}
