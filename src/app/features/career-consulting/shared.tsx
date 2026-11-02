import {
FileText
} from "lucide-react";
import {
useEffect,
useRef,
useState,
type ReactNode
} from "react";
import { useI18n } from "../../i18n";
import { useAuth } from "../auth/store/authStore";
import {
fileUrl,
type CaseData,
type Kind,
type Localized,
type Publication
} from "./api";
import "./consulting.css";
import { L } from "./labels";
export type Perform = <T>(action: () => Promise<T>) => Promise<T | null>;
export type T = (ar: string, en: string) => string;
export const latest = (c: CaseData, kind: Kind) =>
  c.publications.filter((p) => p.kind === kind).at(-1);
export const when = (v: string, locale: string) =>
  new Date(v).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function useText() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return {
    locale,
    ar,
    t: (a: string, b: string) => (ar ? a : b),
    tr: (x: Localized) => (ar ? x.ar : x.en),
    label: (key: string) => L[key]?.[ar ? 0 : 1] ?? key,
  };
}

export function Field({
  name,
  children,
  hint,
}: {
  name: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="cc-field">
      <span>{name}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="cc-empty">{children}</div>;
}

export function ContentValue({ value }: { value: any }) {
  const { t } = useText();
  const names: Record<string, string> = {
    option: t("البديل", "Option"),
    evidence: t("الدليل", "Evidence"),
    benefits: t("الفوائد", "Benefits"),
    limits: t("القيود", "Limits"),
    unknowns: t("ما لم نعرفه", "Unknowns"),
  };
  if (Array.isArray(value))
    return (
      <ul className="cc-list">
        {value.map((v, i) => (
          <li key={i}>
            {v && typeof v === "object"
              ? Object.entries(v)
                  .filter(([, x]) => x)
                  .map(([k, x]) => (
                    <p key={k}>
                      <b>{names[k] ?? k}: </b>
                      {String(x)}
                    </p>
                  ))
              : String(v)}
          </li>
        ))}
      </ul>
    );
  return <p className="cc-content">{String(value ?? "")}</p>;
}

export function Published({
  pub,
  c,
  member = false,
}: {
  pub: Publication;
  c?: CaseData;
  member?: boolean;
}) {
  const { t, label } = useText();
  const content = pub.content;
  const omit = [
    "title",
    "prompts",
    "fileIds",
    "materialIds",
    "sources",
    "catalogId",
    "catalogVersion",
    "language",
  ];
  return (
    <div className="cc-public cc-card">
      <header>
        <div>
          <span className="cc-pill">
            {label(pub.kind)} · {t("نسخة", "Version")} {pub.revision}
          </span>
          <h3>{content.title}</h3>
        </div>
      </header>
      {Object.entries(content)
        .filter(([k, v]) => !omit.includes(k) && v)
        .map(([k, v]) => (
          <div className="cc-detail" key={k}>
            <small>{label(k)}</small>
            {k === "meetingUrl" && String(v).startsWith("https://") ? (
              <a
                className="cc-button"
                target="_blank"
                rel="noopener noreferrer"
                href={String(v)}
              >
                {t("افتح رابط الاجتماع", "Open meeting link")}
              </a>
            ) : (
              <ContentValue
                value={
                  ["stage", "nextActor", "sourceType"].includes(k)
                    ? label(String(v))
                    : v
                }
              />
            )}
          </div>
        ))}
      {c && (
        <div className="cc-actions">
          {(pub.content.fileIds ?? []).map((id: string) => {
            const f = c.files.find((f) => f.id === id);
            return f ? (
              <DocumentButton
                key={id}
                url={fileUrl(member, c.id, id)}
                name={f.originalName}
              />
            ) : null;
          })}
        </div>
      )}
      {c &&
        (pub.content.materialIds ?? []).map((id: string) => {
          const p = c.publications.find((p) => p.id === id);
          return p ? (
            <details key={id}>
              <summary>{p.content.title}</summary>
              <p>{p.content.goal ?? p.content.body ?? p.content.advice}</p>
              {p.content.prompts?.map((q: any) => (
                <p key={q.key}>{q.label}</p>
              ))}
            </details>
          ) : null;
        })}
    </div>
  );
}

export const unsavedEditors = new Set<symbol>();

export function useUnsaved(dirty: boolean) {
  const id = useRef(Symbol("consulting-draft")).current;
  useEffect(() => {
    if (!dirty) return;
    unsavedEditors.add(id);
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", f);
    return () => {
      unsavedEditors.delete(id);
      window.removeEventListener("beforeunload", f);
    };
  }, [dirty, id]);
}

export function FilePicker({
  c,
  selected,
  onChange,
  title,
}: {
  c: CaseData;
  selected: string[];
  onChange: (v: string[]) => void;
  title: string;
}) {
  const { t } = useText();
  return (
    <fieldset className="cc-detail">
      <legend>{title}</legend>
      {!c.files.length && (
        <p className="muted">
          {t(
            "ارفع PDF من «المناقشة والملفات» أولًا.",
            "Upload a PDF under Discussion & files first.",
          )}
        </p>
      )}
      {c.files.map((f) => (
        <label key={f.id} className="cc-check">
          <input
            type="checkbox"
            checked={selected.includes(f.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, f.id]
                  : selected.filter((x) => x !== f.id),
              )
            }
          />
          {f.originalName} · {(f.size / 1024).toFixed(1)} KB
        </label>
      ))}
    </fieldset>
  );
}

export function DocumentButton({ url, name }: { url: string; name: string }) {
  const { t } = useText();
  const { user } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const controller = new AbortController();
    let blobUrl = "";
    setBlob("");
    setError(false);
    void fetch(url, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Unavailable");
        const value = await response.blob();
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(value);
        setBlob(blobUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      dialog.current?.close();
    };
  }, [open, url, user?.id]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        <FileText size={15} />
        {name}
      </button>
      <dialog
        className="cc-document-dialog"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-label={name}
      >
        <header className="cc-actions">
          <h3>{name}</h3>
          <button onClick={() => setOpen(false)}>
            {t("إغلاق والعودة للحالة", "Close & return to the case")}
          </button>
        </header>
        {error ? (
          <p role="alert">
            {t(
              "المستند غير متاح أو تعذر تحميله. أغلقه وأعد المحاولة.",
              "This document is unavailable or could not be loaded. Close it and retry.",
            )}
          </p>
        ) : !blob ? (
          <p role="status">
            {t("تحميل المستند الخاص…", "Loading private document…")}
          </p>
        ) : (
          <>
            <iframe src={blob} title={name} />
            <a className="cc-button" download={name} href={blob}>
              {t(
                "تنزيل PDF إذا لم يظهر في المتصفح",
                "Download PDF if your browser cannot display it",
              )}
            </a>
          </>
        )}
      </dialog>
    </>
  );
}
