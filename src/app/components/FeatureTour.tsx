import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../features/auth/store/authStore";
import { useI18n } from "../i18n";
import { useDialogFocus } from "./ui/useDialogFocus";
import {
  placeTourCard,
  readTourViewport,
  type TourViewport,
} from "../features/applications/components/tour-layout";

const SEEN_EVENT = "nawah:feature-tour-seen";
export function featureTourKey(userId: string, feature: string) {
  return `nawah_feature_tour_${userId}_${feature}`;
}
function hasSeen(userId: string | undefined, feature: string) {
  try {
    return (
      !userId ||
      localStorage.getItem(featureTourKey(userId, feature)) === "true" ||
      (feature === "explorer-intro-week1-v1" && localStorage.getItem(featureTourKey(userId, "explorer-filters-week1-v1")) === "true")
    );
  } catch {
    return true;
  }
}
export function markFeatureTourSeen(
  userId: string | undefined,
  feature: string,
) {
  if (!userId) return;
  try {
    localStorage.setItem(featureTourKey(userId, feature), "true");
  } catch {
    /* Dismissal still works for this page. */
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
}
export function FeatureTourPending({ feature }: { feature: string }) {
  const { user } = useAuth();
  return user?.role !== "ADMIN" &&
    !hasSeen(user?.id, feature) &&
    typeof document !== "undefined"
    ? createPortal(
        <div
          data-tour-pending
          className="tour-scrim fixed inset-0 z-[10029]"
          aria-hidden="true"
        />,
        document.body,
      )
    : null;
}
export interface FeatureTourStep {
  selector: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  finishOnTargetClick?: boolean;
  activateTarget?: boolean;
  advanceOnTargetClick?: boolean;
  includeSelector?: string;
}
export function FeatureTour({
  feature,
  enabled,
  steps,
  onFinish,
  finishAr = "تمام، كمّل",
  finishEn = "Got it",
}: {
  feature: string;
  enabled: boolean;
  steps: FeatureTourStep[];
  onFinish?: (skipped: boolean, fromTarget?: boolean) => void;
  finishAr?: string;
  finishEn?: string;
}) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [seen, setSeen] = useState(() => hasSeen(user?.id, feature));
  const [index, setIndex] = useState(0),
    [rect, setRect] = useState<DOMRect | null>(null),
    [viewport, setViewport] = useState<TourViewport | null>(null),
    [paused, setPaused] = useState(false),
    [height, setHeight] = useState(210);
  const card = useRef<HTMLDivElement>(null),
    target = useRef<HTMLElement | null>(null);
  const title = useId(),
    body = useId();
  const active = enabled && !seen && user?.role !== "ADMIN";
  const finish = (skipped = false, fromTarget = false) => {
    setSeen(true);
    markFeatureTourSeen(user?.id, feature);
    onFinish?.(skipped, fromTarget);
  };
  const advance = () => {
    setRect(null);
    setIndex((i) => i + 1);
  };
  useLayoutEffect(() => {
    const read = () => setSeen(hasSeen(user?.id, feature));
    read();
    setIndex(0);
    window.addEventListener(SEEN_EVENT, read);
    return () => window.removeEventListener(SEEN_EVENT, read);
  }, [user?.id, feature]);
  useLayoutEffect(() => {
    if (!active || !steps[index]) return;
    let frame = 0,
      aligned: HTMLElement | null = null;
    const visible = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const track = () => {
      const element =
        [...document.querySelectorAll<HTMLElement>(steps[index].selector)].find(
          visible,
        ) ?? null;
      target.current = element;
      const dialogs = [
        ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
      ].filter((el) => !el.hasAttribute("data-feature-tour") && visible(el));
      const last = dialogs.at(-1),
        blocked = Boolean(element && last && !last.contains(element));
      setPaused(blocked);
      if (element) {
        if (!blocked && aligned !== element) {
          element.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "instant",
          });
          aligned = element;
        }
        let next = element.getBoundingClientRect();
        if (steps[index].includeSelector) {
          const extra = [
            ...document.querySelectorAll<HTMLElement>(
              steps[index].includeSelector!,
            ),
          ]
            .find(visible)
            ?.getBoundingClientRect();
          if (extra) {
            const l = Math.min(next.left, extra.left),
              t = Math.min(next.top, extra.top);
            next = new DOMRect(
              l,
              t,
              Math.max(next.right, extra.right) - l,
              Math.max(next.bottom, extra.bottom) - t,
            );
          }
        }
        setRect((old) =>
          old &&
          Math.abs(old.top - next.top) < 0.5 &&
          Math.abs(old.left - next.left) < 0.5 &&
          old.width === next.width &&
          old.height === next.height
            ? old
            : next,
        );
      } else setRect(null);
      const next = readTourViewport();
      setViewport((old) =>
        old &&
        old.width === next.width &&
        old.height === next.height &&
        old.top === next.top &&
        old.left === next.left
          ? old
          : next,
      );
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [active, index, steps]);
  useEffect(() => {
    if (feature !== "groups-week1-v1" || !active) return;
    const close = () => {
      if (index >= 2 && index <= 4) {
        setRect(null);
        setIndex(5);
      }
    };
    window.addEventListener("nawah:member-profile-closed", close);
    return () =>
      window.removeEventListener("nawah:member-profile-closed", close);
  }, [active, index, feature]);
  useEffect(() => {
    if (feature !== "analytics-week1-v1" || !active) return;
    const resume = () => { if (index >= 4 && index <= 6) { setRect(null); setIndex(7); } };
    window.addEventListener("nawah:cohort-closed", resume);
    return () => window.removeEventListener("nawah:cohort-closed", resume);
  }, [active, index, feature]);
  const visible = Boolean(active && rect && viewport && !paused);
  useDialogFocus(card, visible, () => finish(true));
  useLayoutEffect(() => {
    if (!visible || !card.current) return;
    const node = card.current;
    setHeight(node.getBoundingClientRect().height);
    const observer = new ResizeObserver(() =>
      setHeight(node.getBoundingClientRect().height),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, index]);
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (!step?.finishOnTargetClick && !step?.advanceOnTargetClick) return;
    const click = (event: MouseEvent) => {
      if (target.current?.contains(event.target as Node)) {
        if (step.finishOnTargetClick) finish(false, true);
        else advance();
      }
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [active, index, steps]);
  if (!active || typeof document === "undefined") return null;
  // The open dialog already owns its backdrop while the guide waits for it.
  if (paused) return null;
  if (!rect || !viewport || !steps[index])
    return createPortal(
      <div
        data-tour-pending
        className="tour-scrim fixed inset-0 z-[10030]"
        aria-hidden="true"
      />,
      document.body,
    );
  const left = Math.max(viewport.left + 2, rect.left - 3),
    top = Math.max(viewport.top + 2, rect.top - 3),
    right = Math.min(viewport.left + viewport.width - 2, rect.right + 3),
    bottom = Math.min(viewport.top + viewport.height - 2, rect.bottom + 3);
  const focus = {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
  const placement = placeTourCard(focus, viewport, height);
  const step = steps[index];
  const next = () => {
    if (step.activateTarget && target.current) {
      target.current.click();
      return;
    }
    if (index + 1 < steps.length) advance();
    else finish(false);
  };
  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[10030]"
      data-feature-tour-overlay={feature}
    >
      <div
        className="tour-scrim pointer-events-auto fixed"
        style={{ top: 0, left: 0, right: 0, height: top }}
      />
      <div
        className="tour-scrim pointer-events-auto fixed"
        style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="tour-scrim pointer-events-auto fixed"
        style={{ top, left: 0, width: left, height: focus.height }}
      />
      <div
        className="tour-scrim pointer-events-auto fixed"
        style={{ top, left: right, right: 0, height: focus.height }}
      />
      <div
        data-tour-focus
        className="fixed rounded-xl border-2 border-emerald-300 ring-4 ring-emerald-300/20"
        style={{
          top,
          left,
          width: focus.width,
          height: focus.height,
        }}
        aria-hidden="true"
      />
      <div
        ref={card}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={title}
        aria-describedby={body}
        data-feature-tour={feature}
        className="pointer-events-auto fixed min-w-0 overflow-hidden rounded-2xl border border-border-strong bg-surface p-4 text-text-primary shadow-2xl"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
        }}
        dir={ar ? "rtl" : "ltr"}
      >
        <div
          style={{
            maxHeight: viewport.height - 70,
            overflowY: "auto",
            overflowX: "hidden",
            overflowWrap: "anywhere",
          }}
        >
          <p className="text-xs font-semibold text-info-strong">
            {ar
              ? `دليل سريع · ${index + 1} من ${steps.length}`
              : `Quick guide · ${index + 1} of ${steps.length}`}
          </p>
          <h2 id={title} className="mt-2 text-base font-bold">
            {ar ? step.titleAr : step.titleEn}
          </h2>
          <p id={body} className="mt-2 text-sm leading-6 text-text-secondary">
            {ar ? step.bodyAr : step.bodyEn}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="min-h-10 rounded-lg px-2 text-xs text-text-secondary underline"
              onClick={() => finish(true)}
            >
              {ar ? "تخطّي" : "Skip"}
            </button>
            <button
              type="button"
              className="button-primary min-h-11 rounded-xl px-4 text-sm font-bold"
              onClick={next}
            >
              {step.activateTarget
                ? ar
                  ? "افتح للمتابعة"
                  : "Open to continue"
                : index + 1 < steps.length
                  ? ar
                    ? "التالي"
                    : "Next"
                  : ar
                    ? finishAr
                    : finishEn}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
