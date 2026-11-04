import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

// Combined mode is for development/type generation; production images are separate.
const target = process.env.NAWAH_FRONTEND_APP || "combined";
const memberRoutes: RouteConfig = [
  route("__design-system", "design-system/workshop/DesignSystemPage.tsx"),
  route("auth/login", "features/auth/pages/LoginPage.tsx"),
  route("auth/register", "features/auth/pages/RegisterPage.tsx"),
  route("career-consulting", "features/career-consulting/MemberConsultingPage.tsx"),
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

  ]),
];
const adminRoutes: RouteConfig = [
  layout("routes/admin-shell.tsx", [
    route("admin", "features/admin/AdminLayout.tsx", [
      index("features/admin/AdminOverviewPage.tsx"),
      ...(process.env.NODE_ENV !== "production" && process.env.NAWAH_LEARNING_PREVIEW === "true" && target !== "member" ? [route("learning/*", "features/learning-library/LearningLibraryPage.tsx")] : []),
      route("strategic-relationships/:view?", "features/strategic-relationships/StrategicRelationshipsPage.tsx"),
      route("founder-workspace/:view?", "features/founder-workspace/FounderWorkspacePage.tsx"),
      route("feedback", "features/admin/feedback/AdminFeedbackPage.tsx"),
      route("community", "features/admin/AdminCommunityPage.tsx"),
      route("mentoring", "features/admin/AdminMentoringPage.tsx"),
      route("journey", "features/admin/AdminJourneyEnginePage.tsx"),
      route("report-preview", "features/admin/AdminReportPreviewPage.tsx"),
      route("ux-lab", "features/admin/AdminUxLabPage.tsx"),
      route("career-consulting", "features/career-consulting/AdminConsultingPage.tsx"),
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
];
export default [...(target !== "admin" ? memberRoutes : []), ...(target !== "member" ? adminRoutes : [])] satisfies RouteConfig;
