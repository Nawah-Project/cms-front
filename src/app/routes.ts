import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("__design-system", "design-system/workshop/DesignSystemPage.tsx"),
  route("auth/login", "features/auth/pages/LoginPage.tsx"),
  route("auth/register", "features/auth/pages/RegisterPage.tsx"),
  // UI layout and pages
  layout("routes/layout.tsx", [
    index("routes/IndexRedirect.tsx"),
    route("applications", "routes/applications.tsx"),
    route("reports", "features/reports/pages/ReportsPage.tsx"),
    route(
      "professional-development",
      "features/professional-development/pages/GuidancePage.tsx",
    ),
    route(
      "professional-development/tasks",
      "features/professional-development/pages/TasksPage.tsx",
    ),
    route(
      "professional-development/feedback",
      "features/professional-development/pages/FeedbackInsightsPage.tsx",
    ),
    route(
      "members-progress",
      "features/members-progress/pages/MembersProgressPage.tsx",
    ),
    route("profile", "features/auth/pages/ProfilePage.tsx"),
    route("applications/:id", "routes/application-details.tsx"),
    route("admin", "features/admin/AdminLayout.tsx", [
      index("features/admin/AdminOverviewPage.tsx"),
      route("community", "features/admin/AdminCommunityPage.tsx"),
      route("mentoring", "features/admin/AdminMentoringPage.tsx"),
      route("journey", "features/admin/AdminJourneyEnginePage.tsx"),
      route("report-preview", "features/admin/AdminReportPreviewPage.tsx"),
      route("ux-lab", "features/admin/AdminUxLabPage.tsx"),
      route("marketing", "features/admin/AdminMarketingPage.tsx"),
      route("operations", "features/admin/AdminOperationsPage.tsx"),
      // Backwards-compatibility redirects:
      route("members", "features/admin/redirects/AdminMembersRedirect.tsx"),
      route("groups", "features/admin/redirects/AdminGroupsRedirect.tsx"),
      route("activity", "features/admin/redirects/AdminActivityRedirect.tsx"),
      route(
        "professional-development",
        "features/admin/redirects/AdminProfDevRedirect.tsx",
      ),
      route(
        "notifications",
        "features/admin/redirects/AdminNotificationsRedirect.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig;
