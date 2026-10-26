import { useState, Fragment } from "react";
import { useNavigate } from "react-router";
import { Pencil, ChevronDown, Trash2, ExternalLink, Sparkles } from "lucide-react";
import type { Application, Stage } from "../../../types";
import { formatApplicationMethod } from "../../../types";
import { formatDisplayDate } from "../../../utils/date";
import { ExternalLinkIcon, SparklesIcon } from "../../../components/Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../../../i18n";
import { useUpdateApplication, useDeleteApplication } from "../api/applicationsApi";
import { EditApplicationModal } from "./EditApplicationModal";
import { useToast } from "../../../components/ui/ToastProvider";

interface TableViewProps {
  applications: Application[];
  appCvVersionMap?: Record<string, number>;
}

export function TableView({ applications, appCvVersionMap }: TableViewProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const updateMutation = useUpdateApplication();
  const deleteMutation = useDeleteApplication();

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  const toggleRowExpanded = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickStageChange = async (appId: string, nextStage: Stage) => {
    try {
      await updateMutation.mutateAsync({
        id: appId,
        updates: { stage: nextStage },
      });

    } catch {
      toast.error(
        locale === "ar" ? "تعذر تحديث مرحلة الطلب" : "Failed to update application stage",
      );
    }
  };

  const handleDelete = async (appId: string, companyName: string) => {
    const confirmed = window.confirm(
      locale === "ar"
        ? `هل أنت متأكد من حذف طلب التقديم لشركة "${companyName}"؟`
        : `Are you sure you want to delete the application for "${companyName}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(appId);

    } catch {
      toast.error(
        locale === "ar" ? "تعذر حذف الطلب" : "Failed to delete application",
      );
    }
  };

  return (
    <>
      <div className="data-table-shell application-table-shell">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr className="data-table-head">
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.company")}
              </th>
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.jobTitle")}
              </th>
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.applicationDate")}
              </th>
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.location")}
              </th>
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.method")}
              </th>
              <th scope="col" className="data-table-cell font-medium">
                {t("applications.stage")}
              </th>
              <th scope="col" className="data-table-cell text-end font-medium">
                {t("applications.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const isExpanded = expandedRowIds.has(app.id);

              return (
                <Fragment key={app.id}>
                  <tr
                    onClick={(e) => toggleRowExpanded(app.id, e)}
                    className="data-table-row group cursor-pointer"
                  >
                    {/* Company Name */}
                    <td className="data-table-cell whitespace-nowrap font-medium text-neutral-900 dark:text-neutral-100">
                      {app.jobUrl ? (
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-neutral-900 transition-colors hover:underline dark:text-neutral-100"
                          title={t("applications.openJob", {
                            company: app.companyName,
                          })}
                        >
                          <span>{app.companyName}</span>
                          <ExternalLinkIcon className="w-3.5 h-3.5 opacity-60 hover:opacity-100 shrink-0" />
                        </a>
                      ) : (
                        <span>{app.companyName}</span>
                      )}
                    </td>

                    {/* Job Title */}
                    <td className="data-table-cell whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-200">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {app.jobTitle}
                        </span>
                        {appCvVersionMap && (
                          <span className="rounded px-1.5 py-0.2 text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            CV {Math.max(0, (appCvVersionMap[app.id] || 1) - 1)}
                          </span>
                        )}
                        {app.isTailored && (
                          <span
                            title={t("applications.tailoredBadge")}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                          >
                            <SparklesIcon className="h-2.5 w-2.5" />
                            <span>{t("applications.tailoredShort")}</span>
                          </span>
                        )}
                        {app.sharedWithGroup && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                            <SparklesIcon className="h-2.5 w-2.5" />
                            <span>{t("members.sharedOpportunityBadge")}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Application Date */}
                    <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {formatDisplayDate(app.applicationDate, locale)}
                    </td>

                    {/* Location */}
                    <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {app.location || (locale === "ar" ? "عن بُعد" : "Remote")}
                    </td>

                    {/* Application Method */}
                    <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {formatApplicationMethod(app.applicationMethod, t)}
                    </td>

                    {/* Status */}
                    <td className="data-table-cell whitespace-nowrap">
                      {app.stage === "CLOSED" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <StatusBadge kind="stage" value="CLOSED" />
                          {app.outcome !== "NONE" && (
                            <StatusBadge kind="outcome" value={app.outcome} />
                          )}
                        </div>
                      ) : (
                        <StatusBadge kind="stage" value={app.stage} />
                      )}
                    </td>

                    {/* Action: Quick Edit Pencil & Accordion Chevron */}
                    <td className="data-table-cell whitespace-nowrap text-end">
                      <div
                        className="inline-flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingApp(app)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleRowExpanded(app.id, e)}
                          aria-expanded={isExpanded}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title={isExpanded ? t("common.collapse") : t("common.expand")}
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Accordion Detail Drawer under the row */}
                  {isExpanded && (
                    <tr className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-border/80">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                          {/* Top: 5 Stage Selector Buttons + Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200/70 dark:border-neutral-800/80">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                {t("applications.stage")}:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                  { stage: "APPLIED" as const, label: t("applications.submitted") },
                                  { stage: "ASSIGNMENT" as const, label: t("applications.assignment") },
                                  { stage: "INTERVIEW" as const, label: t("applications.interview") },
                                  { stage: "DECISION" as const, label: t("applications.decision") },
                                  { stage: "CLOSED" as const, label: t("applications.closed") },
                                ].map((s) => {
                                  const isCurrent = app.stage === s.stage;
                                  return (
                                    <button
                                      key={s.stage}
                                      type="button"
                                      disabled={isCurrent}
                                      onClick={() => handleQuickStageChange(app.id, s.stage)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                        isCurrent
                                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                                          : "border border-border bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                      }`}
                                    >
                                      {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingApp(app)}
                                className="button-secondary px-3 py-1 text-xs inline-flex items-center gap-1.5"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>{t("common.edit")}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(app.id, app.companyName)}
                                className="rounded-lg border border-danger-border/60 bg-danger-soft/20 text-danger-strong hover:bg-danger-soft/40 px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{t("common.delete")}</span>
                              </button>
                            </div>
                          </div>

                          {/* Secondary Info: Location, Method, External Link */}
                          <div className="flex flex-wrap items-center gap-5 text-neutral-600 dark:text-neutral-400">
                            <div>
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200 me-1.5">
                                {t("applications.location")}:
                              </span>
                              <span>{app.location || (locale === "ar" ? "عن بُعد" : "Remote")}</span>
                            </div>

                            <div>
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200 me-1.5">
                                {t("applications.method")}:
                              </span>
                              <span>{formatApplicationMethod(app.applicationMethod, t)}</span>
                            </div>

                            {app.jobUrl && (
                              <div>
                                <a
                                  href={app.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-info-strong hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <span>{t("applications.jobUrl")}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Interview & Assignment Prep Workspace Box */}
                          {(app.stage === "INTERVIEW" || app.stage === "ASSIGNMENT") && (
                            <div className="mt-2.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-800/80 dark:bg-sky-950/30 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-sky-950 dark:text-sky-200">
                                    {t("applications.prepWorkspaceTitle")}
                                  </p>
                                  <p className="text-[11px] text-sky-800 dark:text-sky-300">
                                    {t("applications.prepWorkspaceSubtitle")}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/applications/${app.id}`)}
                                className="button-primary shrink-0 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                              >
                                <span>{t("applications.openPrepWorkspace")}</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Application Modal */}
      {editingApp && (
        <EditApplicationModal
          isOpen={true}
          application={editingApp}
          onClose={() => setEditingApp(null)}
          onSave={async (id, updates) => {
            await updateMutation.mutateAsync({ id, updates });
            setEditingApp(null);
          }}
        />
      )}
    </>
  );
}
