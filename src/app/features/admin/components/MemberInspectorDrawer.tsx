import React, { useEffect, useState } from "react";
import {
  adminApi,
  type AdminUserDetail,
  type AdminGroup,
  type JourneyNodeItem,
} from "../api/adminApi";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import {
  CloseIcon,
  SpinnerIcon,
} from "../../../components/Icons";
import { ActivityBadge, Initials } from "./AdminUI";
import {
  Briefcase,
  FileText,
  ExternalLink,
  MapPin,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  Send,
  CheckCircle,
  Eye,
  History,
  Link as LinkIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

interface MemberInspectorDrawerProps {
  memberId: string | null;
  onClose: () => void;
  onMemberUpdated?: () => void;
}

export function MemberInspectorDrawer({
  memberId,
  onClose,
  onMemberUpdated,
}: MemberInspectorDrawerProps) {
  const { t, locale, number } = useI18n();
  const isAr = locale === "ar";
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Groups and Journey Nodes for quick overrides
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [nodes, setNodes] = useState<JourneyNodeItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedNodeCode, setSelectedNodeCode] = useState<string>("");

  const [assigningGroup, setAssigningGroup] = useState(false);
  const [overridingNode, setOverridingNode] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(false);

    Promise.all([
      adminApi.user(memberId),
      adminApi.groups().catch(() => ({ items: [] })),
      adminApi.journeyNodes().catch(() => []),
    ])
      .then(([userData, groupsData, nodesData]) => {
        setDetail(userData);
        setSelectedGroupId(userData.user.group?.id || "");
        setSelectedNodeCode(userData.journey?.nodeCode || "TASK_0");
        setGroups(groupsData.items || []);
        setNodes(nodesData || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (!memberId) return null;

  const handleAssignGroup = async () => {
    if (!memberId) return;
    setAssigningGroup(true);
    try {
      await adminApi.assignToGroup(memberId, selectedGroupId);
      showToast({
        message: isAr
          ? "تم تحديث تعيين المجموعة بنجاح"
          : "Group assignment updated successfully",
        variant: "success",
      });
      onMemberUpdated?.();
      // Refresh user detail
      const updated = await adminApi.user(memberId);
      setDetail(updated);
    } catch {
      showToast({
        message: isAr ? "فشل تحديث المجموعة" : "Failed to update group",
        variant: "error",
      });
    } finally {
      setAssigningGroup(false);
    }
  };

  const handleOverrideNode = async () => {
    if (!memberId || !selectedNodeCode) return;
    setOverridingNode(true);
    try {
      await adminApi.overrideJourneyNode(memberId, selectedNodeCode);
      showToast({
        message: isAr
          ? "تم نقل العضو إلى المحطة المحددة بنجاح"
          : "Member journey node overridden successfully",
        variant: "success",
      });
      onMemberUpdated?.();
      const updated = await adminApi.user(memberId);
      setDetail(updated);
    } catch {
      showToast({
        message: isAr ? "فشل تعديل محطة العضو" : "Failed to override node",
        variant: "error",
      });
    } finally {
      setOverridingNode(false);
    }
  };

  const cvUrl = `/api/users/${encodeURIComponent(memberId)}/cv`;

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end bg-neutral-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface border-s border-border text-neutral-950 dark:text-neutral-100 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-end duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0">
              <Initials name={detail?.user.name || "..."} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                  {detail?.user.name || "..."}
                </h2>
                {detail && (
                  <ActivityBadge
                    status={detail.activityStatus}
                    days={detail.inactivityDays}
                  />
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {detail?.user.email || "..."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            aria-label={t("common.close")}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <SpinnerIcon className="h-8 w-8 animate-spin text-neutral-400" />
              <p className="text-xs text-neutral-500 font-medium">
                {isAr ? "جارٍ تحميل الملف الشامل للعضو..." : "Loading member 360° inspector..."}
              </p>
            </div>
          ) : error || !detail ? (
            <div className="p-8 text-center text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
              {isAr ? "تعذر تحميل بيانات العضو" : "Failed to load member profile"}
            </div>
          ) : (
            <>
              {/* Profile & Identity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {isAr ? "المعلومات المهنية" : "Professional Info"}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    <Briefcase className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                    <span>{detail.user.targetJobTitle || (isAr ? "غير محدد" : "Not specified")}</span>
                  </div>
                  {detail.user.preferredLocations && detail.user.preferredLocations.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <span>{detail.user.preferredLocations.join("، ")}</span>
                    </div>
                  )}
                  {detail.user.portfolioUrl && (
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                      <LinkIcon className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <a
                        href={detail.user.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-info-strong hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                      >
                        <span>{detail.user.portfolioUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {isAr ? "السيرة الذاتية (CV)" : "Curriculum Vitae"}
                  </span>
                  {detail.user.hasCv ? (
                    <div className="space-y-2">
                      <a
                        href={cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{isAr ? "معاينة السيرة الذاتية (PDF)" : "Preview CV (PDF)"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {detail.user.cvHistory && detail.user.cvHistory.length > 0 && (
                        <div className="pt-1 text-[11px] text-neutral-500">
                          <span className="font-semibold">{isAr ? "سجل النسخ:" : "Versions:"} </span>
                          <span>
                            {isAr
                              ? `${detail.user.cvHistory.length} نسخ مسجلة`
                              : `${detail.user.cvHistory.length} versions logged`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">
                      {isAr ? "لم يرفع سيرة ذاتية بعد" : "No CV uploaded yet"}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Overrides: Group & Journey Node */}
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {isAr ? "إدارة التعيين والتحكم بالرحلة" : "Group Assignment & Journey Controls"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Group Reassignment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isAr ? "المجموعة المخصصة:" : "Assigned Group:"}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-neutral-950 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        <option value="">{isAr ? "— غير معيّن لمجموعة —" : "— Unassigned —"}</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.memberCount}/{g.capacity})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignGroup}
                        disabled={assigningGroup || selectedGroupId === (detail.user.group?.id || "")}
                        className="button-primary text-xs px-3 py-1.5 shrink-0"
                      >
                        {assigningGroup ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : isAr ? "حفظ" : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Journey Node Override */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isAr ? "محطة الرحلة الحالية:" : "Current Journey Node:"}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedNodeCode}
                        onChange={(e) => setSelectedNodeCode(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-neutral-950 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      >
                        {nodes.map((n) => (
                          <option key={n.code} value={n.code}>
                            W{n.weekNumber} - {isAr ? n.titleAr : n.titleEn} ({n.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleOverrideNode}
                        disabled={overridingNode || selectedNodeCode === (detail.journey?.nodeCode || "")}
                        className="button-secondary text-xs px-3 py-1.5 shrink-0"
                      >
                        {overridingNode ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : isAr ? "نقل" : "Move"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey & Tasks Progress Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3 text-center">
                  <span className="text-[11px] text-neutral-500 font-medium">{isAr ? "إجمالي الطلبات" : "Total Apps"}</span>
                  <p className="mt-1 text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                    {number(detail.applicationsCount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3 text-center">
                  <span className="text-[11px] text-neutral-500 font-medium">{isAr ? "المحطات المكتملة" : "Completed Nodes"}</span>
                  <p className="mt-1 text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                    {number(detail.journey?.completedNodes || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3 text-center">
                  <span className="text-[11px] text-neutral-500 font-medium">{isAr ? "مهام متأخرة" : "Overdue Tasks"}</span>
                  <p className={`mt-1 text-xl font-bold font-mono ${detail.development.overdueTasks > 0 ? "text-rose-600" : "text-neutral-950 dark:text-neutral-100"}`}>
                    {number(detail.development.overdueTasks)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3 text-center">
                  <span className="text-[11px] text-neutral-500 font-medium">{isAr ? "ملاحظات غير مقروءة" : "Unread Notes"}</span>
                  <p className="mt-1 text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                    {number(detail.development.unreadMentorFeedback)}
                  </p>
                </div>
              </div>

              {/* Recent Applications Mini Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {isAr ? "آخر طلبات التقديم المسجلة" : "Recent Applications"}
                  </h3>
                  <span className="text-xs text-neutral-500 font-mono">
                    {number(detail.recentApplications?.length || 0)} {isAr ? "طلبات" : "apps"}
                  </span>
                </div>

                {!detail.recentApplications || detail.recentApplications.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-4 text-center border border-dashed border-border rounded-xl">
                    {isAr ? "لا توجد طلبات تقديم مسجلة لهذا العضو بعد" : "No applications logged yet"}
                  </p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
                    {detail.recentApplications.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-950 dark:text-neutral-100 truncate">
                              {app.companyName}
                            </span>
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-400 hover:text-info-strong transition-colors"
                                title={app.jobUrl}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {app.isTailored && (
                              <span className="rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
                                {isAr ? "مخصص" : "Tailored"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {app.jobTitle} • {app.applicationDate}
                          </p>
                        </div>

                        <span className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                          {app.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Drawer Actions */}
        <div className="border-t border-border px-6 py-4 bg-surface-raised flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="button-secondary text-xs px-4 py-2"
          >
            {t("common.close")}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/admin/mentoring?memberId=${encodeURIComponent(memberId)}`);
            }}
            className="button-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isAr ? "إرسال توجيه أو مهمة للعضو" : "Open Mentoring Workspace"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

