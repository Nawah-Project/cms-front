import { useCallback, useEffect, useRef, useState } from "react";
import { membersProgressApi } from "../api/membersProgressApi";
import type { RecentMemberProgress } from "../types/membersProgress.types";

type RecentProgressError = "unassigned" | "general";

export function useRecentMemberProgress(limit = 10) {
  const [events, setEvents] = useState<RecentMemberProgress[]>([]);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RecentProgressError | null>(null);
  const previousEventIds = useRef<Set<string> | null>(null);

  const loadEvents = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      if (!quiet) setError(null);
      try {
        const nextEvents = await membersProgressApi.getActivity(limit);
        const nextIds = new Set(nextEvents.map((event) => event.id));
        if (previousEventIds.current) {
          const added = [...nextIds].filter(
            (id) => !previousEventIds.current?.has(id),
          );
          if (added.length) {
            setNewEventIds((current) => new Set([...current, ...added]));
          }
        }
        previousEventIds.current = nextIds;
        setEvents(nextEvents);
        setError(null);
      } catch (caught) {
        const status = (caught as Error & { status?: number }).status;
        if (!quiet || previousEventIds.current === null) {
          setError(status === 403 ? "unassigned" : "general");
        }
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (
        document.visibilityState === "visible" &&
        previousEventIds.current !== null
      ) {
        void loadEvents(true);
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () =>
      document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [loadEvents]);

  return { events, newEventIds, loading, error, retry: () => loadEvents() };
}
