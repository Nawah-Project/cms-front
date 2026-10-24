import { useState } from "react";
import {
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "../../../components/Icons";
import { useToast } from "../../../components/ui/ToastProvider";
import type { FeedbackPost, FeedbackResource } from "../types";

interface GuidanceReadingModalProps {
  post: FeedbackPost | {
    id: string;
    title: string;
    content: string;
    unlockTriggerCode?: string | null;
    promptTemplate?: string | null;
    resources?: FeedbackResource[];
    isRead?: boolean;
    publishedAt?: string;
  };
  onClose: () => void;
  onMarkRead: (postId: string) => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const v = parsed.pathname.replace(/^\//, "");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
  } catch {
    // not a valid url
  }
  return null;
}

export function GuidanceReadingModal({
  post,
  onClose,
  onMarkRead,
}: GuidanceReadingModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [isRead, setIsRead] = useState(Boolean(post.isRead));

  const handleCopyPrompt = async () => {
    if (!post.promptTemplate) return;
    try {
      await navigator.clipboard.writeText(post.promptTemplate);
      setCopied(true);
      toast.success("تم نسخ موجه الذكاء الاصطناعي بنجاح");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("تعذر نسخ النص تلقائياً، يرجى نسخه يدوياً");
    }
  };

  const handleCompleteReading = () => {
    setIsRead(true);
    onMarkRead(post.id);

    if (post.unlockTriggerCode === "INSIGHT_W3_TIME_MGMT") {
      if (typeof window !== "undefined") {
        localStorage.setItem("insight_read_INSIGHT_W3_TIME_MGMT", "true");
      }
      toast.success(
        "تم تفعيل أداة إدارة المهام الشخصية! يمكنك الآن تطبيق إرشادات إدارة الوقت وتنظيم مهامك اليومية هنا.",
      );
    } else {
      toast.success("تم تأكيد إتمام قراءة الإرشادات بنجاح");
    }
  };

  const videoResources =
    post.resources?.filter(
      (r) =>
        r.type === "VIDEO" ||
        r.url.includes("youtube.com") ||
        r.url.includes("youtu.be"),
    ) ?? [];

  const otherResources =
    post.resources?.filter(
      (r) =>
        r.type !== "VIDEO" &&
        !r.url.includes("youtube.com") &&
        !r.url.includes("youtu.be"),
    ) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidance-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/65 backdrop-blur-xs p-3.5 sm:p-5"
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90dvh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 1. Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-md">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                <SparklesIcon className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span>إرشادات الحبكة الذكية</span>
              </span>
              {isRead ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckIcon className="h-3 w-3" />
                  <span>تمت القراءة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>غير مقروء</span>
                </span>
              )}
            </div>
            <h2
              id="guidance-modal-title"
              className="mt-1 text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate"
            >
              {post.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-6 space-y-6">
          {/* Main Content */}
          <div className="space-y-3">
            <div
              className="text-sm sm:text-[15px] leading-7 text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* Video Resources Section */}
          {videoResources.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <PlayCircleIcon className="h-4 w-4 text-rose-500" />
                <span>فيديوهات وشروحات تطبيقية مرفقة</span>
              </h3>
              <div className="space-y-4">
                {videoResources.map((video) => {
                  const embedUrl = getYouTubeEmbedUrl(video.url);
                  return (
                    <div
                      key={video.id || video.url}
                      className="rounded-xl border border-border bg-neutral-900/5 p-3.5 dark:bg-neutral-900/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                          {video.title}
                        </span>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[11px] text-info-strong hover:underline inline-flex items-center gap-1"
                        >
                          فتح في نافذة جديدة
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      </div>

                      {embedUrl ? (
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-border bg-black shadow-xs">
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                          <PlayCircleIcon className="h-8 w-8 text-neutral-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                              {video.title}
                            </p>
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-[11px] text-info-strong font-mono truncate block"
                              dir="ltr"
                            >
                              {video.url}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Resources Section */}
          {otherResources.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                المصادر والمراجع المقترحة
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {otherResources.map((res) => (
                  <a
                    key={res.id || res.url}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3 transition hover:border-neutral-400 hover:shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {res.type === "TOOL"
                            ? "أداة"
                            : res.type === "DOCUMENT"
                              ? "مستند"
                              : "مقال"}
                        </span>
                        <ExternalLinkIcon className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-info-strong line-clamp-1">
                        {res.title}
                      </p>
                      {res.description && (
                        <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                          {res.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Prompt Template Box */}
          {post.promptTemplate && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>موجه الذكاء الاصطناعي (Prompt جاهز للتطبيق)</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-3.5 w-3.5" />
                      <span>تم النسخ بنجاح ✓</span>
                    </>
                  ) : (
                    <span>نسخ الـ Prompt الذكي</span>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-100 shadow-inner">
                <pre
                  className="whitespace-pre-wrap break-words font-mono text-xs selection:bg-neutral-700"
                  dir="auto"
                >
                  {post.promptTemplate}
                </pre>
              </div>
              <p className="text-[11px] text-neutral-400">
                💡 انسخ البرومبت أعلاه وافتحه في ChatGPT أو Claude وضع بياناتك الشخصية للحصول على نتائج فورية مطابقة لمرحلتك.
              </p>
            </div>
          )}
        </div>

        {/* 3. Sticky Footer */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-5 py-3.5 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="button-ghost px-4 py-2 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handleCompleteReading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
              isRead
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "button-primary"
            }`}
          >
            <CheckIcon className="h-4 w-4" />
            <span>{isRead ? "تم تأكيد القراءة ✓" : "أتممت قراءة الإرشادات ✓"}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
