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
      "members-progress",
      "features/members-progress/pages/MembersProgressPage.tsx",
    ),
    route("profile", "features/auth/pages/ProfilePage.tsx"),
    route("applications/:id", "routes/application-details.tsx"),
  ]),
] satisfies RouteConfig;
