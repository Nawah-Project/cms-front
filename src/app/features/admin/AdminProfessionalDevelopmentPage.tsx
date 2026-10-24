import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { adminApi, type AdminGroup, type AdminMember } from "./api/adminApi";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import {
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  PageHeading,
  relativeTime,
  timeTitle,
} from "./components/AdminUI";
import { TaskFormDialog } from "../professional-development/components/TaskFormDialog";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import type { CreateTaskInput, FeedbackPost } from "../professional-development/types";
import { ArrowLeftIcon, EditIcon, PlusIcon, SparklesIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../components/ui/ToastProvider";

const TRIGGER_LABELS: Record<string, string> = {
  INSIGHT_TASK_0_CV_BASE: "المهمة 0: صياغة الـ CV",
  INSIGHT_W1_INTERVIEW_BASIC: "الأسبوع 1: التجهيز للمقابلة والأسيمنت",
  INSIGHT_W1_TAILORED_CV: "الأسبوع 1: التقديم المخصص",
  INSIGHT_W2_CUSTOM_PREP: "الأسبوع 2: التجهيز المخصص",
  INSIGHT_W2_CONTENT_BUILDING: "الأسبوع 2: بناء المحتوى",
  INSIGHT_W3_TIME_MGMT: "الأسبوع 3: إدارة الوقت",
  INSIGHT_W3_NETWORKING: "الأسبوع 3: بناء العلاقات",
  INSIGHT_W4_SELF_CAREER_PLAN: "الأسبوع 4: التخطيط للكارير",
  INSIGHT_INTERVIEW_ADVANCED: "حدث: أول مقابلة / أسيمنت",
};

type DevelopmentMember = AdminMember & {
  development: {
    active: number;
    inProgress: number;
    overdue: number;
    lastTaskAt: string | null;
  };
};

export default function AdminProfessionalDevelopmentPage() {
  const { t, tp, locale } = useI18n();
  const toast = useToast();
  const [members, setMembers] = useState<DevelopmentMember[]>([]);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assignGroupOpen, setAssignGroupOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState<"tasks" | "insights">("tasks");
  const [feedbackPosts, setFeedbackPosts] = useState<FeedbackPost[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotalCount, setFeedbackTotalCount] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedbackPost | null>(null);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);

  const loadFeedback = useCallback(async (p = 1) => {
    setFeedbackLoading(true);
    setFeedbackError(false);
    try {
      const res = await adminApi.feedbackPosts(p, 20);
      setFeedbackPosts(res.items);
      setFeedbackPage(res.page);
      setFeedbackTotalPages(res.totalPages);
      setFeedbackTotalCount(res.total);
    } catch {
      setFeedbackError(true);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "insights") {
      void loadFeedback(feedbackPage);
    }
  }, [activeTab, feedbackPage, loadFeedback]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const PAGE_SIZE = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [result, groupResult] = await Promise.all([
        adminApi.users({
          page,
          limit: PAGE_SIZE,
          ...(groupFilter === "ALL" ? {} : { groupId: groupFilter }),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        }),
        adminApi.groups(),
      ]);
      setGroups(groupResult.items);
      const users = result.items.filter((member) => member.role === "USER");
      const withDevelopment = users.map((member) => ({
        ...member,
        development: member.development ?? {
          active: 0,
          inProgress: 0,
          overdue: 0,
          lastTaskAt: null,
        },
      }));
      setMembers(withDevelopment);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, groupFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow={t("professionalDevelopment.title")}
          title={t("admin.professionalDevelopment")}
          description={
            activeTab === "tasks"
              ? t("professionalDevelopment.adminDevelopmentDescription")
              : "إدارة ملاحظات الحبكة والتوجيهات الاستراتيجية المربوطة بمحطات مسار الرحلة وقواعد البيانات."
          }
        />
        {activeTab === "tasks" ? (
          <button
            type="button"
            onClick={() => setAssignGroupOpen(true)}
            disabled={!groups.some((group) => group.memberCount > 0)}
            className="button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {t("professionalDevelopment.assignGroupTask")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingPost(null);
              setFeedbackFormOpen(true);
            }}
            className="button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm shadow-xs"
          >
            <PlusIcon className="h-4 w-4" />
            إضافة ملاحظة / رؤية جديدة
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "tasks"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <span>مهام وتطوير الأعضاء</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {totalCount || members.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("insights")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "insights"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <span>ملاحظات ورؤى الحبكة (Journey Insights)</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            {feedbackTotalCount || feedbackPosts.length}
          </span>
        </button>
      </div>

      {activeTab === "insights" ? (
        <div className="space-y-4">
          {feedbackLoading ? (
            <LoadingState label="جاري تحميل ملاحظات ورؤى الرحلة..." />
          ) : feedbackError ? (
            <ErrorState onRetry={() => void loadFeedback(feedbackPage)} />
          ) : !feedbackPosts.length ? (
            <EmptyState>
              لا توجد ملاحظات أو رؤى مسجلة حالياً. انقر على الزر أعلاه لإضافة أول رؤية للمسار.
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {feedbackPosts.map((post) => {
                const triggerLabel = post.unlockTriggerCode
                  ? (TRIGGER_LABELS[post.unlockTriggerCode] || post.unlockTriggerCode)
                  : "متاحة فوراً (بدون قفل)";

                return (
                  <div
                    key={post.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 sm:flex-row sm:items-center shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            post.unlockTriggerCode
                              ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          }`}
                        >
                          {triggerLabel}
                        </span>
                        <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                          {post.visibility === "ALL"
                            ? "لجميع الأعضاء"
                            : post.visibility === "GROUP"
                              ? "مجموعة"
                              : "عضو محدد"}
                        </span>
                        {post.promptTemplate && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            <SparklesIcon className="h-3 w-3 text-amber-500" />
                            برومبت ذكي
                          </span>
                        )}
                        {post.resources && post.resources.length > 0 && (
                          <span className="rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info-strong border border-info-border">
                            {post.resources.length} مصادر مرفقة
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {post.title}
                      </h3>
                      <p className="line-clamp-2 text-xs text-neutral-500 leading-relaxed">
                        {post.content.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(post);
                          setFeedbackFormOpen(true);
                        }}
                        className="button-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("هل أنت متأكد من رغبتك في أرشفة هذه الرؤية؟")) return;
                          try {
                            await adminApi.archiveFeedback(post.id);
                            toast.success("تمت أرشفة الرؤية بنجاح");
                            void loadFeedback(feedbackPage);
                          } catch {
                            toast.error("فشل أرشفة الرؤية");
                          }
                        }}
                        className="button-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        title="أرشفة"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!feedbackLoading && !feedbackError && feedbackTotalPages > 1 && (
            <nav
              aria-label="صفحات الرؤى"
              className="flex items-center justify-center gap-3 border-t border-border pt-5"
            >
              <button
                type="button"
                disabled={feedbackPage <= 1}
                onClick={() => setFeedbackPage((v) => v - 1)}
                className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
              >
                السابق
              </button>
              <span className="text-xs text-neutral-500">
                صفحة {feedbackPage} من {feedbackTotalPages}
              </span>
              <button
                type="button"
                disabled={feedbackPage >= feedbackTotalPages}
                onClick={() => setFeedbackPage((v) => v + 1)}
                className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
              >
                التالي
              </button>
            </nav>
          )}
        </div>
      ) : (
        <>
          {notice && <p role="status" className="text-sm text-success-strong">{notice}</p>}
          <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          <label className="grid gap-1 text-xs text-neutral-500 min-w-60 flex-1 max-w-xs">
            {t("admin.member")}
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder={t("admin.searchPlaceholder")}
              className="field-control w-full"
            />
          </label>
          <label className="grid gap-1 text-xs text-neutral-500">
            {t("admin.groupFilter")}
            <select
              className="field-control min-w-40"
              value={groupFilter}
              onChange={(event) => {
                setGroupFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t("admin.allGroups")}</option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="UNASSIGNED">{t("common.unassigned")}</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          {tp("common.memberCount", totalCount || members.length)}
        </p>
      </div>
      {loading ? (
        <LoadingState label={t("admin.loadingMembers")} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !members.length ? (
        <EmptyState>{t("admin.noMembersMatch")}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member)}
              className="rounded-xl border border-border bg-surface p-4 text-start transition hover:border-border-hover hover:shadow-sm focus-visible:outline-2 focus-visible:outline-info-strong"
            >
              <div className="flex items-center gap-3">
                <Initials name={member.name} avatar={member.avatar} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {member.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {member.group?.name ?? t("common.unassigned")}
                  </span>
                </div>
                <ArrowLeftIcon className="h-4 w-4 shrink-0 rotate-180 text-neutral-400 rtl:rotate-0" />
              </div>
              <div className="mt-3">
                <JourneyBadge journey={member.journey} compact />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
                <span className="rounded-lg border border-border-subtle bg-neutral-50 p-2 text-center">
                  <span className="block text-[11px] text-neutral-500">
                    {t("professionalDevelopment.activeTasks")}
                  </span>
                  <b className="mt-0.5 block text-base font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {member.development.active}
                  </b>
                </span>
                <span className="rounded-lg border border-border-subtle bg-neutral-50 p-2 text-center">
                  <span className="block text-[11px] text-neutral-500">
                    {t("professionalDevelopment.inProgressCount")}
                  </span>
                  <b className="mt-0.5 block text-base font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {member.development.inProgress}
                  </b>
                </span>
                <span className="rounded-lg border border-border-subtle bg-neutral-50 p-2 text-center">
                  <span className="block text-[11px] text-neutral-500">
                    {t("professionalDevelopment.overdueCount")}
                  </span>
                  <b className="mt-0.5 block text-base font-bold tabular-nums text-danger-strong">
                    {member.development.overdue}
                  </b>
                </span>
              </div>
              <p
                className="mt-3 text-xs text-neutral-500"
                title={timeTitle(member.development.lastTaskAt, locale)}
              >
                {t("professionalDevelopment.lastDevelopmentActivity")}:{" "}
                {relativeTime(member.development.lastTaskAt, locale)}
              </p>
            </button>
          ))}
        </div>
      )}
      {!loading && !error && totalPages > 1 && (
        <nav
          aria-label={t("admin.professionalDevelopment")}
          className="flex items-center justify-center gap-3 border-t border-border pt-5"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.previous")}
          </button>
          <span className="text-xs text-neutral-500">
            {t("professionalDevelopment.pageOf", { page, pages: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.next")}
          </button>
        </nav>
      )}
        </>
      )}
      {selected && (
        <AdminMemberDetail
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {assignGroupOpen && (
        <TaskFormDialog
          mode="assignGroup"
          groups={groups.filter((group) => group.memberCount > 0)}
          onClose={() => setAssignGroupOpen(false)}
          onSave={async (input, _memberId, groupId) => {
            if (!groupId) return;
            const result = await adminApi.createTaskForGroup(
              groupId,
              input as CreateTaskInput,
            );
            setAssignGroupOpen(false);
            const msg = t("professionalDevelopment.groupTaskCreated", {
              count: result.assignedCount,
              group: result.groupName,
            });
            setNotice(msg);
            toast.success(msg);
            void load();
          }}
        />
      )}
      {feedbackFormOpen && (
        <FeedbackFormDialog
          post={editingPost}
          onClose={() => {
            setFeedbackFormOpen(false);
            setEditingPost(null);
          }}
          onSaved={(msg) => {
            setFeedbackFormOpen(false);
            setEditingPost(null);
            toast.success(
              msg === "feedbackCreated"
                ? "تم إنشاء ونشر الرؤية بنجاح"
                : "تم تحديث الرؤية بنجاح",
            );
            void loadFeedback(feedbackPage);
          }}
        />
      )}
    </div>
  );
}
