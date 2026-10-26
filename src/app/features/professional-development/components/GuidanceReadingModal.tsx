import { useState, useRef } from "react";
import {
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "../../../components/Icons";
import { useToast } from "../../../components/ui/ToastProvider";
import { useI18n } from "../../../i18n";
import { useDialogFocus } from "../../../components/ui/useDialogFocus";
import { trackUxEvent } from "../../../utils/uxAnalytics";
import { isPdf, MAX_CV_BYTES, MAX_CV_SIZE_MB } from "../../profile/profileApi";
import { Link } from "react-router";
import type { FeedbackPost, FeedbackResource } from "../types";

interface GuidanceReadingModalProps {
  post:
    | FeedbackPost
    | {
        id: string;
        title: string;
        content: string;
        unlockTriggerCode?: string | null;
        promptTemplate?: string | null;
        resources?: FeedbackResource[];
        isRead?: boolean;
        publishedAt?: string;
      };
  cvUpdate?: { canComplete: boolean; completed: boolean; onUpload: (file: File) => Promise<void> };
  onClose: () => void;
  onMarkRead: (postId: string) => Promise<void>;
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
  cvUpdate,
}: GuidanceReadingModalProps) {
  const toast = useToast();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, true, onClose);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRead, setIsRead] = useState(Boolean(post.isRead));

  const handleCopyPrompt = async () => {
    if (!post.promptTemplate) return;
    try {
      await navigator.clipboard.writeText(post.promptTemplate);
      trackUxEvent("prompt_copied");
      setCopied(true);
      toast.success(
        text("تم نسخ موجه الذكاء الاصطناعي بنجاح", "AI prompt copied"),
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(
        text(
          "تعذر نسخ النص تلقائياً، يرجى نسخه يدوياً",
          "Could not copy automatically; select and copy the text",
        ),
      );
    }
  };

  const handleCompleteReading = async () => {
    if (cvUpdate && !cvUpdate.canComplete) { setUploadError(text("ارفع الـCV المحدّث أولًا قبل تأكيد إكمال الإرشاد.", "Upload your revised CV before completing this guide.")); return; }
    setSaving(true);
    try {
      await onMarkRead(post.id);
      setIsRead(true);
      toast.success(
        text("تم حفظ قراءة الإرشادات بنجاح / Reading saved", "Reading saved"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : text(
              "تعذر الحفظ — أعد المحاولة / Save failed — retry",
              "Save failed — retry",
            ),
      );
    } finally {
      setSaving(false);
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
      ref={dialogRef}
      tabIndex={-1}
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
                <span>{text("إرشادات الحبكة الذكية", "Journey guidance")}</span>
              </span>
              {isRead ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckIcon className="h-3 w-3" />
                  <span>{text("تمت القراءة", "Read")}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{text("غير مقروء", "Unread")}</span>
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
            aria-label={text("إغلاق", "Close")}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-6 space-y-6">
          {cvUpdate && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <h3 className="font-semibold">{text("طبّق الإرشاد وارفع نسختك الجديدة هنا", "Apply the guide and upload your revised CV here")}</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{text("الإكمال مرتبط برفع نسخة معدّلة بعد المهمة صفر. رفع نفس الملف الحالي لا يبدأ فترة جديدة.", "Completion requires a revised file uploaded after Task 0. Re-uploading the same file does not start a new period.")}</p>
            <label className="button-secondary mt-3 inline-flex min-h-11 cursor-pointer items-center">{uploading ? text("جارٍ رفع السيرة…", "Uploading CV…") : text("رفع الـCV المحدّث", "Upload revised CV")}<input type="file" accept="application/pdf,.pdf" disabled={uploading || saving} className="sr-only" aria-label={text("رفع الـCV المحدّث", "Upload revised CV")} onChange={async event => {
              const file = event.target.files?.[0];event.target.value="";if(!file)return;setUploadError("");
              if(!isPdf(file)||file.size>MAX_CV_BYTES){setUploadError(text(`ارفع ملف PDF بحد أقصى ${MAX_CV_SIZE_MB} ميغابايت.`,`Upload a PDF up to ${MAX_CV_SIZE_MB} MB.`));return;}
              setUploading(true);try{await cvUpdate.onUpload(file);toast.success(text("اترفعت النسخة المحدّثة. تقدر تؤكد الإكمال دلوقتي.","Revised CV uploaded. You can confirm completion now."));}catch(error){setUploadError(error instanceof Error?error.message:text("تعذر رفع الملف، حاول تاني.","Upload failed; please retry."));}finally{setUploading(false);}
            }}/></label>
            {cvUpdate.canComplete && <p role="status" className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{text("✓ فيه نسخة محدّثة محفوظة، جاهزة لتأكيد الإكمال.", "✓ A revised CV is saved and ready for completion.")}</p>}
            {uploadError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{uploadError}</p>}
          </section>}
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
                <span>
                  {text(
                    "فيديوهات وشروحات تطبيقية مرفقة",
                    "Videos and practical explanations",
                  )}
                </span>
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
                          {text("فتح في نافذة جديدة", "Open in a new window")}
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
                {text("المصادر والمراجع المقترحة", "Suggested resources")}
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
                            ? text("أداة", "Tool")
                            : res.type === "DOCUMENT"
                              ? text("مستند", "Document")
                              : text("مقال", "Article")}
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
                  <span>
                    {text(
                      "موجه الذكاء الاصطناعي (Prompt جاهز للتطبيق)",
                      "AI prompt — ready to use",
                    )}
                  </span>
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
                      <span>{text("تم النسخ بنجاح ✓", "Copied ✓")}</span>
                    </>
                  ) : (
                    <span>
                      {text("نسخ الـ Prompt الذكي", "Copy AI prompt")}
                    </span>
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
                {text(
                  "انسخ البرومبت واستخدمه مع بياناتك في أداة AI تختارها، وراجع النتيجة قبل استخدامها.",
                  "Copy the prompt into your preferred AI tool, add your context, and review the result before using it.",
                )}
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
            {text("إغلاق", "Close")}
          </button>

          {cvUpdate && isRead && <Link to="/reports" onClick={onClose} className="button-primary min-h-11">{text("افتح تحليل الأداء", "Open performance analytics")}</Link>}
          <button
            type="button"
            onClick={handleCompleteReading}
            disabled={saving || uploading || Boolean(cvUpdate && !cvUpdate.canComplete)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
              isRead
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "button-primary"
            }`}
          >
            <CheckIcon className="h-4 w-4" />
            <span>
              {isRead
                ? text("تم تأكيد القراءة ✓", "Reading confirmed ✓")
                : cvUpdate ? text("تم، وأكملت تحديث السيرة ✓", "Complete guide and CV update ✓") : text("أتممت قراءة الإرشادات ✓", "Mark guidance as read ✓")}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
