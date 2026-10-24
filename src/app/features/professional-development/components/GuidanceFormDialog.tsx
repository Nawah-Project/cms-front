import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { adminApi } from "../../admin/api/adminApi";
import { CloseIcon, SparklesIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import type {
  CreateFeedbackInput,
  FeedbackPost,
} from "../types";

interface FormResourceItem {
  title: string;
  url: string;
  type: string;
  description: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFeedbackMarkup(value: string) {
  if (typeof DOMParser === "undefined") return escapeHtml(value);
  const document = new DOMParser().parseFromString(value, "text/html");
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return escapeHtml(node.nodeValue ?? "");
    if (!(node instanceof Element)) return "";
    const children = Array.from(node.childNodes, serialize).join("");
    switch (node.tagName.toLowerCase()) {
      case "br":
        return "<br>";
      case "b":
      case "strong":
        return `<strong>${children}</strong>`;
      case "i":
      case "em":
        return `<em>${children}</em>`;
      case "u":
        return `<u>${children}</u>`;
      case "p":
      case "div":
        return children ? `<p>${children}</p>` : "<p><br></p>";
      default:
        return children;
    }
  };
  return Array.from(document.body.childNodes, serialize).join("").trim();
}

export function GuidanceFormDialog({
  post,
  onClose,
  onSaved,
}: {
  post: FeedbackPost | null;
  onClose: () => void;
  onSaved: (message: "guidanceCreated" | "guidanceUpdated") => void;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [unlockTriggerCode, setUnlockTriggerCode] = useState(
    post?.unlockTriggerCode ?? "INSIGHT_TASK_0_CV_BASE",
  );
  const [promptTemplate, setPromptTemplate] = useState(
    post?.promptTemplate ?? "",
  );

  const [resourceList, setResourceList] = useState<FormResourceItem[]>(() => {
    if (post?.resources && post.resources.length > 0) {
      return post.resources.map((r) => ({
        title: r.title,
        url: r.url,
        type: r.type || "ARTICLE",
        description: r.description || "",
      }));
    }
    return [];
  });

  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResType, setNewResType] = useState("ARTICLE");
  const [newResDesc, setNewResDesc] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    const safeContent = sanitizeFeedbackMarkup(post?.content ?? "");
    if (editorRef.current) editorRef.current.innerHTML = safeContent;
    setContent(safeContent);
  }, [post?.id]);

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    editorRef.current?.focus();
    document.execCommand(command);
    if (editorRef.current)
      setContent(sanitizeFeedbackMarkup(editorRef.current.innerHTML));
  };

  const handleAddResource = () => {
    setError("");
    const titleVal = newResTitle.trim();
    let urlVal = newResUrl.trim();

    if (!titleVal) {
      setError("يرجى كتابة عنوان للمصدر قبل إضافته للقائمة");
      return;
    }
    if (!urlVal) {
      setError("يرجى إدخال رابط المصدر");
      return;
    }

    // Auto-fix missing protocol if user pasted plain domain
    if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
      urlVal = `https://${urlVal}`;
    }

    try {
      const parsed = new URL(urlVal);
      if (parsed.protocol !== "https:") {
        setError("يجب أن يبدأ رابط المصدر بـ https:// لحماية أمان الباحثين");
        return;
      }
    } catch {
      setError("صيغة رابط المصدر غير صالحة، تأكد من كتابة الرابط بشكل صحيح");
      return;
    }

    setResourceList((prev) => [
      ...prev,
      {
        title: titleVal,
        url: urlVal,
        type: newResType,
        description: newResDesc.trim(),
      },
    ]);
    setNewResTitle("");
    setNewResUrl("");
    setNewResDesc("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("يرجى إدخال عنوان الإرشاد");
      return;
    }

    if (!unlockTriggerCode.trim()) {
      setError("يرجى تحديد محطة الفتح في مسار الرحلة لهذا الإرشاد");
      return;
    }

    const formattedContent = sanitizeFeedbackMarkup(content);
    if (!formattedContent.replace(/<[^>]*>/g, "").trim()) {
      setError("يرجى كتابة الشرح التعليمي للإرشاد");
      return;
    }

    // Include any pending unsaved resource
    let finalResources = [...resourceList];
    if (newResTitle.trim() && newResUrl.trim()) {
      let pendingUrl = newResUrl.trim();
      if (!pendingUrl.startsWith("http://") && !pendingUrl.startsWith("https://")) {
        pendingUrl = `https://${pendingUrl}`;
      }
      try {
        const parsed = new URL(pendingUrl);
        if (parsed.protocol === "https:") {
          finalResources.push({
            title: newResTitle.trim(),
            url: pendingUrl,
            type: newResType,
            description: newResDesc.trim(),
          });
        }
      } catch {
        // ignore invalid pending
      }
    }

    const input: CreateFeedbackInput = {
      title: title.trim(),
      content: formattedContent,
      visibility: "ALL",
      unlockTriggerCode: unlockTriggerCode.trim(),
      promptTemplate: promptTemplate.trim() || null,
      resources: finalResources.map((r) => ({
        title: r.title,
        url: r.url,
        type: r.type,
        description: r.description || undefined,
      })),
      resource: finalResources[0]
        ? {
            title: finalResources[0].title,
            url: finalResources[0].url,
            type: finalResources[0].type,
            description: finalResources[0].description || undefined,
          }
        : null,
      context: "GENERAL",
      tags: ["LEARNING", "GENERAL"],
    };

    setBusy(true);
    try {
      if (post) await adminApi.updateFeedback(post.id, input);
      else await adminApi.createFeedback(input);
      onSaved(post ? "guidanceUpdated" : "guidanceCreated");
    } catch {
      setError("فشل حفظ إرشاد الحبكة، يرجى المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="guidance-form-title"
      className="fixed inset-0 m-auto flex h-[92dvh] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl items-stretch justify-center overflow-hidden border-0 bg-transparent p-0 text-start backdrop:bg-neutral-950/60 sm:w-[calc(100%-3rem)]"
    >
      <section className="h-full min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
              <SparklesIcon className="h-3.5 w-3.5 text-purple-600" />
              <span>إرشادات الحبكة الذكية (Journey Guidance)</span>
            </div>
            <h2
              id="guidance-form-title"
              className="mt-1 text-lg font-bold text-neutral-950 dark:text-neutral-100"
            >
              {post ? "تعديل إرشاد الحبكة" : "إضافة إرشاد حبكة جديد"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-800"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-soft px-3.5 py-2.5 text-sm text-danger-strong"
            >
              {error}
            </p>
          )}

          <div className="grid gap-4">
            {/* Title */}
            <label className="grid gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <span>عنوان الإرشاد التوجيهي</span>
              <input
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: الدليل الأساسي للتحضير السريع للمقابلات الأولى"
                className="field-control"
              />
            </label>

            {/* Mandatory Station Trigger */}
            <label className="grid gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <div className="flex items-center justify-between">
                <span>محطة الفتح في مسار الرحلة (إلزامي)</span>
                <span className="text-xs text-purple-600 font-mono">unlockTriggerCode</span>
              </div>
              <select
                required
                value={unlockTriggerCode}
                onChange={(e) => setUnlockTriggerCode(e.target.value)}
                className="field-control font-medium text-xs sm:text-sm"
              >
                <option value="INSIGHT_TASK_0_CV_BASE">
                  المهمة 0: إتمام صياغة السيرة الذاتية (INSIGHT_TASK_0_CV_BASE)
                </option>
                <option value="INSIGHT_W1_INTERVIEW_BASIC">
                  الأسبوع 1: بعد المهمة 2 - التجهيز للمقابلة والأسيمنت (INSIGHT_W1_INTERVIEW_BASIC)
                </option>
                <option value="INSIGHT_W1_TAILORED_CV">
                  الأسبوع 1: محطة اليوم السابع - التقديم المخصص (INSIGHT_W1_TAILORED_CV)
                </option>
                <option value="INSIGHT_W2_CUSTOM_PREP">
                  الأسبوع 2: بعد المهمة 2 - التجهيز المخصص (INSIGHT_W2_CUSTOM_PREP)
                </option>
                <option value="INSIGHT_W2_CONTENT_BUILDING">
                  الأسبوع 2: محطة اليوم السابع - بناء المحتوى (INSIGHT_W2_CONTENT_BUILDING)
                </option>
                <option value="INSIGHT_W3_TIME_MGMT">
                  الأسبوع 3: بعد المهمة 2 - إدارة الوقت وتنظيم المهام [يفتح قسم المهام] (INSIGHT_W3_TIME_MGMT)
                </option>
                <option value="INSIGHT_W3_NETWORKING">
                  الأسبوع 3: محطة اليوم السابع - بناء العلاقات والتواصل (INSIGHT_W3_NETWORKING)
                </option>
                <option value="INSIGHT_W4_SELF_CAREER_PLAN">
                  الأسبوع 4: بعد المهمة 2 - التخطيط الاستراتيجي للكارير (INSIGHT_W4_SELF_CAREER_PLAN)
                </option>
                <option value="INSIGHT_INTERVIEW_ADVANCED">
                  حدث شرطي: عند تسجيل أول مقابلة أو أسيمنت (INSIGHT_INTERVIEW_ADVANCED)
                </option>
              </select>
              <span className="text-[11px] text-neutral-500">
                يحدد متى ينكشف هذا الإرشاد للطالب في صفحة الإرشادات ودرج الحبكة ومحرك الرحلة.
              </span>
            </label>

            {/* Content Formatting */}
            <div className="grid gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <span>الشرح التعليمي والنص الكامل للإرشاد</span>
              <div className="overflow-hidden rounded-lg border border-border bg-surface focus-within:border-neutral-500 focus-within:ring-2 focus-within:ring-neutral-900/15 dark:focus-within:ring-white/15">
                <div
                  role="toolbar"
                  aria-label="تنسيق النص"
                  className="flex items-center gap-1 border-b border-border bg-neutral-100 px-2 py-1.5 dark:bg-neutral-800"
                >
                  {([
                    ["bold", "B", "عريض"],
                    ["italic", "I", "مائل"],
                    ["underline", "U", "تسطير"],
                  ] as const).map(([command, label, desc]) => (
                    <button
                      key={command}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat(command)}
                      aria-label={desc}
                      title={desc}
                      className="flex h-8 min-w-9 items-center justify-center rounded-md text-neutral-950 hover:bg-neutral-200 focus-visible:outline-2 dark:text-white dark:hover:bg-neutral-700"
                    >
                      <span className={command === "bold" ? "font-bold" : command === "italic" ? "italic" : "underline"}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    dir="auto"
                    onInput={(event) =>
                      setContent(
                        sanitizeFeedbackMarkup(event.currentTarget.innerHTML),
                      )
                    }
                    className="min-h-48 max-h-[45dvh] overflow-y-auto whitespace-pre-wrap px-3.5 py-3 leading-7 text-neutral-950 outline-none dark:text-neutral-100"
                  />
                  {!content.replace(/<[^>]*>/g, "").trim() && (
                    <span className="pointer-events-none absolute start-3.5 top-3 text-neutral-400 text-xs">
                      اكتب هنا الشرح التفصيلي، الخطوات العملية، وأمثلة التطبيق الواقعية...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Prompt Box */}
            <div className="grid gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>البرومبت الذكي (اختياري)</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">Prompt Template</span>
              </div>
              <textarea
                rows={5}
                value={promptTemplate}
                onChange={(event) => setPromptTemplate(event.target.value)}
                placeholder="أنت خبير توظيف تقني ومراجع سير ذاتية... الصق هنا البرومبت الجاهز للنسخ..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 font-mono text-xs leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                dir="auto"
              />
              <span className="text-xs font-normal text-neutral-500">
                سيظهر للطالب في مربع داكن قابل للنسخ بنقرة زر واحدة أسفل الإرشاد.
              </span>
            </div>
          </div>

          {/* Dynamic Resources List */}
          <fieldset className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <legend className="px-1 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                المصادر المرفقة (فيديوهات شرح، مقالات، أدوات)
              </legend>
              <span className="text-xs text-neutral-400">
                {resourceList.length} مصادر مضافة
              </span>
            </div>

            {/* Existing Resources List */}
            {resourceList.length > 0 && (
              <div className="space-y-2">
                {resourceList.map((res, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-neutral-50/70 p-3 dark:bg-neutral-900/50"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {res.type === "VIDEO"
                            ? "فيديو"
                            : res.type === "TOOL"
                              ? "أداة"
                              : res.type === "DOCUMENT"
                                ? "مستند"
                                : "مقال"}
                        </span>
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {res.title}
                        </span>
                      </div>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate font-mono text-[11px] text-info-strong hover:underline"
                        dir="ltr"
                      >
                        {res.url}
                      </a>
                      {res.description && (
                        <p className="text-[11px] text-neutral-500 truncate">
                          {res.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setResourceList((list) =>
                          list.filter((_, i) => i !== index),
                        )
                      }
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-danger-strong dark:hover:bg-neutral-800"
                      title="حذف المصدر"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Resource Sub-Form */}
            <div className="rounded-xl border border-dashed border-border p-3.5 bg-surface space-y-3">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                + إضافة مصدر أو فيديو جديد
              </span>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
                  عنوان المصدر
                  <input
                    maxLength={200}
                    value={newResTitle}
                    onChange={(e) => setNewResTitle(e.target.value)}
                    placeholder="مثال: فيديو شرح التحضير للمقابلات السلوكية STAR"
                    className="field-control"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  نوع المصدر
                  <select
                    value={newResType}
                    onChange={(e) => setNewResType(e.target.value)}
                    className="field-control"
                  >
                    <option value="VIDEO">فيديو أو شرح (YouTube)</option>
                    <option value="ARTICLE">مقال أو مرجع</option>
                    <option value="TOOL">أداة أو برمجية</option>
                    <option value="DOCUMENT">ملف أو نموذج مستند</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-3">
                  رابط المصدر (YouTube أو HTTPS)
                  <input
                    type="url"
                    maxLength={2048}
                    value={newResUrl}
                    onChange={(e) => setNewResUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... أو https://..."
                    className="field-control font-mono text-xs"
                    dir="ltr"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-3">
                  وصف مختصر (اختياري)
                  <input
                    maxLength={1000}
                    value={newResDesc}
                    onChange={(e) => setNewResDesc(e.target.value)}
                    placeholder="شرح موجز لأهمية هذا المصدر وكيفية الاستفادة منه..."
                    className="field-control"
                  />
                </label>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="button-secondary px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  + تثبيت المصدر في القائمة
                </button>
              </div>
            </div>
          </fieldset>

          <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="button-secondary px-4 py-2.5 text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy}
              className="button-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "جاري الحفظ..." : post ? "حفظ التعديلات" : "نشر إرشاد الحبكة"}
            </button>
          </footer>
        </form>
      </section>
    </dialog>
  );
}
