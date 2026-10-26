import type { JourneyStateResponse } from "../types";
import { dispatchMilestoneCelebration } from "./celebrationEvents";

export function celebrateJourneyUnlocks(
  prev: JourneyStateResponse | undefined,
  next: JourneyStateResponse | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
  locale: string,
  showToast: (opts: {
    message: string;
    variant?: "success" | "info" | "error";
    duration?: number;
  }) => void,
) {
  if (!prev?.state || !next?.state) return;

  const prevCompleted = new Set(prev.state.completedNodeCodes ?? []);
  const nextCompleted = new Set(next.state.completedNodeCodes ?? []);

  // Check if Group & Professional Development unlocked (Milestone 0 completion)
  if (!prev.state.isGroupUnlocked && next.state.isGroupUnlocked) {
    dispatchMilestoneCelebration({
      title:
        locale === "ar"
          ? "🎉 مبارك! تم فتح قسم تقدم المجموعة والتطوير المهني"
          : "🎉 Milestone Unlocked: Group & Professional Development Available!",
      description:
        locale === "ar"
          ? "أتممت بنجاح المهمة صفر (تسجيل أول 5 طلبات تقديم). تم فك قفل دليل السيرة الذاتية، ومشاركة رحلتك مع زملائك في المجموعة، والاطلاع على الرؤى الاستراتيجية!"
          : "You have completed Milestone 0 (5 applications). You can now read your CV guidance, collaborate with your group, and access foundational insights!",
      unlockedItems:
        locale === "ar"
          ? [
              "قسم متابعة تقدم المجموعة (Group Progress)",
                            "ملاحظة تأسيس السيرة الذاتية (CV Baseline Insight)",
              "تحديث السيرة من داخل الإرشاد لفتح تحليل الأداء",
            ]
          : [
              "Group Progress Section",
                            "CV Baseline Strategy Insight",
              "Update your CV inside the guide to unlock analytics",
            ],
      ctaLabel:
        locale === "ar" ? "انتقل إلى مجموعتك الآن" : "Go to Group Section",
      ctaRoute: "/members-progress",
    });
    return;
  }

  // Check if Table View unlocked (W1_M1 completed)
  if (!prevCompleted.has("W1_M1") && nextCompleted.has("W1_M1")) {
    dispatchMilestoneCelebration({
      title: locale === "ar" ? "🎉 مبارك! تم فتح نمط عرض الجدول المتقدم" : "🎉 Table View Unlocked!",
      description: locale === "ar"
        ? "أتممت بنجاح مهمة الأسبوع الأول الأساسية، وأصبح بإمكانك الآن استعراض طلباتك بنمط الجدول الشامل والفرز المتقدم!"
        : "You have unlocked the advanced Table View mode to manage and sort your applications with ease!",
      unlockedItems: locale === "ar"
        ? [
            "عرض الجدول المتقدم (Advanced Table View)",
            "فرز سريع وتصفية متعددة للطلبات",
            "المهمة التالية في مسار الأسبوع الأول",
          ]
        : [
            "Advanced Table View",
            "Multi-column sorting and filtering",
            "Next quest in Week 1",
          ],
      ctaLabel: locale === "ar" ? "استكشف عرض الجدول الآن" : "Explore Table View",
      ctaRoute: "/applications",
    });
    return;
  }

  // Check if any node newly completed (Micro-celebration)
  const newlyCompletedCode = (next.state.completedNodeCodes ?? []).find(
    (code) => !prevCompleted.has(code),
  );
  if (newlyCompletedCode) {
    const completedNode = next.nodes.find((n) => n.code === newlyCompletedCode);
    const title = completedNode
      ? locale === "ar"
        ? completedNode.titleAr
        : completedNode.titleEn
      : newlyCompletedCode;
    showToast({
      message: t("journey.toastNodeCompleted", { title }),
      variant: "success",
      duration: 5000,
    });
    return;
  }

  // Check if any insight newly unlocked
  const prevInsights = new Set(prev.state.unlockedInsightCodes ?? []);
  const newlyUnlockedInsight = (next.state.unlockedInsightCodes ?? []).find(
    (code) => !prevInsights.has(code),
  );
  if (newlyUnlockedInsight) {
    showToast({
      message: t("journey.toastInsightUnlocked"),
      variant: "info",
      duration: 5000,
    });
  }
}
