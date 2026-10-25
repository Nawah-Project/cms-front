import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useI18n } from "../../i18n";
import { adminApi, type AdminGroup, type AdminMember } from "./api/adminApi";
import { AdminMemberTasks } from "./components/AdminMemberTasks";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { TaskFormDialog } from "../professional-development/components/TaskFormDialog";
import type { CreateTaskInput, FeedbackPost } from "../professional-development/types";
import {
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  relativeTime,
  timeTitle,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  FileText,
  Layers,
  MessageSquare,
  Plus,
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

  const tabParam = (searchParams.get("tab") as "tasks" | "feedback") || "tasks";
  const [activeTab, setActiveTab] = useState<"tasks" | "feedback">(tabParam);

  const switchTab = (tab: "tasks" | "feedback") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // --- Members & Groups Data ---
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // --- Tab 1: Tasks State ---
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [taskFormTarget, setTaskFormTarget] = useState<
    | { type: "MEMBER"; member: AdminMember }
    | { type: "GROUP"; group: AdminGroup }
    | null
  >(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  // --- Tab 2: Feedback State ---
  const [feedbackPosts, setFeedbackPosts] = useState<FeedbackPost[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotalCount, setFeedbackTotalCount] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackPost | null>(null);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);

  // Load basic member list
  const loadDirectory = useCallback(() => {
    setDataLoading(true);
    Promise.all([
      adminApi.users({ limit: 100 }),
      adminApi.groups(),
    ])
      .then(([usersRes, groupsRes]) => {
        setMembers(usersRes.items);
        setGroups(groupsRes.items);
        if (usersRes.items.length && !selectedMember) {
          setSelectedMember(usersRes.items[0]);
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
      .feedbackPosts(p, 20, false, "member")
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
    if (activeTab === "feedback") {
      loadFeedback(feedbackPage);
    }
  }, [activeTab, feedbackPage, loadFeedback]);

  // Handle Task Submit
  const handleCreateTask = async (input: CreateTaskInput) => {
    if (!taskFormTarget) return;
    try {
      if (taskFormTarget.type === "MEMBER") {
        await adminApi.createTask(taskFormTarget.member.id, input);
        toast.success(isAr ? "تم إسناد المهمة للعضو بنجاح" : "Task assigned successfully");
      } else {
        await adminApi.createTaskForGroup(taskFormTarget.group.id, input);
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
      {/* Tabs Switcher */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => switchTab("tasks")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "tasks"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isAr ? "إسناد ومتابعة المهام" : "Assigned Tasks & Follow-up"}</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("feedback")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "feedback"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{isAr ? "ملاحظات وتوجيهات الأعضاء" : "Direct & Group Feedback"}</span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-mono text-neutral-300">
            {number(feedbackTotalCount)}
          </span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED TASKS */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                {isAr ? "متابعة وإسناد المهام التوجيهية" : "Mentor Tasks Management"}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? "إسناد مهام فردية أو جماعية مع تحديد الأولوية، قوائم الفحص، ومتابعة ردود الأعضاء"
                  : "Assign individual or group tasks with mentor priority, checklists, and feedback notes"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedMember) {
                    setTaskFormTarget({ type: "MEMBER", member: selectedMember });
                    setTaskFormOpen(true);
                  }
                }}
                disabled={!selectedMember}
                className="button-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? "+ إسناد مهمة للعضو" : "+ Assign Member Task"}</span>
              </button>
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTaskFormTarget({ type: "GROUP", group: groups[0] });
                    setTaskFormOpen(true);
                  }}
                  className="button-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span>{isAr ? "+ إسناد لمجموعة كاملة" : "+ Assign Cohort Task"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Member Selector List */}
            <div className="lg:col-span-4 rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-xs max-h-[700px] overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-border">
                {isAr ? "اختر العضو لمتابعة مهامه" : "Select Member"}
              </h4>
              {dataLoading ? (
                <LoadingState label={isAr ? "جارٍ التحميل..." : "Loading..."} />
              ) : !members.length ? (
                <EmptyState>{isAr ? "لا يوجد أعضاء" : "No members"}</EmptyState>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {members.map((m) => {
                    const isSelected = selectedMember?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMember(m)}
                        className={`flex w-full items-center justify-between p-2.5 rounded-xl text-start transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-white"
                            : "hover:bg-neutral-800/40 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Initials name={m.name} avatar={m.avatar} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{m.name}</p>
                            <p className="text-[10px] text-neutral-500 truncate">
                              {m.group?.name || t("common.unassigned")}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <JourneyBadge journey={m.journey} compact />
                          {m.development?.overdue ? (
                            <span className="rounded-full bg-red-500/20 px-1.5 py-0.2 text-[9px] font-bold text-red-400">
                              {m.development.overdue} !
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Member Tasks Workspace */}
            <div className="lg:col-span-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
              {selectedMember ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Initials name={selectedMember.name} avatar={selectedMember.avatar} />
                      <div>
                        <h4 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                          {selectedMember.name}
                          <JourneyBadge journey={selectedMember.journey} />
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {selectedMember.email} · {selectedMember.group?.name || t("common.unassigned")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskFormTarget({ type: "MEMBER", member: selectedMember });
                        setTaskFormOpen(true);
                      }}
                      className="button-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 inline me-1" />
                      {isAr ? "إسناد مهمة جديدة" : "Assign Task"}
                    </button>
                  </div>

                  <AdminMemberTasks
                    member={selectedMember}
                    onTasksUpdated={loadDirectory}
                  />
                </div>
              ) : (
                <EmptyState>{isAr ? "يرجى اختيار عضو من القائمة لعرض مهامه" : "Select a member to view tasks"}</EmptyState>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT & GROUP FEEDBACK */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                {isAr ? "ملاحظات وتوجيهات المينتور المباشرة" : "Direct & Group Coaching Notes"}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? "توجيهات مخصصة لعضو محدد، أو لمجموعة، أو إعلانات عامة لجميع الأعضاء"
                  : "Targeted feedback sent directly to members or cohorts outside of automated plot milestones"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingFeedback(null);
                setFeedbackFormOpen(true);
              }}
              className="button-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{isAr ? "+ إرسال ملاحظة توجيهية" : "+ Send Guidance Note"}</span>
            </button>
          </div>

          {feedbackLoading ? (
            <LoadingState label={isAr ? "جارٍ تحميل التوجيهات..." : "Loading guidance..."} />
          ) : feedbackError ? (
            <ErrorState onRetry={() => loadFeedback(feedbackPage)} />
          ) : !feedbackPosts.length ? (
            <EmptyState>{isAr ? "لا توجد ملاحظات توجيهية مرسلة حتى الآن." : "No guidance notes sent yet."}</EmptyState>
          ) : (
            <div className="grid gap-4">
              {feedbackPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-xs hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            post.visibility === "DIRECT"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : post.visibility === "GROUP"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {post.visibility === "DIRECT"
                            ? isAr ? "مباشر لعضو" : "Direct Member"
                            : post.visibility === "GROUP"
                            ? isAr ? `مجموعة: ${post.group?.name || ""}` : `Group: ${post.group?.name || ""}`
                            : isAr ? "عام لكل الأعضاء" : "Public Announcement"}
                        </span>
                        {post.targetUser && (
                          <span className="text-xs font-semibold text-neutral-300">
                            → {post.targetUser.name}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">
                          {relativeTime(post.createdAt, locale)}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-neutral-100">{post.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFeedback(post);
                          setFeedbackFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={isAr ? "تعديل" : "Edit"}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveFeedback(post.id)}
                        className="rounded-lg p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={isAr ? "أرشفة" : "Archive"}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {Boolean(post.resources?.length) && (
                    <div className="pt-2 flex flex-wrap gap-2 border-t border-border-subtle">
                      {post.resources?.map((r, i) => (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-neutral-800 hover:underline"
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

      {/* Task Creation Form Dialog */}
      {taskFormOpen && taskFormTarget && (
        <TaskFormDialog
          task={null}
          groupId={taskFormTarget.type === "GROUP" ? taskFormTarget.group.id : undefined}
          onClose={() => {
            setTaskFormOpen(false);
            setTaskFormTarget(null);
          }}
          onSave={handleCreateTask}
        />
      )}

      {/* Feedback Form Dialog (Simple coaching mode) */}
      {feedbackFormOpen && (
        <FeedbackFormDialog
          post={editingFeedback}
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
    </div>
  );
}

