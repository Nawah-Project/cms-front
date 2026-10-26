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
test("empty comprehensive analytics provide calm baselines without fabricated performance", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(["journey", "reports"], report);
  const html = render(client);
  assert.match(html, /Performance Analytics|تحليل الأداء/);
  assert.match(html, /Progress and Market Response|التقدم واستجابة سوق العمل/);
  assert.match(html, /Current stage distribution|توزيع المرحلة الحالية/);
  assert.match(
    html,
    /No persisted change checkpoints|لا توجد نقاط تغيير محفوظة/,
  );
  assert.match(html, /No timeline activity is recorded yet|مفيش CV أو تغييرات/);
  assert.doesNotMatch(
    html,
    /قرأت التقرير الكامل|I have read the complete report/,
  );
  assert.ok(!html.includes("IMPROVED"));
  client.clear();
});

test("early members keep comprehensive analytics while weekly and final reports remain locked", () => {
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
  assert.match(html, /التحليلات الشاملة|Overall journey/);
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
  assert.match(finalHtml, /Final report — whole journey|التقرير النهائي/);
  assert.match(finalHtml, /Admin read-only preview|معاينة إدارية للقراءة فقط/);
  assert.doesNotMatch(
    finalHtml,
    /I have read the complete report|قرأت التقرير الكامل/,
  );
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
  assert.match(html, /Current stage distribution|توزيع المرحلة الحالية/);
  assert.match(html, /Current final outcomes|النتائج النهائية الحالية/);
  assert.match(html, /CV v2/);
  assert.match(html, /do not prove|مش بيثبت/);
  client.clear();
});

test("admin preview exposes DEMO and ACTUAL modes with all four weeks and final report choices", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(adminReportPreviewQueryKeys.demo, {
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
  assert.match(html, /معاينة إدارية للقراءة فقط|Admin read-only preview/);
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
