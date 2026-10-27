import { setSectionEmitter, SECTION_ACTIONS } from "./lab-events";
export { trackSectionAction } from "./lab-events";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "react-router";
import { useAuth } from "../auth/store/authStore";
import { API_BASE_URL, fetchApi } from "../../lib/api-client";
import { useI18n } from "../../i18n";
export type SectionId =
  | "home"
  | "applications"
  | "development"
  | "members-progress"
  | "analytics"
  | "profile"
  | "onboarding";
export type DesignVersion = "A" | "B";
export type SectionAssignment = {
  version: DesignVersion;
  context: string;
  updatedAt: string | null;
};
type Assignment = {
  sections: Record<SectionId, SectionAssignment>;
  excluded: boolean;
};
const Context = createContext<{
  assignment: Assignment | null;
  loading: boolean;
  failed: boolean;
}>({ assignment: null, loading: false, failed: false });
type LabEvent = {
  id: string;
  sessionId: string;
  section: SectionId;
  version: DesignVersion;
  context: string;
  name: string;
  duration?: number;
};
const routeSection = (path: string): SectionId | null =>
  path.startsWith("/applications")
    ? "applications"
    : path.startsWith("/professional-development")
      ? "development"
      : path.startsWith("/members-progress")
        ? null
        : path.startsWith("/reports") || path.startsWith("/analytics")
          ? "analytics"
          : path === "/profile"
            ? "profile"
            : null;
export function SectionExperienceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { search } = useLocation();
  const q = useQuery({
    queryKey: ["section-design", user?.id],
    queryFn: () => fetchApi<Assignment>("/ux-lab/assignment"),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const assignment = useMemo(() => {
    if (!q.data) return null;
    // URL preview is deliberately limited to administrators and this tab. It can
    // never leak into another account through localStorage or produce research data.
    const preview = new URLSearchParams(search).get("labPreview");
    if (user?.role === "ADMIN" && preview === "home:B")
      return { ...q.data, excluded: true, sections: { ...q.data.sections, home: { version: "B" as const, context: "preview", updatedAt: null } } };
    if (user?.role === "ADMIN" && preview === "members-progress:B")
      return {
        ...q.data,
        excluded: true,
        sections: {
          ...q.data.sections,
          "members-progress": {
            version: "B" as const,
            context: "preview",
            updatedAt: null,
          },
        },
      };
    return q.data;
  }, [q.data, search, user?.role]);
  return (
    <Context.Provider
      value={{ assignment, loading: q.isPending, failed: q.isError }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSectionDesign(section: SectionId) {
  const c = useContext(Context);
  return {
    version: c.assignment?.sections[section]?.version ?? "A",
    loading: c.loading,
    failed: c.failed,
  };
}
export function SectionExposure({
  section: explicit,
  children,
  enabled = true,
}: {
  section?: SectionId;
  children?: ReactNode;
  enabled?: boolean;
}) {
  const { assignment } = useContext(Context);
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const section = explicit ?? routeSection(pathname);
  const design = section ? assignment?.sections[section] : null;

  useEffect(() => {
    if (
      !enabled ||
      !user ||
      user.role !== "USER" ||
      !assignment ||
      assignment.excluded ||
      !section ||
      !design
    )
      return;
    const sessionId = crypto.randomUUID();
    let alive = true,
      busy = false,
      retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const queue: LabEvent[] = [];
    const push = (name: string, duration?: number) => {
      if (queue.length < 100)
        queue.push({
          id: crypto.randomUUID(),
          sessionId,
          section,
          version: design.version,
          context: design.context,
          name,
          ...(duration ? { duration } : {}),
        });
    };
    const flush = async () => {
      if (busy || !queue.length || !alive) return;
      busy = true;
      const batch = queue.slice(0, 20);
      try {
        const r = await fetch(API_BASE_URL + "/ux-lab/events", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: user.id, events: batch }),
          keepalive: true,
        });
        if (r.ok) {
          queue.splice(0, batch.length);
          failures = 0;
        } else if (r.status === 409) {
          queue.length = 0;
          void queryClient.invalidateQueries({
            queryKey: ["section-design", user.id],
          });
        } else if (r.status >= 400 && r.status < 500) {
          queue.splice(0, batch.length);
        } else throw Error("retry");
      } catch {
        failures++;
      } finally {
        busy = false;
        if (alive && queue.length && failures < 6)
          retry = setTimeout(
            () => void flush(),
            Math.min(30_000, 1000 * 2 ** failures),
          );
      }
    };
    push("view");
    void flush();
    let lastInteraction = Date.now(),
      lastTick = Date.now();
    let activeSeconds = 0;
    const interaction = () => {
      lastInteraction = Date.now();
    };
    const action = (name: string) => {
      if (
        ![
          ...SECTION_ACTIONS[section],
          "request_failed",
          "validation_failed",
        ].includes(name)
      )
        return;
      push(name);
      void flush();
    };
    const detach = setSectionEmitter(action);
    const tick = setInterval(() => {
      const now = Date.now(),
        elapsed = Math.min(1, (now - lastTick) / 1000);
      lastTick = now;
      if (
        document.visibilityState === "visible" &&
        now - lastInteraction < 60_000
      )
        activeSeconds += elapsed;
      if (activeSeconds >= 15) {
        push("engaged", 15);
        activeSeconds -= 15;
        void flush();
      }
    }, 1000);
    const online = () => {
      failures = 0;
      void flush();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") {
        if (activeSeconds >= 1) {
          push("engaged", Math.min(15, Math.floor(activeSeconds)));
          activeSeconds = 0;
        }
        void flush();
      }
    };
    window.addEventListener("pointerdown", interaction, { passive: true });
    window.addEventListener("keydown", interaction);
    window.addEventListener("scroll", interaction, {
      passive: true,
      capture: true,
    });
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      if (activeSeconds >= 1)
        push("engaged", Math.min(15, Math.floor(activeSeconds)));
      // Send only this account's pending events on navigation; never retain them
      // for a later login belonging to someone else.
      if (queue.length)
        void fetch(API_BASE_URL + "/ux-lab/events", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: user.id,
            events: queue.slice(0, 20),
          }),
          keepalive: true,
        }).catch(() => {});
      alive = false;
      queue.length = 0;
      clearInterval(tick);
      if (retry) clearTimeout(retry);
      detach();
      window.removeEventListener("pointerdown", interaction);
      window.removeEventListener("keydown", interaction);
      window.removeEventListener("scroll", interaction, true);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [
    user?.id,
    user?.role,
    assignment?.excluded,
    section,
    enabled,
    design?.context,
    design?.version,
    queryClient,
  ]);
  const preview =
    user?.role === "ADMIN" && new URLSearchParams(search).has("labPreview");
  return (
    <>
      {preview && !explicit && new URLSearchParams(search).get("labPreview") !== "home:B" && (
        <aside className="mb-5 flex flex-wrap justify-between gap-3 rounded-xl border border-neutral-300 bg-white p-4 text-sm text-neutral-800">
          <span>
            {locale === "ar"
              ? "معاينة تصميم B · لا تُسجل ضمن نتائج التجارب"
              : "Design B preview · excluded from experiment results"}
          </span>
          <Link className="font-semibold underline" to="/admin/ux-lab">
            {locale === "ar" ? "العودة إلى المعمل" : "Back to lab"}
          </Link>
        </aside>
      )}
      {children}
    </>
  );
}
