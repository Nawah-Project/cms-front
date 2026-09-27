import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import { adminApi } from "../../admin/api/adminApi";
import { api } from "../../../services/api";
import type { FeedbackPost } from "../types";
import { FeedbackRichContent } from "./FeedbackRichContent";
import {
  FeedbackContextTag,
  FeedbackResourceCard,
  FeedbackScopeLabel,
  FeedbackTagList,
} from "./FeedbackPresentation";

export function FeedbackDetailDrawer({
  feedbackId,
  admin = false,
  onClose,
  onRead,
}: {
  feedbackId: string | null;
  admin?: boolean;
  onClose: () => void;
  onRead?: (feedbackId: string) => void;
}) {
  const { t, date } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<FeedbackPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!feedbackId) return;
    setLoading(true);
    setError(false);
    try {
      let result = admin
        ? await adminApi.feedback(feedbackId)
        : await api.getFeedbackItem(feedbackId);
      if (!admin && !result.isRead) {
        const read = await api.markFeedbackRead(feedbackId);
        result = { ...result, isRead: true, readAt: read.readAt };
        onRead?.(feedbackId);
      }
      setFeedback(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [admin, feedbackId, onRead]);

  useEffect(() => {
    if (!feedbackId) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    void load();
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [feedbackId, load]);

  if (!feedbackId) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="feedback-detail-title"
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface p-0 text-start text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50 dark:text-neutral-100 sm:w-[calc(100%-3rem)]"
    >
      <section className="flex max-h-[92dvh] flex-col overflow-hidden">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">
                {t("professionalDevelopment.feedbackDetail")}
              </p>
              <h2
                id="feedback-detail-title"
                className="mt-1 text-xl font-semibold leading-7 text-neutral-950 dark:text-neutral-100"
              >
                {feedback?.title ??
                  t("professionalDevelopment.feedbackInsights")}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("professionalDevelopment.closeFeedback")}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-800"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div
              className="space-y-4 px-5 py-8"
              role="status"
              aria-live="polite"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
          ) : error || !feedback ? (
            <div
              role="alert"
              className="m-auto max-w-sm px-6 py-10 text-center"
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
          ) : (
            <article className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  aria-hidden="true"
                >
                  {feedback.author.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {feedback.author.name}
                </span>
                <span className="text-neutral-400" aria-hidden="true">
                  ·
                </span>
                <time
                  dateTime={feedback.publishedAt}
                  className="text-xs text-neutral-500"
                >
                  {t("professionalDevelopment.published")}{" "}
                  {date(feedback.publishedAt, { dateStyle: "long" })}
                </time>
              </header>

              <div className="flex flex-wrap items-center gap-2">
                <FeedbackContextTag context={feedback.context} />
                <span className="rounded-md border border-border-subtle px-2 py-1 text-[11px] text-neutral-500">
                  <FeedbackScopeLabel visibility={feedback.visibility} />
                </span>
              </div>
              {feedback.tags.length > 0 && (
                <FeedbackTagList tags={feedback.tags} />
              )}
              {feedback.visibility === "DIRECT" && !admin && (
                <p className="text-sm text-info-strong">
                  {t("professionalDevelopment.forYouAudience")}
                </p>
              )}
              {feedback.visibility === "GROUP" && (
                <p className="text-sm text-neutral-500">
                  {t("professionalDevelopment.groupAudience")}
                </p>
              )}
              {feedback.visibility === "ALL" && (
                <p className="text-sm text-neutral-500">
                  {t("professionalDevelopment.everyoneAudience")}
                </p>
              )}

              <div className="border-t border-border pt-5">
                <FeedbackRichContent content={feedback.content} />
              </div>

              {feedback.resources.length > 0 && (
                <section
                  aria-label={t("professionalDevelopment.resourceOptional")}
                  className="space-y-2 border-t border-border pt-5"
                >
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {t("professionalDevelopment.resourceOptional")}
                  </h3>
                  {feedback.resources.map((resource) => (
                    <FeedbackResourceCard
                      key={resource.id}
                      resource={resource}
                    />
                  ))}
                </section>
              )}
            </article>
          )}
          </div>
      </section>
    </dialog>
  );
}
