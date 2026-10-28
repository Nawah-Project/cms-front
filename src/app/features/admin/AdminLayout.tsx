import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/store/authStore";
import { useI18n } from "../../i18n";
import {
  adminHomePath,
  adminSectionForPath,
  canAdminAccess,
} from "./adminAccess";

function getSectionMeta(pathname: string, locale: string) {
  const isAr = locale === "ar";
  if (pathname === "/admin") {
    return {
      title: isAr ? "نظرة عامة تنفيذية" : "Executive Overview",
      description: isAr
        ? "لوحة القيادة المركزية: المؤشرات الحيوية، شريط نبض الأقسام، وأعضاء يحتاجون تدخلك"
        : "Central dashboard: vital metrics, pulse strips, and priority member interventions",
    };
  }
  if (pathname.startsWith("/admin/community")) {
    return {
      title: isAr ? "إدارة المنصة والأعضاء" : "Community & Members",
      description: isAr
        ? "إدارة وتوزيع المجموعات، متابعة الأعضاء حسب مراحل الرحلة، وسجل نشاط المنصة المباشر"
        : "Manage cohorts, track member progress across journey weeks, and inspect real-time platform activity",
    };
  }
  if (pathname.startsWith("/admin/mentoring")) {
    return {
      title: isAr ? "التوجيه والإرشاد" : "Mentoring & Guidance",
      description: isAr
        ? "إسناد ومتابعة المهام التخصصية والملاحظات التوجيهية المباشرة للأعضاء والمجموعات"
        : "Assign & review tasks, provide direct member feedback, and manage checklists",
    };
  }
  if (pathname.startsWith("/admin/report-preview")) {
    return {
      title: isAr ? "معاينة تقارير الرحلة" : "Journey Report Preview",
      description: isAr
        ? "افحص تقارير الأسابيع والتقرير النهائي ببيانات تجريبية أو تقارير أعضاء للقراءة فقط"
        : "Inspect weekly and final reports with synthetic data or read-only member reports",
    };
  }
  if (pathname.startsWith("/admin/journey")) {
    return {
      title: isAr ? "هندسة الرحلة والحبكة" : "Journey & Plot Engine",
      description: isAr
        ? "غرفة التحكم في محطات مسار الـ 30 يوماً، مواعيدها، شروط الإنجاز، وإرشادات الحبكة والبرومبتات الذكية"
        : "Control room for the 30-day journey nodes, milestone requirements, plot insights, and smart prompts",
    };
  }
  if (pathname.startsWith("/admin/ux-lab")) {
    return {
      title: isAr ? "تحليلات التجربة والسلوك" : "UX & Behavior Lab",
      description: isAr
        ? "خريطة قمع العبور ونقاط التوقف الدقيقة، تجارب A/B/C، ومؤشرات تبني أدوات الإصدار الثاني"
        : "Granular funnel analysis, top drop-off bottlenecks, A/B/C experimentation, and V2 feature adoption",
    };
  }
  if (pathname.startsWith("/admin/operations")) {
    return {
      title: isAr ? "العمليات والموارد التشغيلية" : "Operations & Resources",
      description: isAr
        ? "مراقبة استهلاك البريد اليومي/الشهري، المعالجات الخلفية التلقائية، سعة التخزين، وصحة النظام"
        : "Email quotas, background processors, CV storage monitoring, and database health",
    };
  }
  return {
    title: isAr ? "مركز قيادة المنصة" : "Admin Command Center",
    description: isAr
      ? "إدارة مساحة العمل والمنصة"
      : "Platform workspace management",
  };
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  useEffect(() => {
    if (loading) return;
    if (user?.role !== "ADMIN") {
      navigate("/", { replace: true });
      return;
    }
    if (!canAdminAccess(user, adminSectionForPath(location.pathname))) {
      navigate(adminHomePath(user), { replace: true });
    }
  }, [loading, user, navigate, location.pathname]);

  if (
    loading ||
    user?.role !== "ADMIN" ||
    !canAdminAccess(user, adminSectionForPath(location.pathname))
  )
    return (
      <div className="py-20 text-center text-sm text-neutral-500" role="status">
        {t("admin.checkingAccess")}
      </div>
    );

  const section = getSectionMeta(location.pathname, locale);

  return (
    <section className="space-y-6">
      {!location.pathname.startsWith("/admin/ux-lab") && (
        <header className="border-b border-border/80 pb-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-neutral-500"
              >
                <Link
                  to="/admin"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {locale === "ar"
                    ? "مركز قيادة المنصة"
                    : "Admin Command Center"}
                </Link>
                <span>/</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  {section.title}
                </span>
              </nav>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                {section.title}
              </h1>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                {section.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {locale === "ar" ? "لوحة الإدارة نشطة" : "Admin Center Active"}
              </span>
            </div>
          </div>
        </header>
      )}
      <Outlet />
    </section>
  );
}
