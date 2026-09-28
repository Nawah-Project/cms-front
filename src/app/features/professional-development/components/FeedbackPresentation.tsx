import { useState } from "react";
import { ExternalLinkIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import { FeedbackRichContent } from "./FeedbackRichContent";
import type { FeedbackContext, FeedbackPost, FeedbackTag } from "../types";

const CONTEXT_KEYS: Record<FeedbackContext, string> = {
  APPLICATION: "contextApplication",
  INTERVIEW: "contextInterview",
  WAITING: "contextWaiting",
  DECISION: "contextDecision",
  GENERAL: "contextGeneral",
};

const TAG_KEYS: Record<FeedbackTag, string> = {
  INTERVIEW: "tagInterview",
  CV: "tagCv",
  COMMUNICATION: "tagCommunication",
  TECHNICAL: "tagTechnical",
  APPLICATIONS: "tagApplications",
  LEARNING: "tagLearning",
  GENERAL: "tagGeneral",
};

export function FeedbackContextTag({ context }: { context: FeedbackContext }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
      {t(`professionalDevelopment.${CONTEXT_KEYS[context]}`)}
    </span>
  );
}

export function FeedbackTagList({ tags }: { tags: FeedbackTag[] }) {
  const { t } = useI18n();
  if (!tags.length) return null;
  return (
    <span
      className="flex flex-wrap gap-1.5"
      role="list"
      aria-label={t("professionalDevelopment.categories")}
    >
      {tags.map((tag) => (
        <span
          role="listitem"
          key={tag}
          className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {t(`professionalDevelopment.${TAG_KEYS[tag]}`)}
        </span>
      ))}
    </span>
  );
}

export function FeedbackScopeLabel({
  visibility,
}: {
  visibility: FeedbackPost["visibility"];
}) {
  const { t } = useI18n();
  const key =
    visibility === "DIRECT"
      ? "directFeedback"
      : visibility === "GROUP"
        ? "groupFeedback"
        : "sharedWithEveryone";
  return <span>{t(`professionalDevelopment.${key}`)}</span>;
}

export function FeedbackResourceCard({
  resource,
}: {
  resource: FeedbackPost["resources"][number];
}) {
  const { t } = useI18n();
  let safeUrl: string | null = null;
  try {
    const parsed = new URL(resource.url);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password)
      safeUrl = parsed.toString();
  } catch {
    safeUrl = null;
  }
  if (!safeUrl) return null;

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t("professionalDevelopment.openResource")}: ${resource.title}`}
      className="flex w-full items-start gap-3 rounded-lg border border-border-subtle bg-neutral-50 px-3.5 py-3 text-start transition-colors hover:border-border-hover hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <ExternalLinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {resource.title}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-500">
          {resource.description ||
            t("professionalDevelopment.externalResource")}
        </span>
      </span>
      <span className="sr-only">
        {t("professionalDevelopment.opensNewTab")}
      </span>
    </a>
  );
}

export function FeedbackCard({
  post,
  scope,
  onOpen,
  onEdit,
  onArchive,
  archiving = false,
}: {
  post: FeedbackPost;
  scope?: "for-you" | "shared" | "admin";
  onOpen: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  archiving?: boolean;
}) {
  const { t, date } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const plainLength = post.content.replace(/<[^>]*>/g, "").trim().length;
  const canExpand = plainLength > 180 || (post.content.match(/\n/g)?.length ?? 0) > 3;
  const initials = post.author.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-colors hover:border-border-hover">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${post.title}. ${t("professionalDevelopment.openFeedback")}`}
        className="block w-full p-4 text-start focus-visible:outline-2 focus-visible:outline-info-strong focus-visible:outline-offset-[-2px] sm:p-5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {initials || "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {post.author.name}
            </span>
            <time
              dateTime={post.publishedAt}
              className="mt-0.5 block text-xs text-neutral-500"
            >
              {date(post.publishedAt, { dateStyle: "medium" })}
            </time>
          </span>
          {scope === "for-you" && (
            <span className="rounded-md border border-info-border bg-info-soft px-2 py-1 text-[11px] font-semibold text-info-strong">
              {t("professionalDevelopment.forYou")}
            </span>
          )}
          {scope === "shared" && (
            <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
              <FeedbackScopeLabel visibility={post.visibility} />
            </span>
          )}
          {scope === "admin" && (
            <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
              <FeedbackScopeLabel visibility={post.visibility} />
            </span>
          )}
        </span>

        <span className="mt-4 flex items-center gap-2">
          {!post.isRead && scope !== "admin" && (
            <>
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-danger-strong"
              />
              <span className="sr-only">
                {t("professionalDevelopment.feedbackUnreadLabel")}
              </span>
            </>
          )}
          <span className="text-base font-semibold leading-6 text-neutral-950 dark:text-neutral-100">
            {post.title}
          </span>
        </span>

        <span className="mt-3 flex flex-wrap items-center gap-2">
          <FeedbackContextTag context={post.context} />
          {post.tags.length > 0 && <FeedbackTagList tags={post.tags} />}
        </span>
      </button>
      <div className="px-4 pb-4 text-start sm:px-5">
        <FeedbackRichContent content={post.content} preview={!expanded} />
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="mt-2 text-sm font-bold text-neutral-950 underline decoration-2 underline-offset-2 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-info-strong dark:text-white dark:hover:text-neutral-300"
          >
            {t(
              `professionalDevelopment.${expanded ? "showLess" : "showMore"}`,
            )}
          </button>
        )}
      </div>
      {post.resources[0] && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <FeedbackResourceCard resource={post.resources[0]} />
        </div>
      )}
      {(onEdit || onArchive) && (
        <footer className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-2.5 sm:px-5">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="button-secondary px-3 py-1.5 text-xs"
            >
              {t("professionalDevelopment.editFeedback")}
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              disabled={archiving}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger-strong hover:bg-danger-soft disabled:opacity-60"
            >
              {archiving
                ? t("professionalDevelopment.archiving")
                : t("professionalDevelopment.archiveFeedback")}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
