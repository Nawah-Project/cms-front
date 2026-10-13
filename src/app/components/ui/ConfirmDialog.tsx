import React from "react";
import { useI18n } from "../../i18n";
import { AlertCircleIcon, SpinnerIcon, TrashIcon } from "../Icons";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  variant?: "danger" | "primary";
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isConfirming = false,
  variant = "danger",
  icon,
}: ConfirmDialogProps) {
  const { t } = useI18n();

  const defaultIcon =
    variant === "danger" ? (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <TrashIcon className="h-5 w-5" />
      </div>
    ) : (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-strong">
        <AlertCircleIcon className="h-5 w-5" />
      </div>
    );

  const confirmBtnClass =
    variant === "danger" ? "button-danger" : "button-primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      disableClose={isConfirming}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="button-secondary"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`inline-flex items-center gap-2 ${confirmBtnClass}`}
          >
            {isConfirming && <SpinnerIcon className="h-4 w-4" />}
            <span>{confirmLabel ?? (variant === "danger" ? t("common.delete") : t("common.confirm"))}</span>
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        {icon ?? defaultIcon}
        <div className="space-y-1">
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
