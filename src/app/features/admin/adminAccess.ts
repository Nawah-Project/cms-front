import type { User } from "../auth/types/user";

export const ADMIN_SECTIONS = [
  "OVERVIEW",
  "COMMUNITY",
  "MENTORING",
  "JOURNEY",
  "REPORTS",
  "UX_LAB",
  "MARKETING",
  "OPERATIONS",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type AdminAccessLevel = "READ" | "WRITE";
export type AdminPermissionMap = Partial<Record<AdminSection, AdminAccessLevel>>;

export function canAdminAccess(
  user: User | null | undefined,
  section: AdminSection,
  level: AdminAccessLevel = "READ",
) {
  if (user?.role !== "ADMIN") return false;
  if (user.adminAccess?.isRoot) return true;
  const granted = user.adminAccess?.permissions?.[section];
  return granted === "WRITE" || (level === "READ" && granted === "READ");
}

export function adminSectionForPath(pathname: string): AdminSection {
  if (pathname.startsWith("/admin/community")) return "COMMUNITY";
  if (pathname.startsWith("/admin/mentoring")) return "MENTORING";
  if (pathname.startsWith("/admin/report-preview")) return "REPORTS";
  if (pathname.startsWith("/admin/journey")) return "JOURNEY";
  if (pathname.startsWith("/admin/ux-lab")) return "UX_LAB";
  if (pathname.startsWith("/admin/marketing")) return "MARKETING";
  if (pathname.startsWith("/admin/operations")) return "OPERATIONS";
  return "OVERVIEW";
}

const SECTION_PATH: Record<AdminSection, string> = {
  OVERVIEW: "/admin",
  COMMUNITY: "/admin/community",
  MENTORING: "/admin/mentoring",
  JOURNEY: "/admin/journey",
  REPORTS: "/admin/report-preview",
  UX_LAB: "/admin/ux-lab",
  MARKETING: "/admin/marketing",
  OPERATIONS: "/admin/operations",
};

export function adminHomePath(user: User | null | undefined) {
  const section = ADMIN_SECTIONS.find((candidate) =>
    canAdminAccess(user, candidate, "READ"),
  );
  return section ? SECTION_PATH[section] : "/";
}
