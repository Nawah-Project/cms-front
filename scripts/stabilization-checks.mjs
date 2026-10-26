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
const {
  default: AdminReportPreviewPage,
  adminReportPreviewQueryKeys,
} = await server.ssrLoadModule(
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
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(Page),
        ),
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
};
const report = {
  asOf: "2026-10-26T00:00:00Z",
  overall: metrics,
  weeks: [0, 1, 2, 3, 4].map((week) => ({ ...metrics, week })),
  daily: [],
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
test("empty whole-journey final report provides explicit acknowledgement without fabricated performance", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(["journey", "reports"], report);
  const html = render(client);
  assert.match(html, /قرأت التقرير الكامل/);
  assert.match(html, /مفيش نسخ|نسخ السيرة/);
  assert.match(html, /لسه مفيش بيانات/);
  assert.ok(!html.includes("IMPROVED"));
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
  assert.doesNotMatch(html, /قرأت التقرير الكامل|I have read the complete report/);
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
  assert.doesNotMatch(html, /قرأت التقرير الكامل|I have read the complete report/);
  client.clear();
});

test('registration preserves a pending account and its failed-delivery status for verification recovery',async()=>{
 const {authApi}=await server.ssrLoadModule('/src/app/features/auth/api/authApi.ts');
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({id:'synthetic',name:'Synthetic',email:'s@example.invalid',emailVerified:false,verificationDelivery:'FAILED'}),{status:201,headers:{'Content-Type':'application/json'}});
 try { const user=await authApi.register({name:'Synthetic',email:'s@example.invalid',password:'SyntheticPass123!'});assert.equal(user.emailVerified,false);assert.equal(user.verificationDelivery,'FAILED'); }
 finally {globalThis.fetch=original;}
});
