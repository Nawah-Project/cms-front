import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("auth/login", "features/auth/pages/LoginPage.tsx"),
  route("auth/register", "features/auth/pages/RegisterPage.tsx"),
  // UI layout and pages
  layout("routes/layout.tsx", [
    index("routes/dashboard.tsx"),
    route("applications", "routes/applications.tsx"),
    route(
      "professional-development",
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
      route("members", "features/admin/AdminMembersPage.tsx"),
      route("groups", "features/admin/AdminGroupsPage.tsx"),
      route("activity", "features/admin/AdminActivityPage.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
