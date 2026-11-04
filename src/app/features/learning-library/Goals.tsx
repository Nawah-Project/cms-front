import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Plus, Target, CheckCircle2 } from "lucide-react";
import { useLibrary } from "./LibraryContext";
import type { Goal } from "./domain/types";
import { coverage, uid } from "./domain/model.mjs";
import { Dialog, Empty, readerUrl, useWords } from "./ui";
import { FounderLink } from "./FounderLink";
export function GoalsView() {
  const { document } = useLibrary(),
    t = useWords(),
    [edit, setEdit] = useState<Partial<Goal> | null>(null);
  const stages = {
    reading: t("أقرأ لأفهم", "Reading to understand"),
    applying: t("أجرّب التطبيق", "Applying"),
    reviewing: t("أراجع النتيجة", "Reviewing"),
    done: t("مراجعة مكتملة", "Review complete"),
  };
  return (
    <>
      <div className="ll-toolbar">
        <p>
          {t(
            "ابدأ بسؤال، ثم اختبر ما تغيّر في فهمك أو ممارستك.",
            "Start with a question, then examine what changed in your understanding or practice.",
          )}
        </p>
        <button className="ll-button primary" onClick={() => setEdit({})}>
          <Plus size={16} />
          {t("هدف قراءة وتطبيق", "Reading & application goal")}
        </button>
      </div>
      {document.goals.length ? (
        <div className="ll-notes-grid">
          {document.goals.map((goal) => {
            const edition = document.editions.find(
                (x) => x.id === goal.editionId,
              ),
              stats = edition
                ? coverage(document, edition.id, goal.ranges)
                : null;
            return (
              <article className="ll-goal-card" key={goal.id}>
                <small>{stages[goal.stage]}</small>
                <h3>{goal.title}</h3>
                <p>{goal.question}</p>
                {stats && (
                  <>
                    <div className="ll-progress">
                      <i style={{ width: stats.percent + "%" }} />
                    </div>
                    <small>
                      {stats.percent}%{" "}
                      {t(
                        "من نطاق القراءة المطلوب، وليست درجة تمكن",
                        "of the intended reading, not a mastery score",
                      )}
                    </small>
                  </>
                )}
                <div className="ll-goal-evidence">
                  <span>
                    {goal.summary ? "✓" : "○"} {t("خلاصة", "Synthesis")}
                  </span>
                  <span>
                    {goal.application ? "✓" : "○"} {t("تطبيق", "Application")}
                  </span>
                  <span>
                    {goal.review ? "✓" : "○"} {t("مراجعة", "Review")}
                  </span>
                </div>
                <footer>
                  <FounderLink goal={goal} />
                  <button className="ll-button" onClick={() => setEdit(goal)}>
                    {t("افتح العمل والمراجعة", "Open work & review")}
                  </button>
                  {edition && (
                    <Link
                      className="ll-button"
                      to={readerUrl(
                        edition.bookId,
                        edition.id,
                        goal.ranges[0]?.start,
                      )}
                    >
                      {t("افتح المرجع", "Open reading")}
                    </Link>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={t(
            "ماذا تريد أن تفهم أو تغيّر؟",
            "What do you want to understand or change?",
          )}
        >
          {t(
            "اربط قراءة محددة بسؤال، ثم دوّن خلاصة وتجربة تطبيق ومراجعة.",
            "Link specific reading to a question, then record synthesis, application and review.",
          )}
        </Empty>
      )}
      {edit && <GoalEditor initial={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function GoalEditor({
  initial,
  onClose,
}: {
  initial: Partial<Goal>;
  onClose(): void;
}) {
  const { document, commit, draft, setDraft } = useLibrary(),
    t = useWords(),
    [editionId, setEdition] = useState(initial.editionId || ""),
    [saving, setSaving] = useState(false),
    edition = document.editions.find((x) => x.id === editionId);
  const close = () => {
    if (
      !draft ||
      window.confirm(t("تجاهل مسودة الهدف؟", "Discard goal draft?"))
    ) {
      setDraft(false);
      onClose();
    }
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      goal: Goal = {
        id: initial.id || uid(),
        title: String(f.get("title")),
        question: String(f.get("question")),
        editionId: editionId || undefined,
        ranges: editionId
          ? [{ start: Number(f.get("start")), end: Number(f.get("end")) }]
          : [],
        summary: String(f.get("summary")),
        application: String(f.get("application")),
        review: String(f.get("review")),
        reviewAt: String(f.get("reviewAt")),
        founderLink: String(f.get("founderLink")),
        stage: String(f.get("stage")) as Goal["stage"],
      };
    setSaving(true);
    if (await commit("goal", { goal })) {
      setDraft(false);
      onClose();
    }
    setSaving(false);
  }
  return (
    <Dialog
      title={t(
        "من القراءة إلى تجربة قابلة للمراجعة",
        "From reading to a reviewable practice",
      )}
      onClose={close}
    >
      <form
        className="ll-form"
        onSubmit={submit}
        onChange={() => setDraft(true)}
      >
        <label>
          {t("الهدف", "Goal")}
          <input name="title" required defaultValue={initial.title || ""} />
        </label>
        <label>
          {t("السؤال الذي أريد الإجابة عنه", "The question I want to answer")}
          <textarea
            name="question"
            required
            defaultValue={initial.question || ""}
          />
        </label>
        <label>
          {t("مرجع القراءة — اختياري", "Reading source — optional")}
          <select
            value={editionId}
            onChange={(e) => setEdition(e.target.value)}
          >
            <option value="">
              {t("دون مرجع محدد بعد", "No source selected yet")}
            </option>
            {document.editions.map((e) => (
              <option key={e.id} value={e.id}>
                {document.books.find((b) => b.id === e.bookId)?.title +
                  " · " +
                  e.label}
              </option>
            ))}
          </select>
        </label>
        {edition && (
          <div className="ll-two" key={edition.id}>
            <label>
              {t("من صفحة PDF", "From PDF page")}
              <input
                type="number"
                name="start"
                min={1}
                max={edition.pageCount}
                required
                defaultValue={
                  initial.editionId === edition.id
                    ? initial.ranges?.[0]?.start || 1
                    : 1
                }
              />
            </label>
            <label>
              {t("إلى صفحة PDF", "To PDF page")}
              <input
                type="number"
                name="end"
                min={1}
                max={edition.pageCount}
                required
                defaultValue={
                  initial.editionId === edition.id
                    ? initial.ranges?.[0]?.end || edition.pageCount
                    : edition.pageCount
                }
              />
            </label>
          </div>
        )}
        <label>
          {t(
            "خلاصتي: ماذا فهمت؟ وما الذي لم يُحسم؟",
            "Synthesis: what did I understand, and what remains uncertain?",
          )}
          <textarea name="summary" defaultValue={initial.summary || ""} />
        </label>
        <label>
          {t(
            "التطبيق: ماذا جرّبت؟ وما الدليل؟",
            "Application: what did I try, and what is the evidence?",
          )}
          <textarea
            name="application"
            defaultValue={initial.application || ""}
          />
        </label>
        <label>
          {t(
            "المراجعة: ماذا حدث؟ وما الخطوة التالية؟",
            "Review: what happened, and what comes next?",
          )}
          <textarea name="review" defaultValue={initial.review || ""} />
        </label>
        <div className="ll-two">
          <label>
            {t("موعد المراجعة", "Review date")}
            <input
              name="reviewAt"
              type="date"
              defaultValue={initial.reviewAt || ""}
            />
          </label>
          <label>
            {t("مرحلة العمل", "Work stage")}
            <select name="stage" defaultValue={initial.stage || "reading"}>
              <option value="reading">{t("قراءة", "Reading")}</option>
              <option value="applying">{t("تطبيق", "Applying")}</option>
              <option value="reviewing">{t("مراجعة", "Reviewing")}</option>
              <option value="done">
                {t("مراجعة مكتملة", "Review complete")}
              </option>
            </select>
          </label>
        </div>
        <label>
          {t(
            "رابط مهمة المؤسس الموجودة — اختياري",
            "Existing Founder task link — optional",
          )}
          <input
            name="founderLink"
            placeholder="/admin/founder-workspace/today"
            defaultValue={initial.founderLink || ""}
          />
        </label>
        <p className="ll-muted">
          {t(
            "حفظ الرابط لا ينشئ أو ينجز مهمة. الربط والإنشاء الصريح من بطاقة الهدف.",
            "Saving a reference does not create or complete a task. Use the goal card to explicitly link or create one.",
          )}
        </p>
        <button className="ll-button primary" disabled={saving}>
          {t("حفظ الهدف والمراجعة", "Save goal & review")}
        </button>
      </form>
    </Dialog>
  );
}
