import {
BookOpen,
Handshake,
Plus,
Send
} from "lucide-react";
import {
useState
} from "react";
import {
base,
write,
type Activity,
type CaseData,
type Catalog,
type Item,
type Kind
} from "./api";
import { Access,Discussion,Documents } from "./CaseAccess";
import "./consulting.css";
import {
Empty,
latest,
Published,
unsavedEditors,
useText,
when,
type Perform
} from "./shared";
import {
Decision,
DecisionHistory,
ResponseEditor,
SubmissionView,
} from "./SharedWork";
import { ItemEditor } from "./WorkingMaterial";
export function CaseWorkspace({
  c,
  member,
  catalog,
  perform,
  busy,
  onHelp,
}: {
  c: CaseData;
  member: boolean;
  catalog?: Catalog;
  perform: Perform;
  busy: boolean;
  onHelp: (id: string) => void;
}) {
  const { t, label, locale } = useText();
  const [area, setArea] = useState("overview");
  const [editing, setEditing] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<Kind | null>(null);
  const [template, setTemplate] = useState<Activity | undefined>();
  const active = c.status === "ACTIVE" && c.consentStatus === "ACCEPTED";
  const canEdit = !member && !!c.canWrite && active;
  const work = latest(c, "WORK");
  const openItem = (item: Item) => {
    if (
      unsavedEditors.size &&
      !window.confirm(
        t(
          "توجد تعديلات غير محفوظة. فتح مادة أخرى؟",
          "There are unsaved changes. Open different work?",
        ),
      )
    )
      return;
    setEditing(item.id);
    setNewKind(null);
  };
  const begin = (kind: Kind, a?: Activity) => {
    if (
      unsavedEditors.size &&
      !window.confirm(
        t(
          "توجد تعديلات غير محفوظة. بدء مادة أخرى؟",
          "There are unsaved changes. Start different work?",
        ),
      )
    )
      return;
    setEditing(null);
    setNewKind(kind);
    setTemplate(a);
  };
  const areas = [
    ["overview", "صورة الحالة", "Case picture"],
    ["sessions", "الجلسات", "Sessions"],
    ["activities", "العمل المشترك", "Shared work"],
    ["recommendations", "التوصية والمتابعة", "Recommendation & review"],
    ["discussion", "المناقشة والملفات", "Discussion & files"],
    ["access", "الاتفاق والوصول والسجل", "Agreement, access & timeline"],
  ];
  const items = c.items ?? [];
  const current = items.find((i) => i.id === editing);
  const waiting = c.submissions.filter(
    (s) => !c.reviews.some((r) => r.submissionId === s.id),
  );
  return (
    <>
      <header className="cc-card soft">
        <div className="cc-actions">
          <span className="cc-pill">{label(c.status)}</span>
          <span className="cc-pill">{label(c.consentStatus)}</span>
        </div>
        <h2>
          {c.person.name} · {c.title}
        </h2>
        <p>{c.purpose}</p>
        <small>
          {t("مع", "With")} {c.consultantName} ·{" "}
          {t("الاحتفاظ حتى", "Retained until")} {when(c.retentionUntil, locale)}
        </small>
      </header>
      {!member && !c.canWrite && (
        <div className="cc-readonly">
          {t(
            "صلاحيتك قراءة فقط. الملاحظات الخاصة متاحة فقط للمسؤولين المعيّنين للحالة.",
            "Read-only access. Private notes are available only to assigned case administrators.",
          )}
        </div>
      )}
      {member && c.consentStatus === "NOT_ACCEPTED" ? (
        <Agreement c={c} perform={perform} busy={busy} />
      ) : (
        <>
          {!active && (
            <div className="cc-notice">
              {c.status === "DRAFT"
                ? t(
                    "المسودة لم تُدعَ بعد. راجع الغرض ومدة الاحتفاظ ثم أرسل الدعوة صراحة.",
                    "This draft is not yet invited. Review purpose and retention, then explicitly send an invitation.",
                  )
                : c.status === "INVITED"
                  ? t(
                      "بانتظار قبول الشخص لاتفاق الخدمة. العمل الجديد مغلق حتى يقبل بنفسه من حسابه.",
                      "Waiting for the person to accept the service agreement in their own account. New work remains locked.",
                    )
                  : t(
                      "العمل الجديد متوقف. يمكنك مراجعة السجل المنشور خلال مدة الاحتفاظ.",
                      "New work is stopped. Published history remains available during the retention period.",
                    )}
            </div>
          )}
          {!member &&
            c.canWrite &&
            ["DRAFT", "ACTIVE", "PAUSED"].includes(c.status) && (
              <div className="cc-actions mb-4">
                {c.status === "DRAFT" ? (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "إرسال دعوة لهذا الشخص لمراجعة اتفاق الخدمة؟ لا ينضم للبحث.",
                            "Send this person a service-agreement invitation? This does not enroll them in research.",
                          ),
                        )
                      )
                        void perform(() =>
                          write(`${base(false)}/cases/${c.id}/state`, {
                            action: "INVITE",
                          }),
                        );
                    }}
                  >
                    <Send size={15} />
                    {t(
                      "أرسل دعوة اتفاق الخدمة",
                      "Send service agreement invitation",
                    )}
                  </button>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void perform(() =>
                        write(`${base(false)}/cases/${c.id}/state`, {
                          action: c.status === "PAUSED" ? "RESUME" : "PAUSE",
                        }),
                      )
                    }
                  >
                    {c.status === "PAUSED"
                      ? t("استأنف العمل", "Resume work")
                      : t("أوقف العمل مؤقتًا", "Pause work")}
                  </button>
                )}
              </div>
            )}
          <div className="cc-case-grid">
            <aside aria-label={t("أدوات الحالة", "Case workspace tools")}>
              {areas.map(([id, ar, en]) => (
                <button
                  key={id}
                  aria-pressed={area === id}
                  onClick={() => setArea(id)}
                >
                  {t(ar, en)}
                  {id === "activities" && waiting.length > 0 && (
                    <span className="cc-pill">{waiting.length}</span>
                  )}
                </button>
              ))}
            </aside>
            <div>
              {/* Editors stay mounted while opening references or moving between work areas. */}
              {(current || newKind) && !member && (
                <div style={{ display: area === "access" ? "none" : "block" }}>
                  <ItemEditor
                    key={current?.id ?? newKind! + (template?.id ?? "")}
                    c={c}
                    item={current}
                    kind={current?.kind ?? newKind!}
                    template={template}
                    perform={perform}
                    busy={busy}
                    disabled={!canEdit}
                    onHelp={onHelp}
                    onSaved={(id) => {
                      setEditing(id);
                      setNewKind(null);
                    }}
                    onClose={() => {
                      setEditing(null);
                      setNewKind(null);
                    }}
                  />
                </div>
              )}
              <div hidden={area !== "overview"}>
                <div className="cc-row">
                  <article className="cc-card">
                    <h3>
                      {t("القضية والهدف الحالي", "Current concern & goal")}
                    </h3>
                    <p>{work?.content.presentingConcern || c.purpose}</p>
                    <p>
                      <b>
                        {work?.content.goal ||
                          t(
                            "لم نتفق على هدف بعد.",
                            "A goal has not been agreed yet.",
                          )}
                      </b>
                    </p>
                    <small>
                      {work?.content.criteria ||
                        t(
                          "حدّد مع الشخص دليلًا عمليًا على الاستفادة.",
                          "Agree a practical indication of benefit with the person.",
                        )}
                    </small>
                    {canEdit && items.find((i) => i.kind === "WORK") && (
                      <button
                        onClick={() =>
                          openItem(items.find((i) => i.kind === "WORK")!)
                        }
                      >
                        {t(
                          "راجع اتفاق العمل والهدف",
                          "Review working agreement & goal",
                        )}
                      </button>
                    )}
                  </article>
                  <article className="cc-card soft">
                    <h3>
                      {t(
                        "ما الذي ينتظر إجراءً الآن؟",
                        "What needs attention now?",
                      )}
                    </h3>
                    <p>
                      {work?.content.nextStep ||
                        t(
                          "ابدأ بفهم طلب الشخص وسياقه، قبل اقتراح حل.",
                          "Start by understanding the person’s request and context before proposing a solution.",
                        )}
                    </p>
                    {work?.content.nextActor && (
                      <p>{label(work.content.nextActor)}</p>
                    )}
                    {work?.content.followUpAt && (
                      <p>{when(work.content.followUpAt, locale)}</p>
                    )}
                    <p>
                      {waiting.length}{" "}
                      {t(
                        "تسليم ينتظر المراجعة",
                        "submission(s) awaiting review",
                      )}
                    </p>
                    {waiting.length > 0 && (
                      <button onClick={() => setArea("activities")}>
                        {t("افتح العمل المشترك", "Open shared work")}
                      </button>
                    )}
                  </article>
                </div>
                {work && (
                  <>
                    <Published pub={work} c={c} member={member} />
                    {member && active && (
                      <Decision
                        c={c}
                        pub={work}
                        perform={perform}
                        busy={busy}
                      />
                    )}
                  </>
                )}
                {!member && (
                  <>
                    <div className="cc-actions mb-4">
                      {canEdit && (
                        <button onClick={() => begin("EVIDENCE")}>
                          <Plus size={16} />
                          {t(
                            "أضف معلومة بمصدرها",
                            "Add information with its source",
                          )}
                        </button>
                      )}
                      <button onClick={() => onHelp("working-understanding")}>
                        <BookOpen size={16} />
                        {t(
                          "كيف أبني فهمًا للموقف؟",
                          "How do I build a working understanding?",
                        )}
                      </button>
                    </div>
                    {items
                      .filter((i) => i.kind === "EVIDENCE")
                      .map((i) => (
                        <ItemCard
                          key={i.id}
                          i={i}
                          c={c}
                          edit={openItem}
                          canEdit={canEdit}
                        />
                      ))}
                  </>
                )}
                {member &&
                  c.publications
                    .filter((p) => p.kind === "EVIDENCE")
                    .map((p) => (
                      <Published key={p.id} pub={p} c={c} member={member} />
                    ))}
              </div>
              <div hidden={area !== "sessions"}>
                {!member && (
                  <>
                    <div className="cc-actions mb-4">
                      {canEdit && (
                        <button
                          className="primary"
                          onClick={() => begin("SESSION")}
                        >
                          <Plus size={16} />
                          {t("حضّر جلسة", "Prepare a session")}
                        </button>
                      )}
                      <button onClick={() => onHelp("understand-request")}>
                        {t(
                          "مساعدة التحضير وفهم الطلب",
                          "Preparation & intake guidance",
                        )}
                      </button>
                    </div>
                    {items
                      .filter((i) => i.kind === "SESSION")
                      .map((i) => (
                        <ItemCard
                          key={i.id}
                          i={i}
                          c={c}
                          edit={openItem}
                          canEdit={canEdit}
                        />
                      ))}
                  </>
                )}
                {(member
                  ? c.publications.filter((p) => p.kind === "SESSION")
                  : []
                ).map((p) => (
                  <Published key={p.id} pub={p} c={c} member={member} />
                ))}
                {!c.publications.some((p) => p.kind === "SESSION") &&
                  !items.some((i) => i.kind === "SESSION") && (
                    <Empty>
                      {t(
                        "لا توجد جلسة بعد. الجلسة لها هدف ومواد وتحضير، وقد يستكملها عمل مكتوب.",
                        "No session yet. Sessions have a purpose, preparation and materials, and may continue through written work.",
                      )}
                    </Empty>
                  )}
              </div>
              <div hidden={area !== "activities"}>
                {!member && (
                  <>
                    <h2>
                      {t(
                        "اختيار مساعدة تناسب السؤال",
                        "Choose support that fits the question",
                      )}
                    </h2>
                    <p>
                      {t(
                        "اختر نشاطًا لسبب، وعدّل أسئلته للشخص، ثم انشره صراحة. لا نعتبر إكماله دليل نجاح بمفرده.",
                        "Choose an activity for a reason, adapt its prompts, then explicitly publish it. Completion alone does not establish benefit.",
                      )}
                    </p>
                    <div className="cc-rail">
                      {catalog?.activities.map((a) => (
                        <button
                          disabled={!canEdit}
                          key={a.id}
                          onClick={() => begin("ACTIVITY", a)}
                        >
                          {locale === "ar" ? a.title.ar : a.title.en}
                        </button>
                      ))}
                    </div>
                    {items
                      .filter((i) => i.kind === "ACTIVITY")
                      .map((i) => (
                        <ItemCard
                          key={i.id}
                          i={i}
                          c={c}
                          edit={openItem}
                          canEdit={canEdit}
                        />
                      ))}
                  </>
                )}
                {c.publications
                  .filter(
                    (p) =>
                      p.kind === "ACTIVITY" &&
                      !c.publications.some(
                        (x) => x.itemId === p.itemId && x.revision > p.revision,
                      ),
                  )
                  .map((p) => (
                    <article key={p.id} className="cc-card">
                      <Published pub={p} c={c} member={member} />
                      {member && (
                        <ResponseEditor
                          key={p.id}
                          c={c}
                          pub={p}
                          perform={perform}
                          busy={busy}
                          active={active}
                        />
                      )}
                      <h3>
                        {t(
                          "التسليمات والمراجعات لهذا النشاط",
                          "Submissions & reviews for this activity",
                        )}
                      </h3>
                      {c.submissions
                        .filter((s) => s.activityId === p.itemId)
                        .map((s) => (
                          <SubmissionView
                            key={s.id}
                            c={c}
                            s={s}
                            member={member}
                            perform={perform}
                            busy={busy}
                            canEdit={canEdit}
                          />
                        ))}
                      {!c.submissions.some(
                        (s) => s.activityId === p.itemId,
                      ) && (
                        <p className="muted">
                          {t(
                            "لا يوجد تسليم بعد. مسودة الشخص لا تظهر للمستشار.",
                            "No submission yet. The person’s draft is private to them.",
                          )}
                        </p>
                      )}
                    </article>
                  ))}
              </div>
              <div hidden={area !== "recommendations"}>
                {!member && (
                  <div className="cc-actions mb-4">
                    {canEdit && (
                      <>
                        <button
                          className="primary"
                          onClick={() => begin("RECOMMENDATION")}
                        >
                          {t(
                            "صغ توصية مبررة",
                            "Draft a reasoned recommendation",
                          )}
                        </button>
                        <button
                          onClick={() =>
                            openItem(items.find((i) => i.kind === "WORK")!)
                          }
                        >
                          {t(
                            "راجع الاستفادة وخطوات المستقبل",
                            "Review benefit & future steps",
                          )}
                        </button>
                      </>
                    )}
                    <button onClick={() => onHelp("recommendation-action")}>
                      {t(
                        "مساعدة التوصية والمفاضلات",
                        "Recommendation & trade-off guidance",
                      )}
                    </button>
                  </div>
                )}
                {!member &&
                  items
                    .filter((i) => i.kind === "RECOMMENDATION")
                    .map((i) => (
                      <ItemCard
                        key={i.id}
                        i={i}
                        c={c}
                        edit={openItem}
                        canEdit={canEdit}
                      />
                    ))}
                {c.publications
                  .filter((p) => p.kind === "RECOMMENDATION")
                  .map((p) => (
                    <div key={p.id}>
                      <Published pub={p} c={c} member={member} />
                      {member && active && (
                        <Decision c={c} pub={p} perform={perform} busy={busy} />
                      )}
                      <DecisionHistory c={c} pubId={p.id} />
                    </div>
                  ))}
                {work?.content.beforeNow && (
                  <div className="cc-card soft">
                    <h3>{t("مراجعة الاستفادة", "Outcome review")}</h3>
                    <p>{work.content.beforeNow}</p>
                    <h3>{t("خطوات المستقبل", "Future steps")}</h3>
                    <p>{work.content.futureSteps}</p>
                  </div>
                )}
                {canEdit && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "هل راجعت الفائدة والخلاصة مع الشخص ونشرت خطوات المستقبل؟",
                            "Have you reviewed benefit with the person and published a closing summary and future steps?",
                          ),
                        )
                      )
                        void perform(() =>
                          write(
                            `/admin/career-consulting/cases/${c.id}/state`,
                            { action: "COMPLETE" },
                          ),
                        );
                    }}
                  >
                    {t(
                      "إنهاء الاستشارة بعد نشر الخلاصة",
                      "Close consultation after publishing the outcome review",
                    )}
                  </button>
                )}
              </div>
              <div hidden={area !== "discussion"}>
                <Discussion
                  c={c}
                  member={member}
                  perform={perform}
                  busy={busy}
                  active={member ? active : canEdit}
                />
                <Documents
                  c={c}
                  member={member}
                  perform={perform}
                  busy={busy}
                  active={member ? active : canEdit}
                />
              </div>
              <div hidden={area !== "access"}>
                <Access
                  c={c}
                  member={member}
                  perform={perform}
                  busy={busy}
                  active={active}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function ItemCard({
  i,
  c,
  edit,
  canEdit,
}: {
  i: Item;
  c: CaseData;
  edit: (i: Item) => void;
  canEdit: boolean;
}) {
  const { t, label, locale } = useText();
  const pub = c.publications.filter((p) => p.itemId === i.id).at(-1);
  return (
    <article className="cc-card">
      <header>
        <div>
          <span className="cc-pill">{label(i.kind)}</span>
          <h3>{i.title}</h3>
          <small>
            {t("مسودة", "Draft")} {i.revision} · {when(i.updatedAt, locale)}
          </small>
        </div>
        <button onClick={() => edit(i)}>
          {canEdit
            ? t("افتح مادة العمل", "Open work material")
            : t("اقرأ المسودة", "Read draft")}
        </button>
      </header>
      <p>{i.draft.goal || i.draft.advice || i.draft.body}</p>
      <p className="muted">
        {pub
          ? t("آخر نسخة منشورة: ", "Last published version: ") + pub.revision
          : t(
              "خاصة بالمستشار — لم تنشر للشخص.",
              "Private to the consultant · not published to the person.",
            )}
        {pub &&
          pub.revision < i.revision &&
          " · " + t("توجد تعديلات غير منشورة", "Unpublished changes")}
      </p>
    </article>
  );
}

export function Agreement({
  c,
  perform,
  busy,
}: {
  c: CaseData;
  perform: Perform;
  busy: boolean;
}) {
  const { t } = useText();
  const [accepted, setAccepted] = useState(false);
  return (
    <section className="cc-card">
      <Handshake aria-hidden />
      <h2>{t("دعوة لاستشارة مهنية", "Career consultation invitation")}</h2>
      <p>{c.purpose}</p>
      <ul className="cc-list">
        <li>
          {t(
            "نستكشف وضعك وأهدافك، وقد نجمع جلسة مباشرة وعملًا مكتوبًا. القرار لك، ولا نضمن وظيفة.",
            "We explore your situation and goals through sessions and written work. Decisions remain yours; employment is not guaranteed.",
          )}
        </li>
        <li>
          {t(
            "هذه موافقة على تقديم خدمة استشارة، وليست موافقة على البحث. يمكنك طلب تعديل الهدف أو سحب موافقتك.",
            "This is a service agreement, not research consent. You can request a goal change or withdraw consent.",
          )}
        </li>
        <li>
          {t(
            "يرى المستشار والمسؤولون المعيّنون للحالة المواد المشتركة. مسودات إجاباتك خاصة بك حتى التسليم.",
            "The consultant and assigned case administrators can see shared materials. Your response drafts stay private until you submit them.",
          )}
        </li>
        <li>
          {t(
            "تظل السجلات خلال مدة الاحتفاظ الموضحة، ثم تحذف مع مرفقاتها. لا تمدد المدة تلقائيًا عند سحب الموافقة.",
            "Records remain during the stated retention period, then are deleted with attachments. Withdrawal does not extend that period.",
          )}
        </li>
        <li>
          {t(
            "ربط CV أو بيانات البرنامج ليس تلقائيًا. الاستشارة لا تفتح تقارير البرنامج أو تسجّل إنجاز مهامه.",
            "Programme and CV sharing are not automatic. Consulting does not unlock programme reports or complete its tasks.",
          )}
        </li>
      </ul>
      <p>
        <b>
          {t("الاحتفاظ حتى", "Retention until")}:{" "}
          {new Date(c.retentionUntil).toLocaleDateString()}
        </b>
      </p>
      <label className="cc-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          {t(
            "قرأت النطاق والخصوصية ومدة الاحتفاظ وأوافق على خدمة الاستشارة.",
            "I have read the scope, privacy and retention terms and accept the consultation service.",
          )}
        </span>
      </label>
      <div className="cc-actions">
        <button
          className="primary"
          disabled={busy || !accepted}
          onClick={() =>
            void perform(() =>
              write(`/career-consulting/cases/${c.id}/accept`, {
                confirmed: true,
                agreementVersion: c.agreementVersion,
              }),
            )
          }
        >
          {t("أوافق وأبدأ", "Accept & start")}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                t(
                  "رفض الدعوة وسحب الموافقة على العمل؟",
                  "Decline the invitation and stop new work?",
                ),
              )
            )
              void perform(() =>
                write(`/career-consulting/cases/${c.id}/withdraw`),
              );
          }}
        >
          {t("لا أرغب في البدء", "I do not wish to start")}
        </button>
      </div>
    </section>
  );
}
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
