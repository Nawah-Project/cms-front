import { useQuery } from "@tanstack/react-query";
import {
MessageCircle
} from "lucide-react";
import {
useEffect,
useState
} from "react";
import { API_BASE_URL } from "../../lib/api-client";
import {
base,
fileUrl,
read,
upload,
write,
type CaseData,
type Content
} from "./api";
import "./consulting.css";
import {
DocumentButton,
Field,
useText,
useUnsaved,
when,
type Perform
} from "./shared";
export function Discussion({
  c,
  member,
  perform,
  busy,
  active,
}: {
  c: CaseData;
  member: boolean;
  perform: Perform;
  busy: boolean;
  active: boolean;
}) {
  const { t, label, locale } = useText();
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("CASE");
  const [isPrivate, setPrivate] = useState(false);
  return (
    <section className="cc-card">
      <h2>{t("حديث مرتبط بالعمل", "Work-related conversation")}</h2>
      <div className="cc-timeline">
        {c.comments.map((x) => (
          <article key={x.id}>
            <span className="cc-pill">
              {label(x.authorRole)}
              {x.private ? " · " + t("خاص", "Private") : ""}
            </span>
            <small> {when(x.createdAt, locale)}</small>
            {x.targetId && (
              <p className="muted">
                {c.publications.find((p) => p.id === x.targetId)?.content
                  .title ?? t("تعليق على التسليم", "Submission comment")}
              </p>
            )}
            <p className="cc-content">{x.body}</p>
          </article>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await perform(() =>
            write(`${base(member)}/cases/${c.id}/comments`, {
              body,
              private: member ? false : isPrivate,
              targetKind: target === "CASE" ? "CASE" : "PUBLICATION",
              ...(target !== "CASE" ? { targetId: target } : {}),
            }),
          );
          if (r) setBody("");
        }}
      >
        <fieldset disabled={!active || busy}>
          <Field name={t("بخصوص", "Regarding")}>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="CASE">
                {t(
                  "الاتجاه أو الهدف أو الخطوة التالية",
                  "Direction, goal or next step",
                )}
              </option>
              {c.publications.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.content.title} · {p.revision}
                </option>
              ))}
            </select>
          </Field>
          <Field
            name={
              member
                ? t("سؤالك أو طلب التعديل", "Your question or change request")
                : t("تعليق للمناقشة", "Discussion comment")
            }
          >
            <textarea
              required
              maxLength={6000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          {!member && (
            <label className="cc-check">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setPrivate(e.target.checked)}
              />
              {t(
                "ملاحظة داخلية لا يراها الشخص",
                "Internal note · hidden from the person",
              )}
            </label>
          )}
          <button className="primary">
            <MessageCircle size={16} />
            {!member && isPrivate
              ? t("احفظ الملاحظة الخاصة", "Save private note")
              : t("شارك التعليق", "Share comment")}
          </button>
        </fieldset>
      </form>
    </section>
  );
}

export function Documents({
  c,
  member,
  perform,
  busy,
  active,
}: {
  c: CaseData;
  member: boolean;
  perform: Perform;
  busy: boolean;
  active: boolean;
}) {
  const { t } = useText();
  return (
    <section className="cc-card">
      <h2>{t("مستندات العمل الخاصة", "Private working documents")}</h2>
      <p>
        {t(
          "ملفات الاستشارة مستقلة عن CV حسابك. الرفع لا يشارك المستند تلقائيًا؛ اختره ضمن مادة منشورة أو تسليم، أو شاركه صراحة.",
          "Consultation files are separate from your account CV. Uploading does not automatically share a document; select it in published work or a submission, or explicitly share it.",
        )}
      </p>
      <Field
        name={t("ارفع PDF", "Upload PDF")}
        hint={`${t("الحد لكل ملف", "Per-file limit")}: ${(c.maxFileBytes / 1024 / 1024).toFixed(0)} MiB`}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          disabled={!active || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await perform(() => upload(member, c.id, file));
              e.target.value = "";
            }
          }}
        />
      </Field>
      {c.files.map((f) => (
        <div key={f.id} className="cc-detail">
          <div className="cc-actions">
            <DocumentButton
              url={fileUrl(member, c.id, f.id)}
              name={f.originalName}
            />
            <small>{(f.size / 1024).toFixed(1)} KB</small>
            <span className="cc-pill">
              {f.shared
                ? t("مشترك", "Shared")
                : t("خاص بصاحبه", "Private to uploader")}
            </span>
            {!f.shared && active && (
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      t(
                        "مشاركة هذا المستند مع الطرف الآخر؟",
                        "Share this document with the other party?",
                      ),
                    )
                  )
                    void perform(() =>
                      write(
                        `${base(member)}/cases/${c.id}/files/${f.id}/share`,
                      ),
                    );
                }}
              >
                {t("شارك هذا المستند صراحة", "Explicitly share this document")}
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Access({
  c,
  member,
  perform,
  busy,
  active,
}: {
  c: CaseData;
  member: boolean;
  perform: Perform;
  busy: boolean;
  active: boolean;
}) {
  const { t, label, locale } = useText();
  const [showProgramme, setShowProgramme] = useState(false);
  const programme = useQuery({
    queryKey: ["consulting-programme", c.id, c.programmeSharing],
    queryFn: () =>
      read<Content>(`/admin/career-consulting/cases/${c.id}/programme`),
    enabled: !member && showProgramme && c.programmeSharing,
  });
  return (
    <>
      <div className="cc-card">
        <h2>{t("اتفاق الخدمة والاحتفاظ", "Service agreement & retention")}</h2>
        <p>{c.purpose}</p>
        <p>
          {label(c.consentStatus)}
          {c.consentAt ? " · " + when(c.consentAt, locale) : ""}
        </p>
        <p>
          {t("الاحتفاظ حتى", "Retained until")}:{" "}
          {when(c.retentionUntil, locale)}
        </p>
        <p>
          {t(
            "هذه الخدمة ليست موافقة بحثية، ولا تمنح صلاحيات مبكرة في البرنامج. بعد سحب الموافقة يتوقف العمل الجديد، وتبقى السجلات حتى تاريخ الاحتفاظ ثم تُحذف مع مرفقاتها.",
            "This service is not research consent and grants no early programme access. Withdrawal stops new work. Records remain until the retention date and are then deleted with attachments.",
          )}
        </p>
        {member && c.consentStatus !== "WITHDRAWN" && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  t(
                    "سحب الموافقة وإيقاف كل عمل جديد؟ السجلات الموجودة تبقى حتى موعد الاحتفاظ الموضح.",
                    "Withdraw consent and stop all new work? Existing records remain until the stated retention date.",
                  ),
                )
              )
                void perform(() =>
                  write(`/career-consulting/cases/${c.id}/withdraw`),
                );
            }}
          >
            {t(
              "اسحب موافقتي وأوقف العمل الجديد",
              "Withdraw my consent & stop new work",
            )}
          </button>
        )}
      </div>
      <div className="cc-card">
        <h3>
          {t("ربط صريح مع بيانات البرنامج", "Explicit programme data sharing")}
        </h3>
        <p>
          {t(
            "عند اختيارك، يطّلع المستشار على CV الحساب الحالي ورابط أعمالك والتخصص وتقدم الرحلة وأعداد الطلبات، وموارد التوجيه المسموح له بها. لا يتم نقل الإنجازات أو تعديل CV الحساب.",
            "If you choose, your consultant can read your current account CV, portfolio link, specialism, journey position and application counts and mentoring resources they are authorized to access. No achievements are transferred and the account CV is not modified.",
          )}
        </p>
        {member ? (
          <button
            disabled={!active || busy}
            aria-pressed={c.programmeSharing}
            onClick={() =>
              void perform(() =>
                write(`/career-consulting/cases/${c.id}/programme-sharing`, {
                  enabled: !c.programmeSharing,
                }),
              )
            }
          >
            {c.programmeSharing
              ? t("أوقف مشاركة بيانات البرنامج", "Stop sharing programme data")
              : t(
                  "أسمح بعرض بيانات البرنامج للمستشار",
                  "Allow consultant to read programme data",
                )}
          </button>
        ) : (
          <>
            <p>
              {c.programmeSharing
                ? t(
                    "سمح الشخص بالعرض للقراءة.",
                    "The person allowed read-only access.",
                  )
                : t(
                    "لم يسمح الشخص بعرض بيانات البرنامج.",
                    "The person has not allowed programme data sharing.",
                  )}
            </p>
            {c.programmeSharing && (
              <button onClick={() => setShowProgramme(!showProgramme)}>
                {t("اعرض المصدر داخل الحالة", "Read source inside this case")}
              </button>
            )}
            {showProgramme && programme.isPending && (
              <p role="status">{t("تحميل المصدر…", "Loading source…")}</p>
            )}
            {showProgramme && programme.error && (
              <p role="alert">
                {t(
                  "تعذر تحميل مصدر البرنامج.",
                  "Could not load programme source.",
                )}
              </p>
            )}
            {showProgramme && programme.data?.shared && (
              <div className="cc-detail">
                {programme.data.cv && (
                  <DocumentButton
                    url={`${API_BASE_URL}/admin/career-consulting/cases/${c.id}/programme-cv`}
                    name={
                      programme.data.cv.originalName +
                      " · " +
                      t("CV الحساب الحالي فقط", "Current account CV only")
                    }
                  />
                )}
                {programme.data.portfolioUrl && (
                  <a
                    className="cc-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={programme.data.portfolioUrl}
                  >
                    {t("رابط الأعمال من الحساب", "Account portfolio")}
                  </a>
                )}
                <h3>
                  {programme.data.specialism ??
                    t("التخصص غير محدد", "No specialism")}
                </h3>
                <p>
                  {t("المحطة الحالية", "Current station")}:{" "}
                  {programme.data.journey?.currentNodeCode ?? "—"}
                </p>
                <p>
                  {t("إجمالي الطلبات", "Applications")}:{" "}
                  {programme.data.applicationStages?.reduce(
                    (n: number, x: Content) => n + x.count,
                    0,
                  )}
                </p>
                {programme.data.tasks?.map((x: Content) => (
                  <details key={x.id}>
                    <summary>
                      {x.title} · {x.status}
                    </summary>
                    <p>{x.description}</p>
                  </details>
                ))}
                {programme.data.feedback?.map((x: Content) => (
                  <details key={x.id}>
                    <summary>{x.title}</summary>
                    <p>{x.content}</p>
                  </details>
                ))}
                <p className="muted">
                  {t(
                    "مصدر واحد للقراءة. لا يكتب نشاط الاستشارة تقدمًا في رحلة نواة.",
                    "Read-only single source. Consulting activities do not write Nawah journey progress.",
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      {!member && c.canManageAccess && (
        <CaseSettings c={c} perform={perform} busy={busy} />
      )}
      {!member && (
        <div className="cc-card">
          <h2>{t("السجل الفني للحالة", "Case audit timeline")}</h2>
          <p className="muted">
            {t(
              "أحداث الوصول والحفظ والنشر، دون محتوى الملاحظات أو الردود.",
              "Access, save and publication events without private note or response contents.",
            )}
          </p>
          <ol className="cc-timeline">
            {c.events
              ?.filter((x) => x.action !== "AUTHORIZED_VIEW")
              .map((x) => (
                <li key={x.id}>
                  <b>{label(x.action)}</b>
                  <p className="muted">{when(x.createdAt, locale)}</p>
                </li>
              ))}
          </ol>
        </div>
      )}
    </>
  );
}

export function CaseSettings({
  c,
  perform,
  busy,
}: {
  c: CaseData;
  perform: Perform;
  busy: boolean;
}) {
  const { t } = useText();
  const [ownerId, setOwner] = useState(c.ownerId ?? "");
  const [allowedAdminIds, setAllowed] = useState(c.allowedAdminIds ?? []);
  const [retentionUntil, setRetention] = useState(
    c.retentionUntil.slice(0, 10),
  );
  const [revision, setRevision] = useState(c.revision);
  const [dirty, setDirty] = useState(false);
  const staff = useQuery({
    queryKey: ["consulting-staff"],
    queryFn: () =>
      read<{ id: string; name: string; canOwn: boolean }[]>(
        "/admin/career-consulting/staff",
      ),
  });
  useEffect(() => {
    if (!dirty) {
      setOwner(c.ownerId ?? "");
      setAllowed(c.allowedAdminIds ?? []);
      setRetention(c.retentionUntil.slice(0, 10));
      setRevision(c.revision);
    }
  }, [c.revision, dirty]);
  useUnsaved(dirty);
  return (
    <form
      className="cc-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await perform(() =>
          write(
            `/admin/career-consulting/cases/${c.id}`,
            {
              revision,
              ownerId,
              allowedAdminIds,
              ...(retentionUntil !== c.retentionUntil.slice(0, 10)
                ? {
                    retentionUntil: new Date(
                      retentionUntil + "T23:59:59.000Z",
                    ).toISOString(),
                  }
                : {}),
            },
            "PATCH",
          ),
        );
        if (r) setDirty(false);
      }}
    >
      <h3>
        {t(
          "المسؤولون المعيّنون ومدة الاحتفاظ",
          "Assigned administrators & retention",
        )}
      </h3>
      <p className="muted">
        {t(
          "صلاحية القسم شرط مستقل عن تعيين الحالة. Root وحده يمنح صلاحية القسم من إدارة الأدمنز. بعد قبول الاتفاق يمكن تقصير مدة الاحتفاظ ولا تُمدد صامتًا.",
          "Section permission is separate from case assignment. Root grants section permissions in admin management. Accepted retention may be shortened, never silently extended.",
        )}
      </p>
      <fieldset disabled={busy || !c.canWrite}>
        <Field name={t("المستشار المسؤول", "Case owner")}>
          <select
            value={ownerId}
            onChange={(e) => {
              setOwner(e.target.value);
              setDirty(true);
            }}
          >
            {staff.data
              ?.filter((s) => s.canOwn)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <fieldset>
          <legend>
            {t(
              "وصول إضافي للحالة حسب صلاحية القسم",
              "Additional case access, subject to section permission",
            )}
          </legend>
          {staff.data
            ?.filter((s) => s.id !== ownerId)
            .map((s) => (
              <label key={s.id} className="cc-check">
                <input
                  type="checkbox"
                  checked={allowedAdminIds.includes(s.id)}
                  onChange={(e) => {
                    setAllowed(
                      e.target.checked
                        ? [...allowedAdminIds, s.id]
                        : allowedAdminIds.filter((x) => x !== s.id),
                    );
                    setDirty(true);
                  }}
                />
                {s.name} ·{" "}
                {s.canOwn
                  ? t("قراءة وكتابة", "Read & write")
                  : t("قراءة", "Read")}
              </label>
            ))}
        </fieldset>
        <Field name={t("تاريخ نهاية الاحتفاظ", "Retention end date")}>
          <input
            type="date"
            required
            value={retentionUntil}
            onChange={(e) => {
              setRetention(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <button disabled={!dirty}>
          {t("احفظ التخصيص", "Save assignments")}
        </button>
      </fieldset>
    </form>
  );
}
