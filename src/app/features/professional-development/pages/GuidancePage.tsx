import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Lock, Sparkles, Unlock } from "lucide-react";
import { useAuth } from "../../auth/store/authStore";
import { PageHeading } from "../../../components/ui/PageHeading";
import { ProfessionalDevelopmentNav } from "../components/ProfessionalDevelopmentNav";
import { GuidanceReadingModal } from "../components/GuidanceReadingModal";
import { journeyApi, useJourneyState } from "../../journey/api/journeyApi";
import { useQueryClient } from "@tanstack/react-query";
import { journeyQueryKeys } from "../../journey/config/query-keys";
import { JOURNEY_INSIGHTS_CATALOG } from "../../journey/lib/journey-insights-catalog";
import { api } from "../../../services/api";
import { useI18n } from "../../../i18n";
import type { FeedbackPost, FeedbackResource } from "../types";
import { LoadingState } from "../../admin/components/AdminUI";
import { PlayCircleIcon } from "../../../components/Icons";

interface UnifiedGuidanceItem {
  id: string;
  code: string;
  weekNumber: number;
  title: string;
  content: string;
  promptTemplate: string | null;
  resources: FeedbackResource[];
  isRead: boolean;
  publishedAt?: string;
  isAdvanced?: boolean;
}

export default function GuidancePage() {
  const { t, locale } = useI18n();
  const text = (a: string, e: string) => (locale === "ar" ? a : e);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: journeyData,
    isLoading: journeyLoading,
    isError: journeyError,
    refetch: retryJourney,
  } = useJourneyState({
    enabled: Boolean(user),
  });

  const [dbPosts, setDbPosts] = useState<FeedbackPost[]>([]);
  const [dbError, setDbError] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UnifiedGuidanceItem | null>(
    null,
  );
  const loadGuidanceFromApi = useCallback(async () => {
    setDbLoading(true);
    setDbError(false);
    try {
      const res = await api.getFeedback({
        scope: "shared",
        kind: "guidance",
        limit: 50,
      });
      setDbPosts(res.items);
    } catch {
      setDbError(true); // Catalog fallback remains available, with an explicit warning.
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGuidanceFromApi();
  }, [loadGuidanceFromApi]);

  const unlockedSet = useMemo(() => {
    return new Set(journeyData?.state.unlockedInsightCodes ?? []);
  }, [journeyData]);

  const isAdmin = user?.role === "ADMIN";

  // Merge Catalog with DB posts
  const unifiedItems: UnifiedGuidanceItem[] = useMemo(() => {
    return JOURNEY_INSIGHTS_CATALOG.map((catalogItem) => {
      const matchedDb = dbPosts.find(
        (p) => p.unlockTriggerCode === catalogItem.code,
      );

      const title =
        matchedDb?.title ||
        (locale === "ar" ? catalogItem.titleAr : catalogItem.titleEn);

      const content =
        matchedDb?.content ||
        `<p>${locale === "ar" ? catalogItem.summaryAr : catalogItem.summaryEn}</p>`;

      const promptTemplate =
        matchedDb?.promptTemplate !== undefined
          ? matchedDb.promptTemplate
          : locale === "ar"
            ? catalogItem.promptTemplateAr
            : catalogItem.promptTemplateEn;

      const resources = matchedDb?.resources || [];

      const isRead =
        Boolean(matchedDb?.isRead) ||
        Boolean(
          journeyData?.state.readInsightCodes?.includes(catalogItem.code),
        );

      return {
        id: matchedDb?.id || catalogItem.code,
        code: catalogItem.code,
        weekNumber: catalogItem.weekNumber,
        title,
        content,
        promptTemplate: promptTemplate || null,
        resources,
        isRead,
        publishedAt: matchedDb?.publishedAt,
        isAdvanced: catalogItem.isAdvanced,
      };
    });
  }, [dbPosts, locale, journeyData?.state.readInsightCodes]);

  const unlockedGuidance = useMemo(() => {
    return unifiedItems.filter((item) => isAdmin || unlockedSet.has(item.code));
  }, [unifiedItems, isAdmin, unlockedSet]);

  const nextLockedItem = useMemo(() => {
    if (isAdmin) return null;
    return unifiedItems.find((item) => !unlockedSet.has(item.code)) || null;
  }, [unifiedItems, isAdmin, unlockedSet]);

  const [searchParams] = useSearchParams();
  const deepLinkCode = searchParams.get("guidance");

  useEffect(() => {
    if (!deepLinkCode || !unlockedGuidance.length) return;
    const matched = unlockedGuidance.find(
      (item) => item.code === deepLinkCode || item.id === deepLinkCode,
    );
    if (matched) {
      setSelectedItem(matched);
    }
  }, [deepLinkCode, unlockedGuidance]);

  const handleMarkRead = async (postId: string) => {
    const item = unifiedItems.find((i) => i.id === postId || i.code === postId);
    if (!item) throw new Error("Guidance is unavailable");
    await journeyApi.markInsightRead(item.code);
    await queryClient.invalidateQueries({ queryKey: journeyQueryKeys.all });
    await loadGuidanceFromApi();
  };

  const getWeekBadgeLabel = (week: number) => {
    if (week === 0)
      return text("مرحلة التهيئة (المهمة 0)", "Activation (Task 0)");
    if (week === 1)
      return text("الأسبوع 1: تأسيس الهوية", "Week 1: Professional identity");
    if (week === 2)
      return text("الأسبوع 2: التقديم المخصص", "Week 2: Targeted applications");
    if (week === 3)
      return text(
        "الأسبوع 3: الظهور والمحتوى",
        "Week 3: Visibility and content",
      );
    return text("الأسبوع 4: العلاقات والحصاد", "Week 4: Networking and growth");
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      {(journeyError || dbError) && (
        <div role="alert" className="rounded-xl border border-amber-300 p-4">
          <p>
            {text(
              "تعذر تحديث بعض الإرشادات؛ أي محتوى محلي مش معناه إن القراءة محفوظة.",
              "Some guidance could not refresh. Local content does not imply saved reading progress.",
            )}
          </p>
          <button
            className="button-secondary"
            onClick={() => {
              void retryJourney();
              void loadGuidanceFromApi();
            }}
          >
            {text("حاول تاني", "Retry")}
          </button>
        </div>
      )}
      <PageHeading
        eyebrow={text("التطوير المهني", "Professional development")}
        title={text("الإرشادات والتعليمات", "Guidance and instructions")}
        description={text(
          "إرشادات وتوجيهات الحبكة الذكية وموجهات الذكاء الاصطناعي المرتبطة بمحطات رحلتك المهنية خطوة بخطوة.",
          "Practical guidance and AI prompts revealed progressively along your journey.",
        )}
      />

      <ProfessionalDevelopmentNav />

      {/* Guidance Header Banner */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {text(
                "معمل الإرشادات والموجهات الذكية",
                "Guidance and practical prompts",
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              {text(
                "تنكشف لك هذه الإرشادات تدريجياً مع إتمام مهام الحبكة وإرسال طلبات التقديم لضمان تطبيق كل استراتيجية في وقتها الصحيح.",
                "Guidance opens progressively as you complete quests and log applications.",
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            {unlockedGuidance.length}{" "}
            {text("إرشادات مفتوحة", "guides available")}
          </span>
        </div>
      </div>

      {journeyLoading && dbLoading ? (
        <LoadingState
          label={text(
            "جاري تحميل إرشادات مسار الرحلة...",
            "Loading journey guidance…",
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unlocked Guidance Cards */}
          {unlockedGuidance.map((item) => {
            const hasVideo = item.resources.some(
              (r) =>
                r.type === "VIDEO" ||
                r.url.includes("youtube.com") ||
                r.url.includes("youtu.be"),
            );
            const hasOtherResources = item.resources.some(
              (r) =>
                r.type !== "VIDEO" &&
                !r.url.includes("youtube.com") &&
                !r.url.includes("youtu.be"),
            );

            return (
              <button
                type="button"
                key={item.code}
                onClick={() => setSelectedItem(item)}
                className="group text-start flex flex-col justify-between cursor-pointer rounded-2xl border border-border bg-surface p-5 transition-all hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5 select-none"
              >
                <div className="space-y-3">
                  {/* Top Bar: Phase & Read Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {getWeekBadgeLabel(item.weekNumber)}
                    </span>

                    {item.isRead ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Unlock className="h-3 w-3" />
                        <span>{text("تمت القراءة ✓", "Read ✓")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>{text("جديد • غير مقروء", "New • unread")}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Excerpt */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-info-strong transition-colors dark:text-neutral-100">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-3">
                      {item.content.replace(/<[^>]*>/g, "")}
                    </p>
                  </div>

                  {/* Content Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.promptTemplate && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span>
                          {text(
                            "✨ موجه ذكاء اصطناعي للنسخ",
                            "✨ Copyable AI prompt",
                          )}
                        </span>
                      </span>
                    )}
                    {hasVideo && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                        <PlayCircleIcon className="h-3 w-3 text-rose-500" />
                        <span>
                          {text("🎬 فيديو شرح مرفق", "🎬 Video included")}
                        </span>
                      </span>
                    )}
                    {hasOtherResources && (
                      <span className="rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info-strong border border-info-border">
                        {text("📄 مراجع عملية", "📄 Practical resources")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="mt-4 border-t border-border/80 pt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-info-strong group-hover:underline inline-flex items-center gap-1">
                    {locale === "ar"
                      ? "افتح الإرشادات والتطبيق العملي ←"
                      : "Open guidance and practical steps →"}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Exactly ONE Mystery Card (Fog of War) */}
          {nextLockedItem && (
            <article className="flex flex-col justify-between rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-5 dark:border-neutral-700 dark:bg-neutral-900/30 select-none opacity-85">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <Lock className="h-3 w-3" />
                    <span>
                      {text(
                        "إرشادات المحطة القادمة 🔒",
                        "Next milestone guidance 🔒",
                      )}
                    </span>
                  </span>
                  <span className="text-[11px] font-medium text-neutral-400">
                    {text("ضباب الحرب المهني", "Coming next")}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-500 dark:text-neutral-400">
                    {text(
                      "محتوى مغلق حتى الوصول إلى المحطة القادمة",
                      "Complete the prerequisite milestone to unlock",
                    )}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
                    {text(
                      "واصل إرسال طلبات التقديم وإتمام مهام الأسبوع في درج الرحلة لتنكشف لك الإرشادات والموجهات الذكية لهذه المحطة فور وصولك إليها.",
                      "Continue logging applications and completing your quests to unlock the next guidance.",
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-dashed border-border pt-3">
                <span className="text-xs text-neutral-400">
                  {text(
                    "🔒 ستفتح تلقائياً عند استيفاء متطلبات المحطة",
                    "🔒 Opens when milestone requirements are met",
                  )}
                </span>
              </div>
            </article>
          )}
        </div>
      )}

      {/* Facebook-Post Style Centered Reading Modal */}
      {selectedItem && (
        <GuidanceReadingModal
          post={selectedItem}
          onClose={() => setSelectedItem(null)}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}
