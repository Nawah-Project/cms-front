import type { MemberProgress } from "../types/membersProgress.types";
import { ProgressCount, type ProgressStage } from "./ProgressCount";

const STAGES: ProgressStage[] = ["applied", "interview", "decision", "closed"];

export function MemberProgressRow({
  member,
  isCurrentUser,
}: {
  member: MemberProgress;
  isCurrentUser: boolean;
}) {
  const initial = member.name.trim().charAt(0).toLocaleUpperCase() || "?";

  return (
    <tr className="data-table-row group">
      <th scope="row" className="data-table-cell min-w-52 text-left">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {member.name}
            </span>
            {isCurrentUser && (
              <span className="mt-0.5 inline-block text-xs text-neutral-500 dark:text-neutral-400">
                You
              </span>
            )}
          </span>
        </div>
      </th>
      {STAGES.map((stage) => (
        <td key={stage} className="data-table-cell w-28 text-center sm:w-32">
          <ProgressCount stage={stage} count={member.counts[stage]} />
          <span className="sr-only">{stage}</span>
        </td>
      ))}
    </tr>
  );
}
