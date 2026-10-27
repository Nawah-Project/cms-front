import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../features/auth/store/authStore";
import { useI18n } from "../../../i18n";
import { JourneyContinueCoachmark } from "./JourneyContinueCoachmark";
import {
  placeTourCard,
  readTourViewport,
  type TourViewport,
} from "./tour-layout";
import { profileApi } from "../../../features/profile/profileApi";
import { trackUxEvent } from "../../../utils/uxAnalytics";
import {
  FIRST_APPLICATION_FLOW,
  isGuideFinished,
  useExperienceProgress,
} from "../../experience/ExperienceProgress";

export type TourStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface TourContextValue {
  isTourActive: boolean;
  isTourBlocking: boolean;
  step: TourStep;
  nextStep: () => void;
  setStep: (step: TourStep) => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  isTourActive: false,
  isTourBlocking: false,
  step: 1,
  nextStep: () => {},
  setStep: () => {},
  completeTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

const STEP_SELECTORS: Record<TourStep, string> = {
  1: '[data-tour-step="journey-drawer-handle"]',
  2: '[data-tour-step="journey-add-app-btn"]',
  3: '[data-tour-step="add-app-explorer-btn"]',
  4: '[data-tour-step="explorer-linkedin-card"]',
  5: '[data-tour-step="add-app-company"]',
  6: '[data-tour-step="add-app-url"]',
  7: '[data-tour-step="add-app-submit"]',
};

interface StepContent {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

const STEP_CONTENTS: Record<TourStep, StepContent> = {
  1: {
    titleAr: "الخطوة 1 من 7: افتح خريطة مهامك 🎯",
    titleEn: "Step 1 of 7: Open your Quest Map 🎯",
    bodyAr:
      "اضغط على زر المهام الجانبي لترى المهمة التمهيدية المطلوبة منك الآن.",
    bodyEn: "Click the quest button to view your active onboarding mission.",
  },
  2: {
    titleAr: "الخطوة 2 من 7: ابدأ أول طلب تقديم 🚀",
    titleEn: "Step 2 of 7: Start Your First Application 🚀",
    bodyAr:
      "اضغط على زر (+ إضافة طلب تقديم) داخل بطاقة المهمة لتجهيز أول طلب وظيفة.",
    bodyEn:
      "Click (+ Add Application) in the mission card to set up your first application.",
  },
  3: {
    titleAr: "الخطوة 3 من 7: افتح مستكشف الوظائف 🧭",
    titleEn: "Step 3 of 7: Open Job Explorer 🧭",
    bodyAr: "اضغط هنا للوصول السريع إلى الوظائف المفتوحة والمفلترة بتخصصك.",
    bodyEn:
      "Click here to discover open jobs pre-filtered by your specialization.",
  },
  4: {
    titleAr: "الخطوة 4 من 7: ابحث في LinkedIn Jobs 💼",
    titleEn: "Step 4 of 7: Search in LinkedIn Jobs 💼",
    bodyAr:
      "اضغط على بطاقة LinkedIn لفتح الوظائف المناسبة لتخصصك في تبويب جديد؛ اختر وظيفة وانسخ رابطها واسم الشركة ثم عد إلى هذه النافذة.",
    bodyEn:
      "Click LinkedIn card to browse matching jobs in a new tab; pick a job, copy its URL and company name, then return to this form.",
  },
  5: {
    titleAr: "الخطوة 5 من 7: سجل اسم الشركة 🏢",
    titleEn: "Step 5 of 7: Record Company Name 🏢",
    bodyAr: "اكتب اسم الشركة التي وجدت الفرصة لديها (واضغط التالي للمتابعة).",
    bodyEn:
      "Enter the company name where you found the job (click Next to continue).",
  },
  6: {
    titleAr: "الخطوة 6 من 7: الصق رابط الوظيفة 🔗",
    titleEn: "Step 6 of 7: Paste Job Link 🔗",
    bodyAr:
      "ضع رابط إعلان الوظيفة هنا؛ يسهّل عليك الرجوع إليها لاحقاً وستحتاجه في تقييم اليوم السابع.",
    bodyEn:
      "Paste the job post URL here; it enables quick review and is vital for your Day 7 evaluation.",
  },
  7: {
    titleAr: "الخطوة 7 من 7: احفظ طلبك الأول! 🎉",
    titleEn: "Step 7 of 7: Save Your First Application! 🎉",
    bodyAr: "اضغط على (إضافة الطلب) لتسجيل أول إنجاز لك في المهمة بنجاح.",
    bodyEn: "Click (Add Application) to log your first milestone successfully.",
  },
};

type ArrowDir = "left" | "right" | "up" | "down";

function TourArrow({ dir, offset }: { dir: ArrowDir; offset: number }) {
  if (dir === "left") {
    return (
      <div
        className="absolute -left-[9px] pointer-events-none drop-shadow-[-2px_0_4px_rgba(0,0,0,0.6)]"
        style={{ top: offset - 8 }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path
            d="M0 8L10 0V16L0 8Z"
            fill="#ffffff"
            stroke="#a9bcb0"
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }

  if (dir === "right") {
    return (
      <div
        className="absolute -right-[9px] pointer-events-none drop-shadow-[2px_0_4px_rgba(0,0,0,0.6)]"
        style={{ top: offset - 8 }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path
            d="M10 8L0 16V0L10 8Z"
            fill="#ffffff"
            stroke="#a9bcb0"
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }

  if (dir === "up") {
    return (
      <div
        className="absolute -top-[9px] pointer-events-none drop-shadow-[0_-2px_4px_rgba(0,0,0,0.6)]"
        style={{ left: offset - 8 }}
      >
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path
            d="M8 0L16 10H0L8 0Z"
            fill="#ffffff"
            stroke="#a9bcb0"
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }

  // Down
  return (
    <div
      className="absolute -bottom-[9px] pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      style={{ left: offset - 8 }}
    >
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path
          d="M8 10L0 0H16L8 10Z"
          fill="#ffffff"
          stroke="#a9bcb0"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export function FirstApplicationGuidedTourProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const isRtl = locale === "ar";
  const experience = useExperienceProgress();
  const firstProgress = experience.progress[FIRST_APPLICATION_FLOW];
  const startedOwner = useRef<string | null>(null);
  const resumeForm = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
    enabled: Boolean(user) && enabled,
  });

  const storageKey = user?.id ? `nawah_v2_guided_tour_done_${user.id}` : null;

  const [isTourActive, setIsTourActive] = useState(false);
  const [completionOwner, setCompletionOwner] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const [viewport, setViewport] = useState<TourViewport | null>(null);
  const [step, setStep] = useState<TourStep>(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetBorderRadius, setTargetBorderRadius] = useState<string>("12px");

  // Form field live values for Step 5 & 6 validation
  const [companyValue, setCompanyValue] = useState("");
  const [urlValue, setUrlValue] = useState("");

  // The account owns this state; existing application counts never imply that
  // somebody completed this guide. Deployments and browser changes cannot reset it.
  useLayoutEffect(() => {
    if (!enabled) {
      setIsTourActive(false);
      return;
    }
    if (!user || !storageKey || !experience.ready) return;
    if (!profile?.profileComplete) {
      setIsTourActive(false);
      return;
    }
    if (user.role === "ADMIN" || isGuideFinished(firstProgress)) {
      setIsTourActive(false);
      setCompletionOwner(
        experience.progress["journey-continue-v1"]?.status === "IN_PROGRESS"
          ? user.id
          : null,
      );
      return;
    }
    if (startedOwner.current === user.id) return;
    startedOwner.current = user.id;
    // Reopen the required controls, but never resume on an empty submit button.
    // Unsaved form input is not sent to the server as guide telemetry.
    const savedStep = Math.max(1, Math.min(7, firstProgress?.currentStep ?? 1));
    const resumeStep = (savedStep >= 5 ? 5 : savedStep) as TourStep;
    setIsTourActive(true);
    setStep(resumeStep);
    resumeForm.current = resumeStep >= 3;
  }, [
    enabled,
    user?.id,
    user?.role,
    storageKey,
    profile?.profileComplete,
    experience.ready,
    firstProgress?.status,
    experience.progress["journey-continue-v1"]?.status,
  ]);

  useEffect(() => {
    if (!isTourActive || !resumeForm.current) return;
    const timer = window.setTimeout(() => {
      resumeForm.current = false;
      window.dispatchEvent(new Event("nawah_open_add_modal"));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isTourActive]);

  useEffect(() => {
    if (isTourActive)
      experience.record(FIRST_APPLICATION_FLOW, "IN_PROGRESS", step);
  }, [isTourActive, step, experience.record]);

  let preparing = false;
  preparing = Boolean(
    enabled &&
    user?.role !== "ADMIN" &&
    user &&
    !experience.error &&
    !isGuideFinished(firstProgress) &&
    (!experience.ready || profile === undefined),
  );
  const completeTour = () => {
    experience.record(FIRST_APPLICATION_FLOW, "COMPLETED", 7);
    experience.record("explorer-intro-week1-v1", "COMPLETED", 0);
    experience.record("explorer-filters-week1-v1", "COMPLETED", 2);
    experience.record("journey-coachmark-v1", "COMPLETED", 0);
    experience.record("journey-continue-v1", "IN_PROGRESS", 0);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // ignore
      }
    }
    trackUxEvent("tour_completed");
    setIsTourActive(false);
    if (user?.id) setCompletionOwner(user.id);
  };

  const nextStep = () => {
    if (step < 7) {
      setStep((prev) => (prev + 1) as TourStep);
    } else {
      completeTour();
    }
  };

  // Continuous requestAnimationFrame tracking loop
  useLayoutEffect(() => {
    if (!isTourActive) {
      setTargetRect(null);
      return;
    }

    let animationFrameId: number;
    let alignedTarget: Element | null = null;

    const track = () => {
      const selector = STEP_SELECTORS[step];
      const el = selector
        ? (document.querySelector(selector) as HTMLElement | null)
        : null;

      if (el) {
        if (
          step !== 1 &&
          alignedTarget !== el &&
          el.getBoundingClientRect().height > 0
        ) {
          el.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "instant",
          });
          alignedTarget = el;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const computed = window.getComputedStyle(el);
          const radius = computed.borderRadius;
          if (radius && radius !== "0px") {
            setTargetBorderRadius((prev) => (prev !== radius ? radius : prev));
          } else {
            setTargetBorderRadius((prev) => (prev !== "12px" ? "12px" : prev));
          }

          setTargetRect((prev) => {
            if (
              !prev ||
              Math.abs(rect.top - prev.top) > 0.5 ||
              Math.abs(rect.left - prev.left) > 0.5 ||
              Math.abs(rect.width - prev.width) > 0.5 ||
              Math.abs(rect.height - prev.height) > 0.5
            ) {
              return rect;
            }
            return prev;
          });
        }
      }

      animationFrameId = requestAnimationFrame(track);
    };

    track();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isTourActive, step]);

  // Step 1: Detect drawer opening automatically if user clicks the handle
  useEffect(() => {
    if (!isTourActive || step !== 1) return;

    const interval = setInterval(() => {
      const drawer = document.querySelector("#journey-tasks-drawer");
      const isDrawerOpen =
        drawer && drawer.getAttribute("aria-hidden") === "false";
      if (isDrawerOpen) {
        setStep(2);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isTourActive, step]);

  // One-time focus on entering steps 5 or 6
  useEffect(() => {
    if (!isTourActive) return;
    if (step === 5 || step === 6) {
      const timer = setTimeout(() => {
        const selector = STEP_SELECTORS[step];
        const el = selector
          ? (document.querySelector(selector) as HTMLElement | null)
          : null;
        if (el && document.activeElement !== el) {
          el.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isTourActive, step]);

  // Track inputs for steps 5 & 6 (instant keystroke + interval fallback)
  useEffect(() => {
    if (!isTourActive) return;
    if (step !== 5 && step !== 6) return;

    const checkInputs = () => {
      if (step === 5) {
        const compEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-company"]',
        );
        if (compEl) {
          const val = compEl.value || "";
          setCompanyValue((prev) => (prev !== val ? val : prev));
        }
      } else if (step === 6) {
        const urlEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-url"]',
        );
        if (urlEl) {
          const val = urlEl.value || "";
          setUrlValue((prev) => (prev !== val ? val : prev));
        }
      }
    };

    checkInputs();

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target) return;
      if (
        step === 5 &&
        target.getAttribute("data-tour-step") === "add-app-company"
      ) {
        setCompanyValue(target.value || "");
      } else if (
        step === 6 &&
        target.getAttribute("data-tour-step") === "add-app-url"
      ) {
        setUrlValue(target.value || "");
      }
    };

    window.addEventListener("input", handleInput, false);
    const interval = window.setInterval(checkInputs, 40);

    return () => {
      window.removeEventListener("input", handleInput, false);
      window.clearInterval(interval);
    };
  }, [isTourActive, step]);

  // Keyboard navigation: Enter in steps 5 & 6 advances
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (step === 5 && companyValue.trim().length >= 2) {
          e.preventDefault();
          nextStep();
        } else if (
          step === 6 &&
          urlValue.trim().length >= 8 &&
          /^https?:\/\//i.test(urlValue.trim())
        ) {
          e.preventDefault();
          nextStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourActive, step, companyValue, urlValue]);

  // Complete tour only when application created successfully
  useEffect(() => {
    const handleAppCreated = () => {
      if (isTourActive) {
        completeTour();
      }
    };
    window.addEventListener("nawah_app_created", handleAppCreated);
    return () =>
      window.removeEventListener("nawah_app_created", handleAppCreated);
  }, [isTourActive, storageKey]);

  useEffect(() => {
    if (!isTourActive) return;
    const update = () => setViewport(readTourViewport());
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    const node = cardRef.current;
    const observer = node
      ? new ResizeObserver(() =>
          setCardHeight(node.getBoundingClientRect().height),
        )
      : null;
    if (node) observer?.observe(node);
    return () => {
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isTourActive, step]);

  const isStep5Valid = companyValue.trim().length >= 2;
  const isStep6Valid =
    urlValue.trim().length >= 8 && /^https?:\/\//i.test(urlValue.trim());

  const currentContent = STEP_CONTENTS[step];

  let activeRect = targetRect;
  if (!activeRect && typeof window !== "undefined") {
    if (step === 1) {
      activeRect = new DOMRect(
        isRtl ? 0 : window.innerWidth - 32,
        window.innerHeight / 2 - 22,
        32,
        44,
      );
    }
  }

  const visibleViewport = viewport ?? {
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    top: 0,
    left: 0,
  };
  const placement = placeTourCard(
    activeRect ?? {
      top: 100,
      bottom: 100,
      left: visibleViewport.width / 2,
      right: visibleViewport.width / 2,
      width: 0,
      height: 0,
    },
    visibleViewport,
    cardHeight,
    step === 1,
  );

  const pad = 2;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        isTourBlocking:
          preparing ||
          isTourActive ||
          completionOwner === user?.id ||
          !experience.ready,
        step,
        nextStep,
        setStep,
        completeTour,
      }}
    >
      {children}
      {experience.error && !experience.ready && (
        <div
          role="alert"
          className="fixed bottom-5 inset-x-5 z-[9995] mx-auto max-w-md rounded-xl border border-border bg-white p-4 shadow-xl"
        >
          <p className="text-sm text-text-primary">
            {isRtl
              ? "تعذر تحميل خطوات حسابك. أعد المحاولة لاستكمال الشرح من مكانك."
              : "Your account's guide progress could not be loaded. Retry to continue where you left off."}
          </p>
          <button
            type="button"
            className="button-primary mt-3"
            onClick={experience.refresh}
          >
            {isRtl ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {preparing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-tour-pending
            className="tour-scrim fixed inset-0 z-[9989]"
          />,
          document.body,
        )}

      {isTourActive &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-mandatory-tour
            className="fixed inset-0 w-full h-dvh z-[9990] pointer-events-none select-none overflow-hidden"
          >
            {/* 4 Physical Backdrop Divs: Invisible hitboxes blocking clicks EXCEPT inside activeRect (z-[9990]) */}
            {activeRect ? (
              <>
                {/* Top Backdrop */}
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: Math.max(0, activeRect.top - pad),
                    zIndex: 9990,
                  }}
                  className="tour-scrim pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Bottom Backdrop */}
                <div
                  style={{
                    position: "fixed",
                    top: activeRect.bottom + pad,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9990,
                  }}
                  className="tour-scrim pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Left Backdrop */}
                <div
                  style={{
                    position: "fixed",
                    top: Math.max(0, activeRect.top - pad),
                    left: 0,
                    width: Math.max(0, activeRect.left - pad),
                    height: activeRect.height + pad * 2,
                    zIndex: 9990,
                  }}
                  className="tour-scrim pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Right Backdrop */}
                <div
                  style={{
                    position: "fixed",
                    top: Math.max(0, activeRect.top - pad),
                    left: activeRect.right + pad,
                    right: 0,
                    height: activeRect.height + pad * 2,
                    zIndex: 9990,
                  }}
                  className="tour-scrim pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              </>
            ) : (
              <div
                className="tour-scrim fixed inset-0 z-[9990] pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            )}

            {/* Glowing Cutout Border around Target (z-[9991]) casting seamless dark backdrop via box-shadow */}
            {activeRect && (
              <div
                style={{
                  position: "fixed",
                  top: activeRect.top - pad,
                  left: activeRect.left - pad,
                  width: activeRect.width + pad * 2,
                  height: activeRect.height + pad * 2,
                  borderRadius: targetBorderRadius
                    ? `calc(${targetBorderRadius} + ${pad}px)`
                    : "14px",
                  border: "1.5px solid rgba(255, 255, 255, 0.85)",
                  boxShadow:
                    "0 0 0 3px rgba(255,255,255,.7), 0 0 12px rgba(18,94,78,.18)",
                  zIndex: 9991,
                }}
                className="ring-2 ring-emerald-400/35 pointer-events-none"
              />
            )}

            {/* Interactive Guidance Card (z-[9999]) - Pure Pointer Coachmark */}
            <div
              ref={cardRef}
              data-guided-tour-card
              style={{
                position: "fixed",
                width: placement.width,
                maxHeight: visibleViewport.height - 24,
                overflowY: "auto",
                overflowX: "hidden",
                overflowWrap: "anywhere",
                top: placement.top,
                left: placement.left,
                zIndex: 9999,
              }}
              className="relative rounded-2xl border border-border-strong bg-surface px-4 py-3.5 text-text-primary shadow-2xl  duration-200 pointer-events-auto"
            >
              {/* Attached Pointer Arrow */}
              <TourArrow
                dir={placement.arrowDir}
                offset={placement.arrowOffset}
              />

              {/* Mini Top Bar (No divider line) */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-info-strong">
                  {isRtl ? `الخطوة ${step} من 7` : `Step ${step} of 7`}
                </span>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                    <span
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        s === step
                          ? "w-3.5 bg-emerald-400"
                          : s < step
                            ? "w-1.5 bg-emerald-600"
                            : "w-1.5 bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="mt-1.5 text-xs sm:text-[13px] font-bold text-text-primary leading-snug">
                {isRtl ? currentContent.titleAr : currentContent.titleEn}
              </h3>

              {/* Description */}
              {!(
                (step === 5 || step === 6) &&
                visibleViewport.height < 450
              ) && (
                <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                  {isRtl ? currentContent.bodyAr : currentContent.bodyEn}
                </p>
              )}

              {/* Steps 5 & 6 only: Sleek inline Next button */}
              {step === 5 && (
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] truncate transition-colors ${
                      isStep5Valid
                        ? "text-info-strong font-bold"
                        : "text-neutral-400"
                    }`}
                  >
                    {isStep5Valid
                      ? isRtl
                        ? "✓ جاهز للمتابعة"
                        : "✓ Ready"
                      : isRtl
                        ? "اكتب اسم الشركة..."
                        : "Type company name..."}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep5Valid}
                    onClick={nextStep}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all duration-150 shrink-0 ${
                      isStep5Valid
                        ? "bg-accent hover:bg-neutral-900 text-white shadow-sm cursor-pointer active:scale-95"
                        : "bg-neutral-100 text-neutral-500 border border-border cursor-not-allowed"
                    }`}
                  >
                    <span>{isRtl ? "التالي ←" : "Next →"}</span>
                  </button>
                </div>
              )}

              {step === 6 && (
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] truncate transition-colors ${
                      isStep6Valid
                        ? "text-info-strong font-bold"
                        : "text-neutral-400"
                    }`}
                  >
                    {isStep6Valid
                      ? isRtl
                        ? "✓ رابط صحيح"
                        : "✓ Valid link"
                      : isRtl
                        ? "الصق الرابط (http://)..."
                        : "Paste job URL..."}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep6Valid}
                    onClick={nextStep}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all duration-150 shrink-0 ${
                      isStep6Valid
                        ? "bg-accent hover:bg-neutral-900 text-white shadow-sm cursor-pointer active:scale-95"
                        : "bg-neutral-100 text-neutral-500 border border-border cursor-not-allowed"
                    }`}
                  >
                    <span>{isRtl ? "التالي ←" : "Next →"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
      {enabled && completionOwner === user?.id && !isTourActive && (
        <JourneyContinueCoachmark
          onDismiss={() => {
            experience.record("journey-continue-v1", "COMPLETED");
            setCompletionOwner(null);
          }}
        />
      )}
    </TourContext.Provider>
  );
}
