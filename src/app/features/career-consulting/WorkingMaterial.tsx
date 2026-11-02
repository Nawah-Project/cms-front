import {
BookOpen,
LockKeyhole,
Send
} from "lucide-react";
import {
useEffect,
useState
} from "react";
import {
write,
type Activity,
type CaseData,
type Content,
type Item,
type Kind
} from "./api";
import "./consulting.css";
import {
Field,
FilePicker,
latest,
Published,
useText,
useUnsaved,
type Perform
} from "./shared";
const fieldSets: Record<Kind, string[]> = {
  WORK: [
    "presentingConcern",
    "goal",
    "criteria",
    "context",
    "nextStep",
    "nextActor",
    "followUpAt",
    "beforeNow",
    "futureSteps",
  ],
  ACTIVITY: ["goal", "rationale", "expectedOutput", "instructions", "deadline"],
  SESSION: [
    "goal",
    "agenda",
    "scheduledAt",
    "meetingUrl",
    "stage",
    "summary",
    "followUp",
  ],
  EVIDENCE: [
    "sourceType",
    "source",
    "region",
    "observedAt",
    "body",
    "limitations",
  ],
  RECOMMENDATION: [
    "advice",
    "reasons",
    "alternatives",
    "limitations",
    "nextStep",
    "followUpAt",
  ],
};

const choices: Record<string, string[]> = {
  nextActor: ["", "CLIENT", "CONSULTANT", "TOGETHER"],
  stage: ["PLANNED", "IN_SESSION", "HELD"],
  sourceType: [
    "",
    "CLIENT_ACCOUNT",
    "WORK_SAMPLE",
    "OBSERVATION",
    "MARKET_RESOURCE",
    "WORKING_INTERPRETATION",
  ],
};

export function ItemEditor({
  c,
  item,
  kind,
  template,
  perform,
  busy,
  disabled,
  onHelp,
  onSaved,
  onClose,
}: {
  c: CaseData;
  item?: Item;
  kind: Kind;
  template?: Activity;
  perform: Perform;
  busy: boolean;
  disabled: boolean;
  onHelp: (s: string) => void;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const { t, label, tr, locale } = useText();
  const initial = () =>
    item?.draft ??
    (kind === "ACTIVITY" && template
      ? {
          catalogId: template.id,
          goal: latest(c, "WORK")?.content.goal ?? "",
          rationale: tr(template.purpose),
          expectedOutput: tr(template.expectedOutput),
          prompts: template.fields.map((f) => ({ ...f, label: tr(f.label) })),
          language: locale,
        }
      : {});
  const [data, setData] = useState<Content>(initial);
  const [title, setTitle] = useState(
    item?.title ?? (template ? tr(template.title) : label(kind)),
  );
  const [privateNotes, setPrivateNotes] = useState(item?.privateNotes ?? "");
  const [revision, setRevision] = useState(item?.revision);
  const [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const set = (k: string, v: any) => {
    setData((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };
  useEffect(() => {
    if (item && !dirty) {
      setData(item.draft);
      setTitle(item.title);
      setPrivateNotes(item.privateNotes);
      setRevision(item.revision);
    }
  }, [item?.revision, dirty]);
  const save = async () => {
    const r = await perform(() =>
      write(
        `/admin/career-consulting/cases/${c.id}/items${item ? "/" + item.id : ""}`,
        {
          kind,
          title,
          data,
          privateNotes,
          language: data.language ?? locale,
          ...(item ? { revision } : {}),
        },
        item ? "PATCH" : "POST",
      ),
    );
    if (r) {
      setDirty(false);
      onSaved(r.id);
    }
  };
  const published = c.publications.filter((p) => p.itemId === item?.id).at(-1);
  return (
    <section
      className="cc-card"
      aria-label={t("محرر مادة العمل", "Work material editor")}
    >
      <header>
        <div>
          <span className="cc-pill">{label(kind)}</span>
          <h2>
            {item
              ? t("مادة عمل محفوظة", "Saved work material")
              : t("تحضير مادة جديدة", "Prepare new work material")}
          </h2>
        </div>
        <button
          onClick={() => {
            if (
              !dirty ||
              window.confirm(
                t(
                  "توجد تعديلات غير محفوظة. إغلاقها؟",
                  "There are unsaved changes. Close anyway?",
                ),
              )
            )
              onClose();
          }}
        >
          {t("أغلق المحرر", "Close editor")}
        </button>
      </header>
      <div className="cc-notice">
        <LockKeyhole size={15} className="inline" />{" "}
        {t(
          "حفظ المسودة لا يشاركها. النشر إجراء منفصل، والملاحظات الخاصة لا تدخل النسخة المنشورة.",
          "Saving a draft does not share it. Publishing is separate, and private notes never enter the published version.",
        )}
      </div>
      {template && (
        <details open>
          <summary>
            {t(
              "سبب اختيار النشاط وطريقة مراجعة فائدته",
              "Activity selection & reviewing its benefit",
            )}
          </summary>
          <p>{tr(template.indications)}</p>
          <p>{tr(template.avoid)}</p>
          <ul className="cc-list">
            {template.review.map((x, i) => (
              <li key={i}>{tr(x)}</li>
            ))}
          </ul>
        </details>
      )}
      <button
        className="link"
        onClick={() =>
          onHelp(
            kind === "WORK"
              ? "understand-request"
              : kind === "ACTIVITY"
                ? "choose-intervention"
                : kind === "RECOMMENDATION"
                  ? "recommendation-action"
                  : "working-understanding",
          )
        }
      >
        <BookOpen size={15} />
        {t(
          "افتح مساعدة الممارسة دون مغادرة الحالة",
          "Open practice guidance without leaving the case",
        )}
      </button>
      <fieldset disabled={disabled || busy}>
        <Field name={t("عنوان مادة العمل", "Work material title")}>
          <input
            maxLength={160}
            minLength={3}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        {fieldSets[kind].map((k) => (
          <Field
            key={k}
            name={label(k)}
            hint={
              k === "beforeNow"
                ? t(
                    "اربط التغير بهدف الشخص ودليل ملموس؛ لا يكفي عدد الأنشطة.",
                    "Connect change to the person’s goal and concrete evidence; activity count is not enough.",
                  )
                : k === "limitations"
                  ? t(
                      "ما الذي نعرفه، وما الذي ما زال يحتاج تحققًا؟",
                      "What is known, and what still needs verification?",
                    )
                  : undefined
            }
          >
            {choices[k] ? (
              <select
                value={data[k] ?? (k === "stage" ? "PLANNED" : "")}
                onChange={(e) => set(k, e.target.value)}
              >
                {choices[k].map((v) => (
                  <option key={v} value={v}>
                    {v ? label(v) : t("غير محدد بعد", "Not decided yet")}
                  </option>
                ))}
              </select>
            ) : [
                "followUpAt",
                "deadline",
                "scheduledAt",
                "observedAt",
              ].includes(k) ? (
              <input
                type="datetime-local"
                value={
                  data[k]
                    ? new Date(
                        new Date(data[k]).getTime() -
                          new Date(data[k]).getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  set(
                    k,
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  )
                }
              />
            ) : k === "meetingUrl" ? (
              <input
                type="url"
                dir="ltr"
                value={data[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                placeholder="https://…"
              />
            ) : (
              <textarea
                maxLength={6000}
                value={data[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
              />
            )}
          </Field>
        ))}
        {kind === "ACTIVITY" && (
          <fieldset>
            <legend>
              {t(
                "أسئلة النشاط — عدّلها للشخص",
                "Activity prompts · adapt them for the person",
              )}
            </legend>
            {(data.prompts ?? []).map((p: any, i: number) => (
              <Field key={p.key} name={t("سؤال", "Prompt") + " " + (i + 1)}>
                <textarea
                  value={p.label}
                  maxLength={500}
                  onChange={(e) =>
                    set(
                      "prompts",
                      data.prompts.map((x: any, j: number) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <small>
                  {t("شكل الإجابة", "Answer format")}:{" "}
                  {p.kind === "matrix"
                    ? t("جدول مقارنة", "Comparison matrix")
                    : p.kind === "ranked"
                      ? t("قائمة أولويات مرتبة", "Ordered priority list")
                      : t("نص", "Text")}
                </small>
              </Field>
            ))}
          </fieldset>
        )}
        {kind !== "WORK" && (
          <FilePicker
            c={c}
            selected={data.fileIds ?? []}
            onChange={(v) => set("fileIds", v)}
            title={t(
              "مرفقات تدخل النسخة المنشورة عند النشر",
              "Attachments shared when this version is published",
            )}
          />
        )}
        {kind === "SESSION" && (
          <fieldset>
            <legend>
              {t(
                "مواد منشورة للعمل عليها في الجلسة",
                "Published materials to work on during the session",
              )}
            </legend>
            {c.publications
              .filter(
                (p) =>
                  !c.publications.some(
                    (n) => n.itemId === p.itemId && n.revision > p.revision,
                  ),
              )
              .map((p) => (
                <label className="cc-check" key={p.id}>
                  <input
                    type="checkbox"
                    checked={(data.materialIds ?? []).includes(p.id)}
                    onChange={(e) =>
                      set(
                        "materialIds",
                        e.target.checked
                          ? [...(data.materialIds ?? []), p.id]
                          : (data.materialIds ?? []).filter(
                              (x: string) => x !== p.id,
                            ),
                      )
                    }
                  />
                  {p.content.title}
                </label>
              ))}
          </fieldset>
        )}
        <div className="cc-private">
          <Field
            name={t(
              "ملاحظات خاصة بالمستشار والمسؤولين المعيّنين فقط",
              "Private notes · consultant & assigned administrators only",
            )}
          >
            <textarea
              maxLength={12000}
              value={privateNotes}
              onChange={(e) => {
                setPrivateNotes(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>
        <div className="cc-actions mt-4">
          <button
            className="primary"
            type="button"
            onClick={() => void save()}
            disabled={!dirty && !!item}
          >
            {t("احفظ المسودة الخاصة", "Save private draft")}
          </button>
          <span role="status" className={dirty ? "cc-warning" : "muted"}>
            {dirty
              ? t("تعديلات غير محفوظة", "Unsaved changes")
              : item
                ? t("محفوظة على الخادم", "Saved on server")
                : t("لم تحفظ بعد", "Not saved yet")}
          </span>
        </div>
      </fieldset>
      {item && !disabled && (
        <div className="cc-detail">
          <button
            disabled={busy || dirty || published?.revision === revision}
            onClick={() => {
              if (
                window.confirm(
                  t(
                    "نشر النسخة المحفوظة للشخص، مع المرفقات المحددة؟ الملاحظات الخاصة تظل خاصة.",
                    "Publish the saved version to the person, including selected attachments? Private notes remain private.",
                  ),
                )
              )
                void perform(() =>
                  write(
                    `/admin/career-consulting/cases/${c.id}/items/${item.id}/publish`,
                    { revision },
                  ),
                );
            }}
          >
            <Send size={15} />
            {t(
              "انشر النسخة المحفوظة للشخص",
              "Publish saved version to the person",
            )}
          </button>
          {dirty && (
            <p className="muted">
              {t(
                "احفظ أولًا ثم راجع ما تريد نشره.",
                "Save first, then review what you want to publish.",
              )}
            </p>
          )}
        </div>
      )}
      {published && (
        <details>
          <summary>
            {t(
              "راجع ما يراه الشخص فعليًا",
              "Review exactly what the person can see",
            )}
          </summary>
          <Published pub={published} c={c} />
        </details>
      )}
    </section>
  );
}
