import { useEffect, useState } from "react";
import { adminApi, type AdminActivity } from "./api/adminApi";
import { AdminActivityList } from "./components/AdminActivityList";
import { ErrorState, LoadingState, PageHeading } from "./components/AdminUI";
import { useI18n } from "../../i18n";

export default function AdminActivityPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = () => {
    setLoading(true);
    setError(false);
    void adminApi
      .activity(20)
      .then(({ items }) => setItems(items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={t("admin.meaningfulChanges")}
        title={t("admin.activityTitle")}
        description={t("admin.activityDescription")}
      />
      {loading ? (
        <LoadingState label={t("admin.loadingActivity")} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className="rounded-lg border border-border bg-surface px-4 py-2 sm:px-5">
          <AdminActivityList items={items} />
        </div>
      )}
    </div>
  );
}
