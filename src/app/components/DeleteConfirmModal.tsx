import React, { useState } from "react";
import { useI18n } from "../i18n";
import { ConfirmDialog } from "./ui/ConfirmDialog";

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

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={t("applications.deleteTitle")}
      message={`${t("applications.deletePrompt", { jobTitle, company: companyName })} ${t("applications.deletePromptEnding")}`}
      confirmLabel={t("applications.deleteConfirm")}
      cancelLabel={t("common.cancel")}
      isConfirming={isDeleting}
      variant="danger"
    />
  );
}
