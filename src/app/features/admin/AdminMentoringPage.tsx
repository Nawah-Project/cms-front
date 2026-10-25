import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useI18n } from "../../i18n";
import { adminApi, type AdminGroup, type AdminMember } from "./api/adminApi";
import { AdminMemberTasks } from "./components/AdminMemberTasks";
import { MemberInspectorDrawer } from "./components/MemberInspectorDrawer";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { TaskFormDialog } from "../professional-development/components/TaskFormDialog";
import type { CreateTaskInput, UpdateTaskInput, FeedbackPost } from "../professional-development/types";
import {
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  relativeTime,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import { Modal } from "../../components/ui/Modal";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  User,
  Users,
} from "lucide-react";

export default function AdminMentoringPage() {
  const { t, tp, locale, number } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active workspace tab for selected member: "tasks" | "feedback"
  const [workspaceTab, setWorkspaceTab] = useState<"tasks" | "feedback">("tasks");

  // --- Members & Groups Data ---
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Selected Member
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Filter & Search in member list
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<"ALL" | "OVERDUE" | "TASK_0">("ALL");

  // Inspect Member Drawer
  const [inspectorMemberId, setInspectorMemberId] = useState<string | null>(null);

  // Dialogs
  const [taskFormTarget, setTaskFormTarget] = useState<
    | { type: "MEMBER"; member: AdminMember }
    | { type: "GROUP"; group: AdminGroup }
    | null
  >(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [selectedCohortForTask, setSelectedCohortForTask] = useState<AdminGroup | null>(null);

  // Feedback State
  const [feedbackPosts, setFeedbackPosts] = useState<FeedbackPost[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotalCount, setFeedbackTotalCount] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackPost | null>(null);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);
  const [feedbackScope, setFeedbackScope] = useState<"MEMBER_ONLY" | "ALL">("MEMBER_ONLY");

  // Load directory
  const loadDirectory = useCallback(() => {
    setDataLoading(true);
    Promise.all([
      adminApi.users({ limit: 100 }),
      adminApi.groups(),
    ])
      .then(([usersRes, groupsRes]) => {
        setMembers(usersRes.items);
        setGroups(groupsRes.items);
        if (usersRes.items.length) {
          setSelectedMemberId((prev) => prev ?? usersRes.items[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // Load Feedback Posts
  const loadFeedback = useCallback((p = 1) => {
    setFeedbackLoading(true);
    setFeedbackError(false);
    adminApi
      .feedbackPosts(p, 50, false, "member")
      .then((res) => {
        setFeedbackPosts(res.items);
        setFeedbackPage(res.page);
        setFeedbackTotalPages(res.totalPages);
        setFeedbackTotalCount(res.total);
      })
      .catch(() => setFeedbackError(true))
      .finally(() => setFeedbackLoading(false));
  }, []);

  useEffect(() => {
    loadFeedback(1);
  }, [loadFeedback]);

  // Selected member object
  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) ?? members[0] ?? null,
    [members, selectedMemberId],
  );

  // Metrics
  const activeTasksCount = useMemo(
    () => members.reduce((acc, m) => acc + (m.development?.active || 0), 0),
    [members],
  );
  const overdueTasksCount = useMemo(
    () => members.reduce((acc, m) => acc + (m.development?.overdue || 0), 0),
    [members],
  );

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (memberFilter === "OVERDUE") {
        return Boolean(m.development?.overdue && m.development.overdue > 0);
      }
      if (memberFilter === "TASK_0") {
        return m.journey?.nodeCode === "TASK_0";
      }

      return true;
    });
  }, [members, searchQuery, memberFilter]);

  // Feedback relevant to selected member
  const memberFeedbackPosts = useMemo(() => {
    if (!selectedMember || feedbackScope === "ALL") return feedbackPosts;
    return feedbackPosts.filter((post) => {
      if (post.targetUser?.id === selectedMember.id) return true;
      if (post.visibility === "GROUP" && post.group?.id === selectedMember.group?.id) return true;
      if (post.visibility === "ALL") return true;
      return false;
    });
  }, [feedbackPosts, selectedMember, feedbackScope]);

  // Handle Task Submit
  const handleCreateTask = async (input: CreateTaskInput | UpdateTaskInput) => {
    if (!input.title?.trim()) throw new Error("Task title is required");
    const createInput: CreateTaskInput = {
      ...input,
      title: input.title,
      description: input.description ?? undefined,
      startDate: input.startDate ?? undefined,
      dueDate: input.dueDate ?? undefined,
    };
    if (!taskFormTarget) return;
    try {
      if (taskFormTarget.type === "MEMBER") {
        await adminApi.createTask(taskFormTarget.member.id, createInput);
        toast.success(isAr ? "تم إسناد المهمة للعضو بنجاح" : "Task assigned successfully");
      } else {
        await adminApi.createTaskForGroup(taskFormTarget.group.id, createInput);
        toast.success(
          isAr
            ? `تم إسناد المهمة لجميع أعضاء ${taskFormTarget.group.name}`
            : `Task assigned to cohort ${taskFormTarget.group.name}`,
        );
      }
      setTaskFormOpen(false);
      setTaskFormTarget(null);
      loadDirectory();
    } catch {
      toast.error(isAr ? "فشل إسناد المهمة" : "Failed to assign task");
    }
  };

  // Archive Feedback
  const handleArchiveFeedback = async (id: string) => {
    try {
      await adminApi.archiveFeedback(id);
      toast.success(isAr ? "تمت أرشفة الملاحظة" : "Note archived");
      loadFeedback(feedbackPage);
    } catch {
      toast.error(isAr ? "فشل أرشفة الملاحظة" : "Failed to archive");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METRICS STRIP & BULK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? "المهام التخصصية النشطة" : "Active Tasks"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-soft text-info-strong dark:bg-info-soft/20 dark:text-info-strong">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-950 dark:text-neutral-100">
              {number(activeTasksCount)}
            </span>
            <span className="text-xs text-neutral-500">
              {isAr ? "مهمة قيد التنفيذ" : "in progress"}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? "المهام المتأخرة" : "Overdue Tasks"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {number(overdueTasksCount)}
            </span>
            <span className="text-xs text-neutral-500">
              {isAr ? "تجاوزت الموعد" : "overdue"}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? "توجيهات وملاحظات المنتور" : "Guidance Notes"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-950 dark:text-neutral-100">
              {number(feedbackTotalCount)}
            </span>
            <span className="text-xs text-neutral-500">
              {isAr ? "ملاحظة مرسلة" : "notes sent"}
            </span>
          </div>
        </div>

        {/* Action Card: Cohort Bulk Assignment */}
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800 flex flex-col justify-center">
          <button
            type="button"
            onClick={() => {
              if (groups.length > 0) {
                setSelectedCohortForTask(groups[0]);
                setCohortModalOpen(true);
              } else {
                toast.error(isAr ? "لا توجد مجموعات متاحة" : "No cohorts found");
              }
            }}
            className="button-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span>{isAr ? "📢 إسناد لمجموعة كاملة" : "📢 Assign to Entire Cohort"}</span>
          </button>
          <p className="text-[11px] text-neutral-500 text-center mt-2">
            {isAr ? "إرسال مهمة تخصصية لجميع أعضاء دفعة معينة" : "Broadcast task to all cohort members"}
          </p>
        </div>
      </div>

      {/* 2. MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN (lg:col-span-4): MEMBERS DIRECTORY & FILTERS */}
        <div className="lg:col-span-4 rounded-2xl border border-neutral-200/80 bg-surface p-4 space-y-4 shadow-xs dark:border-neutral-800">
          <div>
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                {isAr ? "أعضاء البرنامج" : "Members Directory"}
              </h3>
              <span className="text-xs font-semibold text-neutral-500">
                {number(filteredMembers.length)} {isAr ? "عضو" : "members"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث بالاسم أو الإيميل أو الدفعة..." : "Search name, email, cohort..."}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/60 py-1.5 ps-9 pe-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-surface focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100 dark:focus:border-neutral-100"
              />
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => setMemberFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  memberFilter === "ALL"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
              >
                {isAr ? "الكل" : "All"}
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter("OVERDUE")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  memberFilter === "OVERDUE"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <span>{isAr ? "مهام متأخرة" : "Overdue"}</span>
                <span className="font-bold">🔴</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter("TASK_0")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  memberFilter === "TASK_0"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {isAr ? "عالقون في المهمة 0" : "Stuck in Task 0"}
              </button>
            </div>
          </div>

          {/* Members Scroll List */}
          <div className="max-h-[640px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 pe-1">
            {dataLoading ? (
              <LoadingState label={isAr ? "جارٍ تحميل الأعضاء..." : "Loading members..."} />
            ) : !filteredMembers.length ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                {isAr ? "لا توجد نتائج مطابقة للبحث" : "No matching members found"}
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`flex w-full items-center justify-between p-2.5 rounded-xl text-start transition-all cursor-pointer my-1 ${
                      isSelected
                        ? "bg-neutral-100 border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 shadow-xs"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Initials name={m.name} avatar={m.avatar} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-950 dark:text-neutral-100 truncate">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {m.group?.name || t("common.unassigned")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1 ms-2">
                      <JourneyBadge journey={m.journey} compact />
                      {Boolean(m.development?.overdue) && (
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                          {m.development?.overdue} {isAr ? "متأخرة" : "overdue"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT COLUMN (lg:col-span-8): SELECTED MEMBER WORKSPACE */}
        <div className="lg:col-span-8 space-y-4">
          {selectedMember ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-5">
              {/* Member Workspace Header (Fixed DOM: No div inside h4) */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-start gap-3.5 min-w-0">
                  <Initials name={selectedMember.name} avatar={selectedMember.avatar} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-neutral-950 dark:text-neutral-100">
                        {selectedMember.name}
                      </h2>
                      <JourneyBadge journey={selectedMember.journey} compact />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {selectedMember.email} · {selectedMember.group?.name || t("common.unassigned")}
                    </p>
                  </div>
                </div>

                {/* Inspect Drawer Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectorMemberId(selectedMember.id)}
                    className="button-secondary text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{isAr ? "ملف العضو والسيرة 360°" : "Member 360° Profile"}</span>
                  </button>
                </div>
              </div>

              {/* Unified Workspace Action Bar & Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                {/* Internal Tabs Switcher */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("tasks")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      workspaceTab === "tasks"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {isAr ? "المهام التخصصية المسندة" : "Assigned Tasks"}
                    </span>
                    <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.2 text-[10px] font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                      {selectedMember.development?.active ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("feedback")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      workspaceTab === "feedback"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>
                      {isAr ? "سجل ملاحظات وتوجيهات المنتور" : "Mentor Notes"}
                    </span>
                    <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.2 text-[10px] font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                      {memberFeedbackPosts.length}
                    </span>
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskFormTarget({ type: "MEMBER", member: selectedMember });
                      setTaskFormOpen(true);
                    }}
                    className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAr ? "+ إسناد مهمة جديدة" : "+ Assign Task"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingFeedback(null);
                      setFeedbackFormOpen(true);
                    }}
                    className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                    <span>{isAr ? "+ إرسال ملاحظة توجيهية" : "+ Send Guidance"}</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: MEMBER TASKS */}
              {workspaceTab === "tasks" && (
                <div className="pt-2">
                  <AdminMemberTasks
                    member={selectedMember}
                    onChanged={loadDirectory}
                  />
                </div>
              )}

              {/* TAB 2: MEMBER FEEDBACK NOTES */}
              {workspaceTab === "feedback" && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {isAr ? "نطاق العرض:" : "View Scope:"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFeedbackScope("MEMBER_ONLY")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          feedbackScope === "MEMBER_ONLY"
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {isAr ? `توجيهات ${selectedMember.name} والمجموعة` : `Targeted to ${selectedMember.name}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackScope("ALL")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          feedbackScope === "ALL"
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {isAr ? "جميع التوجيهات العامة" : "All Guidance Posts"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingFeedback(null);
                        setFeedbackFormOpen(true);
                      }}
                      className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isAr ? "+ ملاحظة جديدة" : "+ New Note"}</span>
                    </button>
                  </div>

                  {feedbackLoading ? (
                    <LoadingState label={isAr ? "جارٍ تحميل التوجيهات..." : "Loading guidance notes..."} />
                  ) : feedbackError ? (
                    <ErrorState onRetry={() => loadFeedback(feedbackPage)} />
                  ) : !memberFeedbackPosts.length ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
                      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        {isAr ? "لا توجد ملاحظات توجيهية مرسلة لهذا العضو بعد" : "No guidance notes sent to this member yet"}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {isAr
                          ? "يمكنك كتابة ملاحظة مخصصة أو نصائح تدريبية له بالضغط على زر إرسال ملاحظة توجيهية"
                          : "Send a targeted guidance note to support this member's progress"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {memberFeedbackPosts.map((post) => (
                        <div
                          key={post.id}
                          className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-4 space-y-2.5 shadow-xs dark:border-neutral-700 dark:bg-neutral-800/60"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    post.visibility === "DIRECT"
                                      ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                      : post.visibility === "GROUP"
                                      ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  }`}
                                >
                                  {post.visibility === "DIRECT"
                                    ? isAr ? "مباشر للعضو" : "Direct Member"
                                    : post.visibility === "GROUP"
                                    ? isAr ? `مجموعة: ${post.group?.name || ""}` : `Group: ${post.group?.name || ""}`
                                    : isAr ? "إعلان عام" : "Public Announcement"}
                                </span>
                                {post.targetUser && (
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    → {post.targetUser.name}
                                  </span>
                                )}
                                <span className="text-xs text-neutral-500">
                                  {relativeTime(post.publishedAt, locale)}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                                {post.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeedback(post);
                                  setFeedbackFormOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80 dark:hover:text-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                                title={isAr ? "تعديل" : "Edit"}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveFeedback(post.id)}
                                className="rounded-lg p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title={isAr ? "أرشفة" : "Archive"}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                            {post.content}
                          </p>

                          {Boolean(post.resources?.length) && (
                            <div className="pt-2 flex flex-wrap gap-2 border-t border-neutral-200 dark:border-neutral-700">
                              {post.resources?.map((r, i) => (
                                <a
                                  key={i}
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[11px] font-medium text-info-strong border border-neutral-200 hover:underline dark:border-neutral-700"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>{r.title}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200/80 bg-surface p-12 text-center dark:border-neutral-800">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "يرجى اختيار عضو من القائمة لعرض مساحة العمل التوجيهية" : "Select a member to view their mentoring workspace"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cohort Bulk Task Modal */}
      {cohortModalOpen && (
        <Modal
          isOpen={cohortModalOpen}
          title={isAr ? "📢 إسناد مهمة لمجموعة كاملة" : "📢 Assign Cohort Task"}
          onClose={() => setCohortModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {isAr
                ? "اختر المجموعة أو الدفعة المستهدفة، ثم حدد معايير المهمة وموعد التسليم ليتم إسنادها فوراً لجميع أعضائها:"
                : "Select target cohort to bulk assign a tailored task to all its members:"}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {isAr ? "المجموعة المستهدفة:" : "Target Cohort:"}
              </label>
              <select
                value={selectedCohortForTask?.id || ""}
                onChange={(e) => {
                  const g = groups.find((grp) => grp.id === e.target.value);
                  if (g) setSelectedCohortForTask(g);
                }}
                className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
              >
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name} ({grp.memberCount} {isAr ? "عضو" : "members"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCohortModalOpen(false)}
                className="button-secondary text-xs px-3.5 py-2 cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedCohortForTask) {
                    setTaskFormTarget({ type: "GROUP", group: selectedCohortForTask });
                    setCohortModalOpen(false);
                    setTaskFormOpen(true);
                  }
                }}
                className="button-primary text-xs px-4 py-2 font-bold cursor-pointer"
              >
                {isAr ? "متابعة لتفاصيل المهمة ←" : "Proceed to Task Details →"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Task Creation Form Dialog */}
      {taskFormOpen && taskFormTarget && (
        <TaskFormDialog
          task={undefined}
          mode={taskFormTarget.type === "GROUP" ? "assignGroup" : "assign"}
          groups={taskFormTarget.type === "GROUP" ? [taskFormTarget.group] : []}
          selectedMember={
            taskFormTarget.type === "MEMBER" ? taskFormTarget.member : undefined
          }
          onClose={() => {
            setTaskFormOpen(false);
            setTaskFormTarget(null);
          }}
          onSave={handleCreateTask}
        />
      )}

      {/* Feedback Form Dialog */}
      {feedbackFormOpen && (
        <FeedbackFormDialog
          post={editingFeedback}
          initialTargetUserId={selectedMember ? selectedMember.id : undefined}
          initialTargetName={selectedMember ? selectedMember.name : undefined}
          initialVisibility="DIRECT"
          onClose={() => {
            setFeedbackFormOpen(false);
            setEditingFeedback(null);
          }}
          onSaved={(msg) => {
            setFeedbackFormOpen(false);
            setEditingFeedback(null);
            toast.success(t(`professionalDevelopment.${msg}`));
            loadFeedback(feedbackPage);
          }}
        />
      )}

      {/* Member 360° Inspector Slide-over Drawer */}
      <MemberInspectorDrawer
        memberId={inspectorMemberId}
        onClose={() => setInspectorMemberId(null)}
        onMemberUpdated={loadDirectory}
      />
    </div>
  );
}
