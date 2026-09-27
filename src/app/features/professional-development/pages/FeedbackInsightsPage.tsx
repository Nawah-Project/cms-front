import { useCallback, useEffect, useMemo, useState } from "react";
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
  const scope: FeedbackScope = rawScope === "shared" ? "shared" : "for-you";
  const feedbackId = searchParams.get("feedback");
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState({ forYou: 0, shared: 0 });
  const [contextFilter, setContextFilter] = useState<FeedbackContext | "ALL">(
    "ALL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [result, unread] = await Promise.all([
        api.getFeedback({ scope, page, limit: PAGE_SIZE }),
        api.getFeedbackUnreadCount(),
      ]);
      setPosts(result.items);
      setTotalPages(result.totalPages);
      setUnreadCount({ forYou: unread.forYou, shared: unread.shared });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const visiblePosts = useMemo(
    () =>
      contextFilter === "ALL"
        ? posts
        : posts.filter((post) => post.context === contextFilter),
    [contextFilter, posts],
  );

  const selectScope = (next: FeedbackScope) => {
    setPage(1);
    setContextFilter("ALL");
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
      setUnreadCount((current) => ({
        ...current,
        [scope === "for-you" ? "forYou" : "shared"]: Math.max(
          0,
          current[scope === "for-you" ? "forYou" : "shared"] - 1,
        ),
      }));
    },
    [scope],
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

      <div className="grid gap-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <nav
          aria-label={t("professionalDevelopment.feedbackViews")}
          className="flex gap-2 overflow-x-auto border-b border-border pb-2 lg:block lg:space-y-1 lg:border-b-0 lg:pb-0"
        >
          {(["for-you", "shared"] as const).map((item) => {
            const selected = item === scope;
            const count =
              item === "for-you" ? unreadCount.forYou : unreadCount.shared;
            return (
              <button
                key={item}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => selectScope(item)}
                className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-info-strong lg:w-full ${selected ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-neutral-100" : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"}`}
              >
                <span>
                  {t(
                    `professionalDevelopment.${item === "for-you" ? "forYou" : "shared"}`,
                  )}
                </span>
                {count > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger-strong">
                    {number(count)}
                  </span>
                )}
              </button>
            );
          })}
          <p className="hidden px-3 pt-2 text-xs leading-5 text-neutral-500 lg:block">
            {t(
              `professionalDevelopment.${scope === "for-you" ? "forYouDescription" : "sharedDescription"}`,
            )}
          </p>
        </nav>

        <section
          aria-label={t(
            `professionalDevelopment.${scope === "for-you" ? "forYou" : "shared"}`,
          )}
          className="min-w-0 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-500 lg:hidden">
              {t(
                `professionalDevelopment.${scope === "for-you" ? "forYouDescription" : "sharedDescription"}`,
              )}
            </p>
            <label className="ms-auto flex items-center gap-2 text-xs text-neutral-500">
              {t("professionalDevelopment.context")}
              <select
                value={contextFilter}
                onChange={(event) =>
                  setContextFilter(
                    event.target.value as FeedbackContext | "ALL",
                  )
                }
                className="field-control min-h-9 w-auto py-1.5 text-xs"
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
                  contextFilter !== "ALL"
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
                  scope={scope}
                  onOpen={() => selectFeedback(post.id)}
                />
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
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
                  pages: number(totalPages),
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
        </section>
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
