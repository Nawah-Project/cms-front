import assert from "node:assert/strict";
import { test, after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
after(() => server.close());
const { clearPrivateAccountCache } = await server.ssrLoadModule(
  "/src/app/lib/account-cache.ts",
);
const { default: ReportsPage } = await server.ssrLoadModule(
  "/src/app/features/reports/pages/ReportsPage.tsx",
);
const { ReportPreviewProvider } = await server.ssrLoadModule(
  "/src/app/features/reports/pages/ReportsPage.tsx",
);
const { default: AdminReportPreviewPage, adminReportPreviewQueryKeys } =
  await server.ssrLoadModule(
    "/src/app/features/admin/AdminReportPreviewPage.tsx",
  );
const { buildAnalyticsChartRows } = await server.ssrLoadModule(
  "/src/app/features/reports/pages/analytics-model.ts",
);
const { I18nProvider } = await server.ssrLoadModule("/src/app/i18n/index.tsx");
function render(client, Page = ReportsPage) {
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(Page)),
      ),
    ),
  );
}
const metrics = {
  logged: 0,
  tailored: 0,
  positive: 0,
  positiveRate: null,
  interviews: 0,
  unknownInterviews: 0,
  assignments: 0,
  rejected: 0,
  withdrawn: 0,
  noResponse: 0,
  accepted: 0,
  posts: 0,
  outreach: 0,
  reviews: 0,
  stages: { APPLIED: 0, ASSIGNMENT: 0, INTERVIEW: 0, DECISION: 0, CLOSED: 0 },
  outcomes: { NONE: 0, ACCEPTED: 0, REJECTED: 0, WITHDRAWN: 0, NO_RESPONSE: 0 },
  milestones: { assignments: 0, interviews: 0, decisions: 0 },
};
const report = {
  asOf: "2026-10-26T00:00:00Z",
  overall: metrics,
  weeks: [0, 1, 2, 3, 4].map((week) => ({ ...metrics, week })),
  daily: [],
  periodComparisons: [],
  cvs: [],
  tasks: [],
  activities: [],
  readInsightCodes: [],
  completedNodeCodes: [],
  currentNodeCode: "FINAL_REPORT",
  currentWeek: 4,
  finalAvailable: true,
  completed: false,
};
test("logout/account boundary discards private cache and an old in-flight result cannot replace new-account data", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  let finish;
  client.setQueryData(["journey", "reports"], { private: "A" });
  const pending = client
    .fetchQuery({
      queryKey: ["profile"],
      queryFn: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    })
    .catch(() => undefined);
  clearPrivateAccountCache(client);
  assert.equal(client.getQueryData(["journey", "reports"]), undefined);
  client.setQueryData(["profile"], { owner: "B" });
  finish({ owner: "A" });
  await pending;
  await Promise.resolve();
  assert.deepEqual(client.getQueryData(["profile"]), { owner: "B" });
  client.clear();
});
test("report error renders an alert and a retry action instead of loading forever", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client
    .getQueryCache()
    .build(client, { queryKey: ["journey", "reports"] })
    .setState({
      status: "error",
      error: new Error("Synthetic API failure"),
      fetchStatus: "idle",
    });
  const html = render(client);
  assert.match(html, /role="alert"/);
  assert.match(html, /<button/);
  assert.match(html, /حاول تاني/);
  client.clear();
});

test("activity chart transforms fill real UTC bins and cumulative mode sums actual values only", () => {
  const period = buildAnalyticsChartRows(
    [
      { date: "2026-10-01", logged: 2, positiveEvents: 1 },
      { date: "2026-10-03", logged: 1, positiveEvents: 0 },
    ],
    [{ date: "2026-10-02", title: "CV v2" }],
    "period",
  );
  assert.equal(period.bucket, "day");
  assert.deepEqual(period.rows.map((row) => [row.date, row.applications, row.progressionEvents]), [
    ["2026-10-01", 2, 1],
    ["2026-10-02", 0, 0],
    ["2026-10-03", 1, 0],
  ]);
  assert.deepEqual(period.rows[1].markerTitles, ["CV v2"]);

  const cumulative = buildAnalyticsChartRows(
    [
      { date: "2026-10-01", logged: 2, positiveEvents: 1 },
      { date: "2026-10-03", logged: 1, positiveEvents: 2 },
    ],
    [],
    "cumulative",
  );
  assert.deepEqual(cumulative.rows.map((row) => [row.applications, row.progressionEvents]), [
    [2, 1],
    [2, 1],
    [3, 3],
  ]);
});

test("long activity histories use weekly or monthly bins without changing event totals", () => {
  const weekly = buildAnalyticsChartRows(
    [
      { date: "2026-01-01", logged: 2, positiveEvents: 1 },
      { date: "2026-05-01", logged: 3, positiveEvents: 2 },
    ],
    [],
    "period",
  );
  assert.equal(weekly.bucket, "week");
  assert.equal(weekly.rows.reduce((sum, row) => sum + row.applications, 0), 5);
  assert.equal(weekly.rows.reduce((sum, row) => sum + row.progressionEvents, 0), 3);
  const monthly = buildAnalyticsChartRows(
    [
      { date: "2023-01-01", logged: 2, positiveEvents: 0 },
      { date: "2026-01-01", logged: 3, positiveEvents: 1 },
    ],
    [],
    "period",
  );
  assert.equal(monthly.bucket, "month");
  assert.equal(monthly.rows.reduce((sum, row) => sum + row.applications, 0), 5);
});

test("one application uses a compact first-record presentation instead of a wide chart", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false } } });
  const oneApplication = {
    ...report,
    overall: { ...metrics, logged: 1, positiveRate: null },
    weeks: report.weeks.map((week) => ({ ...week, logged: week.week === 0 ? 1 : 0 })),
    daily: [{ date: "2026-10-03", logged: 1, positiveEvents: 0 }],
  };
  client.setQueryData(["journey", "reports"], oneApplication);
  const html = render(client);
  assert.match(html, /First application recorded|أول طلب اتسجل/);
  assert.doesNotMatch(html, /role="img"/);
  assert.doesNotMatch(html, /h-\[320px\]/);
  client.clear();
});
test("empty analytics show a compact real baseline without an empty chart or fabricated performance", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(["journey", "reports"], report);
  const html = render(client);
  assert.match(html, /Performance analytics|تحليلات الأداء/);
  assert.match(html, /Activity and recruitment response|النشاط واستجابة التوظيف/);
  assert.match(html, /Current recruitment pipeline|مسار الطلبات الحالي/);
  assert.match(
    html,
    /No saved change checkpoint|لسه مفيش نقطة تغيير محفوظة/,
  );
  assert.match(html, /No saved activity or change events|لسه مفيش أنشطة أو تغييرات محفوظة/);
  assert.doesNotMatch(
    html,
    /قرأت التقرير الكامل|I have read the complete report/,
  );
  assert.ok(!html.includes("IMPROVED"));
  client.clear();
});

test("early members get continuous analytics while weekly and final reports remain locked", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(["journey", "reports"], {
    ...report,
    currentWeek: 0,
    currentNodeCode: "TASK_0",
    completedNodeCodes: [],
    finalAvailable: false,
    completed: false,
    week1StartedAt: null,
  });

  const html = render(client);
  assert.match(html, /تحليلات مستمرة|Continuous analytics/);
  assert.equal((html.match(/مقفول/g) ?? []).length, 5);
  assert.doesNotMatch(html, /قرأت التقرير الكامل|I have read the complete report/);
  client.clear();
});

test("week and final report previews are distinct and the final preview stays read-only", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  function WeekReportPreview() {
    return React.createElement(
      ReportPreviewProvider,
      { value: { data: report, scope: 2, onScopeChange: () => {} } },
      React.createElement(ReportsPage),
    );
  }
  function FinalReportPreview() {
    return React.createElement(
      ReportPreviewProvider,
      {
        value: {
          data: report,
          scope: null,
          onScopeChange: () => {},
          forceFinalPreview: true,
        },
      },
      React.createElement(ReportsPage),
    );
  }
  const weekHtml = render(client, WeekReportPreview);
  assert.match(weekHtml, /Week 2 report|تقرير الأسبوع ٢|تقرير الأسبوع 2/);
  const finalHtml = render(client, FinalReportPreview);
  assert.match(finalHtml, /رحلتك من أول خطوة|Your journey, from the first step/);
  assert.match(finalHtml, /Admin preview is read-only|معاينة Admin للقراءة فقط/);
  assert.doesNotMatch(
    finalHtml,
    /I have read the complete report|قرأت التقرير الكامل/,
  );
  client.clear();
});

test("weekly report presents saved reflection and learning as a stage report, not the analytics dashboard", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false } } });
  const weekly = {
    ...report,
    weeklyStages: [{
      week: 2,
      available: true,
      focus: { titleAr: "الأسبوع الثاني — التخصيص", titleEn: "Week 2 — tailored practice", descriptionAr: "وصف المرحلة", descriptionEn: "Stage focus" },
      milestones: [{ titleAr: "مهمة مكتملة", titleEn: "Completed quest", completed: true, review: false }],
      complete: true,
      reflectionRecorded: true,
      observedFrom: "2026-10-06T00:00:00.000Z",
      observedThrough: "2026-10-12T00:00:00.000Z",
      nextStage: { titleAr: "المرحلة التالية", titleEn: "Next stage" },
    }],
    readGuidance: [{ titleAr: "دليل حقيقي مقروء", titleEn: "Persisted guidance read", weekNumber: 2 }],
    activities: [{ id: "week-2-reflection", week: 2, type: "WEEKLY_REVIEW", summary: "Reflected on targeting", postUrl: null, postTopic: null, contactName: null, companyName: null, createdAt: "2026-10-12T12:00:00.000Z", legacyChange: false }],
  };
  function WeekPreview() {
    return React.createElement(ReportPreviewProvider, { value: { data: weekly, scope: 2, onScopeChange: () => {} } }, React.createElement(ReportsPage));
  }
  const html = render(client, WeekPreview);
  assert.match(html, /Week 2 — tailored practice|الأسبوع الثاني — التخصيص/);
  assert.match(html, /Reflected on targeting/);
  assert.match(html, /Persisted guidance read|دليل حقيقي مقروء/);
  assert.match(html, /Compared with the previous week|مقارنة بالأسبوع السابق/);
  assert.match(html, /hidden=""/);
  client.clear();
});

test("populated analytics keep dates, actual checkpoints, stage distributions and evidence labels", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  const populatedMetrics = {
    ...metrics,
    logged: 2,
    tailored: 1,
    positive: 1,
    positiveRate: 50,
    interviews: 1,
    unknownInterviews: 0,
    stages: { APPLIED: 1, ASSIGNMENT: 0, INTERVIEW: 1, DECISION: 0, CLOSED: 0 },
    outcomes: {
      NONE: 2,
      ACCEPTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      NO_RESPONSE: 0,
    },
    milestones: { assignments: 0, interviews: 1, decisions: 0 },
  };
  client.setQueryData(["journey", "reports"], {
    ...report,
    overall: populatedMetrics,
    weeks: report.weeks.map((week) => ({ ...week, ...populatedMetrics })),
    daily: [
      { date: "2026-10-01", logged: 1, positiveEvents: 0 },
      { date: "2026-10-12", logged: 1, positiveEvents: 1 },
    ],
    cvs: [
      {
        id: "demo-cv",
        versionNumber: 2,
        originalName: "DEMO-cv-v2.pdf",
        uploadedAt: "2026-10-06T12:00:00.000Z",
      },
    ],
    periodComparisons: [
      {
        id: "checkpoint-1",
        kind: "CV",
        title: "CV v2",
        startAt: "2026-10-06T12:00:00.000Z",
        endAt: null,
        metrics: {
          ...populatedMetrics,
          posts: undefined,
          outreach: undefined,
          reviews: undefined,
        },
      },
    ],
  });

  const html = render(client);
  assert.match(html, /role="img"/);
  assert.match(html, /2026-10-12/);
  assert.match(html, /Current recruitment pipeline|مسار الطلبات الحالي/);
  assert.match(html, /Current outcomes|النتائج الحالية/);
  assert.match(html, /CV v2/);
  assert.match(html, /does not establish causation|لا تثبت إن التغيير سبب/);
  client.clear();
});

test("admin preview exposes DEMO and ACTUAL modes with all four weeks and final report choices", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(adminReportPreviewQueryKeys.demo("COMPLETED"), {
    mode: "DEMO",
    report,
  });
  const html = render(client, AdminReportPreviewPage);
  assert.match(html, /DEMO/);
  assert.match(html, /ACTUAL/);
  assert.match(html, /Week 1|الأسبوع الأول/);
  assert.match(html, /Week 2|الأسبوع الثاني/);
  assert.match(html, /Week 3|الأسبوع الثالث/);
  assert.match(html, /Week 4|الأسبوع الرابع/);
  assert.match(html, /Final report|التقرير النهائي/);
  assert.match(html, /Synthetic scenario|حالة البيانات التجريبية/);
  assert.match(html, /DEMO — completed Week 1|إكمال الأسبوع الأول/);
  assert.match(html, /DEMO — Weeks 1–3 completed|إكمال الأسابيع 1–3/);
  assert.match(html, /DEMO — 30 طلبًا/);
  assert.doesNotMatch(
    html,
    /قرأت التقرير الكامل|I have read the complete report/,
  );
  client.clear();
});

test("final Admin presentation is forced by selection and remains read-only", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  function FinalReportPreview() {
    return React.createElement(
      ReportPreviewProvider,
      {
        value: {
          data: report,
          scope: null,
          onScopeChange: () => {},
          forceFinalPreview: true,
        },
      },
      React.createElement(ReportsPage),
    );
  }
  const html = render(client, FinalReportPreview);
  assert.match(html, /التقرير النهائي|Final report/);
  assert.match(html, /معاينة Admin للقراءة فقط|Admin preview is read-only/);
  assert.doesNotMatch(
    html,
    /قرأت التقرير الكامل|I have read the complete report/,
  );
  client.clear();
});

test("registration preserves a pending account and its failed-delivery status for verification recovery", async () => {
  const { authApi } = await server.ssrLoadModule(
    "/src/app/features/auth/api/authApi.ts",
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: "synthetic",
        name: "Synthetic",
        email: "s@example.invalid",
        emailVerified: false,
        verificationDelivery: "FAILED",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  try {
    const user = await authApi.register({
      name: "Synthetic",
      email: "s@example.invalid",
      password: "SyntheticPass123!",
    });
    assert.equal(user.emailVerified, false);
    assert.equal(user.verificationDelivery, "FAILED");
  } finally {
    globalThis.fetch = original;
  }
});
