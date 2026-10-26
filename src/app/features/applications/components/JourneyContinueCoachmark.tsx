import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ArrowUpRight } from "lucide-react";
import { useI18n } from "../../../i18n";
import {
  closeJourneyTasksPanel,
  openJourneyTasksPanel,
} from "../../../components/journeyTasksPanelEvents";
import { useDialogFocus } from "../../../components/ui/useDialogFocus";
import {
  placeTourCard,
  readTourViewport,
  type TourViewport,
} from "./tour-layout";

export function JourneyContinueCoachmark({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState<TourViewport | null>(null);
  const [height, setHeight] = useState(220);
  const card = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useDialogFocus(card, ready && Boolean(viewport), onDismiss);
  useEffect(() => {
    closeJourneyTasksPanel();
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    const timer = window.setInterval(() => {
      // Wait for the saved application's modal or milestone celebration to close.
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) {
        setReady(true);
        window.clearInterval(timer);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const track = () => {
      const handle = document.querySelector<HTMLElement>(
        '[data-tour-step="journey-drawer-handle"]',
      );
      if (handle) {
        const next = handle.getBoundingClientRect();
        setRect((previous) =>
          previous &&
          Math.abs(previous.top - next.top) < 0.5 &&
          Math.abs(previous.left - next.left) < 0.5 &&
          previous.width === next.width &&
          previous.height === next.height
            ? previous
            : next,
        );
      }
      const next = readTourViewport();
      setViewport((previous) =>
        previous &&
        previous.width === next.width &&
        previous.height === next.height &&
        previous.left === next.left &&
        previous.top === next.top
          ? previous
          : next,
      );
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  useEffect(() => {
    if (!ready || !card.current) return;
    const node = card.current;
    const observer = new ResizeObserver(() =>
      setHeight(node.getBoundingClientRect().height),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready, Boolean(viewport)]);
  if (!ready || !viewport || typeof document === "undefined") return null;
  const target =
    rect ??
    new DOMRect(
      ar ? 0 : viewport.width - 36,
      viewport.top + viewport.height / 2 - 22,
      36,
      44,
    );
  const placement = placeTourCard(target, viewport, height, true);
  const open = () => {
    onDismiss();
    openJourneyTasksPanel();
  };
  return createPortal(
    <div className="fixed inset-0 z-[10020]" data-journey-continue-overlay>
      <div
        className="tour-scrim absolute inset-0"
        onClick={onDismiss}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={open}
        aria-label={
          ar ? "افتح درج المهام لمتابعة الرحلة" : "Open your tasks to continue"
        }
        className="fixed rounded-xl border-2 border-emerald-300 bg-white/10 ring-4 ring-emerald-300/25 focus-visible:outline-2 focus-visible:outline-white"
        style={{
          top: target.top - 4,
          left: target.left - 2,
          width: target.width + 4,
          height: target.height + 8,
        }}
      >
        <span aria-hidden="true" className="text-sm font-bold text-text-primary">
          {ar ? "المهام" : "Tasks"}
        </span>
      </button>
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-journey-continue
        className="fixed rounded-2xl border border-border-strong bg-surface p-4 text-text-primary shadow-2xl"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
        }}
        dir={ar ? "rtl" : "ltr"}
      >
        <div
          style={{
            maxHeight: Math.max(80, viewport.height - 56),
            overflowY: "auto",
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-info-strong">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {ar ? "الخطوات الأولى اكتملت" : "First steps complete"}
          </span>
          <h2 id={titleId} className="mt-3 text-base font-bold">
            {ar
              ? "أول طلب اتسجّل. كمّل رحلتك من هنا."
              : "Your first application is saved. Continue from here."}
          </h2>
          <p id={bodyId} className="mt-2 text-sm leading-6 text-text-secondary">
            {ar
              ? "درج المهام على جنب الشاشة فيه مهمتك الحالية وتقدّمك. افتحه وقت ما تكون جاهز، أو اضغط حسنًا وكمل استكشاف المنصة."
              : "The tasks drawer on the edge of your screen holds your current quest and progress. Open it when ready, or choose Got it and keep exploring."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-400 px-3 text-sm font-bold text-neutral-950"
              onClick={open}
            >
              {ar ? "افتح المهام" : "Open tasks"}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-border-strong px-4 text-sm font-semibold hover:bg-surface-hover"
              onClick={onDismiss}
            >
              {ar ? "حسنًا" : "Got it"}
            </button>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="absolute h-3 w-3 rotate-45 border-border-strong bg-surface"
          style={
            placement.arrowDir === "left"
              ? {
                  top: placement.arrowOffset - 6,
                  left: -7,
                  borderLeftWidth: 1,
                  borderBottomWidth: 1,
                }
              : {
                  top: placement.arrowOffset - 6,
                  right: -7,
                  borderRightWidth: 1,
                  borderTopWidth: 1,
                }
          }
        />
      </div>
    </div>,
    document.body,
  );
}
