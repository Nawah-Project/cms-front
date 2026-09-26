import { useCallback, useEffect, useState } from "react";
import { membersProgressApi } from "../api/membersProgressApi";
import type { MemberProgress } from "../types/membersProgress.types";

type ProgressError = "unassigned" | "general";

export function useMembersProgress() {
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProgressError | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await membersProgressApi.getMembersProgress();
      setMembers(data);
    } catch (caught) {
      const status = (caught as Error & { status?: number }).status;
      setError(status === 403 ? "unassigned" : "general");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return { members, loading, error, retry: loadMembers };
}
