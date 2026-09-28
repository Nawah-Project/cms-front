import { Link, useLocation } from "react-router";
import { useI18n } from "../../../i18n";

export function ProfessionalDevelopmentNav({
  unreadCount = 0,
}: {
  unreadCount?: number;
}) {
  const { t, number } = useI18n();
  const { pathname } = useLocation();
  const active = pathname.endsWith("/feedback") ? "feedback" : "tasks";

  return (
    <nav
      aria-label={t("professionalDevelopment.sectionNavigation")}
      className="flex w-fit max-w-full gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {(["tasks", "feedback"] as const).map((item) => {
        const selected = active === item;
        return (
          <Link
            key={item}
            to={
              item === "tasks"
                ? "/professional-development"
                : "/professional-development/feedback"
            }
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-info-strong sm:px-4 ${selected ? "border border-neutral-950 bg-neutral-950 font-semibold text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-950" : "font-medium text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"}`}
          >
            {t(
              `professionalDevelopment.${item === "tasks" ? "tasks" : "feedbackInsights"}`,
            )}
            {item === "feedback" && unreadCount > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger-strong">
                {number(unreadCount)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
