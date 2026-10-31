import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/store/authStore";
import { apiClient } from "../../lib/api-client";

export const FIRST_APPLICATION_FLOW = "first-application-v1";
export type GuideStatus = "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type GuideProgress = { flowKey: string; status: GuideStatus; currentStep: number };
type ProgressMap = Record<string, GuideProgress>;
const RECORD_EVENT = "nawah:experience-record";
const CACHE_PREFIX = "nawah_account_guides_";
export const isGuideFinished = (row?: GuideProgress) => row?.status === "COMPLETED" || row?.status === "SKIPPED";

function mergeProgress(current: ProgressMap, incoming: ProgressMap): ProgressMap {
  const result = { ...current };
  for (const [key, row] of Object.entries(incoming)) {
    const old = result[key];
    result[key] = isGuideFinished(old) ? old : { ...row, currentStep: Math.max(old?.currentStep ?? 0, row.currentStep) };
  }
  return result;
}
function readLocal(userId: string): ProgressMap {
  const result: ProgressMap = {};
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + userId) || "{}");
    for (const [key, value] of Object.entries(cached)) {
      const row = value as GuideProgress;
      if (row && ["IN_PROGRESS", "COMPLETED", "SKIPPED"].includes(row.status) && Number.isInteger(row.currentStep)) result[key] = row;
    }
    if (localStorage.getItem(`nawah_v2_guided_tour_done_${userId}`) === "true") result[FIRST_APPLICATION_FLOW] = result[FIRST_APPLICATION_FLOW] ?? { flowKey: FIRST_APPLICATION_FLOW, status: "COMPLETED", currentStep: 7 };
    const prefix = `nawah_feature_tour_${userId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && localStorage.getItem(key) === "true") {
        const flowKey = key.slice(prefix.length);
        result[flowKey] ??= { flowKey, status: "COMPLETED", currentStep: 0 };
      }
    }
  } catch { /* The account API also works when browser storage is unavailable. */ }
  return result;
}
function saveLocal(userId: string, data: ProgressMap) {
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(data));
    for (const row of Object.values(data)) {
      if (!isGuideFinished(row)) continue;
      localStorage.setItem(row.flowKey === FIRST_APPLICATION_FLOW ? `nawah_v2_guided_tour_done_${userId}` : `nawah_feature_tour_${userId}_${row.flowKey}`, "true");
    }
  } catch { /* The server remains authoritative without local storage. */ }
}
export function requestGuideProgress(userId: string | undefined, flowKey: string, status: GuideStatus, currentStep = 0) {
  if (!userId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECORD_EVENT, { detail: { userId, flowKey, status, currentStep } }));
}

type Lease = { id: string; feature: string; priority: number };
interface ProgressContext {
  ready: boolean; error: boolean; progress: ProgressMap;
  record: (flowKey: string, status: GuideStatus, currentStep?: number) => void;
  refresh: () => void;
  leaseOwner: string | null;
  registerLease: (lease: Lease) => () => void;
}
const Context = createContext<ProgressContext>({ ready: false, error: false, progress: {}, record: () => {}, refresh: () => {}, leaseOwner: null, registerLease: () => () => {} });
export const useExperienceProgress = () => useContext(Context);

export function ExperienceProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const key = useMemo(() => ["experience-progress", userId] as const, [userId]);
  const cached = useMemo(() => userId ? readLocal(userId) : {}, [userId]);
  const query = useQuery({ queryKey: key, enabled: Boolean(userId && user?.role !== "ADMIN"), staleTime: 30_000, refetchOnWindowFocus: "always", retry: 1,
    queryFn: async () => {
      const response = await apiClient.get<{ items: GuideProgress[] }>("/experience/progress");
      return mergeProgress(Object.fromEntries(response.items.map(row => [row.flowKey, row])), userId ? readLocal(userId) : {});
    },
  });
  const progress = useMemo(() => mergeProgress(query.data ?? {}, cached), [cached, query.data]);
  const chains = useRef(new Map<string, Promise<void>>());
  const record = useCallback((flowKey: string, status: GuideStatus, currentStep = 0) => {
    if (!userId || user?.role === "ADMIN") return;
    const row = { flowKey, status, currentStep };
    queryClient.setQueryData<ProgressMap>(key, old => {
      const next = mergeProgress(mergeProgress(old ?? {}, cached), { [flowKey]: row });
      saveLocal(userId, next);
      return next;
    });
    const chainKey = `${userId}:${flowKey}`;
    const next = (chains.current.get(chainKey) ?? Promise.resolve()).then(async () => {
      const saved = await apiClient.put<GuideProgress>(`/experience/progress/${encodeURIComponent(flowKey)}`, { status, currentStep });
      if (flowKey === FIRST_APPLICATION_FLOW && (status === "COMPLETED" || (status === "IN_PROGRESS" && currentStep === 1))) {
        void queryClient.invalidateQueries({ queryKey: ["journey", "state"] });
      }
      queryClient.setQueryData<ProgressMap>(key, old => {
        const next = isGuideFinished(saved) ? { ...old, [flowKey]: saved } : mergeProgress(old ?? {}, { [flowKey]: saved });
        saveLocal(userId, next);
        return next;
      });
    }).catch(() => { /* The account-scoped local queue is retried on reconnect or next login. */ });
    chains.current.set(chainKey, next);
  }, [userId, user?.role, queryClient, key, cached]);
  const imported = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !query.isSuccess || imported.current === userId) return;
    imported.current = userId;
    for (const row of Object.values(cached)) record(row.flowKey, row.status, row.currentStep);
    saveLocal(userId, progress);
    void queryClient.invalidateQueries({ queryKey: ["journey", "state"] });
  }, [userId, query.isSuccess, cached, progress, record, queryClient]);
  useEffect(() => {
    const onRecord = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.userId === userId) record(detail.flowKey, detail.status, detail.currentStep);
    };
    const retry = () => {
      if (userId) for (const row of Object.values(readLocal(userId))) record(row.flowKey, row.status, row.currentStep);
    };
    const onStorage = (event: StorageEvent) => {
      if (userId && event.key === CACHE_PREFIX + userId) {
        queryClient.setQueryData<ProgressMap>(key, old => mergeProgress(old ?? {}, readLocal(userId)));
      }
    };
    window.addEventListener(RECORD_EVENT, onRecord);
    window.addEventListener("online", retry);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(RECORD_EVENT, onRecord); window.removeEventListener("online", retry); window.removeEventListener("storage", onStorage); };
  }, [userId, record, queryClient, key]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const registerLease = useCallback((lease: Lease) => {
    setLeases(old => [...old.filter(item => item.id !== lease.id), lease]);
    return () => setLeases(old => old.filter(item => item.id !== lease.id));
  }, []);
  const leaseOwner = [...leases].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0]?.id ?? null;
  return <Context.Provider value={{ ready: user?.role === "ADMIN" || query.isSuccess || (query.isError && isGuideFinished(cached[FIRST_APPLICATION_FLOW])), error: query.isError, progress, record, refresh: () => { void query.refetch(); }, leaseOwner, registerLease }}>{children}</Context.Provider>;
}

export function useGuideLease(feature: string, enabled: boolean) {
  const { leaseOwner, registerLease } = useExperienceProgress();
  const id = useId();
  const priority = feature.includes("explorer") ? 10 : feature.includes("unlocked") ? 20 : feature.includes("cv-filter") ? 50 : 30;
  useLayoutEffect(() => enabled ? registerLease({ id, feature, priority }) : undefined, [enabled, registerLease, id, feature, priority]);
  return enabled && leaseOwner === id;
}
