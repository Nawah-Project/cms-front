import React from "react";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 7 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      {/* Table Head Skeleton */}
      <div className="flex items-center gap-4 border-b border-neutral-200 bg-neutral-50/80 px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="ms-auto h-4 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 px-5 py-4 animate-in fade-in duration-200"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
            <div className="ms-auto h-4 w-12 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
