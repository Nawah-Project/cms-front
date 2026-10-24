import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../features/auth/store/authStore";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import { useApplications } from "../api/applicationsApi";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  FileText,
  Globe,
  ListChecks,
  Plus,
  Send,
} from "lucide-react";

export type TourStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface TourContextValue {
  isTourActive: boolean;
  step: TourStep;
  nextStep: () => void;
  setStep: (step: TourStep) => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  isTourActive: false,
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
  icon: typeof Compass;
}

const STEP_CONTENTS: Record<TourStep, StepContent> = {
  1: {
    titleAr: "الخطوة 1 من 7: افتح خريطة مهامك 🎯",
    titleEn: "Step 1 of 7: Open your Quest Map 🎯",
    bodyAr: "اضغط على زر المهام الجانبي لترى المهمة التمهيدية المطلوبة منك الآن.",
    bodyEn: "Click the side quest handle to view your active onboarding mission.",
    icon: ListChecks,
  },
  2: {
    titleAr: "الخطوة 2 من 7: ابدأ أول طلب تقديم 🚀",
    titleEn: "Step 2 of 7: Start Your First Application 🚀",
    bodyAr: "اضغط على زر (إضافة طلب تقديم) داخل بطاقة المهمة لتجهيز أول طلب وظيفة.",
    bodyEn: "Click (+ Add Application) in the mission card to set up your first application.",
    icon: Plus,
  },
  3: {
    titleAr: "الخطوة 3 من 7: افتح مستكشف الوظائف 🧭",
    titleEn: "Step 3 of 7: Open Job Explorer 🧭",
    bodyAr: "اضغط هنا للوصول السريع إلى الوظائف المفتوحة والمفلترة بتخصصك.",
    bodyEn: "Click here to discover open jobs pre-filtered by your specialization.",
    icon: Compass,
  },
  4: {
    titleAr: "الخطوة 4 من 7: ابحث في LinkedIn Jobs 💼",
    titleEn: "Step 4 of 7: Search in LinkedIn Jobs 💼",
    bodyAr:
      "اضغط على بطاقة LinkedIn لفتح الوظائف المناسبة لتخصصك في تبويب جديد؛ اختر وظيفة وانسخ رابطها واسم الشركة ثم عد إلى هذه النافذة.",
    bodyEn:
      "Click LinkedIn card to browse matching jobs in a new tab; pick a job, copy its URL and company name, then return to this form.",
    icon: Globe,
  },
  5: {
    titleAr: "الخطوة 5 من 7: سجل اسم الشركة 🏢",
    titleEn: "Step 5 of 7: Record Company Name 🏢",
    bodyAr: "اكتب اسم الشركة التي وجدت الفرصة لديها (واضغط التالي للمتابعة).",
    bodyEn: "Enter the company name where you found the job (click Next to continue).",
    icon: FileText,
  },
  6: {
    titleAr: "الخطوة 6 من 7: الصق رابط الوظيفة 🔗",
    titleEn: "Step 6 of 7: Paste Job Link 🔗",
    bodyAr:
      "ضع رابط إعلان الوظيفة هنا؛ يسهّل عليك الرجوع إليها لاحقاً وستحتاجه في تقييم اليوم السابع.",
    bodyEn:
      "Paste the job post URL here; it enables quick review and is vital for your Day 7 evaluation.",
    icon: Globe,
  },
  7: {
    titleAr: "الخطوة 7 من 7: احفظ طلبك الأول! 🎉",
    titleEn: "Step 7 of 7: Save Your First Application! 🎉",
    bodyAr: "اضغط على (إضافة الطلب) لتسجيل أول إنجاز لك في المهمة صفر.",
    bodyEn: "Click (Add Application) to log your first milestone in Mission Zero.",
    icon: Send,
  },
};

type ArrowDir = "left" | "right" | "up" | "down";

interface SmartPlacement {
  top: number;
  left: number;
  arrowDir: ArrowDir;
  arrowOffset: number;
}

function getTourCardPlacement(
  targetRect: DOMRect,
  isRtl: boolean,
  step: TourStep,
): SmartPlacement {
  const cardWidth = 360;
  const cardHeight = step === 5 || step === 6 ? 250 : 190;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

  // STEP 1: Target is handle button on the edge
  if (step === 1) {
    const isDockedLeft = targetRect.left < 160;
    if (isDockedLeft) {
      const top = Math.max(
        16,
        Math.min(screenH - cardHeight - 16, targetRect.top - 20),
      );
      const left = targetRect.right + 18;
      const arrowOffset = Math.max(
        18,
        Math.min(cardHeight - 28, targetRect.top + targetRect.height / 2 - top - 9),
      );
      return { top, left, arrowDir: "left", arrowOffset };
    } else {
      const top = Math.max(
        16,
        Math.min(screenH - cardHeight - 16, targetRect.top - 20),
      );
      const left = Math.max(16, targetRect.left - cardWidth - 18);
      const arrowOffset = Math.max(
        18,
        Math.min(cardHeight - 28, targetRect.top + targetRect.height / 2 - top - 9),
      );
      return { top, left, arrowDir: "right", arrowOffset };
    }
  }

  // STEP 2: Button inside sliding drawer
  if (step === 2) {
    if (screenW >= 840) {
      // Place cleanly to the right of drawer in RTL, or left of drawer in LTR
      const top = Math.max(
        16,
        Math.min(screenH - cardHeight - 16, targetRect.top - 20),
      );
      const left = isRtl
        ? Math.min(screenW - cardWidth - 16, Math.max(510, targetRect.right + 24))
        : Math.max(16, targetRect.left - cardWidth - 24);
      const arrowDir: ArrowDir = isRtl ? "left" : "right";
      const arrowOffset = Math.max(
        18,
        Math.min(cardHeight - 28, targetRect.top + targetRect.height / 2 - top - 9),
      );
      return { top, left, arrowDir, arrowOffset };
    }
  }

  // STEP 7: Submit button at bottom of modal - Card placed ABOVE submit button
  if (step === 7) {
    const top = Math.max(16, targetRect.top - cardHeight - 16);
    let left = isRtl
      ? targetRect.right - cardWidth
      : targetRect.left;
    left = Math.max(16, Math.min(screenW - cardWidth - 16, left));
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const arrowOffset = Math.max(
      24,
      Math.min(cardWidth - 32, targetCenterX - left - 9),
    );
    return { top, left, arrowDir: "down", arrowOffset };
  }

  // STEPS 2, 3, 4, 5, 6: Prefer below, fallback to above if overflowing bottom
  let top = targetRect.bottom + 16;
  let arrowDir: ArrowDir = "up";

  if (top + cardHeight > screenH - 16) {
    top = Math.max(16, targetRect.top - cardHeight - 16);
    arrowDir = "down";
  }

  let left = isRtl
    ? targetRect.right - cardWidth
    : targetRect.left;
  left = Math.max(16, Math.min(screenW - cardWidth - 16, left));

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const arrowOffset = Math.max(
    24,
    Math.min(cardWidth - 32, targetCenterX - left - 9),
  );

  return { top, left, arrowDir, arrowOffset };
}

function TourArrow({ dir, offset }: { dir: ArrowDir; offset: number }) {
  if (dir === "left") {
    return (
      <div
        className="absolute -left-3 pointer-events-none drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]"
        style={{ top: offset }}
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
          <path
            d="M12 0L0 9L12 18V0Z"
            fill="#171717"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  if (dir === "right") {
    return (
      <div
        className="absolute -right-3 pointer-events-none drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]"
        style={{ top: offset }}
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
          <path
            d="M0 0L12 9L0 18V0Z"
            fill="#171717"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  if (dir === "up") {
    return (
      <div
        className="absolute -top-3 pointer-events-none drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]"
        style={{ left: offset }}
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <path
            d="M0 12L9 0L18 12H0Z"
            fill="#171717"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  // Down
  return (
    <div
      className="absolute -bottom-3 pointer-events-none drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]"
      style={{ left: offset }}
    >
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        <path
          d="M0 0L9 12L18 0H0Z"
          fill="#171717"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export function FirstApplicationGuidedTourProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const isRtl = locale === "ar";
  const { showToast } = useToast();
  const { data: appsData } = useApplications();
  const totalApplications =
    appsData?.unfilteredTotal ?? appsData?.total ?? 0;

  const storageKey = user?.id
    ? `nawah_first_app_tour_completed_${user.id}`
    : null;

  const [isTourActive, setIsTourActive] = useState(false);
  const [step, setStep] = useState<TourStep>(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Form field live values for Step 5 & 6 validation
  const [companyValue, setCompanyValue] = useState("");
  const [urlValue, setUrlValue] = useState("");

  // Determine if tour should start
  useEffect(() => {
    if (!user || !storageKey) return;
    try {
      const completed = localStorage.getItem(storageKey);
      if (completed !== "true" && totalApplications === 0) {
        setIsTourActive(true);
        setStep(1);
      } else {
        setIsTourActive(false);
      }
    } catch {
      setIsTourActive(false);
    }
  }, [user, storageKey, totalApplications]);

  const completeTour = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // ignore
      }
    }
    setIsTourActive(false);
    showToast({
      message: isRtl
        ? "🎉 رائع جداً! تم تسجيل أول طلب تقديم لك في رحلة نواة بنجاح!"
        : "🎉 Fantastic! Your first job application has been logged successfully!",
      variant: "success",
    });
  };

  const nextStep = () => {
    if (step < 7) {
      setStep((prev) => (prev + 1) as TourStep);
    } else {
      completeTour();
    }
  };

  // Continuous requestAnimationFrame tracking loop
  useEffect(() => {
    if (!isTourActive) {
      setTargetRect(null);
      return;
    }

    let animationFrameId: number;
    let lastRect: { top: number; left: number; width: number; height: number } | null = null;

    const track = () => {
      const selector = STEP_SELECTORS[step];
      const el = selector
        ? (document.querySelector(selector) as HTMLElement | null)
        : null;

      if (el) {
        if (step === 2) {
          el.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
        if ((step === 5 || step === 6) && document.activeElement !== el) {
          el.focus();
        }

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (
            !lastRect ||
            Math.abs(rect.top - lastRect.top) > 0.5 ||
            Math.abs(rect.left - lastRect.left) > 0.5 ||
            Math.abs(rect.width - lastRect.width) > 0.5 ||
            Math.abs(rect.height - lastRect.height) > 0.5
          ) {
            lastRect = {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
            setTargetRect(rect);
          }
        }
      }

      animationFrameId = requestAnimationFrame(track);
    };

    animationFrameId = requestAnimationFrame(track);
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

  // Track inputs for steps 5 & 6
  useEffect(() => {
    if (!isTourActive) return;

    const checkInputs = () => {
      if (step === 5) {
        const compEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-company"]',
        );
        if (compEl) setCompanyValue(compEl.value);
      } else if (step === 6) {
        const urlEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-url"]',
        );
        if (urlEl) setUrlValue(urlEl.value);
      }
    };

    const interval = window.setInterval(checkInputs, 80);
    return () => window.clearInterval(interval);
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

  // Complete tour when application created
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

  const isStep5Valid = companyValue.trim().length >= 2;
  const isStep6Valid =
    urlValue.trim().length >= 8 && /^https?:\/\//i.test(urlValue.trim());

  const currentContent = STEP_CONTENTS[step];
  const IconComponent = currentContent?.icon || Compass;

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

  const placement = activeRect
    ? getTourCardPlacement(activeRect, isRtl, step)
    : {
        top: 120,
        left: Math.max(
          16,
          typeof window !== "undefined" ? (window.innerWidth - 360) / 2 : 16,
        ),
        arrowDir: "up" as ArrowDir,
        arrowOffset: 40,
      };

  const pad = step === 5 || step === 6 ? 4 : 6;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        step,
        nextStep,
        setStep,
        completeTour,
      }}
    >
      {children}

      {isTourActive &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 w-screen h-dvh z-[9990] pointer-events-none select-none overflow-hidden">
            {/* 4 Physical Backdrop Divs: Shading EVERYTHING across the screen EXCEPT activeRect */}
            {activeRect ? (
              <>
                {/* Top Backdrop (covers top of screen down to target top) */}
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: Math.max(0, activeRect.top - pad),
                    zIndex: 9990,
                  }}
                  className="bg-neutral-950/80 backdrop-blur-[2px] pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Bottom Backdrop (covers target bottom down to screen bottom) */}
                <div
                  style={{
                    position: "fixed",
                    top: activeRect.bottom + pad,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9990,
                  }}
                  className="bg-neutral-950/80 backdrop-blur-[2px] pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Left Backdrop (covers left edge to target left) */}
                <div
                  style={{
                    position: "fixed",
                    top: Math.max(0, activeRect.top - pad),
                    left: 0,
                    width: Math.max(0, activeRect.left - pad),
                    height: activeRect.height + pad * 2,
                    zIndex: 9990,
                  }}
                  className="bg-neutral-950/80 backdrop-blur-[2px] pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
                {/* Right Backdrop (covers target right to right edge) */}
                <div
                  style={{
                    position: "fixed",
                    top: Math.max(0, activeRect.top - pad),
                    left: activeRect.right + pad,
                    right: 0,
                    height: activeRect.height + pad * 2,
                    zIndex: 9990,
                  }}
                  className="bg-neutral-950/80 backdrop-blur-[2px] pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              </>
            ) : (
              <div
                className="fixed inset-0 bg-neutral-950/80 backdrop-blur-[2px] z-[9990] pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            )}

            {/* Glowing Cutout Border around Target (z-[9991]) */}
            {activeRect && (
              <div
                style={{
                  position: "fixed",
                  top: activeRect.top - pad,
                  left: activeRect.left - pad,
                  width: activeRect.width + pad * 2,
                  height: activeRect.height + pad * 2,
                  zIndex: 9991,
                }}
                className="rounded-2xl ring-4 ring-primary-strong/90 animate-pulse pointer-events-none shadow-[0_0_45px_rgba(40,89,135,0.7)]"
              />
            )}

            {/* Interactive Guidance Card (z-[9999]) with Directional SVG Arrow */}
            <div
              style={{
                position: "fixed",
                top: placement.top,
                left: placement.left,
                zIndex: 9999,
              }}
              className="relative w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-neutral-700/80 bg-neutral-900/95 p-5 text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            >
              {/* Directional SVG Arrow pointing directly at target */}
              <TourArrow dir={placement.arrowDir} offset={placement.arrowOffset} />

              {/* Header & Step Dots */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-strong/20 text-primary-strong border border-primary-strong/40">
                    <IconComponent className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-neutral-300">
                    {isRtl ? `الخطوة ${step} من 7` : `Step ${step} of 7`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                    <span
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        s === step
                          ? "w-4 bg-primary-strong"
                          : s < step
                            ? "w-1.5 bg-emerald-500"
                            : "w-1.5 bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="mt-3 text-sm font-bold text-white flex items-center gap-1.5">
                {isRtl ? currentContent.titleAr : currentContent.titleEn}
              </h3>

              {/* Description */}
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
                {isRtl ? currentContent.bodyAr : currentContent.bodyEn}
              </p>

              {/* Step 1: Open Drawer Action Button */}
              {step === 1 && (
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                    }}
                    className="button-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 font-semibold shadow-xs"
                  >
                    <span>{isRtl ? "افتح خريطة مهامك" : "Open Journey Tasks"}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Open Add Application Modal Action Button */}
              {step === 2 && (
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(3);
                      const addBtn = document.querySelector(
                        '[data-tour-step="journey-add-app-btn"]',
                      ) as HTMLButtonElement | null;
                      if (addBtn) {
                        addBtn.click();
                      } else {
                        const directAddBtn = document.querySelector(
                          '[data-tour-step="add-app-btn-header"]',
                        ) as HTMLButtonElement | null;
                        if (directAddBtn) directAddBtn.click();
                      }
                    }}
                    className="button-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 font-semibold shadow-xs"
                  >
                    <span>{isRtl ? "إضافة أول طلب تقديم" : "Add First Application"}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Steps 5 & 6: 'Next' Action Button inside card */}
              {step === 5 && (
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    {isStep5Valid
                      ? isRtl
                        ? "✓ الاسم جاهز"
                        : "✓ Valid Name"
                      : isRtl
                        ? "اكتب اسم الشركة للمتابعة..."
                        : "Type company name..."}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep5Valid}
                    onClick={nextStep}
                    className="button-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <span>{isRtl ? "التالي" : "Next"}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {step === 6 && (
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    {isStep6Valid
                      ? isRtl
                        ? "✓ الرابط صحيح"
                        : "✓ Valid Link"
                      : isRtl
                        ? "الصق رابط يبدأ بـ http://..."
                        : "Paste URL starting with http://..."}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep6Valid}
                    onClick={nextStep}
                    className="button-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <span>{isRtl ? "التالي" : "Next"}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </TourContext.Provider>
  );
}
