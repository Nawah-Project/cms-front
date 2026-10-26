import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../../i18n";
import { adminApi } from "./api/adminApi";
import { ErrorState, LoadingState } from "./components/AdminUI";
import ReportsPage, {
  ReportPreviewProvider,
} from "../reports/pages/ReportsPage";

type PreviewReportChoice = "week-1" | "week-2" | "week-3" | "week-4" | "final";
type PreviewMode = "DEMO" | "ACTUAL";

export const adminReportPreviewQueryKeys = {
  demo: ["admin", "journey-report-preview", "DEMO"] as const,
  users: (search: string) =>
    ["admin", "journey-report-preview", "users", search] as const,
  actual: (userId: string) =>
    ["admin", "journey-report-preview", "ACTUAL", userId] as const,
};

export default function AdminReportPreviewPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const text = (ar: string, en: string) => (isAr ? ar : en);
  const [mode, setMode] = useState<PreviewMode>("DEMO");
  const [reportChoice, setReportChoice] = useState<PreviewReportChoice>("week-1");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const usersQuery = useQuery({
    queryKey: adminReportPreviewQueryKeys.users(debouncedSearch),
    queryFn: () =>
      adminApi.users({ page: 1, limit: 100, search: debouncedSearch }),
    enabled: mode === "ACTUAL",
    retry: false,
    staleTime: 30_000,
  });
  const reportQuery = useQuery({
    queryKey:
      mode === "DEMO"
        ? adminReportPreviewQueryKeys.demo
        : adminReportPreviewQueryKeys.actual(selectedUserId),
    queryFn: () =>
      mode === "DEMO"
        ? adminApi.reportPreviewDemo()
        : adminApi.reportPreviewUser(selectedUserId),
    enabled: mode === "DEMO" || Boolean(selectedUserId),
    retry: false,
  });

  const report = reportQuery.data?.report;
  const users = (usersQuery.data?.items ?? []).filter(
    (user) => user.role === "USER",
  );
  const scope =
    reportChoice === "final" ? null : Number(reportChoice.slice(-1));
  const hasActualActivity = Boolean(
    report &&
      (report.overall.logged ||
        report.overall.posts ||
        report.overall.outreach ||
        report.overall.reviews ||
        report.cvs.length ||
        report.tasks.length ||
        report.activities.length),
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {text("معاينة تقارير الرحلة", "Journey report preview")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-text-secondary">
              {text(
                "راجع تقارير الأسابيع الأربعة والتقرير النهائي من غير انتظار التقويم أو تغيير تقدم أي عضو.",
                "Inspect the four weekly reports and final report without waiting for the journey calendar or changing a member’s progress.",
              )}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              mode === "DEMO"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "border-info-strong/30 bg-info-soft text-info-strong"
            }`}
          >
            {mode === "DEMO"
              ? text("DEMO — بيانات تجريبية", "DEMO — synthetic data")
              : text("ACTUAL — بيانات عضو", "ACTUAL — member data")}
          </span>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            {text("التقرير", "Report")}
            <select
              className="field-control mt-1"
              value={reportChoice}
              onChange={(event) =>
                setReportChoice(event.target.value as PreviewReportChoice)
              }
            >
              <option value="week-1">{text("الأسبوع الأول", "Week 1")}</option>
              <option value="week-2">{text("الأسبوع الثاني", "Week 2")}</option>
              <option value="week-3">{text("الأسبوع الثالث", "Week 3")}</option>
              <option value="week-4">{text("الأسبوع الرابع", "Week 4")}</option>
              <option value="final">{text("التقرير النهائي", "Final report")}</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            {text("مصدر البيانات", "Data mode")}
            <select
              className="field-control mt-1"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as PreviewMode);
                setSelectedUserId("");
              }}
            >
              <option value="DEMO">{text("DEMO — بيانات تجريبية", "DEMO — synthetic sample")}</option>
              <option value="ACTUAL">{text("ACTUAL — بيانات حقيقية", "ACTUAL — real member data")}</option>
            </select>
          </label>
        </div>

        {mode === "ACTUAL" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              {text("ابحث عن عضو بالاسم أو البريد", "Search members by name or email")}
              <input
                className="field-control mt-1"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedUserId("");
                }}
                type="search"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-medium">
              {text("العضو", "Member")}
              <select
                className="field-control mt-1"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={usersQuery.isPending || usersQuery.isError}
              >
                <option value="">{text("اختار عضوًا للمعاينة", "Select a member to preview")}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}{user.email ? ` · ${user.email}` : ""}
                  </option>
                ))}
              </select>
              {usersQuery.data && usersQuery.data.total > users.length && (
                <span className="mt-1 block text-xs text-text-secondary">
                  {text(
                    "اكتب جزءًا من الاسم أو البريد لتضييق النتائج.",
                    "Search by part of a name or email to narrow the results.",
                  )}
                </span>
              )}
            </label>
          </div>
        )}
      </section>

      {mode === "ACTUAL" && usersQuery.isPending && (
        <LoadingState label={text("بنحمّل قائمة الأعضاء…", "Loading members…")} />
      )}
      {mode === "ACTUAL" && usersQuery.isError && (
        <ErrorState
          message={text("تعذر تحميل قائمة الأعضاء.", "Could not load members.")}
          onRetry={() => void usersQuery.refetch()}
        />
      )}
      {mode === "ACTUAL" && !usersQuery.isPending && !usersQuery.isError && !users.length && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary" role="status">
          {text("مفيش أعضاء مطابقين للبحث.", "No members match this search.")}
        </div>
      )}

      {mode === "ACTUAL" && !selectedUserId && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary" role="status">
          {text("اختار عضوًا عشان تعرض تقريره للقراءة فقط.", "Select a member to inspect their report read-only.")}
        </div>
      )}
      {reportQuery.isPending && (mode === "DEMO" || Boolean(selectedUserId)) && (
        <LoadingState label={text("بنحمّل التقرير…", "Loading report…")} />
      )}
      {reportQuery.isError && (mode === "DEMO" || Boolean(selectedUserId)) && (
        <ErrorState
          message={text("تعذر تحميل المعاينة.", "Could not load the preview.")}
          onRetry={() => void reportQuery.refetch()}
        />
      )}

      {report && (
        <>
          {mode === "ACTUAL" && !hasActualActivity && (
            <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary" role="status">
              {text("العضو ده ما عندوش نشاط أو تقارير محفوظة حتى الآن.", "This member has no recorded activity or reports yet.")}
            </div>
          )}
          <ReportPreviewProvider
            value={{
              data: report,
              scope,
              onScopeChange: (nextScope) =>
                setReportChoice(nextScope === null ? "final" : `week-${nextScope}` as PreviewReportChoice),
              forceFinalPreview: reportChoice === "final",
            }}
          >
            <ReportsPage />
          </ReportPreviewProvider>
        </>
      )}
    </div>
  );
}
