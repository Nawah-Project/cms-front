import { PlayCircleIcon } from "./Icons";
import { useI18n } from "../i18n";
import { useUxExperiment } from "../utils/uxAnalytics";

type ResolvedVideo = { type: "iframe" | "video"; src: string };

function toEmbedUrl(rawUrl: string): ResolvedVideo | null {
  const value = rawUrl.trim();
  if (!value) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(value)
      ? { type: "video", src: value }
      : null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;

    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
      return { type: "video", src: parsed.toString() };
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2];
        if (id && /^[\w-]+$/.test(id)) {
          return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
        }
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/")[2];
        if (id && /^[\w-]+$/.test(id)) {
          return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
        }
      }
      const id = parsed.searchParams.get("v");
      if (id && /^[\w-]+$/.test(id)) {
        return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
      }
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (id && /^[\w-]+$/.test(id)) {
        return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
      }
    }

    if (host === "loom.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2];
        if (id && /^[\w-]+$/.test(id)) {
          return { type: "iframe", src: `https://www.loom.com/embed/${id}` };
        }
      }
      if (parsed.pathname.startsWith("/share/")) {
        const id = parsed.pathname.split("/")[2];
        if (id && /^[\w-]+$/.test(id)) {
          return { type: "iframe", src: `https://www.loom.com/embed/${id}` };
        }
      }
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (id && /^\d+$/.test(id)) {
        return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
      }
    }

    if (host === "drive.google.com" && parsed.pathname.includes("/file/d/")) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1] && /^[\w-]+$/.test(match[1])) {
        return {
          type: "iframe",
          src: `https://drive.google.com/file/d/${match[1]}/preview`,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function IntroVideoPlayer() {
  const { t, locale } = useI18n();
  const { introVideoUrl } = useUxExperiment();
  const resolved = toEmbedUrl(introVideoUrl);

  if (resolved?.type === "video") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-neutral-950 shadow-sm">
        <video
          src={resolved.src}
          controls
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (resolved?.type === "iframe") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-neutral-950 shadow-sm">
        <iframe
          src={resolved.src}
          title={t("auth.watchIntroTitle")}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="journey-video-poster">
      <img src="/images/nawah-professional-v2.webp" alt="" aria-hidden="true" />
      <div><span>{locale==="ar"?"دليلك للبداية":"YOUR STARTING GUIDE"}</span><h4>{locale==="ar"?"خطوة واضحة. وبعدها خطوة.":"One clear step. Then the next."}</h4><p>{locale==="ar"?"جهّز ملفك، سجّل أول طلب، وخلي كل تجربة تعلّمك حاجة للخطوة الجاية. الشرح المكتوب تحت متاح ليك دلوقتي؛ الفيديو التعريفي هينضاف قريبًا.":"Prepare your profile, track your first application, and learn from each attempt. Your written starting guide is below; an introductory video will follow."}</p></div>
    </div>
  );
}
