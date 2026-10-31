import { Link, useLocation } from "react-router";
import { useI18n } from "../../../i18n";
import { useAuth } from "../../auth/store/authStore";
import { useJourneyState } from "../../journey/api/journeyApi";
import { canUseProfessionalTasks } from "../../journey/lib/journey-policies";

export function ProfessionalDevelopmentNav({
  unreadCount = 0,
}: {
  unreadCount?: number;
}) {
  const { t, number } = useI18n();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });

  const currentWeek = journeyData?.state.currentWeek ?? 0;
  const isAdmin = user?.role === "ADMIN";

  const canShowTasks = canUseProfessionalTasks(journeyData, user);

  const canShowFeedback = isAdmin || currentWeek >= 3;

  const active = pathname.endsWith("/tasks")
    ? "tasks"
    : pathname.endsWith("/feedback")
      ? "feedback"
      : "guidance";

  const navItems = [
    {
      id: "guidance" as const,
      to: "/professional-development",
      label: "الإرشادات",
      visible: true,
    },
    {
      id: "tasks" as const,
      to: "/professional-development/tasks",
      label: "المهام",
      visible: canShowTasks,
    },
    {
      id: "feedback" as const,
      to: "/professional-development/feedback",
      label: "الملاحظات",
      visible: canShowFeedback,
    },
  ].filter((item) => item.visible);

  return (
    <nav
      aria-label={t("professionalDevelopment.sectionNavigation")}
      className="development-navigation n-segmented flex w-fit max-w-full gap-1 rounded-xl border border-border bg-surface p-1 shadow-2xs"
    >
      {navItems.map((item) => {
        const selected = active === item.id;
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-info-strong sm:px-4 ${
              selected
                ? "border border-neutral-950 bg-neutral-950 font-semibold text-white shadow-xs dark:border-white dark:bg-white dark:text-neutral-950"
                : "font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            <span>{item.label}</span>
            {item.id === "feedback" && unreadCount > 0 && (
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
