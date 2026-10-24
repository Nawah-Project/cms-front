import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../features/auth/store/authStore";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import { profileApi } from "../../../features/profile/profileApi";

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
}

const STEP_CONTENTS: Record<TourStep, StepContent> = {
  1: {
    titleAr: "الخطوة 1 من 7: افتح خريطة مهامك 🎯",
    titleEn: "Step 1 of 7: Open your Quest Map 🎯",
    bodyAr: "اضغط على زر المهام الجانبي لترى المهمة التمهيدية المطلوبة منك الآن.",
    bodyEn: "Click the side quest handle to view your active onboarding mission.",
  },
  2: {
    titleAr: "الخطوة 2 من 7: ابدأ أول طلب تقديم 🚀",
    titleEn: "Step 2 of 7: Start Your First Application 🚀",
    bodyAr: "اضغط على زر (+ إضافة طلب تقديم) داخل بطاقة المهمة لتجهيز أول طلب وظيفة.",
    bodyEn: "Click (+ Add Application) in the mission card to set up your first application.",
  },
  3: {
    titleAr: "الخطوة 3 من 7: افتح مستكشف الوظائف 🧭",
    titleEn: "Step 3 of 7: Open Job Explorer 🧭",
    bodyAr: "اضغط هنا للوصول السريع إلى الوظائف المفتوحة والمفلترة بتخصصك.",
    bodyEn: "Click here to discover open jobs pre-filtered by your specialization.",
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
    bodyEn: "Enter the company name where you found the job (click Next to continue).",
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
  const cardWidth = 280;
  const cardHeight = step === 5 || step === 6 ? 165 : 125;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  // STEP 1: Target is handle button on the edge
  if (step === 1) {
    // In RTL, drawer is docked on the left (targetRect.left < 200)
    // Card placed directly to the right of handle, arrow points left
    if (targetRect.left < screenW / 2) {
      const top = Math.max(
        16,
        Math.min(screenH - cardHeight - 16, targetCenterY - cardHeight / 2),
      );
      const left = Math.min(screenW - cardWidth - 16, targetRect.right + 14);
      const arrowOffset = Math.max(
        18,
        Math.min(cardHeight - 18, targetCenterY - top),
      );
      return { top, left, arrowDir: "left", arrowOffset };
    } else {
      // In LTR, drawer is docked on the right
      const top = Math.max(
        16,
        Math.min(screenH - cardHeight - 16, targetCenterY - cardHeight / 2),
      );
      const left = Math.max(16, targetRect.left - cardWidth - 14);
      const arrowOffset = Math.max(
        18,
        Math.min(cardHeight - 18, targetCenterY - top),
      );
      return { top, left, arrowDir: "right", arrowOffset };
    }
  }

  // STEP 7: Submit button at bottom of modal - Card placed ABOVE submit button
  if (step === 7) {
    const top = Math.max(16, targetRect.top - cardHeight - 14);
    let left = targetCenterX - cardWidth / 2;
    left = Math.max(16, Math.min(screenW - cardWidth - 16, left));
    const arrowOffset = Math.max(
      20,
      Math.min(cardWidth - 20, targetCenterX - left),
    );
    return { top, left, arrowDir: "down", arrowOffset };
  }

  // STEPS 2, 3, 4, 5, 6: Prefer BELOW target, arrow points UP
  let top = targetRect.bottom + 14;
  let arrowDir: ArrowDir = "up";

  if (top + cardHeight > screenH - 16) {
    // If not enough space below, place ABOVE target, arrow points DOWN
    top = Math.max(16, targetRect.top - cardHeight - 14);
    arrowDir = "down";
  }

  let left = targetCenterX - cardWidth / 2;
  left = Math.max(16, Math.min(screenW - cardWidth - 16, left));

  const arrowOffset = Math.max(
    20,
    Math.min(cardWidth - 20, targetCenterX - left),
  );

  return { top, left, arrowDir, arrowOffset };
}

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
            fill="#171717"
            stroke="rgba(255,255,255,0.2)"
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
            fill="#171717"
            stroke="rgba(255,255,255,0.2)"
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
            fill="#171717"
            stroke="rgba(255,255,255,0.2)"
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
          fill="#171717"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
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

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
    enabled: Boolean(user),
  });

  const storageKey = user?.id
    ? `nawah_v2_guided_tour_done_${user.id}`
    : null;

  const [isTourActive, setIsTourActive] = useState(false);
  const [step, setStep] = useState<TourStep>(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetBorderRadius, setTargetBorderRadius] = useState<string>("12px");

  // Form field live values for Step 5 & 6 validation
  const [companyValue, setCompanyValue] = useState("");
  const [urlValue, setUrlValue] = useState("");

  // Determine if tour should start:
  // ONLY conditions: user logged in, profileComplete === true, and !localStorage.getItem(storageKey)
  // NEVER depend on applications.length or totalApplications!
  useEffect(() => {
    if (!user || !storageKey) return;
    if (profile && !profile.profileComplete) {
      setIsTourActive(false);
      return;
    }
    try {
      const tourDone = localStorage.getItem(storageKey);
      if (tourDone !== "true") {
        setIsTourActive(true);
        setStep(1);
      } else {
        setIsTourActive(false);
      }
    } catch {
      setIsTourActive(false);
    }
  }, [user?.id, storageKey, profile?.profileComplete]);

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
          const computed = window.getComputedStyle(el);
          const radius = computed.borderRadius;
          if (radius && radius !== "0px") {
            setTargetBorderRadius(radius);
          } else {
            setTargetBorderRadius("12px");
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

  // Track inputs for steps 5 & 6 (instant keystroke + interval fallback)
  useEffect(() => {
    if (!isTourActive) return;

    const checkInputs = () => {
      if (step === 5) {
        const compEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-company"]',
        );
        if (compEl && compEl.value !== companyValue) {
          setCompanyValue(compEl.value);
        }
      } else if (step === 6) {
        const urlEl = document.querySelector<HTMLInputElement>(
          '[data-tour-step="add-app-url"]',
        );
        if (urlEl && urlEl.value !== urlValue) {
          setUrlValue(urlEl.value);
        }
      }
    };

    checkInputs();

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target) return;
      if (step === 5 && target.matches?.('[data-tour-step="add-app-company"]')) {
        setCompanyValue(target.value);
      } else if (step === 6 && target.matches?.('[data-tour-step="add-app-url"]')) {
        setUrlValue(target.value);
      }
    };

    document.addEventListener("input", handleInput, true);
    const interval = window.setInterval(checkInputs, 60);

    return () => {
      document.removeEventListener("input", handleInput, true);
      window.clearInterval(interval);
    };
  }, [isTourActive, step, companyValue, urlValue]);

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

  const placement = activeRect
    ? getTourCardPlacement(activeRect, isRtl, step)
    : {
        top: 120,
        left: Math.max(
          16,
          typeof window !== "undefined" ? (window.innerWidth - 280) / 2 : 16,
        ),
        arrowDir: "up" as ArrowDir,
        arrowOffset: 40,
      };

  const pad = 2;

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
                  className="bg-transparent pointer-events-auto"
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
                  className="bg-transparent pointer-events-auto"
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
                  className="bg-transparent pointer-events-auto"
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
                  className="bg-transparent pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              </>
            ) : (
              <div
                className="fixed inset-0 bg-neutral-950/72 backdrop-blur-[2px] z-[9990] pointer-events-auto"
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
                    "0 0 0 9999px rgba(9, 9, 11, 0.72), 0 0 12px rgba(16, 185, 129, 0.18)",
                  zIndex: 9991,
                }}
                className="ring-2 ring-emerald-400/35 pointer-events-none transition-all duration-150"
              />
            )}

            {/* Interactive Guidance Card (z-[9999]) - Pure Pointer Coachmark */}
            <div
              style={{
                position: "fixed",
                top: placement.top,
                left: placement.left,
                zIndex: 9999,
              }}
              className="relative w-[280px] max-w-[280px] rounded-2xl border border-white/15 bg-neutral-900/95 px-4 py-3.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            >
              {/* Attached Pointer Arrow */}
              <TourArrow dir={placement.arrowDir} offset={placement.arrowOffset} />

              {/* Mini Top Bar (No divider line) */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400">
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
              <h3 className="mt-1.5 text-xs sm:text-[13px] font-bold text-white leading-snug">
                {isRtl ? currentContent.titleAr : currentContent.titleEn}
              </h3>

              {/* Description */}
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
                {isRtl ? currentContent.bodyAr : currentContent.bodyEn}
              </p>

              {/* Steps 5 & 6 only: Sleek inline Next button */}
              {step === 5 && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] truncate transition-colors ${
                      isStep5Valid
                        ? "text-emerald-400 font-medium"
                        : "text-neutral-400"
                    }`}
                  >
                    {isStep5Valid
                      ? (isRtl ? "✓ جاهز للمتابعة" : "✓ Ready")
                      : (isRtl ? "اكتب اسم الشركة..." : "Type company name...")}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep5Valid}
                    onClick={nextStep}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-150 shrink-0 ${
                      isStep5Valid
                        ? "bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-md shadow-emerald-400/25 ring-1 ring-emerald-300/50 cursor-pointer active:scale-95"
                        : "bg-emerald-500/35 text-neutral-400/90 cursor-not-allowed border border-emerald-500/20"
                    }`}
                  >
                    <span>{isRtl ? "التالي ←" : "Next →"}</span>
                  </button>
                </div>
              )}

              {step === 6 && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] truncate transition-colors ${
                      isStep6Valid
                        ? "text-emerald-400 font-medium"
                        : "text-neutral-400"
                    }`}
                  >
                    {isStep6Valid
                      ? (isRtl ? "✓ رابط صحيح" : "✓ Valid link")
                      : (isRtl ? "الصق الرابط (http://)..." : "Paste job URL...")}
                  </span>
                  <button
                    type="button"
                    disabled={!isStep6Valid}
                    onClick={nextStep}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-150 shrink-0 ${
                      isStep6Valid
                        ? "bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-md shadow-emerald-400/25 ring-1 ring-emerald-300/50 cursor-pointer active:scale-95"
                        : "bg-emerald-500/35 text-neutral-400/90 cursor-not-allowed border border-emerald-500/20"
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
    </TourContext.Provider>
  );
}
