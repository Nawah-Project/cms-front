import {
useEffect,
useState
} from "react";
import {
fileUrl,
write,
type CaseData,
type Content,
type Publication,
type Submission
} from "./api";
import "./consulting.css";
import {
ContentValue,
DocumentButton,
Field,
FilePicker,
useText,
useUnsaved,
when,
type Perform
} from "./shared";
export function PromptInput({
  prompt,
  value,
  onChange,
}: {
  prompt: { key: string; label: string; kind: string };
  value: any;
  onChange: (v: any) => void;
}) {
  const { t } = useText();
  if (prompt.kind === "ranked")
    return (
      <Field
        name={prompt.label}
        hint={t(
          "اكتب كل أولوية في سطر؛ ترتيب السطور يعبر عن أولويتك ويمكنك تغييره.",
          "One priority per line. Line order represents your priorities and can be changed.",
        )}
      >
        <textarea
          value={(value ?? []).join("\n")}
          maxLength={12000}
          onChange={(e) => onChange(e.target.value.split("\n"))}
        />
      </Field>
    );
  if (prompt.kind === "matrix") {
    const rows: Content[] = value ?? [];
    const keys = ["option", "evidence", "benefits", "limits", "unknowns"];
    const names = [
      t("البديل", "Option"),
      t("الأدلة", "Evidence"),
      t("الفوائد", "Benefits"),
      t("القيود", "Limits"),
      t("ما لم نعرفه", "Unknowns"),
    ];
    return (
      <fieldset className="cc-detail">
        <legend>{prompt.label}</legend>
        {rows.map((row, i) => (
          <div className="cc-card soft" key={i}>
            <div className="cc-matrix">
              {keys.map((k, j) => (
                <Field key={k} name={names[j]}>
                  <textarea
                    maxLength={1500}
                    value={row[k] ?? ""}
                    onChange={(e) =>
                      onChange(
                        rows.map((x, n) =>
                          n === i ? { ...x, [k]: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
            >
              {t("إزالة البديل", "Remove option")}
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={rows.length >= 12}
          onClick={() => onChange([...rows, {}])}
        >
          {t("أضف بديلًا للمقارنة", "Add an option to compare")}
        </button>
      </fieldset>
    );
  }
  return (
    <Field name={prompt.label}>
      <textarea
        value={value ?? ""}
        maxLength={12000}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function ResponseEditor({
  c,
  pub,
  perform,
  busy,
  active,
}: {
  c: CaseData;
  pub: Publication;
  perform: Perform;
  busy: boolean;
  active: boolean;
}) {
  const { t } = useText();
  const d = c.drafts.find((x) => x.publicationId === pub.id);
  const [answers, setAnswers] = useState<Content>(d?.answers ?? {});
  const [fileIds, setFileIds] = useState<string[]>(d?.fileIds ?? []);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(d?.revision ?? 0);
  useUnsaved(dirty);
  useEffect(() => {
    if (!dirty) {
      setAnswers(d?.answers ?? {});
      setFileIds(d?.fileIds ?? []);
      setRevision(d?.revision ?? 0);
    }
  }, [d?.revision, dirty]);
  const send = async (submit: boolean) => {
    const r = await perform(() =>
      write(
        `/career-consulting/cases/${c.id}/${submit ? "submissions" : "response-draft"}`,
        { publicationId: pub.id, answers, fileIds, revision },
      ),
    );
    if (r) setDirty(false);
  };
  return (
    <section>
      <h3>{t("مساحة إجابتك", "Your response workspace")}</h3>
      <p className="muted">
        {t(
          "مسودتك لا تظهر للمستشار. «تسليم» يشارك هذه النسخة ومرفقاتها ويحفظ النسخ السابقة.",
          "Your draft is private. Submit shares this version and its selected attachments; earlier submitted versions remain preserved.",
        )}
      </p>
      <fieldset disabled={!active || busy}>
        {(pub.content.prompts ?? []).map((p: any) => (
          <PromptInput
            key={p.key}
            prompt={p}
            value={answers[p.key]}
            onChange={(v) => {
              setAnswers((a) => ({ ...a, [p.key]: v }));
              setDirty(true);
            }}
          />
        ))}
        <FilePicker
          c={c}
          selected={fileIds}
          onChange={(v) => {
            setFileIds(v);
            setDirty(true);
          }}
          title={t("مرفقات هذا التسليم", "Attachments for this submission")}
        />
        <div className="cc-actions mt-4">
          <button type="button" onClick={() => void send(false)}>
            {t("احفظ مسودة خاصة", "Save private draft")}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (
                window.confirm(
                  t(
                    "تسليم إجاباتك والمرفقات المحددة للمستشار؟",
                    "Submit your answers and selected attachments to the consultant?",
                  ),
                )
              )
                void send(true);
            }}
          >
            {t("سلّم هذه النسخة للمراجعة", "Submit this version for review")}
          </button>
          <span role="status" className="muted">
            {dirty
              ? t("تعديلات غير محفوظة", "Unsaved changes")
              : t("المسودة المحفوظة خاصة بك", "Saved draft is private to you")}
          </span>
        </div>
      </fieldset>
    </section>
  );
}

export function SubmissionView({
  c,
  s,
  member,
  perform,
  busy,
  canEdit,
}: {
  c: CaseData;
  s: Submission;
  member: boolean;
  perform: Perform;
  busy: boolean;
  canEdit: boolean;
}) {
  const { t, locale } = useText();
  const pub = c.publications.find((p) => p.id === s.publicationId);
  const review = c.reviews.find((r) => r.submissionId === s.id);
  const [body, setBody] = useState(review?.body ?? "");
  const [nextStep, setNextStep] = useState(review?.nextStep ?? "");
  const [revision, setRevision] = useState(review?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  useEffect(() => {
    if (!dirty) {
      setBody(review?.body ?? "");
      setNextStep(review?.nextStep ?? "");
      setRevision(review?.revision ?? 0);
    }
  }, [review?.revision, dirty]);
  return (
    <details className="cc-detail" open={!review}>
      <summary>
        {t("التسليم", "Submission")} {s.version} · {when(s.createdAt, locale)} ·{" "}
        {review
          ? t("تمت المراجعة", "Reviewed")
          : t("بانتظار المراجعة", "Awaiting review")}
      </summary>
      <small>
        {t("مرتبط بنسخة النشاط", "Linked to activity version")} {pub?.revision}
      </small>
      {Object.entries(s.answers).map(([k, v]) => (
        <div key={k} className="cc-detail">
          <b>
            {pub?.content.prompts?.find((p: any) => p.key === k)?.label ?? k}
          </b>
          <ContentValue value={v} />
        </div>
      ))}
      {s.fileIds.map((id) => {
        const f = c.files.find((x) => x.id === id);
        return f ? (
          <p key={id}>
            <DocumentButton
              url={fileUrl(member, c.id, id)}
              name={f.originalName}
            />
          </p>
        ) : null;
      })}
      {review && (
        <div className="cc-notice">
          <h3>
            {t("مراجعة هذه النسخة تحديدًا", "Review of this exact version")}
          </h3>
          <p>{review.body}</p>
          <p>
            <b>{t("الخطوة التالية", "Next step")}: </b>
            {review.nextStep}
          </p>
        </div>
      )}
      {canEdit && (
        <form
          className="cc-card soft"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await perform(() =>
              write(
                `/admin/career-consulting/cases/${c.id}/submissions/${s.id}/review`,
                { body, nextStep, revision },
              ),
            );
            if (result) setDirty(false);
          }}
        >
          <Field
            name={t(
              "ماذا أضاف التسليم لفهم الحالة؟ وما تعليقك للشخص؟",
              "What did this submission add to understanding the case? Your feedback to the person",
            )}
          >
            <textarea
              required
              minLength={3}
              maxLength={10000}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field name={t("الخطوة المقترحة بعد المراجعة", "Proposed next step")}>
            <textarea
              maxLength={3000}
              value={nextStep}
              onChange={(e) => {
                setNextStep(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <button disabled={busy}>
            {t(
              "شارك المراجعة المرتبطة بالتسليم",
              "Share review linked to this submission",
            )}
          </button>
        </form>
      )}
    </details>
  );
}

export function DecisionHistory({ c, pubId }: { c: CaseData; pubId: string }) {
  const { label, t, locale } = useText();
  return (
    <div className="cc-detail">
      <h3>
        {t("اختيارات الشخص وتعليقاته", "The person’s choices & comments")}
      </h3>
      {c.decisions
        .filter((d) => d.publicationId === pubId)
        .map((d) => (
          <div key={d.id}>
            <b>{label(d.choice)}</b>
            <p>{d.body}</p>
            <small>{when(d.createdAt, locale)}</small>
          </div>
        ))}
    </div>
  );
}

export function Decision({
  c,
  pub,
  perform,
  busy,
}: {
  c: CaseData;
  pub: Publication;
  perform: Perform;
  busy: boolean;
}) {
  const { t, label } = useText();
  const [choice, setChoice] = useState("PROCEED");
  const [body, setBody] = useState("");
  return (
    <form
      className="cc-card soft"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await perform(() =>
          write(`/career-consulting/cases/${c.id}/decisions`, {
            publicationId: pub.id,
            choice,
            body,
          }),
        );
        if (r) setBody("");
      }}
    >
      <h3>
        {t(
          "الرأي المهني يساعدك؛ القرار لك",
          "The professional recommendation supports you; the decision is yours",
        )}
      </h3>
      <Field
        name={t("اختيارك بخصوص هذه النسخة", "Your choice about this version")}
      >
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          {["PROCEED", "REQUEST_CHANGE", "DEFER"].map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
      </Field>
      <Field
        name={t(
          "ما المناسب لك أو ما الذي تريد تغييره؟",
          "What fits you, or what would you like to change?",
        )}
      >
        <textarea
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <button disabled={busy}>
        {t("شارك اختياري وتعليقي", "Share my choice & comment")}
      </button>
      <DecisionHistory c={c} pubId={pub.id} />
    </form>
  );
}
