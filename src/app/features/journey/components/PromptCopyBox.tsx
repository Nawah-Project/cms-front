import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";

export function PromptCopyBox({
  promptTemplate,
  locked = false,
}: {
  promptTemplate: string;
  locked?: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (locked || !promptTemplate) return;
    try {
      await navigator.clipboard.writeText(promptTemplate);
      setCopied(true);
      showToast({
        message: t("journey.promptCopiedToast"),
        variant: "success",
      });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast({
        message: t("common.unexpectedError"),
        variant: "error",
      });
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 text-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3.5 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("journey.smartPromptBoxTitle")}</span>
        </span>
        {!locked && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-neutral-700"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t("journey.promptCopiedBtn")}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>{t("journey.copyPromptBtn")}</span>
              </>
            )}
          </button>
        )}
      </div>
      <pre
        className={`max-h-52 overflow-y-auto whitespace-pre-wrap p-3.5 font-mono text-xs leading-5 text-neutral-200 ${
          locked ? "blur-[4px] select-none pointer-events-none opacity-60" : ""
        }`}
      >
        {promptTemplate}
      </pre>
    </div>
  );
}

