import { useCallback, useState } from "react";
import { membersProgressApi } from "../api/membersProgressApi";
import type {
  MemberDetail,
  MemberProgress,
  RecentMemberProgress,
} from "../types/membersProgress.types";
import { MemberProgressRow } from "./MemberProgressRow";
import { useI18n } from "../../../i18n";
import { ProgressStageIcon, type ProgressStage } from "./ProgressCount";
import { MemberProfessionalCard } from "../../profile/MemberProfessionalCard";

export function MembersProgressTable({
  members,
  currentUserId,
  activities,
}: {
  members: MemberProgress[];
  currentUserId?: string;
  activities: RecentMemberProgress[];
}) {
  const { t } = useI18n();
  const stageColumns: { stage: ProgressStage; label: string }[] = [
    { stage: "applied", label: t("applications.submitted") },
    { stage: "interview", label: t("applications.interview") },
    { stage: "decision", label: t("applications.decision") },
    { stage: "closed", label: t("applications.closed") },
  ];
  const columns = [t("members.member"), ...stageColumns.map(({ label }) => label), t("members.lastUpdatedLabel")];
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, MemberDetail>>({});
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [errorMemberId, setErrorMemberId] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<MemberProgress | null>(null);

  const loadMember = useCallback(async (memberId: string) => {
    setLoadingMemberId(memberId);
    setErrorMemberId(null);
    try {
      const detail = await membersProgressApi.getMemberDetail(memberId);
      setDetails((current) => ({ ...current, [memberId]: detail }));
    } catch {
      setErrorMemberId(memberId);
    } finally {
      setLoadingMemberId((current) => (current === memberId ? null : current));
    }
  }, []);

  const toggleMember = (memberId: string) => {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(memberId);
    if (!details[memberId]) void loadMember(memberId);
  };

  const retryMember = (memberId: string) => {
    void loadMember(memberId);
  };

  return (
    <div className="space-y-3">
      {profileMember && <MemberProfessionalCard member={profileMember} onClose={() => setProfileMember(null)} />}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm md:block">
        <table className="data-table w-full table-fixed">
          <caption className="sr-only">
            {t("members.tableCaption")}
          </caption>
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="data-table-head border-b border-neutral-300 bg-neutral-100 text-neutral-700">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`data-table-cell text-xs font-semibold uppercase tracking-wide text-neutral-700 ${index === 0 ? "ps-5 text-start sm:ps-6" : index === columns.length - 1 ? "pe-5 text-end" : "text-center"}`}
                >
                  {index > 0 && index < columns.length - 1 ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <ProgressStageIcon
                        stage={stageColumns[index - 1].stage}
                      />
                      <span>{column}</span>
                    </span>
                  ) : column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberProgressRow
                variant="desktop"
                key={member.memberId}
                member={member}
                isCurrentUser={
                  member.isCurrentUser ?? member.memberId === currentUserId
                }
                expanded={expandedMemberId === member.memberId}
                onToggle={() => toggleMember(member.memberId)}
                onOpenProfile={() => setProfileMember(member)}
                detail={details[member.memberId]}
                detailLoading={loadingMemberId === member.memberId}
                detailError={errorMemberId === member.memberId}
                onRetry={() => retryMember(member.memberId)}
                activities={activities}
                currentUserId={currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {members.map((member) => (
          <MemberProgressRow
            variant="mobile"
            key={member.memberId}
            member={member}
            isCurrentUser={
              member.isCurrentUser ?? member.memberId === currentUserId
            }
            expanded={expandedMemberId === member.memberId}
            onToggle={() => toggleMember(member.memberId)}
            onOpenProfile={() => setProfileMember(member)}
            detail={details[member.memberId]}
            detailLoading={loadingMemberId === member.memberId}
            detailError={errorMemberId === member.memberId}
            onRetry={() => retryMember(member.memberId)}
            activities={activities}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
