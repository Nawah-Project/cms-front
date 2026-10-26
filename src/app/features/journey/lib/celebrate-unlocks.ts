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
      title: locale === "ar" ? "🎉 مبارك! اتفتح قسم مجموعتك" : "🎉 Your group is unlocked!",
      description: locale === "ar" ? "أكملت أول 5 طلبات في المهمة صفر. دلوقتي تقدر تتعرف على مجموعتك وتتابع تقدم زملائك." : "You completed your first five applications. Meet your group and follow their progress.",
      unlockedItems: [locale === "ar" ? "قسم تقدم المجموعة" : "Group progress"],
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
