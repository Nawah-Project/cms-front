import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { useI18n } from "../i18n";
import { JourneyQuestsMap } from "../features/journey/components/JourneyQuestsMap";
import { OPEN_JOURNEY_TASKS_PANEL_EVENT } from "./journeyTasksPanelEvents";

export function JourneyTasksPanel() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
    return () =>
      window.removeEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;
  const CloseChevron = locale === "ar" ? ChevronRight : ChevronLeft;
  const panelWidth = "min(31rem, calc(100vw - 2.5rem))";
  const panelEdgeOffset = `calc(${panelWidth} + 1.25rem)`;
  const hiddenOffset =
    locale === "ar" ? "calc(-100% - 1.25rem)" : "calc(100% + 1.25rem)";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => setOpen(false)}
          className="fixed inset-y-0 end-0 start-0 z-50 cursor-default bg-neutral-950/30 lg:start-64"
        />
      )}

      <aside
        id="journey-tasks-panel"
        aria-label={t("journey.panelTitle")}
        aria-hidden={!open}
        inert={!open}
        style={{
          width: panelWidth,
          height: "min(50rem, calc(100dvh - 2rem))",
          transform: open ? "translateX(0)" : `translateX(${hiddenOffset})`,
        }}
        className={`fixed end-5 top-1/2 z-[60] flex -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "" : "pointer-events-none"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                {t("journey.panelTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {t("journey.panelSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            aria-controls="journey-tasks-panel"
            aria-expanded={true}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <JourneyQuestsMap compact />
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-controls="journey-tasks-panel"
          aria-expanded={true}
          aria-label={t("journey.closePanel")}
          onClick={() => setOpen(false)}
          style={{ insetInlineEnd: panelEdgeOffset }}
          className="fixed top-1/2 z-[61] inline-flex -translate-y-1/2 items-center rounded-s-xl border border-e-0 border-border bg-surface p-3 text-neutral-800 shadow-lg transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <CloseChevron className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {!open && (
        <button
          type="button"
          aria-controls="journey-tasks-panel"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="fixed end-5 top-1/2 z-[61] inline-flex -translate-y-1/2 items-center gap-2 rounded-e-xl border border-e-0 border-border bg-surface px-3 py-3 text-sm font-semibold text-neutral-800 shadow-lg transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          <span>{t("journey.panelTitle")}</span>
          <Chevron className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
