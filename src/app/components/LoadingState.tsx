import { useI18n } from "../i18n";
import { SpinnerIcon } from "./Icons";
export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-2 text-sm text-neutral-500"
      role="status"
    >
      <SpinnerIcon className="h-5 w-5 text-neutral-500" />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}
