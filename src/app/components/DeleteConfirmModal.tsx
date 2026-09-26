import React, { useState } from "react";
import { SpinnerIcon, TrashIcon } from "./Icons";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  companyName: string;
  jobTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({
  isOpen,
  companyName,
  jobTitle,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(
        err.message || "Failed to delete application. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
            <TrashIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              id="delete-confirm-title"
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Delete Application
            </h3>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete your application for{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {jobTitle}
              </span>{" "}
              at{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {companyName}
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <div className="mt-3 p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="button-danger inline-flex items-center gap-2 text-xs disabled:opacity-50 shadow-xs dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {isDeleting && <SpinnerIcon className="w-3.5 h-3.5" />}
            <span>Delete Application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
