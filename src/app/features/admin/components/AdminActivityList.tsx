import type { AdminActivity } from "../api/adminApi";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState, Initials, relativeTime, timeTitle } from "./AdminUI";
import { useI18n } from "../../../i18n";

export function AdminActivityList({ items }: { items: AdminActivity[] }) {
  const { t, locale } = useI18n();
  if (!items.length) return <EmptyState>{t("admin.noRecentActivity")}</EmptyState>;
  return (
    <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-4 first:pt-1 last:pb-1">
          <Initials name={item.user.name} avatar={item.user.avatar} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {item.user.name}
              </span>
              <span className="text-xs text-neutral-500">
                {item.group?.name ?? t("common.unassigned")}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
              {item.type === "APPLICATION_STAGE_CHANGED" && item.fromStage ? (
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <StatusBadge kind="stage" value={item.fromStage} />
                  <span aria-hidden="true" className="text-neutral-400">
                    →
                  </span>
                  <StatusBadge kind="stage" value={item.toStage} />
                </span>
              ) : item.type === "APPLICATION_CREATED" ? (
                t("admin.appliedTo")
              ) : (
                t("admin.updated")
              )}{" "}
              <span className="font-medium">
                {item.application.companyName}
              </span>
              <span className="text-neutral-500">
                {" "}
                · {item.application.jobTitle}
              </span>
            </p>
          </div>
          <time
            className="shrink-0 pt-0.5 text-xs text-neutral-500"
            dateTime={item.createdAt}
            title={timeTitle(item.createdAt, locale)}
          >
            {relativeTime(item.createdAt, locale)}
          </time>
        </li>
      ))}
    </ol>
  );
}
