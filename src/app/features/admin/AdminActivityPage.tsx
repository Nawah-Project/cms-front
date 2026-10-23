import { useEffect, useState } from "react";
import { adminApi, type AdminActivity } from "./api/adminApi";
import { AdminActivityList } from "./components/AdminActivityList";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
} from "./components/AdminUI";
import { useI18n } from "../../i18n";

export default function AdminActivityPage() {
  const { t, tp, number } = useI18n();
  const [items, setItems] = useState<AdminActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    setError(false);
    void adminApi
      .activity({ page, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || res.items.length);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          eyebrow={t("admin.meaningfulChanges")}
          title={t("admin.activityTitle")}
          description={t("admin.activityDescription")}
        />
        <p className="text-xs text-neutral-500">
          {tp("common.memberCount", totalCount || items.length)}
        </p>
      </div>

      {loading ? (
        <LoadingState label={t("admin.loadingActivity")} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : !items.length ? (
        <EmptyState>{t("admin.noRecentActivity")}</EmptyState>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface px-4 py-2 sm:px-5">
            <AdminActivityList items={items} />
          </div>

          {totalPages > 1 && (
            <nav
              aria-label={t("admin.activityTitle")}
              className="flex items-center justify-between border-t border-border pt-4 text-sm"
            >
              <span className="text-neutral-500 text-xs">
                {t("admin.pageOf", {
                  page: number(page),
                  pages: number(totalPages),
                })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {t("admin.previous")}
                </button>
                <button
                  type="button"
                  className="button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("admin.next")}
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
