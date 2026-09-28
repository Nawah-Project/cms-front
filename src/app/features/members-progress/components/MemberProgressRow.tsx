import { formatApplicationMethod } from "../../../types";
import type {
  MemberApplication,
  MemberDetail,
  MemberProgress,
  RecentMemberProgress,
} from "../types/membersProgress.types";
import { LastUpdated } from "./LastUpdated";
import { MemberAvatar } from "./MemberAvatar";
import { ProgressCount, ProgressStageIcon, type ProgressStage } from "./ProgressCount";
import { StatusBadge } from "../../../components/StatusBadge";
import { useI18n } from "../../../i18n";
import { formatDisplayDate } from "../../../utils/date";

const STAGES: ProgressStage[] = ["applied", "interview", "decision", "closed"];

function MemberIdentity({
  member,
  isCurrentUser,
  expanded,
  onToggle,
  onOpenProfile,
  controlsId,
}: {
  member: MemberProgress;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  controlsId: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        aria-label={t("members.viewProfessionalProfile", { name: member.name })}
        onClick={onOpenProfile}
        className="group flex min-w-0 items-center gap-3 rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-strong"
      >
        <MemberAvatar member={member} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-neutral-900">
              {member.name}
            </span>
            {isCurrentUser && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-info-border bg-info-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-strong">
                {t("members.you")}
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={expanded ? t("members.hideApplications") : t("members.viewApplications")}
        onClick={onToggle}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-800"
      >
        <svg className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

function MemberDetailContent({
  member,
  detail,
  activities,
  currentUserId,
  loading,
  error,
  onRetry,
}: {
  member: MemberProgress;
  detail?: MemberDetail;
  activities: RecentMemberProgress[];
  currentUserId?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t, locale, relativeTime } = useI18n();
  if (loading) {
    return (
      <p role="status" className="py-5 text-sm text-neutral-500">
        {t("members.loadingMemberApplications", { name: member.name })}
      </p>
    );
  }
  if (error || !detail) {
    return (
      <div className="py-5" role="alert">
        <p className="text-sm text-danger-strong">
          {t("members.memberDetailsError")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md px-2 py-1 text-sm font-medium text-info-strong hover:bg-info-soft focus-visible:outline-2 focus-visible:outline-info-strong"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }
  if (detail.applications.length === 0) {
    return (
      <p className="w-full py-5 text-center text-sm text-neutral-500">
        {t("members.noApplications")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-neutral-200">
      {detail.applications.map((application) => (
        <ApplicationItem
          key={application.id}
          application={application}
          member={detail.member}
          activities={activities}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  );
}

function ApplicationItem({
  application,
  member,
  activities,
  currentUserId,
}: {
  application: MemberApplication;
  member: MemberDetail["member"];
  activities: RecentMemberProgress[];
  currentUserId?: string;
}) {
  const { t, locale, relativeTime } = useI18n();
  const statusChange = activities.find(
    (activity) =>
      activity.application.id === application.id && activity.fromStage !== null,
  );
  const method = application.applicationMethod
    ? formatApplicationMethod(application.applicationMethod, t)
    : null;
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 text-start">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">
            {application.companyName}
          </h3>
          <StatusBadge kind="stage" value={application.stage} />
          {application.outcome && (
            <StatusBadge kind="outcome" value={application.outcome} />
          )}
        </div>
        <p className="mt-1 w-full text-start text-sm text-neutral-700">
          {application.jobTitle}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>{t("members.appliedDate", { date: formatDisplayDate(application.applicationDate, locale) })}</span>
          {application.location && <span>{application.location}</span>}
          {method && <span>{t("members.viaMethod", { method })}</span>}
          {statusChange && (
            <span>
              {t("members.statusChanged", { time: relativeTime(statusChange.changedAt) })}
            </span>
          )}
          <span>{t("members.lastUpdated", { time: relativeTime(application.updatedAt) })}</span>
        </div>
        {application.sharedCompany && (
          <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-info-border bg-info-soft/70 px-3 py-2 text-xs text-info-strong">
            <span className="font-semibold">{t("members.sharedCompany")}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t("members.sharedCompanyContext", { member: member.id === currentUserId ? t("members.you") : member.name, others: application.otherMembers.map((other) => other.name).join(", "), company: application.companyName })}
            </span>
          </div>
        )}
      </div>
      {application.jobUrl && (
        <a
          href={application.jobUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong"
        >
          {t("members.openJob")}{" "}
          <span className="ms-1" aria-hidden="true">
            ↗
          </span>
        </a>
      )}
    </li>
  );
}

export interface MemberRowState {
  variant: "desktop" | "mobile";
  member: MemberProgress;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  detail?: MemberDetail;
  detailLoading: boolean;
  detailError: boolean;
  onRetry: () => void;
  activities: RecentMemberProgress[];
  currentUserId?: string;
}

export function MemberProgressRow(props: MemberRowState) {
  const { t } = useI18n();
  const { variant, member, isCurrentUser, expanded, onToggle, onOpenProfile } = props;
  const detail = expanded ? (
    <MemberDetailContent
      member={member}
      detail={props.detail}
      activities={props.activities}
      currentUserId={props.currentUserId}
      loading={props.detailLoading}
      error={props.detailError}
      onRetry={props.onRetry}
    />
  ) : null;
  const noApplications =
    expanded &&
    !props.detailLoading &&
    !props.detailError &&
    props.detail?.applications.length === 0;
  if (variant === "desktop") {
    return (
      <>
        <tr
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${member.name}: ${expanded ? t("members.hideApplications") : t("members.viewApplications")}`}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
          className={`hidden cursor-pointer border-t border-neutral-200 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong md:table-row ${isCurrentUser ? "bg-info-soft/20" : ""}`}
        >
          <th scope="row" onClick={(event) => event.stopPropagation()} className="data-table-cell ps-5 text-start sm:ps-6">
            <MemberIdentity
              member={member}
              isCurrentUser={isCurrentUser}
              expanded={expanded}
              onToggle={onToggle}
              onOpenProfile={onOpenProfile}
              controlsId={`member-details-${member.memberId}-desktop`}
            />
          </th>
          {STAGES.map((stage) => (
            <td
              key={stage}
            className="data-table-cell px-2 py-5 text-center sm:px-3"
            >
              <ProgressCount
                stage={stage}
                count={member.counts[stage]}
                highlightSuccess={member.hasAcceptedApplication}
              />
              <span className="sr-only">{stage}</span>
            </td>
          ))}
          <td className="data-table-cell pe-5 text-end">
            <LastUpdated value={member.lastUpdatedAt} />
          </td>
        </tr>
        <tr
          className={
            expanded ? "bg-neutral-50/70 member-detail-enter" : "hidden"
          }
        >
          <td
            id={`member-details-${member.memberId}-desktop`}
            colSpan={6}
            className="px-6 pb-5"
          >
            <div
              className={
                noApplications
                  ? "flex min-h-20 items-center justify-center"
                  : "ms-[24%] border-s border-neutral-300/80 ps-4 dark:border-neutral-700"
              }
            >
              {detail}
            </div>
          </td>
        </tr>
      </>
    );
  }
  return (
    <article
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${member.name}: ${expanded ? t("members.hideApplications") : t("members.viewApplications")}`}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong ${isCurrentUser ? "border-s-2 border-s-info-strong" : ""}`}
    >
      <div className="flex items-start justify-between gap-3" onClick={(event) => event.stopPropagation()}>
        <MemberIdentity
          member={member}
          isCurrentUser={isCurrentUser}
          expanded={expanded}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
          controlsId={`member-details-${member.memberId}-mobile`}
        />
        <LastUpdated value={member.lastUpdatedAt} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-0">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
              <ProgressStageIcon stage={stage} />
              {t(`applications.${stage === "applied" ? "submitted" : stage}`)}
            </p>
            <ProgressCount
              stage={stage}
              count={member.counts[stage]}
              highlightSuccess={member.hasAcceptedApplication}
            />
          </div>
        ))}
      </div>
      <div
        id={`member-details-${member.memberId}-mobile`}
        hidden={!expanded}
        onClick={(event) => event.stopPropagation()}
        className="member-detail-enter mt-4 border-t border-neutral-200 pt-2"
      >
        {detail}
      </div>
    </article>
  );
}
