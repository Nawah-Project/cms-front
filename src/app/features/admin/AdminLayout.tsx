import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/store/authStore";
import { useI18n } from "../../i18n";

const tabs = [
  ["overview", "/admin"],
  ["members", "/admin/members"],
  ["professionalDevelopment", "/admin/professional-development"],
  ["groups", "/admin/groups"],
  ["activity", "/admin/activity"],
] as const;

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") navigate("/", { replace: true });
  }, [loading, user, navigate]);
  if (loading || user?.role !== "ADMIN")
    return (
      <div className="py-20 text-center text-sm text-neutral-500" role="status">
        {t("admin.checkingAccess")}
      </div>
    );
  return (
    <section className="space-y-6">
      <header className="border-b border-stone-300/80 pb-3 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              {t("admin.eyebrow")}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              {t("admin.title")}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("admin.description")}
          </p>
        </div>
        <nav
          aria-label={t("admin.sections")}
          className="mt-3 flex gap-1 overflow-x-auto"
        >
          {tabs.map(([label, to]) => {
            const active =
              to === "/admin"
                ? location.pathname === to
                : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${active ? "border-neutral-900 font-medium text-neutral-950 dark:border-white dark:text-white" : "border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"}`}
              >
                {t(`admin.${label}`)}
              </Link>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </section>
  );
}
