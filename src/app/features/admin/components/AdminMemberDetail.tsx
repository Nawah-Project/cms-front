import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type AdminMember,
  type AdminUserDetail,
} from "../api/adminApi";
import {
  ActivityBadge,
  EmptyState,
  Initials,
  LoadingState,
  relativeTime,
  StageCounts,
  timeTitle,
} from "./AdminUI";
import { AdminActivityList } from "./AdminActivityList";
import { useI18n } from "../../../i18n";
import { ProfessionalProfileActions } from "../../profile/MemberProfessionalCard";
import { AdminMemberTasks } from "./AdminMemberTasks";
import { FeedbackFormDialog } from "../../professional-development/components/FeedbackFormDialog";

export function AdminMemberDetail({
  member,
  onClose,
}: {
  member: AdminMember;
  onClose: () => void;
}) {
  const { t, tp, locale } = useI18n();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    void adminApi
      .user(member.id)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [member.id, member.group?.id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-950/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-member-title"
        className="h-full w-full max-w-2xl overflow-y-auto border-s border-border bg-surface p-5 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <Initials name={member.name} avatar={member.avatar} />
            <div>
              <p className="text-xs text-neutral-500">
                {t("admin.memberDetails")}
              </p>
              <h2
                id="admin-member-title"
                className="text-xl font-semibold text-neutral-950 dark:text-neutral-100"
              >
                {member.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin.closeMemberDetails")}
            className="rounded-md px-2 py-1 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="button-primary mt-4 px-3 py-2 text-xs"
        >
          {t("professionalDevelopment.giveFeedback")}
        </button>
        {feedbackNotice && (
          <p role="status" className="mt-2 text-xs text-success-strong">
            {feedbackNotice}
          </p>
        )}
        {loading ? (
          <LoadingState label={t("admin.loadingMemberDetails")} />
        ) : error || !detail ? (
          <div className="py-8 text-center" role="alert">
            <p className="text-sm text-neutral-600">
              {t("admin.loadMemberError")}
            </p>
            <button
              className="button-secondary mt-3"
              type="button"
              onClick={load}
            >
              {t("admin.tryAgain")}
            </button>
          </div>
        ) : (
          <div className="space-y-7 py-6">
            <section
              aria-labelledby="member-development-summary"
              className="space-y-3"
            >
              <h3
                id="member-development-summary"
                className="text-sm font-semibold"
              >
                {t("professionalDevelopment.development")}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["activeTasks", detail.development.totalActiveTasks],
                  [
                    "inProgressCount",
                    detail.development.taskStatusCounts.IN_PROGRESS,
                  ],
                  ["blocked", detail.development.taskStatusCounts.BLOCKED],
                  ["overdueCount", detail.development.overdueTasks],
                  ["done", detail.development.taskStatusCounts.DONE],
                  [
                    "mentorAssigned",
                    detail.development.tasksBySource.mentorAssigned,
                  ],
                  ["personalTasks", detail.development.tasksBySource.personal],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border px-3 py-3"
                  >
                    <p className="text-xs text-neutral-500">
                      {t(`professionalDevelopment.${label}`)}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <AdminMemberTasks member={member} onChanged={load} />
            <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h3 className="mb-3 text-sm font-semibold">
                {t("profile.professionalProfile")}
              </h3>
              <ProfessionalProfileActions
                portfolioUrl={detail.user.portfolioUrl ?? null}
                hasCv={detail.user.hasCv === true}
                userId={detail.user.id}
              />
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-neutral-500">
                  {t("admin.currentGroup")}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {detail.user.group?.name ?? t("common.unassigned")}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-neutral-500">
                  {t("admin.lastActivity")}
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  title={timeTitle(detail.lastActivityAt, locale)}
                >
                  {relativeTime(detail.lastActivityAt, locale)}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-neutral-500">
                  {t("admin.activityStatus")}
                </p>
                <div className="mt-2">
                  <ActivityBadge
                    status={detail.activityStatus}
                    days={detail.inactivityDays}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-neutral-500">
                  {t("admin.applications")}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {tp("admin.applicationsTotal", detail.applicationsCount)}
                </p>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t("admin.applicationProgress")}
              </h3>
              <StageCounts counts={detail.currentStageCounts} />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t("admin.recentMeaningfulActivity")}
              </h3>
              <div className="rounded-lg border border-border px-4">
                <AdminActivityList items={detail.recentActivities} />
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t("admin.recentApplications")}
              </h3>
              {detail.recentApplications.length ? (
                <div className="divide-y divide-neutral-100 rounded-lg border border-border dark:divide-neutral-800">
                  {detail.recentApplications.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {application.companyName}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {application.jobTitle}
                        </p>
                      </div>
                      <span className="status-badge status-neutral">
                        {t(
                          `applications.${application.stage === "APPLIED" ? "submitted" : application.stage.toLowerCase()}`,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>{t("admin.noApplications")}</EmptyState>
              )}
            </section>
          </div>
        )}
      </aside>
      {feedbackOpen && (
        <FeedbackFormDialog
          post={null}
          initialTargetUserId={member.id}
          initialTargetName={member.name}
          initialVisibility="DIRECT"
          onClose={() => setFeedbackOpen(false)}
          onSaved={(message) => {
            setFeedbackOpen(false);
            setFeedbackNotice(t(`professionalDevelopment.${message}`));
          }}
        />
      )}
    </div>
  );
}
