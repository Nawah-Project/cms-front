import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  adminApi,
  type ActivityStatus,
  type AdminActivity,
  type AdminGroup,
  type AdminMember,
} from "./api/adminApi";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { AdminActivityList } from "./components/AdminActivityList";
import { MemberInspectorModal } from "./components/MemberInspectorModal";
import { useI18n } from "../../i18n";
import {
  ActivityBadge,
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  StageCounts,
  timeTitle,
} from "./components/AdminUI";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/ToastProvider";
import {
  Activity,
  ChevronDown,
  Layers,
  Plus,
  Search,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

const statuses: ActivityStatus[] = [
  "ACTIVE",
  "WARNING",
  "CRITICAL",
  "NEVER_ACTIVE",
];

const journeyWeeks = [
  { val: "ALL", labelAr: "كل الأسابيع", labelEn: "All Weeks" },
  { val: "0", labelAr: "الأسبوع 0 (التهيئة)", labelEn: "Week 0 (Onboarding)" },
  { val: "1", labelAr: "الأسبوع 1", labelEn: "Week 1" },
  { val: "2", labelAr: "الأسبوع 2", labelEn: "Week 2" },
  { val: "3", labelAr: "الأسبوع 3", labelEn: "Week 3" },
  { val: "4", labelAr: "الأسبوع 4", labelEn: "Week 4" },
];

export default function AdminCommunityPage() {
  const { t, tp, locale, number } = useI18n();
  const isAr = locale === "ar";
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const tabParam =
    (searchParams.get("tab") as "members" | "groups" | "activity") || "members";
  const [activeTab, setActiveTab] = useState<"members" | "groups" | "activity">(
    tabParam,
  );

  useEffect(() => {
    const tParam = searchParams.get("tab") as
      "members" | "groups" | "activity" | null;
    if (tParam && ["members", "groups", "activity"].includes(tParam)) {
      setActiveTab(tParam);
    }
  }, [searchParams]);

  const switchTab = (newTab: "members" | "groups" | "activity") => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    });
  };

  // --- Members Tab State ---
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ActivityStatus>(
    "ALL",
  );
  const [weekFilter, setWeekFilter] = useState<string>("ALL");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [inspectorMemberId, setInspectorMemberId] = useState<string | null>(
    null,
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] = useState<AdminMember | null>(
    null,
  );
  const [assigningMember, setAssigningMember] = useState<AdminMember | null>(
    null,
  );
  const [targetGroupId, setTargetGroupId] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // --- Groups Tab State ---
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembersMap, setGroupMembersMap] = useState<
    Record<string, AdminMember[]>
  >({});
  const [loadingGroupIds, setLoadingGroupIds] = useState<
    Record<string, boolean>
  >({});
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // --- Activity Tab State ---
  const [activityItems, setActivityItems] = useState<AdminActivity[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotalCount, setActivityTotalCount] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(false);

  const PAGE_SIZE = 12;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Load Members
  const loadMembers = () => {
    setMembersLoading(true);
    setMembersError(false);
    void Promise.all([
      adminApi.users({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter === "ALL" ? {} : { activityStatus: statusFilter }),
        ...(groupFilter === "ALL" ? {} : { groupId: groupFilter }),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
      adminApi.groups(),
    ])
      .then(([usersRes, groupsRes]) => {
        let items = usersRes.items;
        if (weekFilter !== "ALL") {
          const wNum = Number(weekFilter);
          items = items.filter((m) => m.journey?.week === wNum);
        }
        setMembers(items);
        setTotalPages(usersRes.totalPages);
        setTotalCount(usersRes.total);
        setGroups(groupsRes.items);
      })
      .catch(() => setMembersError(true))
      .finally(() => setMembersLoading(false));
  };

  useEffect(() => {
    if (activeTab === "members" || activeTab === "groups") {
      loadMembers();
    }
  }, [page, statusFilter, weekFilter, groupFilter, debouncedSearch, activeTab]);

  // Load Activity
  const loadActivity = () => {
    setActivityLoading(true);
    setActivityError(false);
    void adminApi
      .activity({ page: activityPage, limit: 15 })
      .then((res) => {
        setActivityItems(res.items);
        setActivityTotalPages(res.totalPages || 1);
        setActivityTotalCount(res.total || res.items.length);
      })
      .catch(() => setActivityError(true))
      .finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivity();
    }
  }, [activityPage, activeTab]);

  // Group expansion
  const toggleGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    if (!groupMembersMap[groupId]) {
      setLoadingGroupIds((prev) => ({ ...prev, [groupId]: true }));
      try {
        const res = await adminApi.users({ groupId, limit: 50 });
        setGroupMembersMap((prev) => ({ ...prev, [groupId]: res.items }));
      } catch {
        toast.error(
          isAr ? "تعذر تحميل أعضاء المجموعة" : "Failed to load group members",
        );
      } finally {
        setLoadingGroupIds((prev) => ({ ...prev, [groupId]: false }));
      }
    }
  };

  // Actions
  const handleRemoveMember = async () => {
    if (!removingMember || !removingMember.group?.id) return;
    setRemoveLoading(true);
    try {
      await adminApi.removeFromGroup(
        removingMember.group.id,
        removingMember.id,
      );
      toast.success(
        t("admin.removedSuccess", {
          name: removingMember.name,
          group: removingMember.group.name,
        }),
      );
      setRemovingMember(null);
      loadMembers();
    } catch {
      toast.error(isAr ? "تعذر إزالة العضو" : "Failed to remove member");
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleAssignMember = async () => {
    if (!assigningMember || !targetGroupId) return;
    setAssignLoading(true);
    try {
      await adminApi.assignToGroup(assigningMember.id, targetGroupId);
      const targetGroup = groups.find((g) => g.id === targetGroupId);
      toast.success(
        t("admin.assignedSuccess", {
          name: assigningMember.name,
          group: targetGroup?.name || "",
        }),
      );
      setAssigningMember(null);
      setTargetGroupId("");
      loadMembers();
    } catch {
      toast.error(
        isAr ? "تعذر تعيين العضو للمجموعة" : "Failed to assign member",
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await adminApi.createGroup(newGroupName.trim());
      toast.success(
        isAr ? "تم إنشاء المجموعة بنجاح" : "Group created successfully",
      );
      setNewGroupName("");
      setCreateGroupModalOpen(false);
      loadMembers();
    } catch {
      toast.error(isAr ? "فشل إنشاء المجموعة" : "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Internal Tabs Bar */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => switchTab("members")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "members"
              ? "border-neutral-900 text-neutral-950 font-bold dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{isAr ? "الأعضاء وحالاتهم" : "Members Management"}</span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-xs font-mono text-neutral-700 dark:text-neutral-300">
            {number(totalCount)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("groups")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "groups"
              ? "border-neutral-900 text-neutral-950 font-bold dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>{isAr ? "إدارة المجموعات" : "Cohorts & Groups"}</span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-xs font-mono text-neutral-700 dark:text-neutral-300">
            {number(groups.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("activity")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "activity"
              ? "border-neutral-900 text-neutral-950 font-bold dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>{isAr ? "سجل نشاط المنصة" : "Platform Activity Feed"}</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS MANAGEMENT */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    isAr
                      ? "بحث بالاسم، البريد، أو التخصص..."
                      : "Search by name, email, specialization..."
                  }
                  className="field-control w-full ps-9 text-xs"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="field-control text-xs"
              >
                <option value="ALL">
                  {isAr ? "كل الحالات" : "All Statuses"}
                </option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {t(`admin.activityFilter.${s}`)}
                  </option>
                ))}
              </select>

              {/* Journey Week Filter */}
              <select
                value={weekFilter}
                onChange={(e) => {
                  setWeekFilter(e.target.value);
                  setPage(1);
                }}
                className="field-control text-xs"
              >
                {journeyWeeks.map((w) => (
                  <option key={w.val} value={w.val}>
                    {isAr ? w.labelAr : w.labelEn}
                  </option>
                ))}
              </select>

              {/* Group Filter */}
              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value);
                  setPage(1);
                }}
                className="field-control text-xs"
              >
                <option value="ALL">
                  {isAr ? "كل المجموعات" : "All Groups"}
                </option>
                <option value="UNASSIGNED">
                  {isAr ? "الأعضاء غير المسندين (شاغر)" : "Unassigned Members"}
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount}/{g.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {membersLoading ? (
            <LoadingState label={t("admin.loadingMembers")} />
          ) : membersError ? (
            <ErrorState onRetry={loadMembers} />
          ) : !members.length ? (
            <EmptyState>{t("admin.noMembersMatch")}</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead className="border-b border-border bg-neutral-50/90 text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400 font-medium">
                  <tr>
                    <th className="px-4 py-3 text-start">
                      {t("admin.member")}
                    </th>
                    <th className="px-3 py-3 text-start">
                      {isAr ? "المحطة الحالية" : "Current Node"}
                    </th>
                    <th className="px-3 py-3 text-start">{t("admin.group")}</th>
                    <th className="px-3 py-3 text-start">
                      {t("admin.applications")}
                    </th>
                    <th className="px-3 py-3 text-start">
                      {isAr ? "المهام" : "Tasks"}
                    </th>
                    <th className="px-3 py-3 text-start">
                      {t("admin.status")}
                    </th>
                    <th className="px-4 py-3 text-end">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Initials name={member.name} avatar={member.avatar} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setInspectorMemberId(member.id)}
                              className="font-semibold text-neutral-950 dark:text-neutral-100 hover:text-info-strong hover:underline cursor-pointer truncate block"
                            >
                              {member.name}
                            </button>
                            <span className="text-[11px] text-neutral-500 block truncate">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <JourneyBadge journey={member.journey} />
                      </td>

                      <td className="px-3 py-3.5 text-neutral-700 dark:text-neutral-300">
                        {member.group ? (
                          <span className="font-medium">
                            {member.group.name}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                            {t("common.unassigned")}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold tabular-nums text-neutral-950 dark:text-neutral-100">
                            {number(member.applicationsCount)}
                          </span>
                          <StageCounts
                            counts={member.currentStageCounts}
                            compact
                          />
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-neutral-600 dark:text-neutral-400">
                        {member.development?.overdue ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold text-xs">
                            {member.development.overdue}{" "}
                            {isAr ? "متأخرة" : "overdue"}
                          </span>
                        ) : member.development?.active ? (
                          <span className="text-emerald-700 dark:text-emerald-400 text-xs">
                            {member.development.active}{" "}
                            {isAr ? "نشطة" : "active"}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <ActivityBadge
                          status={member.activityStatus}
                          days={member.inactivityDays ?? null}
                        />
                      </td>

                      <td className="px-4 py-3.5 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectorMemberId(member.id)}
                            className="button-secondary text-xs px-2.5 py-1"
                          >
                            {isAr ? "الملف والتفاصيل" : "Profile 360°"}
                          </button>
                          {member.group ? (
                            <button
                              type="button"
                              onClick={() => setRemovingMember(member)}
                              className="rounded-lg p-1 text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title={t("admin.removeFromGroup")}
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssigningMember(member)}
                              className="rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 px-2 py-1 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5 inline me-1" />
                              {isAr ? "تعيين" : "Assign"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-xs text-neutral-400">
                    {t("admin.pageOf", {
                      page: number(page),
                      pages: number(totalPages),
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="button-secondary px-3 py-1 text-xs disabled:opacity-40"
                    >
                      {t("admin.previous")}
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="button-secondary px-3 py-1 text-xs disabled:opacity-40"
                    >
                      {t("admin.next")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUPS MANAGEMENT */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
              {isAr ? "مجموعات المتدربين النشطة" : "Active Cohorts"}
            </h3>
            <button
              type="button"
              onClick={() => setCreateGroupModalOpen(true)}
              className="button-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>
                {isAr ? "+ إنشاء مجموعة جديدة" : "+ Create New Cohort"}
              </span>
            </button>
          </div>

          <div className="grid gap-3">
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              const membersInGroup = groupMembersMap[group.id] ?? [];
              const isLoadingMembers = loadingGroupIds[group.id];
              const capPercent = Math.min(
                100,
                Math.round(
                  (group.memberCount / Math.max(1, group.capacity)) * 100,
                ),
              );

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs"
                >
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold border border-neutral-200 dark:border-neutral-700">
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                          {group.name}
                          <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-[11px] font-mono text-neutral-800 dark:text-neutral-200">
                            {group.memberCount} / {group.capacity} ({capPercent}
                            %)
                          </span>
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="w-24 bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all"
                              style={{ width: `${capPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-neutral-500">
                            {isAr
                              ? `المقاعد الشاغرة: ${group.availableSlots} مقعد`
                              : `Open seats: ${group.availableSlots}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {group.activeMembers} {isAr ? "نشط" : "active"}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {group.warningMembers} {isAr ? "تحذير" : "warning"}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-rose-700 dark:text-rose-400 font-medium">
                          {group.criticalMembers} {isAr ? "منقطع" : "critical"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-neutral-50/70 dark:bg-neutral-900/40 p-4 space-y-3 animate-in fade-in duration-150">
                      {isLoadingMembers ? (
                        <LoadingState
                          label={
                            isAr
                              ? "جارٍ تحميل الأعضاء..."
                              : "Loading members..."
                          }
                        />
                      ) : !membersInGroup.length ? (
                        <EmptyState>
                          {isAr
                            ? "لا يوجد أعضاء في هذه المجموعة حالياً."
                            : "No members in this group yet."}
                        </EmptyState>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {membersInGroup.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                            >
                              <div className="flex items-center gap-2.5">
                                <Initials name={m.name} avatar={m.avatar} />
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setInspectorMemberId(m.id)}
                                    className="text-xs font-semibold text-neutral-950 dark:text-neutral-100 hover:text-info-strong hover:underline cursor-pointer"
                                  >
                                    {m.name}
                                  </button>
                                  <p className="text-[10px] text-neutral-500">
                                    {m.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ActivityBadge
                                  status={m.activityStatus}
                                  days={m.inactivityDays ?? null}
                                />
                                <button
                                  type="button"
                                  onClick={() => setRemovingMember(m)}
                                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                                >
                                  {isAr ? "إزالة" : "Remove"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM ACTIVITY FEED */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                {isAr
                  ? "سجل نشاط المنصة المباشر"
                  : "Platform Activity Audit Feed"}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {isAr
                  ? "تحركات الأعضاء، إنشاء وتعديل طلبات التقديم، والانتقال للمقابلات والأسيمنت"
                  : "Live feed of member job applications, stage promotions, and achievements"}
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {number(activityTotalCount)}{" "}
              {isAr ? "حدث مسجل" : "events recorded"}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-surface px-5 py-3 shadow-xs">
            {activityLoading ? (
              <LoadingState label={t("admin.loadingActivity")} />
            ) : activityError ? (
              <ErrorState onRetry={loadActivity} />
            ) : !activityItems.length ? (
              <EmptyState>{t("admin.noRecentActivity")}</EmptyState>
            ) : (
              <>
                <AdminActivityList items={activityItems} />
                {activityTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <span className="text-xs text-neutral-400">
                      {t("admin.pageOf", {
                        page: number(activityPage),
                        pages: number(activityTotalPages),
                      })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={activityPage <= 1}
                        onClick={() =>
                          setActivityPage((p) => Math.max(1, p - 1))
                        }
                        className="button-secondary px-3 py-1 text-xs disabled:opacity-40"
                      >
                        {t("admin.previous")}
                      </button>
                      <button
                        type="button"
                        disabled={activityPage >= activityTotalPages}
                        onClick={() =>
                          setActivityPage((p) =>
                            Math.min(activityTotalPages, p + 1),
                          )
                        }
                        className="button-secondary px-3 py-1 text-xs disabled:opacity-40"
                      >
                        {t("admin.next")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            loadMembers();
          }}
        />
      )}

      {/* Remove Confirm Modal */}
      {removingMember && (
        <ConfirmDialog
          isOpen={Boolean(removingMember)}
          title={t("admin.removeTitle", {
            name: removingMember.name,
            group: removingMember.group?.name || "",
          })}
          message={t("admin.removeDescription")}
          confirmLabel={t("admin.removeConfirm")}
          onConfirm={handleRemoveMember}
          onClose={() => setRemovingMember(null)}
          isConfirming={removeLoading}
        />
      )}

      {/* Assign Member Modal */}
      {assigningMember && (
        <Modal
          isOpen={Boolean(assigningMember)}
          onClose={() => {
            setAssigningMember(null);
            setTargetGroupId("");
          }}
          title={t("admin.assignTitle", { name: assigningMember.name })}
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              {t("admin.assignDescription")}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t("admin.destinationGroup")}
              </label>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="field-control w-full text-xs"
              >
                <option value="">
                  {isAr ? "اختر مجموعة..." : "Select group..."}
                </option>
                {groups
                  .filter((g) => g.availableSlots > 0)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.availableSlots}{" "}
                      {isAr ? "مقعد شاغر" : "slots available"})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigningMember(null)}
                className="button-secondary px-3 py-1.5 text-xs"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!targetGroupId || assignLoading}
                onClick={handleAssignMember}
                className="button-primary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                {assignLoading ? t("admin.adding") : t("admin.addToGroup")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Group Modal */}
      {createGroupModalOpen && (
        <Modal
          isOpen={createGroupModalOpen}
          onClose={() => setCreateGroupModalOpen(false)}
          title={isAr ? "إنشاء مجموعة جديدة" : "Create New Cohort"}
        >
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "اسم المجموعة *" : "Cohort Name *"}
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={
                  isAr ? "مثال: مجموعة الرياض 4" : "e.g. Cohort Alpha 4"
                }
                className="field-control w-full text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateGroupModalOpen(false)}
                className="button-secondary px-3 py-1.5 text-xs"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim()}
                className="button-primary px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                {creatingGroup
                  ? isAr
                    ? "جارٍ الإنشاء..."
                    : "Creating..."
                  : isAr
                    ? "إنشاء المجموعة"
                    : "Create Group"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Member 360° profile dialog */}
      <MemberInspectorModal
        memberId={inspectorMemberId}
        onClose={() => setInspectorMemberId(null)}
        onMemberUpdated={loadMembers}
      />
    </div>
  );
}
