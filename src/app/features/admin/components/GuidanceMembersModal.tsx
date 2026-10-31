import { useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";

export type GuidanceMember = {
  id: string;
  name: string;
  groupName: string | null;
  currentNodeCode: string | null;
  available: boolean;
  read: boolean;
  completed: boolean;
  pending: boolean;
  blocking: boolean;
};
export type GuidanceAudienceFilter =
  "ALL" | "READ" | "COMPLETED" | "PENDING" | "BLOCKING";

export function GuidanceMembersModal({
  title,
  members,
  required,
  ar,
  initialFilter = "ALL",
  onClose,
}: {
  title: string;
  members: GuidanceMember[];
  required: boolean;
  ar: boolean;
  initialFilter?: GuidanceAudienceFilter;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const text = (a: string, e: string) => (ar ? a : e);
  const filters: {
    key: GuidanceAudienceFilter;
    label: string;
    matches: (m: GuidanceMember) => boolean;
  }[] = [
    {
      key: "ALL",
      label: text("متاح لهم", "Available to"),
      matches: () => true,
    },
    {
      key: "READ",
      label: text("قراءة مسجّلة", "Recorded read"),
      matches: (m) => m.read,
    },
    {
      key: "COMPLETED",
      label: text("أكملوه", "Completed"),
      matches: (m) => m.completed,
    },
    {
      key: "PENDING",
      label: text("بانتظار الإتمام", "Pending"),
      matches: (m) => m.pending,
    },
    ...(required
      ? [
          {
            key: "BLOCKING" as const,
            label: text("متوقفون عنده", "Blocked here"),
            matches: (m: GuidanceMember) => m.blocking,
          },
        ]
      : []),
  ];
  const visible = useMemo(
    () =>
      members.filter(
        (m) =>
          filters.find((f) => f.key === filter)?.matches(m) &&
          `${m.name} ${m.groupName ?? ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [members, filter, search],
  );
  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="space-y-4" data-guidance-members>
        <p className="text-sm leading-6 text-text-secondary">
          {required
            ? text(
                "إرشاد إلزامي بعد المهمة صفر. القراءة وحدها لا تعني الإتمام؛ يلزم تطبيق التعديل ورفع سيرة محدّثة. المتوقفون عنده لم يستوفوا هذا الشرط بعد.",
                "Required after Task 0. A read receipt alone is not completion: an updated CV must be uploaded after applying the guidance.",
              )
            : text(
                "الإتمام هنا يعني تسجيل قراءة الإرشاد، ولا يثبت تطبيق النصيحة عمليًا. هذا الإرشاد لا يوقف انتقال المهام الرئيسية.",
                "Completion here means a recorded read, not evidence of practical application. This guide does not block the main quest progression.",
              )}
        </p>
        <div
          className="flex flex-wrap gap-2"
          aria-label={text("حالة الإرشاد", "Guidance status")}
        >
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
                data-guidance-status={f.key}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${filter === f.key ? "border-accent bg-accent text-white" : "border-border bg-surface text-text-secondary"}`}
            >
              {f.label} · {members.filter(f.matches).length}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
          type="search"
          aria-label={text(
            "ابحث بالاسم أو المجموعة",
            "Search by name or group",
          )}
          placeholder={text(
            "ابحث بالاسم أو المجموعة…",
            "Search by name or group…",
          )}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-2" aria-live="polite">
          {visible.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-border bg-surface p-3"
              data-guidance-member={m.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{m.name}</strong>
                <span
                  className={`rounded-lg px-2 py-1 text-xs ${m.completed ? "bg-success-soft text-success-strong" : "bg-info-soft text-info-strong"}`}
                >
                  {m.completed
                    ? text("مكتمل", "Completed")
                    : m.blocking
                      ? text("متوقف عند هذا الإرشاد", "Blocked at this guide")
                      : text("بانتظار الإتمام", "Pending")}
                </span>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                {m.groupName || text("بدون مجموعة", "No group")} ·{" "}
                {m.read
                  ? text("قراءة مسجّلة", "Read recorded")
                  : text("لا توجد قراءة مسجّلة", "No read recorded")}
              </p>
              {required && m.read && !m.completed && (
                <p className="mt-1 text-xs text-text-secondary">
                  {text(
                    "قرأ الإرشاد؛ تحديث السيرة لم يُستكمل بعد.",
                    "Read the guide; CV update still pending.",
                  )}
                </p>
              )}
            </article>
          ))}
          {!visible.length && (
            <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-secondary">
              {text(
                "لا يوجد أعضاء في هذه الحالة ضمن النطاق المحدد.",
                "No members in this status in the selected scope.",
              )}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
