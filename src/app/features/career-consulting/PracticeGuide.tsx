import {
useState
} from "react";
import {
type Catalog
} from "./api";
import "./consulting.css";
import {
useText
} from "./shared";
export function LessonView({ catalog, id }: { catalog: Catalog; id: string }) {
  const { t, tr } = useText();
  const l = catalog.lessons.find((x) => x.id === id);
  if (!l) return null;
  return (
    <article>
      <h2>{tr(l.title)}</h2>
      <p>
        <b>{tr(l.goal)}</b>
      </p>
      {l.body.map((x, i) => (
        <p key={i}>{tr(x)}</p>
      ))}
      <div className="cc-card soft">
        <h3>{t("مثال حالة", "Case example")}</h3>
        <p>{tr(l.example)}</p>
      </div>
      <h3>{t("جرّب الممارسة", "Practice exercise")}</h3>
      <ol className="cc-list">
        {l.exercise.map((x, i) => (
          <li key={i}>{tr(x)}</li>
        ))}
      </ol>
      <h3>{t("أخطاء شائعة", "Common pitfalls")}</h3>
      <ul className="cc-list">
        {l.pitfalls.map((x, i) => (
          <li key={i}>{tr(x)}</li>
        ))}
      </ul>
      <Sources catalog={catalog} ids={l.sources} />
    </article>
  );
}

export function Sources({ catalog, ids }: { catalog: Catalog; ids: string[] }) {
  const { t, tr } = useText();
  return (
    <details>
      <summary>{t("المراجع وحدود الاستخدام", "Sources & limits")}</summary>
      {ids.map((id) => {
        const s = catalog.sources.find((x) => x.id === id);
        return s ? (
          <p key={id}>
            <b>{s.title}</b>
            <br />
            {s.location}
            {s.note && (
              <>
                <br />
                {tr(s.note)}
              </>
            )}
          </p>
        ) : null;
      })}
    </details>
  );
}

export function Learning({
  catalog,
  mode,
  onHelp,
}: {
  catalog: Catalog;
  mode: string;
  onHelp: (id: string) => void;
}) {
  const { t, tr } = useText();
  const [lesson, setLesson] = useState(catalog.lessons[0]?.id ?? "");
  const [demo, setDemo] = useState(false);
  if (mode === "reference")
    return (
      <>
        <div className="cc-notice">
          {t(
            "أنشطة نوعية للتفكير وجمع الأدلة، وليست اختبارات مقننة أو تشخيصًا. عدّل السؤال بحسب الهدف والسياق. معلومات سوق العمل تحتاج دولة وتاريخ تحقق ومصدرًا حديثًا.",
            "Qualitative activities for reflection and evidence gathering, not standardized tests or diagnosis. Adapt prompts to the goal and context. Labour-market information requires a country, verification date and current source.",
          )}
        </div>
        <div className="cc-grid">
          {catalog.activities.map((a) => (
            <article key={a.id} className="cc-card">
              <h2>{tr(a.title)}</h2>
              <p>{tr(a.purpose)}</p>
              <h3>{t("متى أستخدمه؟", "When to use")}</h3>
              <p>{tr(a.indications)}</p>
              <p>{tr(a.avoid)}</p>
              <details>
                <summary>
                  {t("أسئلة قابلة للتعديل", "Adaptable prompts")}
                </summary>
                {a.fields.map((f) => (
                  <p key={f.key}>{tr(f.label)}</p>
                ))}
              </details>
              <h3>{t("المخرج المنتظر", "Expected output")}</h3>
              <p>{tr(a.expectedOutput)}</p>
              <details>
                <summary>
                  {t("كيف أراجع فائدته؟", "How to review its benefit")}
                </summary>
                <ul className="cc-list">
                  {a.review.map((x, i) => (
                    <li key={i}>{tr(x)}</li>
                  ))}
                </ul>
              </details>
              <Sources catalog={catalog} ids={a.sources} />
            </article>
          ))}
        </div>
      </>
    );
  return (
    <>
      <div className="cc-notice">
        {t(
          "دليل للمستشار أثناء العمل. الاتجاه المهني ليس درجة ملاءمة، والقرار يظل للشخص. هذه البداية لا تشمل اختبارات مقننة أو تشخيصًا أو علاجًا.",
          "A working guide for the consultant. Career direction is not a fit score; decisions remain with the person. This release does not include standardized testing, diagnosis or therapy.",
        )}
      </div>
      <div className="cc-rail">
        {catalog.lessons.map((l, i) => (
          <button
            key={l.id}
            aria-pressed={lesson === l.id}
            onClick={() => setLesson(l.id)}
          >
            {i + 1}. {tr(l.title)}
          </button>
        ))}
      </div>
      <div className="cc-card">
        <LessonView catalog={catalog} id={lesson} />
      </div>
      <div className="cc-card soft">
        <h2>
          {t(
            "حالتان تدريبيتان — بلا بيانات حقيقية",
            "Two training cases · no real participant data",
          )}
        </h2>
        <p>
          {t(
            "اتجاه غير واضح؛ أو هدف واضح وبحث لا ينجح. جرّب التحضير والجلسة والنشاط والتسليم والتوصية من منظور المستشار والشخص. هذه المحاكاة مستقلة ولا تنشئ حسابات أو حالات على الخادم.",
            "An unclear direction, or a clear goal with an unsuccessful search. Try preparation, a session, activity, submission and recommendation from both roles. This isolated simulation creates no accounts or server cases.",
          )}
        </p>
        <button onClick={() => setDemo(!demo)}>
          {demo
            ? t("أغلق المحاكاة", "Close simulation")
            : t("افتح محاكاة الحالتين", "Open two-case simulation")}
        </button>
        {demo && (
          <iframe
            title={t(
              "محاكاة استشارة ببيانات تدريبية",
              "Synthetic consultation simulation",
            )}
            src="/consulting-training/index.html"
            style={{
              width: "100%",
              height: 900,
              border: "1px solid #cbd8cf",
              marginTop: 15,
              borderRadius: 12,
            }}
          />
        )}
      </div>
    </>
  );
}
