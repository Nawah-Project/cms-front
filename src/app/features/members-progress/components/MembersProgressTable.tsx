import type { MemberProgress } from "../types/membersProgress.types";
import { MemberProgressRow } from "./MemberProgressRow";

const COLUMNS = ["Member", "Applied", "Interview", "Decision", "Closed"];

export function MembersProgressTable({
  members,
  currentUserId,
}: {
  members: MemberProgress[];
  currentUserId?: string;
}) {
  return (
    <div className="data-table-shell">
      <table className="data-table min-w-[700px]">
        <thead>
          <tr className="data-table-head">
            {COLUMNS.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`data-table-cell font-medium ${index === 0 ? "text-left" : "w-28 text-center sm:w-32"}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberProgressRow
              key={member.userId}
              member={member}
              isCurrentUser={
                member.isCurrentUser ?? member.userId === currentUserId
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
