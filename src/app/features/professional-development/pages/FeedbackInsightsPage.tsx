import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../../auth/store/authStore";
import { PageHeading } from "../../admin/components/AdminUI";
import { adminApi } from "../../admin/api/adminApi";
import type { FeedbackContext, FeedbackPost, FeedbackScope } from "../types";
import { api } from "../../../services/api";
import { useI18n } from "../../../i18n";
import { ProfessionalDevelopmentNav } from "../components/ProfessionalDevelopmentNav";
import { FeedbackCard } from "../components/FeedbackPresentation";
import { FeedbackDetailDrawer } from "../components/FeedbackDetailDrawer";
import { FeedbackFormDialog } from "../components/FeedbackFormDialog";

const PAGE_SIZE = 20;
const FEEDBACK_LOAD_LIMIT = 50;
const CONTEXTS: FeedbackContext[] = [
  "APPLICATION",
  "INTERVIEW",
  "WAITING",
  "DECISION",
  "GENERAL",
];
const CONTEXT_KEYS: Record<FeedbackContext, string> = {
  APPLICATION: "contextApplication",
  INTERVIEW: "contextInterview",
  WAITING: "contextWaiting",
  DECISION: "contextDecision",
  GENERAL: "contextGeneral",
};

function MemberFeedbackPage() {
  const { t, number } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawScope = searchParams.get("scope");
  const scope: "all" | FeedbackScope =
    rawScope === "all" ? "all" : rawScope === "shared" ? "shared" : "for-you";
  const feedbackId = searchParams.get("feedback");
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [page, setPage] = useState(1);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const [unreadCount, setUnreadCount] = useState({ forYou: 0, shared: 0 });
  const [contextFilter, setContextFilter] = useState<FeedbackContext | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const scopes: FeedbackScope[] =
        scope === "all" ? ["for-you", "shared"] : [scope];
      const [results, unread] = await Promise.all([
        Promise.all(
          scopes.map((item) =>
            api.getFeedback({ scope: item, page: 1, limit: FEEDBACK_LOAD_LIMIT }),
          ),
        ),
        api.getFeedbackUnreadCount(),
      ]);
      const merged = results
        .flatMap((result) => result.items)
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        );
      setPosts(merged);
      setUnreadCount({ forYou: unread.forYou, shared: unread.shared });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return posts.filter((post) => {
      const matchesContext =
        contextFilter === "ALL" || post.context === contextFilter;
      const matchesSearch =
        !query ||
        `${post.title}\n${post.content}`.toLocaleLowerCase().includes(query);
      return matchesContext && matchesSearch;
    });
  }, [contextFilter, posts, search]);
  const visiblePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));

  const selectScope = (next: "all" | FeedbackScope) => {
    setPage(1);
    setContextFilter("ALL");
    setSearch("");
    setSearchParams({ scope: next }, { preventScrollReset: true });
  };

  const selectFeedback = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("feedback", id);
    else next.delete("feedback");
    setSearchParams(next, { preventScrollReset: true });
  };

  const markReadLocally = useCallback(
    (id: string) => {
      setPosts((current) =>
        current.map((post) =>
          post.id === id ? { ...post, isRead: true } : post,
        ),
      );
      const key =
        postsRef.current.find((post) => post.id === id)?.visibility === "DIRECT"
          ? "forYou"
          : "shared";
      setUnreadCount((current) => ({
        ...current,
        [key]: Math.max(0, current[key] - 1),
      }));
    },
    [],
  );

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={t("professionalDevelopment.title")}
        title={t("professionalDevelopment.feedbackTitle")}
        description={t("professionalDevelopment.feedbackSubtitle")}
      />
      <ProfessionalDevelopmentNav
        unreadCount={unreadCount.forYou + unreadCount.shared}
      />

      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <nav
            aria-label={t("professionalDevelopment.feedbackViews")}
            className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-neutral-100 p-1 dark:bg-neutral-900"
          >
            {(["all", "for-you", "shared"] as const).map((item) => {
              const selected = item === scope;
              const count =
                item === "for-you" ? unreadCount.forYou : unreadCount.shared;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectScope(item)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-info-strong ${selected ? "bg-neutral-950 font-semibold text-white shadow-sm dark:bg-white dark:text-neutral-950" : "font-medium text-neutral-800 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-800"}`}
                >
                  {t(
                    `professionalDevelopment.${item === "all" ? "allFeedback" : item === "for-you" ? "forYouTab" : "sharedTab"}`,
                  )}
                  {item !== "all" && count > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger-strong">
                      {number(count)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="min-w-0">
              <span className="sr-only">
                {t("professionalDevelopment.searchFeedback")}
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t("professionalDevelopment.searchFeedbackPlaceholder")}
                className="field-control w-full py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {t("professionalDevelopment.context")}
              <select
                value={contextFilter}
                onChange={(event) => {
                  setContextFilter(
                    event.target.value as FeedbackContext | "ALL",
                  );
                  setPage(1);
                }}
                className="field-control min-h-10 w-auto py-2 text-sm"
              >
                <option value="ALL">
                  {t("professionalDevelopment.allContexts")}
                </option>
                {CONTEXTS.map((context) => (
                  <option key={context} value={context}>
                    {t(`professionalDevelopment.${CONTEXT_KEYS[context]}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <section
          aria-label={t(
              `professionalDevelopment.${scope === "all" ? "allFeedback" : scope === "for-you" ? "forYouTab" : "sharedTab"}`,
          )}
          className="min-w-0 space-y-4"
        >
            {loading ? (
              <div
                className="space-y-4"
                role="status"
                aria-label={t("professionalDevelopment.feedbackLoading")}
              >
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-48 animate-pulse rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900"
                  />
                ))}
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-xl border border-danger-border bg-surface px-5 py-8 text-center"
              >
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {t("professionalDevelopment.feedbackLoadError")}
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="button-secondary mt-4 px-3 py-2 text-xs"
                >
                  {t("professionalDevelopment.retryFeedback")}
                </button>
              </div>
            ) : !visiblePosts.length ? (
              <section className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {t(
                    contextFilter !== "ALL" || search.trim()
                      ? "professionalDevelopment.noFilteredFeedback"
                      : scope === "for-you"
                        ? "professionalDevelopment.noDirectFeedback"
                        : "professionalDevelopment.noSharedInsights",
                  )}
                </h2>
              </section>
            ) : (
              <div className="space-y-4">
                {visiblePosts.map((post) => (
                  <FeedbackCard
                    key={post.id}
                    post={post}
                    scope={post.visibility === "DIRECT" ? "for-you" : "shared"}
                    onOpen={() => selectFeedback(post.id)}
                  />
                ))}
              </div>
            )}

            {!loading && !error && filteredTotalPages > 1 && (
              <nav
                aria-label={t("professionalDevelopment.feedbackPagination")}
                className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-5"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
                >
                  {t("professionalDevelopment.previousPage")}
                </button>
                <span className="text-xs text-neutral-500">
                  {t("professionalDevelopment.feedbackPageOf", {
                    page: number(page),
                    pages: number(filteredTotalPages),
                  })}
                </span>
                <button
                  type="button"
                  disabled={page >= filteredTotalPages}
                  onClick={() =>
                    setPage((current) => Math.min(filteredTotalPages, current + 1))
                  }
                  className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
                >
                  {t("professionalDevelopment.nextPage")}
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>

      <FeedbackDetailDrawer
        feedbackId={feedbackId}
        onClose={() => selectFeedback(null)}
        onRead={markReadLocally}
      />
    </div>
  );
}

function AdminFeedbackPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const archived = searchParams.get("archived") === "true";
  const feedbackId = searchParams.get("feedback");
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FeedbackPost | null>(null);
  const [pendingArchive, setPendingArchive] = useState<FeedbackPost | null>(
    null,
  );
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await adminApi.feedbackPosts(page, PAGE_SIZE, archived);
      setPosts(result.items);
      setTotalPages(result.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [archived, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const setArchived = (next: boolean) => {
    setPage(1);
    setSearchParams(next ? { archived: "true" } : {}, {
      preventScrollReset: true,
    });
  };
  const openDetail = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("feedback", id);
    else next.delete("feedback");
    setSearchParams(next, { preventScrollReset: true });
  };
  const saved = (key: "feedbackCreated" | "feedbackUpdated") => {
    setShowForm(false);
    setEditing(null);
    setMessage(t(`professionalDevelopment.${key}`));
    void load();
  };
  const archive = async () => {
    if (!pendingArchive) return;
    setArchiving(true);
    try {
      await adminApi.archiveFeedback(pendingArchive.id);
      setPendingArchive(null);
      setMessage(t("professionalDevelopment.feedbackArchived"));
      void load();
    } catch {
      setError(true);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading
          eyebrow={t("professionalDevelopment.title")}
          title={t("professionalDevelopment.feedbackTitle")}
          description={t("professionalDevelopment.adminFeedbackDescription")}
        />
        {!archived && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="button-primary px-4 py-2.5 text-sm"
          >
            + {t("professionalDevelopment.addFeedback")}
          </button>
        )}
      </header>
      <ProfessionalDevelopmentNav />

      {message && (
        <p
          role="status"
          className="rounded-lg border border-success-border bg-success-soft px-4 py-3 text-sm text-success-strong"
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-sm text-neutral-500">
          {t("professionalDevelopment.adminFeedbackDescription")}
        </p>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {([false, true] as const).map((item) => (
            <button
              key={String(item)}
              type="button"
              aria-current={archived === item ? "page" : undefined}
              onClick={() => setArchived(item)}
              className={`rounded-md px-3 py-1.5 text-xs ${archived === item ? "bg-neutral-900 font-medium text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300"}`}
            >
              {t(
                item
                  ? "professionalDevelopment.archived"
                  : "professionalDevelopment.activeFeedback",
              )}
            </button>
          ))}
        </div>
      </div>

      {pendingArchive && (
        <section
          role="alertdialog"
          aria-labelledby="archive-feedback-title"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning-border bg-warning-soft p-4"
        >
          <div>
            <h2 id="archive-feedback-title" className="text-sm font-semibold">
              {t("professionalDevelopment.archiveConfirmTitle")}
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              {t("professionalDevelopment.archiveConfirmDescription")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingArchive(null)}
              className="button-secondary px-3 py-2 text-xs"
            >
              {t("professionalDevelopment.cancel")}
            </button>
            <button
              type="button"
              disabled={archiving}
              onClick={() => void archive()}
              className="button-primary px-3 py-2 text-xs"
            >
              {t("professionalDevelopment.confirmArchive")}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div
          className="space-y-4"
          role="status"
          aria-label={t("professionalDevelopment.feedbackLoading")}
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger-border bg-surface px-5 py-8 text-center"
        >
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {t("professionalDevelopment.feedbackLoadError")}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="button-secondary mt-4 px-3 py-2 text-xs"
          >
            {t("professionalDevelopment.retryFeedback")}
          </button>
        </div>
      ) : !posts.length ? (
        <section className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {archived
              ? t("professionalDevelopment.noArchivedFeedback")
              : t("professionalDevelopment.noAdminFeedback")}
          </h2>
          {!archived && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="button-secondary mt-4 px-3 py-2 text-sm"
            >
              {t("professionalDevelopment.addFeedback")}
            </button>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedbackCard
              key={post.id}
              post={post}
              scope="admin"
              onOpen={() => openDetail(post.id)}
              onEdit={
                !archived
                  ? () => {
                      setEditing(post);
                      setShowForm(true);
                    }
                  : undefined
              }
              onArchive={!archived ? () => setPendingArchive(post) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav
          aria-label={t("professionalDevelopment.feedbackPagination")}
          className="flex items-center justify-center gap-3 border-t border-border pt-5"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.previousPage")}
          </button>
          <span className="text-xs text-neutral-500">
            {t("professionalDevelopment.feedbackPageOf", {
              page,
              pages: totalPages,
            })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.nextPage")}
          </button>
        </nav>
      )}

      {showForm && (
        <FeedbackFormDialog
          key={editing?.id ?? "create"}
          post={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={saved}
        />
      )}
      <FeedbackDetailDrawer
        feedbackId={feedbackId}
        admin
        onClose={() => openDetail(null)}
      />
    </div>
  );
}

export default function FeedbackInsightsPage() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? (
    <AdminFeedbackPage />
  ) : (
    <MemberFeedbackPage />
  );
}
