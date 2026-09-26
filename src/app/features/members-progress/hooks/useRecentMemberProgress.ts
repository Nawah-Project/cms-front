import { useCallback, useEffect, useState } from "react";
import { membersProgressApi } from "../api/membersProgressApi";
import type { RecentMemberProgress } from "../types/membersProgress.types";

type RecentProgressError = "unassigned" | "general";

export function useRecentMemberProgress(limit = 10) {
  const [events, setEvents] = useState<RecentMemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RecentProgressError | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await membersProgressApi.getRecentProgress(limit));
    } catch (caught) {
      const status = (caught as Error & { status?: number }).status;
      setError(status === 403 ? "unassigned" : "general");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return { events, loading, error, retry: loadEvents };
}
