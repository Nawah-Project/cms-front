import React, { useEffect, useRef, useState } from "react";
import { SpinnerIcon, TrashIcon } from "./Icons";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(
        t("common.unexpectedError"),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isDeleting) onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current && !isDeleting) onClose();
      }}
      aria-labelledby="delete-confirm-title"
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-start shadow-xl backdrop:bg-neutral-950/40 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
            <TrashIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              id="delete-confirm-title"
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {t("applications.deleteConfirm")}
            </h3>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t("applications.deletePrompt", { jobTitle, company: companyName })} {t("applications.deletePromptEnding")}
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
            ref={cancelRef}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="button-danger inline-flex items-center gap-2 text-xs disabled:opacity-50 shadow-xs dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {isDeleting && <SpinnerIcon className="w-3.5 h-3.5" />}
            <span>{t("applications.deleteConfirm")}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
