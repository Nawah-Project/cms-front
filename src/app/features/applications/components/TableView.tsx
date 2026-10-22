import { Link, useNavigate } from "react-router";
import type { Application } from "../../../types";
import { formatApplicationMethod } from "../../../types";
import { formatDisplayDate } from "../../../utils/date";
import {
  ExternalLinkIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from "../../../components/Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../../../i18n";

interface TableViewProps {
  applications: Application[];
}

export function TableView({ applications }: TableViewProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  return (
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
          {applications.map((app) => (
            <tr
              key={app.id}
              onClick={() => navigate(`/applications/${app.id}`)}
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
                  <Link
                    to={`/applications/${app.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline hover:text-neutral-950 dark:hover:text-white"
                  >
                    {app.jobTitle}
                  </Link>
                  {app.isTailored && (
                    <span
                      title={t("applications.tailoredBadge")}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                    >
                      <SparklesIcon className="h-2.5 w-2.5" />
                      <span>{t("applications.tailoredShort")}</span>
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
                {app.location || "—"}
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

              {/* Action */}
              <td className="data-table-cell whitespace-nowrap text-end">
                <span className="inline-flex items-center gap-1 text-neutral-400 group-hover:text-neutral-800 transition-colors text-xs font-medium">
                  <span>{t("applications.view")}</span>
                  <ArrowLeftIcon className="w-3.5 h-3.5 rotate-180 rtl:rotate-0" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

