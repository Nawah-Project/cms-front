import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { AdminGroup, AdminMember } from "../../admin/api/adminApi";
import { adminApi } from "../../admin/api/adminApi";
import { CloseIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import type {
  CreateFeedbackInput,
  FeedbackContext,
  FeedbackPost,
  FeedbackTag,
  FeedbackVisibility,
} from "../types";

const CONTEXTS: FeedbackContext[] = [
  "APPLICATION",
  "INTERVIEW",
  "WAITING",
  "DECISION",
  "GENERAL",
];
const TAGS: FeedbackTag[] = [
  "INTERVIEW",
  "CV",
  "COMMUNICATION",
  "TECHNICAL",
  "APPLICATIONS",
  "LEARNING",
  "GENERAL",
];

function plainContent(value: string) {
  return value
    .replace(/<\/(p|h[2-4]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export function FeedbackFormDialog({
  post,
  initialTargetUserId,
  initialTargetName,
  initialVisibility = "DIRECT",
  onClose,
  onSaved,
}: {
  post: FeedbackPost | null;
  initialTargetUserId?: string;
  initialTargetName?: string;
  initialVisibility?: FeedbackVisibility;
  onClose: () => void;
  onSaved: (message: "feedbackCreated" | "feedbackUpdated") => void;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(
    post ? plainContent(post.content) : "",
  );
  const [visibility, setVisibility] = useState<FeedbackVisibility>(
    post?.visibility ?? initialVisibility,
  );
  const [targetUserId, setTargetUserId] = useState(initialTargetUserId ?? "");
  const [groupId, setGroupId] = useState(
    post?.visibility === "GROUP" ? "" : "",
  );
  const [context, setContext] = useState<FeedbackContext>(
    post?.context ?? "GENERAL",
  );
  const [tags, setTags] = useState<FeedbackTag[]>(post?.tags ?? []);
  const [resourceTitle, setResourceTitle] = useState(
    post?.resources[0]?.title ?? "",
  );
  const [resourceUrl, setResourceUrl] = useState(post?.resources[0]?.url ?? "");
  const [resourceDescription, setResourceDescription] = useState(
    post?.resources[0]?.description ?? "",
  );
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPages, setMemberPages] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [audienceChanged, setAudienceChanged] = useState(!post);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLookups = useCallback(async () => {
    setLookupLoading(true);
    setLookupError(false);
    try {
      const [users, groupResult] = await Promise.all([
        adminApi.users({ page: 1, limit: 100 }),
        adminApi.groups(),
      ]);
      const memberItems = users.items.filter(
        (member) => member.role === "USER",
      );
      if (
        initialTargetUserId &&
        !memberItems.some((item) => item.id === initialTargetUserId)
      ) {
        memberItems.unshift({
          id: initialTargetUserId,
          name: initialTargetName ?? initialTargetUserId,
          role: "USER",
          group: null,
          lastActivityAt: null,
          inactivityDays: null,
          activityStatus: "NEVER_ACTIVE",
          applicationsCount: 0,
          currentStageCounts: {
            applied: 0,
            interview: 0,
            decision: 0,
            closed: 0,
          },
        });
      }
      setMembers(memberItems);
      setMemberPage(1);
      setMemberPages(users.totalPages);
      setGroups(groupResult.items);
    } catch {
      setLookupError(true);
    } finally {
      setLookupLoading(false);
    }
  }, [initialTargetName, initialTargetUserId]);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    void loadLookups();
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [loadLookups]);

  const loadMoreMembers = async () => {
    const nextPage = memberPage + 1;
    setLookupError(false);
    try {
      const result = await adminApi.users({ page: nextPage, limit: 100 });
      setMembers((current) => [
        ...current,
        ...result.items.filter(
          (member) =>
            member.role === "USER" &&
            !current.some((item) => item.id === member.id),
        ),
      ]);
      setMemberPage(nextPage);
    } catch {
      setLookupError(true);
    }
  };

  const changeVisibility = (next: FeedbackVisibility) => {
    setVisibility(next);
    setAudienceChanged(true);
    setScopeConfirmed(false);
    setTargetUserId("");
    setGroupId("");
  };

  const selectedGroup = groups.find((group) => group.id === groupId);
  const broadAudience = visibility !== "DIRECT";
  const audienceReady =
    post && !audienceChanged
      ? true
      : visibility === "DIRECT"
        ? Boolean(targetUserId)
        : visibility === "GROUP"
          ? Boolean(groupId && scopeConfirmed)
          : scopeConfirmed;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!audienceReady) {
      setError(t("professionalDevelopment.chooseAudience"));
      return;
    }
    if (resourceUrl.trim()) {
      try {
        const url = new URL(resourceUrl.trim());
        if (url.protocol !== "https:" || url.username || url.password)
          throw new Error("unsafe");
      } catch {
        setError(t("professionalDevelopment.resourceRequiresHttps"));
        return;
      }
      if (!resourceTitle.trim()) {
        setError(t("professionalDevelopment.formError"));
        return;
      }
    }

    const input: CreateFeedbackInput = {
      title: title.trim(),
      content: content.trim(),
      visibility,
      context,
      tags,
      ...(!post || audienceChanged
        ? visibility === "DIRECT"
          ? { targetUserId }
          : visibility === "GROUP"
            ? { groupId }
            : {}
        : {}),
      resource: resourceUrl.trim()
        ? {
            title: resourceTitle.trim(),
            url: resourceUrl.trim(),
            ...(resourceDescription.trim()
              ? { description: resourceDescription.trim() }
              : {}),
          }
        : null,
    };

    setBusy(true);
    try {
      if (post) await adminApi.updateFeedback(post.id, input);
      else await adminApi.createFeedback(input);
      onSaved(post ? "feedbackUpdated" : "feedbackCreated");
    } catch {
      setError(t("professionalDevelopment.formError"));
    } finally {
      setBusy(false);
    }
  };

  const filteredMembers = members.filter((member) =>
    member.name
      .toLocaleLowerCase()
      .includes(memberSearch.trim().toLocaleLowerCase()),
  );

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
      aria-labelledby="feedback-form-title"
      className="fixed inset-0 m-auto flex h-[92dvh] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl items-stretch justify-center overflow-hidden border-0 bg-transparent p-0 text-start backdrop:bg-neutral-950/50 sm:w-[calc(100%-3rem)]"
    >
      <section className="h-full min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs text-neutral-500">
              {t("professionalDevelopment.feedbackInsights")}
            </p>
            <h2
              id="feedback-form-title"
              className="mt-1 text-lg font-semibold text-neutral-950 dark:text-neutral-100"
            >
              {post
                ? t("professionalDevelopment.editFeedback")
                : t("professionalDevelopment.addFeedback")}
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

        <form onSubmit={submit} className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-strong"
            >
              {error}
            </p>
          )}
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("professionalDevelopment.titleLabel")}
              <input
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("professionalDevelopment.titlePlaceholder")}
                className="field-control"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("professionalDevelopment.contentLabel")}
              <textarea
                required
                minLength={1}
                maxLength={20000}
                rows={7}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t("professionalDevelopment.contentPlaceholder")}
                className="field-control min-h-40 resize-y leading-6"
              />
              <span className="text-xs font-normal text-neutral-500">
                {t("professionalDevelopment.contentHelp")}
              </span>
            </label>
          </div>

          <fieldset className="space-y-3 rounded-xl border border-border p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {t("professionalDevelopment.whoShouldSeeThis")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["DIRECT", "GROUP", "ALL"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${visibility === option ? "border-info-strong bg-info-soft text-neutral-900 dark:text-neutral-100" : "border-border text-neutral-600 dark:text-neutral-300"}`}
                >
                  <input
                    type="radio"
                    name="feedback-audience"
                    value={option}
                    checked={visibility === option}
                    onChange={() => changeVisibility(option)}
                    className="accent-neutral-900"
                  />
                  {t(
                    `professionalDevelopment.${option === "DIRECT" ? "person" : option === "GROUP" ? "group" : "everyone"}`,
                  )}
                </label>
              ))}
            </div>

            {lookupLoading ? (
              <div
                role="status"
                className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
              />
            ) : lookupError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 text-sm text-danger-strong"
              >
                <span>{t("professionalDevelopment.memberLookupError")}</span>
                <button
                  type="button"
                  onClick={() => void loadLookups()}
                  className="button-secondary px-3 py-1.5 text-xs"
                >
                  {t("professionalDevelopment.retryFeedback")}
                </button>
              </div>
            ) : visibility === "DIRECT" ? (
              <div className="space-y-2">
                <label className="grid gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("professionalDevelopment.chooseMember")}
                  <select
                    required={!post || audienceChanged}
                    value={targetUserId}
                    onChange={(event) => {
                      setTargetUserId(event.target.value);
                      if (event.target.value) setAudienceChanged(true);
                    }}
                    className="field-control"
                  >
                    <option value="">
                      {t("professionalDevelopment.chooseMember")}
                    </option>
                    {filteredMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                {post && !audienceChanged && (
                  <p className="text-xs text-neutral-500">
                    {t("professionalDevelopment.currentRecipientUnchanged")}
                  </p>
                )}
                <input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder={t("professionalDevelopment.searchMembers")}
                  aria-label={t("professionalDevelopment.searchMembers")}
                  className="field-control text-sm"
                />
                {!filteredMembers.length && (
                  <p className="text-xs text-neutral-500">
                    {t("professionalDevelopment.memberSearchEmpty")}
                  </p>
                )}
                {memberPage < memberPages && (
                  <button
                    type="button"
                    onClick={() => void loadMoreMembers()}
                    className="text-xs font-medium text-info-strong underline underline-offset-4"
                  >
                    {t("professionalDevelopment.loadMoreMembers")}
                  </button>
                )}
              </div>
            ) : visibility === "GROUP" ? (
              <label className="grid gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("professionalDevelopment.chooseGroup")}
                <select
                  required={!post || audienceChanged}
                  value={groupId}
                  onChange={(event) => {
                    setGroupId(event.target.value);
                    if (event.target.value) setAudienceChanged(true);
                    setScopeConfirmed(false);
                  }}
                  className="field-control"
                >
                  <option value="">
                    {t("professionalDevelopment.chooseGroup")}
                  </option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {visibility === "ALL" && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                {t("professionalDevelopment.everyoneWillSee")}
              </p>
            )}
            {visibility === "GROUP" && selectedGroup && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                {t("professionalDevelopment.groupWillSee", {
                  group: selectedGroup.name,
                })}
              </p>
            )}
            {broadAudience &&
              (!post || audienceChanged) &&
              (visibility === "ALL" || Boolean(groupId)) && (
                <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={scopeConfirmed}
                    onChange={(event) =>
                      setScopeConfirmed(event.target.checked)
                    }
                    className="mt-0.5 accent-neutral-900"
                  />
                  <span>{t("professionalDevelopment.confirmAudience")}</span>
                </label>
              )}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid content-start gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("professionalDevelopment.context")}
              <select
                value={context}
                onChange={(event) =>
                  setContext(event.target.value as FeedbackContext)
                }
                className="field-control"
              >
                {CONTEXTS.map((item) => (
                  <option key={item} value={item}>
                    {t(
                      `professionalDevelopment.context${item[0]}${item.slice(1).toLowerCase()}`,
                    )}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("professionalDevelopment.optionalCategories")}
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {TAGS.map((tag) => (
                  <label
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300"
                  >
                    <input
                      type="checkbox"
                      checked={tags.includes(tag)}
                      onChange={(event) =>
                        setTags((current) =>
                          event.target.checked
                            ? [...current, tag]
                            : current.filter((item) => item !== tag),
                        )
                      }
                      className="accent-neutral-900"
                    />
                    {t(
                      `professionalDevelopment.${({ INTERVIEW: "tagInterview", CV: "tagCv", COMMUNICATION: "tagCommunication", TECHNICAL: "tagTechnical", APPLICATIONS: "tagApplications", LEARNING: "tagLearning", GENERAL: "tagGeneral" } as const)[tag]}`,
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="space-y-3 rounded-xl border border-border p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {t("professionalDevelopment.resourceOptional")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {t("professionalDevelopment.resourceTitle")}
                <input
                  maxLength={200}
                  value={resourceTitle}
                  onChange={(event) => setResourceTitle(event.target.value)}
                  placeholder={t(
                    "professionalDevelopment.resourceTitlePlaceholder",
                  )}
                  className="field-control"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {t("professionalDevelopment.resourceUrl")}
                <input
                  type="url"
                  maxLength={2048}
                  value={resourceUrl}
                  onChange={(event) => setResourceUrl(event.target.value)}
                  placeholder="https://"
                  className="field-control"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 sm:col-span-2">
                {t("professionalDevelopment.resourceDescription")}
                <input
                  maxLength={1000}
                  value={resourceDescription}
                  onChange={(event) =>
                    setResourceDescription(event.target.value)
                  }
                  placeholder={t(
                    "professionalDevelopment.resourceDescriptionPlaceholder",
                  )}
                  className="field-control"
                />
              </label>
            </div>
          </fieldset>

          <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="button-secondary px-4 py-2.5 text-sm"
            >
              {t("professionalDevelopment.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy || lookupLoading || !audienceReady}
              className="button-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? t(
                    post
                      ? "professionalDevelopment.savingFeedback"
                      : "professionalDevelopment.publishingFeedback",
                  )
                : t(
                    post
                      ? "professionalDevelopment.saveFeedback"
                      : "professionalDevelopment.publishFeedback",
                  )}
            </button>
          </footer>
        </form>
      </section>
    </dialog>
  );
}
