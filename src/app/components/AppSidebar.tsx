import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  Eye,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../features/auth/store/authStore";
import { useLogout } from "../features/auth/hooks/useLogout";
import { useI18n } from "../i18n";
import { GlobeIcon } from "./Icons";
import { NotificationCenter } from "./NotificationCenter";
import { useJourneyState } from "../features/journey/api/journeyApi";
import {
  canAccessGroupSection,
  canAccessProfessionalDevelopment,
} from "../features/journey/lib/journey-policies";
import { ContextualLockBubble } from "./ui/ContextualLockBubble";
import { openJourneyTasksPanel } from "./journeyTasksPanelEvents";

type NavItem = {
  labelKey: string;
  to: string;
  icon:
    | "dashboard"
    | "applications"
    | "reports"
    | "development"
    | "members"
    | "profile"
    | "admin"
    | "admin-overview"
    | "admin-community"
    | "admin-mentoring"
    | "admin-journey"
    | "admin-ux-lab"
    | "admin-operations";
  end?: boolean;
  hasStatusDot?: boolean;
};

const USER_NAV_ITEMS: NavItem[] = [
  {
    labelKey: "common.navApplications",
    to: "/applications",
    icon: "applications",
  },
  {
    labelKey: "common.navProfessionalDevelopment",
    to: "/professional-development",
    icon: "development",
  },
  {
    labelKey: "common.navMembers",
    to: "/members-progress",
    icon: "members",
  },
  {
    labelKey: "common.navReports",
    to: "/reports",
    icon: "reports",
  },
  {
    labelKey: "common.navProfile",
    to: "/profile",
    icon: "profile",
  },
];

type AdminNavItem = {
  labelAr: string;
  labelEn: string;
  to: string;
  icon: NavItem["icon"];
  end?: boolean;
  hasStatusDot?: boolean;
};

const ADMIN_PRIMARY_ITEMS: AdminNavItem[] = [
  {
    labelAr: "نظرة عامة",
    labelEn: "Overview",
    to: "/admin",
    icon: "admin-overview",
    end: true,
  },
  {
    labelAr: "إدارة المنصة والأعضاء",
    labelEn: "Community & Members",
    to: "/admin/community",
    icon: "admin-community",
  },
  {
    labelAr: "التوجيه والإرشاد",
    labelEn: "Mentoring & Guidance",
    to: "/admin/mentoring",
    icon: "admin-mentoring",
  },
  {
    labelAr: "هندسة الرحلة والحبكة",
    labelEn: "Journey & Plot Engine",
    to: "/admin/journey",
    icon: "admin-journey",
  },
  {
    labelAr: "معاينة تقارير الرحلة",
    labelEn: "Journey Report Preview",
    to: "/admin/report-preview",
    icon: "reports",
  },
  {
    labelAr: "تحليلات التجربة والسلوك",
    labelEn: "UX & Behavior Lab",
    to: "/admin/ux-lab",
    icon: "admin-ux-lab",
  },
  {
    labelAr: "العمليات والموارد التشغيلية",
    labelEn: "Operations & Resources",
    to: "/admin/operations",
    icon: "admin-operations",
    hasStatusDot: true,
  },
];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = {
    className: "h-[18px] w-[18px] shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };
  if (name === "admin-overview" || name === "dashboard")
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  if (name === "admin-community")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
        />
      </svg>
    );
  if (name === "admin-mentoring")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-5.25 6.557c0 1.5.5 3 2.25 3.75"
        />
      </svg>
    );
  if (name === "admin-journey")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 0 1-1.006 0L9.503 3.31a1.125 1.125 0 0 0-1.006 0L3.623 5.748A1.125 1.125 0 0 0 3 6.755v12.427c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 0 1 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
        />
      </svg>
    );
  if (name === "admin-ux-lab")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5m14.25-11.396v5.714a2.25 2.25 0 0 0 .659 1.591L24 14.5M3 20.25h18A2.25 2.25 0 0 0 23.25 18l-3.32-8.3a2.25 2.25 0 0 0-2.09-1.45H6.16a2.25 2.25 0 0 0-2.09 1.45L.75 18A2.25 2.25 0 0 0 3 20.25Z"
        />
        <circle cx="12" cy="15" r="1.5" />
      </svg>
    );
  if (name === "admin-operations")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.75 5.1A3 3 0 0 1 8.25 3.75h7.5a3 3 0 0 1 2.5 1.35l2.1 3.45a4.5 4.5 0 0 1 .9 2.7M6.75 17.25h.008v.008H6.75v-.008Zm3.75 0h.008v.008H10.5v-.008Z"
        />
      </svg>
    );
  if (name === "applications")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 5.5h-2A2.5 2.5 0 0 0 3.5 8v10A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 18 5.5h-2M8 5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5m-8 0h8m-8 5h8m-8 4h5"
        />
      </svg>
    );
  if (name === "reports")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
    );
  if (name === "members")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 19.5v-1.2a3.3 3.3 0 0 0-3.3-3.3H7.3A3.3 3.3 0 0 0 4 18.3v1.2m15.5 0v-1.2a3.3 3.3 0 0 0-2.4-3.17M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm9.5-3.5a3.5 3.5 0 0 1-2.7 3.4"
        />
      </svg>
    );
  if (name === "development")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v14a.5.5 0 0 1-.78.42L12 15.25l-7.72 5.17A.5.5 0 0 1 3.5 20V6A1.5 1.5 0 0 1 5 4.5Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 8h8M8 11.5h5"
        />
      </svg>
    );
  if (name === "admin")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5 19 6v5.1c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4V6l7-2.5Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 20a7 7 0 0 1 14 0"
      />
    </svg>
  );
}

function isPathActive(pathname: string, to: string, end?: boolean) {
  if (end || to === "/admin") {
    return pathname === to;
  }
  if (to === "/applications") {
    return pathname === "/applications" || pathname.startsWith("/applications/");
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const logout = useLogout();
  const isReportPreviewRoute = location.pathname === "/admin/report-preview";
  const journeyQuery = useJourneyState({
    enabled: Boolean(user) && !isReportPreviewRoute,
  });
  const journeyData = isReportPreviewRoute ? undefined : journeyQuery.data;
  const journeyLoading = isReportPreviewRoute ? false : journeyQuery.isLoading;
  const isGroupUnlocked = canAccessGroupSection(journeyData, user);
  const isProfDevUnlocked = canAccessProfessionalDevelopment(journeyData, user);
  const [openLockedBubbleKey, setOpenLockedBubbleKey] = useState<string | null>(
    null,
  );

  const isAdmin = user?.role === "ADMIN";
  const isInsideAdmin = location.pathname.startsWith("/admin");
  const [userViewOpen, setUserViewOpen] = useState(!isInsideAdmin);

  // Auto-expand user preview if navigating to user section
  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) {
      setUserViewOpen(true);
    }
  }, [location.pathname]);

  const today = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(),
  );

  const localeToggle = (
    <button
      type="button"
      aria-label={t("common.changeLanguage")}
      title={t("common.changeLanguage")}
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-700 px-2.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-info-strong cursor-pointer"
    >
      <GlobeIcon className="h-4 w-4" />
      <span>{locale === "ar" ? "ع" : "EN"}</span>
    </button>
  );

  const renderAdminPrimaryNav = (mobile = false) => (
    <div className="space-y-1">
      <div className={`px-3 pb-1 pt-1 ${collapsed && !mobile ? "sr-only" : ""}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          {locale === "ar" ? "مركز قيادة المنصة" : "Admin Command Center"}
        </p>
      </div>
      {ADMIN_PRIMARY_ITEMS.map((item) => {
        const active = isPathActive(location.pathname, item.to, item.end);
        const className = `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs sm:text-sm transition duration-150 hover:scale-[1.01] ${
          mobile
            ? active
              ? "bg-neutral-900 font-bold text-white shadow-xs dark:bg-white dark:text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            : active
              ? "bg-neutral-800 text-white font-bold border border-neutral-700 shadow-xs"
              : "text-neutral-300 hover:bg-neutral-800/70 hover:text-white"
        } ${collapsed && !mobile ? "justify-center px-2" : ""}`;

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => mobile && setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            aria-label={locale === "ar" ? item.labelAr : item.labelEn}
            title={collapsed && !mobile ? (locale === "ar" ? item.labelAr : item.labelEn) : undefined}
            className={className}
          >
            <span className={`flex min-w-0 items-center gap-2.5 ${collapsed && !mobile ? "justify-center" : ""}`}>
              <NavIcon name={item.icon} />
              <span className={collapsed && !mobile ? "sr-only" : "truncate"}>
                {locale === "ar" ? item.labelAr : item.labelEn}
              </span>
            </span>
            {item.hasStatusDot && !(collapsed && !mobile) && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  const renderResearcherPreviewNav = (mobile = false) => (
    <div className="mt-4 border-t border-neutral-800/80 pt-3">
      <button
        type="button"
        onClick={() => setUserViewOpen((prev) => !prev)}
        aria-label={locale === "ar" ? "منظور الباحث (معاينة)" : "Researcher View (Preview)"}
        title={collapsed && !mobile ? (locale === "ar" ? "منظور الباحث (معاينة)" : "Researcher View (Preview)") : undefined}
        className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors rounded-lg hover:bg-neutral-800/50 cursor-pointer ${collapsed && !mobile ? "justify-center px-2" : ""}`}
        aria-expanded={userViewOpen}
      >
        <span className={`flex items-center gap-2 ${collapsed && !mobile ? "justify-center" : ""}`}>
          <Eye className="h-4 w-4 text-neutral-400" />
          <span className={collapsed && !mobile ? "sr-only" : ""}>
            {locale === "ar"
              ? "منظور الباحث (معاينة)"
              : "Researcher View (Preview)"}
          </span>
        </span>
        {!collapsed || mobile ? <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${
            userViewOpen ? "rotate-180" : ""
          }`}
        /> : null}
      </button>

      {userViewOpen && (
        <div className="mt-1 space-y-1 ps-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {USER_NAV_ITEMS.map((item) => {
            const active = isPathActive(location.pathname, item.to, item.end);
            const className = `flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs sm:text-[13px] transition duration-150 hover:scale-[1.01] ${
              mobile
                ? active
                  ? "bg-neutral-100 font-medium text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                : active
                  ? "bg-neutral-700/80 font-medium text-white shadow-xs"
                  : "text-neutral-400 hover:bg-neutral-800/70 hover:text-white"
            } ${collapsed && !mobile ? "justify-center px-2" : ""}`;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => mobile && setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                aria-label={t(item.labelKey)}
                title={collapsed && !mobile ? t(item.labelKey) : undefined}
                className={className}
              >
                <span className={`flex min-w-0 items-center gap-2.5 ${collapsed && !mobile ? "justify-center" : ""}`}>
                  <NavIcon name={item.icon} />
                  <span className={collapsed && !mobile ? "sr-only" : "truncate"}>{t(item.labelKey)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStandardUserNav = (mobile = false) => (
    <div className="space-y-1">
      {USER_NAV_ITEMS.map((item) => {
        const active = isPathActive(location.pathname, item.to, item.end);
        const isLocked =
          !journeyLoading &&
          ((item.to === "/reports" && !journeyData?.features.analytics) || (item.to === "/members-progress" && !isGroupUnlocked) ||
            (item.to === "/professional-development" && !isProfDevUnlocked));

        const className = `flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm transition duration-150 hover:scale-[1.01] ${
          mobile
            ? active && !isLocked
              ? "bg-neutral-100 font-medium text-neutral-950 shadow-xs"
              : isLocked
                ? "text-neutral-400 hover:bg-neutral-50/60 hover:text-neutral-500"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            : active && !isLocked
              ? "bg-neutral-700 font-medium text-white shadow-xs"
              : isLocked
                ? "text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-400"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
        } ${collapsed && !mobile ? "justify-center px-2" : ""}`;

        const content = (
          <>
            <span className={`flex min-w-0 items-center gap-3 ${collapsed && !mobile ? "justify-center" : ""}`}>
              <NavIcon name={item.icon} />
              <span className={collapsed && !mobile ? "sr-only" : "truncate"}>{t(item.labelKey)}</span>
            </span>
            {isLocked && !(collapsed && !mobile) && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                aria-label={t("journey.lockedBadge")}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
          </>
        );

        if (isLocked) {
          const bubbleKey = `${mobile ? "m" : "d"}-${item.to}`;
          const isBubbleOpen = openLockedBubbleKey === bubbleKey;
          const lockTitle =
            item.to === "/reports" ? t("common.navReports") : item.to === "/professional-development"
              ? t("common.navProfessionalDevelopment")
              : t("common.navMembersProgress");
          const lockRequirement =
            item.to === "/reports" ? (journeyData?.cvFoundation?.unlocked ? (locale === "ar" ? "أكمل إرشاد السيرة: ارفع النسخة المحدّثة من داخله وأكّد الإكمال لفتح التحليل." : "Upload your revised CV inside its guide and confirm completion to unlock analytics.") : (locale === "ar" ? "أكمل المهمة صفر أولًا. خطوتك الحالية موجودة في درج المهام." : "Complete Task 0 first. Your current step is in the tasks drawer.")) : item.to === "/professional-development"
              ? t("journey.profDevLockedTooltip")
              : t("journey.groupLockedTooltip");

          return (
            <div key={item.to} className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenLockedBubbleKey((prev) =>
                    prev === bubbleKey ? null : bubbleKey,
                  )
                }
                aria-expanded={isBubbleOpen}
                aria-label={`${lockTitle}: ${lockRequirement}`}
                title={collapsed && !mobile ? lockTitle : undefined}
                className={`${className} w-full text-start cursor-pointer`}
              >
                {content}
              </button>
              <ContextualLockBubble
                isOpen={isBubbleOpen}
                onClose={() => setOpenLockedBubbleKey(null)}
                title={lockTitle}
                requirement={lockRequirement}
                ctaLabel={item.to==="/reports" && journeyData?.cvFoundation?.unlocked ? (locale==="ar"?"افتح إرشاد السيرة":"Open CV guide") : t("journey.panelTitle")}
                onCtaClick={() => {
                  if (mobile) setMobileOpen(false);
                  setOpenLockedBubbleKey(null);
                  if(item.to==="/reports" && journeyData?.cvFoundation?.unlocked) navigate("/professional-development?guidance=INSIGHT_TASK_0_CV_BASE"); else openJourneyTasksPanel();
                }}
                placement={mobile ? "bottom" : "inline-end"}
              />
            </div>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => mobile && setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            aria-label={t(item.labelKey)}
            title={collapsed && !mobile ? t(item.labelKey) : undefined}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );

  const actions = (mobile = false) => (
    <button
      type="button"
      onClick={() => {
        setMobileOpen(false);
        void logout().catch(() => undefined);
      }}
      className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 hover:scale-[1.01] cursor-pointer ${
        mobile
          ? "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
      } ${collapsed && !mobile ? "justify-center px-2" : ""}`}
      aria-label={t("common.signOut")}
      title={collapsed && !mobile ? t("common.signOut") : undefined}
    >
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 17l5-5-5-5m5 5H3.5m8-8.5h5A3.5 3.5 0 0 1 20 7v10a3.5 3.5 0 0 1-3.5 3.5h-5"
        />
      </svg>
      <span className={collapsed && !mobile ? "sr-only" : ""}>{t("common.signOut")}</span>
    </button>
  );

  return (
    <>
      <aside className={`fixed inset-y-0 start-0 z-[65] hidden flex-col border-e border-neutral-800 bg-neutral-900 py-7 transition-[width,padding] duration-200 lg:flex overflow-y-auto ${collapsed ? "w-20 px-2.5" : "w-64 px-5"}`}>
        <div className={`mb-6 ${collapsed ? "" : "px-1"}`}>
          <div className={`flex ${collapsed ? "flex-col items-center gap-3" : "items-start justify-between gap-2"}`}>
          <Link
            to={isAdmin ? "/admin" : "/"}
            title={collapsed ? t("common.brand") : undefined}
            className={`flex min-w-0 items-start gap-3 text-sm font-semibold tracking-tight text-white ${collapsed ? "justify-center" : ""}`}
          >
            <img
              src="/nawah-logo.svg"
              alt=""
              className="h-9 w-9 shrink-0 rounded-md object-contain"
            />
            <span className={collapsed ? "sr-only" : "min-w-0 flex-1 pt-0.5"}>
              <span className="block whitespace-nowrap leading-tight">
                {t("common.brand")}
              </span>
              <time
                className="mt-1 block text-xs font-normal tracking-normal text-neutral-400"
                dateTime={new Date().toISOString()}
              >
                {today}
              </time>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? (locale === "ar" ? "توسيع القائمة الجانبية" : "Expand sidebar") : (locale === "ar" ? "تصغير القائمة الجانبية" : "Collapse sidebar")}
            title={collapsed ? (locale === "ar" ? "توسيع القائمة الجانبية" : "Expand sidebar") : (locale === "ar" ? "تصغير القائمة الجانبية" : "Collapse sidebar")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-info-strong"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 ${collapsed ? "flex-col" : "justify-end"}`}>
            {!isReportPreviewRoute && <NotificationCenter variant="dark" />}
            {localeToggle}
          </div>
        </div>

        <nav aria-label={t("common.primaryNavigation")} className="flex-1 space-y-1">
          {isAdmin ? (
            <>
              {renderAdminPrimaryNav(false)}
              {renderResearcherPreviewNav(false)}
            </>
          ) : (
            renderStandardUserNav(false)
          )}
        </nav>

        <div className="mt-auto border-t border-neutral-800 pt-4">
          {actions(false)}
        </div>
      </aside>

      <header className="sticky top-0 z-[65] border-b border-border bg-surface/95 px-5 py-3.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              to={isAdmin ? "/admin" : "/"}
              className="flex min-w-0 flex-1 items-start gap-2.5 text-sm font-semibold tracking-tight text-neutral-950 dark:text-white"
            >
              <img
                src="/nawah-logo.svg"
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-contain"
              />
              <span className="min-w-0 pt-0.5">
                <span className="block whitespace-normal break-words leading-tight">
                  {t("common.brand")}
                </span>
                <time
                  className="mt-0.5 block text-[11px] font-normal tracking-normal text-neutral-500"
                  dateTime={new Date().toISOString()}
                >
                  {today}
                </time>
              </span>
            </Link>
            {localeToggle}
          </div>
          <div className="flex items-center gap-2">
            {!isReportPreviewRoute && <NotificationCenter variant="light" />}
            <button
              type="button"
              aria-label={
                mobileOpen
                  ? t("common.closeMenu")
                  : t("common.openMenu")
              }
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-4 border-t border-border pt-4 dark:border-neutral-800 max-h-[calc(100vh-80px)] overflow-y-auto pb-6">
            <nav aria-label={t("common.mobileNavigation")} className="space-y-1">
              {isAdmin ? (
                <>
                  {renderAdminPrimaryNav(true)}
                  {renderResearcherPreviewNav(true)}
                </>
              ) : (
                renderStandardUserNav(true)
              )}
            </nav>
            <div className="mt-4 border-t border-border pt-3 dark:border-neutral-800">
              {actions(true)}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
