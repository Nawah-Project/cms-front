import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
} from "../api/adminApi";
import {
  ActivityBadge,
  EmptyState,
  Initials,
  JourneyBadge,
  LoadingState,
  relativeTime,
  timeTitle,
} from "./AdminUI";
import { AdminMemberDetail } from "./AdminMemberDetail";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/ToastProvider";
import { useI18n } from "../../../i18n";

export function GroupMembersDrawer({
  group,
  onClose,
  onGroupUpdated,
}: {
  group: AdminGroup | null;
  onClose: () => void;
  onGroupUpdated?: () => void;
}) {
  const { t, tp, locale, number } = useI18n();
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] = useState<AdminMember | null>(
    null,
  );
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (group) {
      if (!dialog.open) dialog.showModal();
      setLoading(true);
      setError(false);
      adminApi
        .users({ groupId: group.id, limit: 50 })
        .then((res) => setMembers(res.items))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      if (dialog.open) dialog.close();
      setMembers([]);
    }
  }, [group]);

  const confirmRemoval = async () => {
    if (!group || !removingMember) return;
    setRemoveLoading(true);
    try {
      await adminApi.removeFromGroup(group.id, removingMember.id);
      const msg = t("admin.removedSuccess", {
        name: removingMember.name,
        group: group.name,
      });
      toast.success(msg);
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id));
      setRemovingMember(null);
      onGroupUpdated?.();
    } catch {
      toast.error(t("admin.actionFailed"));
    } finally {
      setRemoveLoading(false);
    }
  };

  if (!group) return null;

  const capacityPct = Math.min(
    100,
    Math.round((group.memberCount / Math.max(1, group.capacity)) * 100),
  );

  return (
    <>
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        onMouseDown={(e) => {
          if (e.target === dialogRef.current) onClose();
        }}
        aria-labelledby="group-drawer-title"
        className="fixed inset-y-0 end-0 m-0 h-full w-full max-w-lg overflow-y-auto border-s border-border bg-surface p-0 text-start text-neutral-900 shadow-2xl backdrop:bg-neutral-950/40 dark:text-neutral-100"
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  {t("admin.group")}
                </p>
                <h2
                  id="group-drawer-title"
                  className="mt-0.5 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
                >
                  {group.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("admin.closeMemberDetails")}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {/* Capacity status bar */}
            <div className="mt-3.5 space-y-1.5 rounded-xl border border-border-subtle bg-neutral-50/70 p-3 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {t("admin.memberCapacity", {
                    members: number(group.memberCount),
                    capacity: number(group.capacity),
                  })}
                </span>
                <span
                  className={
                    group.availableSlots > 0
                      ? "font-semibold text-success-strong"
                      : "text-neutral-500"
                  }
                >
                  {group.availableSlots > 0
                    ? tp("common.spotCount", group.availableSlots)
                    : t("admin.full")}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-700 dark:bg-neutral-300 transition-all"
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>

            {/* Quick action: Open in full members table */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link
                to={`/admin/members?group=${encodeURIComponent(group.id)}`}
                className="text-xs font-semibold text-info-strong hover:underline"
              >
                {t("admin.openInMembersTable")}
              </Link>
              <span className="text-xs text-neutral-500">
                {tp("common.memberCount", members.length)}
              </span>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {loading ? (
              <LoadingState label={t("admin.loadingMembers")} />
            ) : error ? (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t("admin.loadSectionError")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setError(false);
                    adminApi
                      .users({ groupId: group.id, limit: 50 })
                      .then((res) => setMembers(res.items))
                      .catch(() => setError(true))
                      .finally(() => setLoading(false));
                  }}
                  className="button-secondary mt-3 text-xs"
                >
                  {t("admin.tryAgain")}
                </button>
              </div>
            ) : !members.length ? (
              <EmptyState>{t("admin.noMembersInGroup")}</EmptyState>
            ) : (
              <div className="divide-y divide-border-subtle">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(member)}
                        className="flex min-w-0 items-center gap-3 text-start hover:opacity-80"
                      >
                        <Initials name={member.name} avatar={member.avatar} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {member.name}
                          </p>
                          {member.email && (
                            <p className="truncate text-xs text-neutral-500">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </button>
                      <ActivityBadge
                        status={member.activityStatus}
                        days={member.inactivityDays}
                      />
                    </div>

                    <JourneyBadge journey={member.journey} />

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p
                        className="text-[11px] text-neutral-500"
                        title={timeTitle(member.lastActivityAt, locale)}
                      >
                        {t("admin.lastActivity")}:{" "}
                        {relativeTime(member.lastActivityAt, locale)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="button-secondary px-2.5 py-1 text-xs"
                        >
                          {t("admin.quickInspect")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemovingMember(member)}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-danger-border hover:bg-danger-soft hover:text-danger-strong dark:text-neutral-400"
                        >
                          {t("admin.removeFromGroup")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </dialog>

      {/* Member Details Modal */}
      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            if (group) {
              adminApi
                .users({ groupId: group.id, limit: 50 })
                .then((res) => setMembers(res.items))
                .catch(() => null);
            }
          }}
        />
      )}

      {/* Confirm Removal Dialog */}
      {removingMember && (
        <ConfirmDialog
          isOpen={Boolean(removingMember)}
          onClose={() => setRemovingMember(null)}
          onConfirm={() => void confirmRemoval()}
          title={t("admin.removeTitle", {
            name: removingMember.name,
            group: group.name,
          })}
          message={t("admin.removeDescription")}
          confirmLabel={t("admin.removeConfirm")}
          cancelLabel={t("admin.cancel")}
          isConfirming={removeLoading}
          variant="danger"
        />
      )}
    </>
  );
}

