import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Clock3, Lock, Plus } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import type { Report } from "./ReportsPage";

export function analyticsAccess(report: Report) {
  const done = new Set(report.completedNodeCodes);
  return (
    report.analyticsAccess ?? {
      cv: report.cvs.length > 0 || done.has("TASK_0"),
      pipeline: done.has("W1_M1") || report.currentWeek >= 2,
      tailoring: done.has("W1_REVIEW") || report.currentWeek >= 2,
      publishing: done.has("W2_REVIEW") || report.currentWeek >= 3,
      networking: done.has("W3_REVIEW") || report.currentWeek >= 4,
      freeChanges: report.currentWeek >= 3,
    }
  );
}

export function cohortApplicationsUrl(
  period: Report["periodComparisons"][number],
  label: string,
) {
  const query = new URLSearchParams({
    createdFrom: period.startAt,
    change: label,
  });
  if (period.endAt) query.set("createdBefore", period.endAt);
  return `/applications?${query.toString()}`;
}

function description(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      return (
        [record.title, record.summary, record.note]
          .filter((v) => typeof v === "string")
          .join(" · ") || null
      );
    }
  } catch {
    /* Legacy plain text is displayed as text. */
  }
  return value;
}

export function ChangeLab({
  report,
  admin,
  onAddUpdate,
}: {
  report: Report;
  admin: boolean;
  onAddUpdate: () => void;
}) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const access = analyticsAccess(report);
  const periods = report.periodComparisons.filter(
    (p) => admin || access.freeChanges || p.kind !== "USER_CHANGE",
  );
  const [selectedId, setSelectedId] = useState("");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const receivedAt = useMemo(() => Date.now(), [report]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const serverNow =
    new Date(report.asOf).getTime() + Math.max(0, now - receivedAt);
  const nextAt = report.manualUpdate?.nextAvailableAt;
  const cooldown = Boolean(nextAt && serverNow < new Date(nextAt).getTime());
  const selected = periods.find((p) => p.id === selectedId) ?? periods.at(-1);
  const previous = selected
    ? periods[periods.indexOf(selected) - 1]
    : undefined;
  const opened = periods.find((p) => p.id === openedId);
  const rows = opened?.applications ?? [];
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const date = (value: string, time = false) =>
    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
      timeZone: "Africa/Cairo",
    }).format(new Date(value));
  const title = (p: Report["periodComparisons"][number]) => {
    if (p.kind === "CV") return p.title;
    if (p.kind === "BEFORE_FIRST_CHECKPOINT")
      return t("قبل أول تعديل", "Before first change");
    const activity = report.activities.find(
      (a) => a.type === "USER_CHANGE" && a.createdAt === p.startAt,
    );
    return (
      description(activity?.summary) ??
      t(
        `تحديث ${number(periods.filter((p) => p.kind === "USER_CHANGE").findIndex((item) => item.id === p.id) + 1)}`,
        `Update ${number(periods.filter((p) => p.kind === "USER_CHANGE").findIndex((item) => item.id === p.id) + 1)}`,
      )
    );
  };
  const nextReview = report.currentWeek <= 1 ? 1 : 2;
  const nextMessage = access.freeChanges
    ? cooldown
      ? t(
          `التحديث القادم متاح ${date(nextAt!, true)} بتوقيت القاهرة.`,
          `Your next update is available ${date(nextAt!, true)} Cairo time.`,
        )
      : t(
          "تقدر تضيف تحديث جديد الآن. بعد حفظه، التحديث التالي هيكون متاح بعد 3 أيام.",
          "You can add an update now. Your next update becomes available 3 days after saving.",
        )
    : t(
        `التعديل القادم عند محطة مراجعة الأسبوع ${number(nextReview)}. هتقدر تراجع تجهيزاتك وتحدّث سيرتك هناك.`,
        `Your next change checkpoint is the Week ${number(nextReview)} review. Review your preparation and update your CV there.`,
      );
  return (
    <section
      id="change-lab"
      data-guide="analytics-periods"
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-bold">
            {t(
              "مقارنة الأداء حسب تحديثاتك وتجهيزاتك",
              "Compare your preparation updates",
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            {t(
              "قارن الطلبات اللي اتسجلت بعد كل تغيير لحد التغيير اللي بعده. اضغط على عدد الطلبات لعرضها.",
              "Compare applications recorded after each change up to the next one. Select an application count to inspect its cohort.",
            )}
          </p>
        </div>
        {access.freeChanges && !admin && (
          <div className="max-w-xs">
            <button
              type="button"
              disabled={cooldown}
              onClick={onAddUpdate}
              className="button-primary inline-flex min-h-11 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("إضافة تحديث", "Add an update")}
            </button>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {t("متاح مرة كل 3 أيام", "Available once every 3 days")}
            </p>
          </div>
        )}
      </header>
      <div className="p-4 sm:p-6">
        {periods.length > 2 && (
          <label className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span>{t("التغيير المعروض", "Displayed change")}</span>
            <select
              className="field-control min-h-10 w-full sm:max-w-sm"
              value={selected?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {title(p).slice(0, 70)} · {date(p.startAt)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-5">
          {[previous, selected]
            .filter((p): p is NonNullable<typeof selected> => Boolean(p))
            .map((p) => (
              <article
                key={p.id}
                className="min-w-0 rounded-2xl border border-border bg-neutral-50 p-4 dark:bg-neutral-900/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {p.metrics.positiveRate === null
                      ? t("لا توجد طلبات بعد", "No applications yet")
                      : `${number(p.metrics.positiveRate)}% ${t("تقدم إيجابي", "positive progression")}`}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {p.endAt
                      ? t("فترة سابقة", "Previous period")
                      : t("الفترة الحالية", "Current period")}
                  </span>
                </div>
                <button
                  type="button"
                  data-guide={p.id === (previous?.id ?? selected?.id) ? "analytics-first-cohort" : undefined}
                  aria-label={t(
                    `عرض ${number(p.metrics.logged)} طلبات مرتبطة بـ ${title(p)}`,
                    `View ${number(p.metrics.logged)} applications for ${title(p)}`,
                  )}
                  onClick={() => {
                    setOpenedId(p.id);
                    setPage(0);
                  }}
                  className="mt-5 flex min-h-32 sm:min-h-44 w-full flex-col justify-end overflow-hidden rounded-xl border border-border bg-surface p-2 text-center transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <strong className="text-2xl sm:text-3xl font-bold tabular-nums">
                    {number(p.metrics.logged)}
                  </strong>
                  <span
                    className="mt-3 flex h-20 sm:h-32 w-full items-end overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-900/50"
                    aria-hidden="true"
                  >
                    <span
                      className="w-full rounded-lg bg-emerald-700"
                      style={{
                        height: `${(p.metrics.logged / Math.max(1, ...[previous, selected].filter(Boolean).map((x) => x!.metrics.logged))) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="mt-3 inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {t("عرض الطلبات", "View applications")} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
                <h3 className="mt-4 break-words font-semibold">{title(p)}</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {date(p.startAt)} —{" "}
                  {p.endAt ? date(p.endAt) : t("حتى الآن", "Present")}
                </p>
                <p className="mt-3 text-sm">
                  <strong>{number(p.metrics.positive)}</strong>{" "}
                  {t(
                    "طلبات بتقدم إيجابي حالي",
                    "applications with current progression",
                  )}{" "}
                  · <strong>{number(p.metrics.interviews)}</strong>{" "}
                  {t("مقابلات", "interviews")}
                </p>
              </article>
            ))}
          {!previous && (
            <div className="flex min-h-44 sm:min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 text-center">
              <span className="rounded-full bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {access.freeChanges ? (
                  <Clock3 className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
              </span>
              <h3 className="mt-4 font-semibold">
                {t("التعديل القادم", "Next change")}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">
                {nextMessage}
              </p>
              {!access.freeChanges && !admin && (
                <Link
                  to="/journey"
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-emerald-800 underline dark:text-emerald-300"
                >
                  {t("تابع مهمتك الحالية", "Continue your current quest")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
        {previous && (
          <p
            role="status"
            className="mt-5 flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-text-secondary dark:bg-neutral-900/40"
          >
            <Clock3 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            {nextMessage}
          </p>
        )}
        {!periods.length && (
          <p className="mt-4 text-center text-sm text-text-secondary">
            {t(
              "لسه مفيش نسخة CV أو تغيير محفوظ للمقارنة. النشاط اللي سجلته ظاهر في المنحنى فوق.",
              "No saved CV or change is available for comparison yet. Your recorded activity appears in the chart above.",
            )}
          </p>
        )}
      </div>
      <p className="border-t border-border px-5 py-3 text-xs leading-6 text-text-secondary">
        {t(
          "النسبة = الطلبات ذات التقدم الإيجابي ÷ إجمالي طلبات الفترة. الفترات تختلف في حجم العينة ومدة انتظار الرد؛ المقارنة لا تثبت إن التغيير سبب النتيجة.",
          "Rate = applications with positive progression ÷ all applications in the period. Sample size and waiting time vary; comparison does not establish causation.",
        )}
      </p>
      <Modal
        isOpen={Boolean(opened)}
        onClose={() => { setOpenedId(null); window.dispatchEvent(new Event("nawah:cohort-closed")); }}
        title={
          opened
            ? t(`طلبات ${title(opened)}`, `Applications · ${title(opened)}`)
            : t("الطلبات المرتبطة", "Linked applications")
        }
        size="xl"
      >
        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-sm text-text-secondary">
            {opened &&
              `${date(opened.startAt, true)} — ${opened.endAt ? date(opened.endAt, true) : t("حتى الآن", "Present")}`}
          </p>
          <div data-guide="analytics-cohort-list">{rows.length ? (
            <>
              <ul className="divide-y divide-border">
                {rows.slice(page * 8, page * 8 + 8).map((app) => (
                  <li
                    key={app.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">{app.jobTitle}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {app.companyName}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {date(app.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                      {(
                        {
                          APPLIED: t("تم التقديم", "Applied"),
                          ASSIGNMENT: t("تكليف", "Assignment"),
                          INTERVIEW: t("مقابلة", "Interview"),
                          DECISION: t("قرار", "Decision"),
                          CLOSED: t("مغلق", "Closed"),
                        } as Record<string, string>
                      )[app.stage] ?? app.stage}
                    </span>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="button-secondary min-h-10"
                    disabled={!page}
                    onClick={() => setPage(page - 1)}
                  >
                    {t("السابق", "Previous")}
                  </button>
                  <span className="text-xs">
                    {number(page + 1)} / {number(pages)}
                  </span>
                  <button
                    className="button-secondary min-h-10"
                    disabled={page >= pages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    {t("التالي", "Next")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="py-5 text-sm text-text-secondary">
              {opened?.metrics.logged
                ? t(
                    "تفاصيل الطلبات غير متاحة في النسخة الحالية للخدمة.",
                    "Details are unavailable in the current service version.",
                  )
                : t(
                    "مفيش طلبات مسجلة في الفترة دي حتى الآن.",
                    "No applications have been recorded in this period yet.",
                  )}
            </p>
          )}</div>
          {opened && !admin && (
            <Link
              data-guide="analytics-cohort-link"
              to={cohortApplicationsUrl(opened, title(opened))}
              className="button-primary inline-flex min-h-11 items-center gap-2"
            >
              {t("افتح في قسم الطلبات بالفلتر", "Open filtered applications")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          {admin && (
            <p className="text-xs text-text-secondary">
              {t(
                "معاينة إدارية للقراءة فقط؛ الطلبات تخص العضو المعروض.",
                "Read-only admin preview; these applications belong to the selected member.",
              )}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
