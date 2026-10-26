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

test("one application has a cumulative chart with a labelled origin and no invented activity day", () => {
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  client.setQueryData(["journey","reports"],{...report,overall:{...metrics,logged:1},daily:[{date:"2026-10-03",logged:1,positiveEvents:0}]});
  const html=render(client);
  assert.match(html,/role="img"/);
  assert.match(html,/2026-10-03|٣ أكتوبر/);
  assert.match(html,/Application progress over time|منحنى التقدم واستجابة الطلبات/);
  client.clear();
});
test("empty analytics show real emptiness and a next-change placeholder",()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(["journey","reports"],report);
  const html=render(client);assert.match(html,/No saved CV or change|لسه مفيش نسخة CV/);assert.doesNotMatch(html,/role="img"/);client.clear();
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
  assert.match(html, /Applications with positive progression|طلبات بتقدم إيجابي موثق/);
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

test("early analytics never spoil publishing or outreach, while current unlocked metrics appear later",()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  client.setQueryData(["journey","reports"],{...report,currentWeek:1,currentNodeCode:"W1_M1",completedNodeCodes:["TASK_0"],finalAvailable:false});
  const early=render(client);
  assert.doesNotMatch(early,/منشورات|تواصل مهني|المحتوى والحضور|العلاقات المهنية|Recorded posts|Recorded outreach/);
  assert.doesNotMatch(early,/إضافة تحديث|Add an update/);
  assert.match(early,/التعديل القادم عند محطة مراجعة الأسبوع/);
  client.setQueryData(["journey","reports"],{...report,currentWeek:3});const week3=render(client);
  assert.match(week3,/إضافة تحديث|Add an update/);assert.match(week3,/منشورات موثقة|Recorded posts/);assert.doesNotMatch(week3,/تواصل مهني موثق|Recorded outreach/);client.clear();
});
test("admin sees all metrics without update writes",()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 function Preview(){return React.createElement(ReportPreviewProvider,{value:{data:{...report,currentWeek:0},scope:null,onScopeChange:()=>{}}},React.createElement(ReportsPage));}
 const html=render(client,Preview);assert.match(html,/منشورات موثقة|Recorded posts/);assert.match(html,/تواصل مهني موثق|Recorded outreach/);assert.doesNotMatch(html,/إضافة تحديث|Add an update/);client.clear();
});
test("update button respects server cooldown and cohort link preserves precise period boundaries",async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(["journey","reports"],{...report,currentWeek:3,manualUpdate:{eligible:true,canSubmit:false,nextAvailableAt:"2026-10-29T00:00:00Z"}});
 const html=render(client);assert.match(html,/<button[^>]*disabled[^>]*>.*إضافة تحديث/s);client.clear();
 const {cohortApplicationsUrl}=await server.ssrLoadModule("/src/app/features/reports/pages/JourneyAnalytics.tsx");
 const url=new URL(cohortApplicationsUrl({startAt:"2026-10-01T12:34:56Z",endAt:"2026-10-04T15:00:00Z"},"CV v2"),"http://local");
 assert.equal(url.searchParams.get("createdFrom"),"2026-10-01T12:34:56Z");assert.equal(url.searchParams.get("createdBefore"),"2026-10-04T15:00:00Z");
});

test("tour cards fit the measured mobile and keyboard viewport and remain next to edge handles", async () => {
  const {placeTourCard}=await server.ssrLoadModule("/src/app/features/applications/components/tour-layout.ts");
  const viewport={width:390,height:650,left:0,top:0};
  const target={left:28,right:362,top:410,bottom:490,width:334,height:80};
  const card=placeTourCard(target,viewport,225);
  assert(card.top>=12&&card.top+225<=638);assert(card.top+225<=target.top);assert(card.left>=12&&card.left+card.width<=378);
  const edge=placeTourCard({left:0,right:40,top:300,bottom:344,width:40,height:44},{width:320,height:640,left:0,top:0},260,true);
  assert(edge.left>=40);assert(edge.left+edge.width<=308);assert.equal(edge.arrowDir,"left");
  const keyboard=placeTourCard({left:30,right:360,top:110,bottom:150,width:330,height:40},{width:390,height:330,left:0,top:0},125);
  assert(keyboard.top>=12&&keyboard.top+125<=318);assert(keyboard.top>=150);
});

test("onboarding uses one labelled specialization picker instead of a wall of cards", async () => {
  const {ProfileForm}=await server.ssrLoadModule("/src/app/features/profile/ProfileForm.tsx");
  const {ToastProvider}=await server.ssrLoadModule("/src/app/components/ui/ToastProvider.tsx");
  function Form(){return React.createElement(ToastProvider,null,React.createElement(ProfileForm,{initial:{id:"qa",name:"QA",portfolioUrl:"https://example.com",targetJobTitle:"Software QA Engineer",cv:null,hasCv:true,profileComplete:false},onSaved:()=>{},onboarding:true}));}
  const client=new QueryClient();const html=render(client,Form);
  assert.match(html,/id="profile-specialization"/);assert.equal((html.match(/<select/g)??[]).length,1);assert.match(html,/value="Software QA Engineer" selected=""/);
  assert.doesNotMatch(html,/grid-cols-1 sm:grid-cols-2/);client.clear();
});
