import React from "react";
import { Link, useNavigate } from "react-router";
import type { Application } from "../types";
import { formatApplicationMethod } from "../types";
import { formatDisplayDate } from "../utils/date";
import { ExternalLinkIcon } from "./Icons";
import { StatusBadge } from "./StatusBadge";

interface TableViewProps {
  applications: Application[];
}

export function TableView({ applications }: TableViewProps) {
  const navigate = useNavigate();

  return (
    <div className="data-table-shell">
      <table className="data-table min-w-[980px]">
        <thead>
          <tr className="data-table-head">
            <th scope="col" className="data-table-cell font-medium">
              Company
            </th>
            <th scope="col" className="data-table-cell font-medium">
              Job Title
            </th>
            <th scope="col" className="data-table-cell font-medium">
              Application Date
            </th>
            <th scope="col" className="data-table-cell font-medium">
              Location
            </th>
            <th scope="col" className="data-table-cell font-medium">
              Application Method
            </th>
            <th scope="col" className="data-table-cell font-medium">
              Status
            </th>
            <th scope="col" className="data-table-cell text-right font-medium">
              Action
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
                    title={`Open job posting at ${app.companyName}`}
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
                <Link
                  to={`/applications/${app.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline hover:text-neutral-950 dark:hover:text-white"
                >
                  {app.jobTitle}
                </Link>
              </td>

              {/* Application Date */}
              <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                {formatDisplayDate(app.applicationDate)}
              </td>

              {/* Location */}
              <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                {app.location || "—"}
              </td>

              {/* Application Method */}
              <td className="data-table-cell whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                {formatApplicationMethod(app.applicationMethod)}
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
              <td className="data-table-cell whitespace-nowrap text-right">
                <span className="text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors text-xs font-medium">
                  View →
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
