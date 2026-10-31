import { useId } from "react";
import {
  BookOpen,
  Compass,
  Search,
  NotebookPen,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import "./ux-research-guide.css";

type GuidePart = {
  id: string;
  title: string;
  purpose: string;
  use: string;
  limit?: string;
};
export function UxResearchGuide({ onClose }: { onClose: () => void }) {
  const { locale } = useI18n(),
    ar = locale === "ar",
    prefix = useId();
  const text = (a: string, e: string) => (ar ? a : e);
  const parts: GuidePart[] = [
    {
      id: "scope",
      title: text(
        "عدسة البحث: مين؟ وفي أي فترة؟",
        "Research lens: who and when?",
      ),
      purpose: text(
        "تمنع المقارنة بين مجموعات أو فترات مختلفة دون الانتباه لذلك.",
        "Keeps the population and period clear before interpreting a comparison.",
      ),
      use: text(
        "اختَر الجميع أو مجموعة، ثم باحثًا لو أردت فحص حالة فردية. فترة 7 أو 30 أو 90 يومًا تخص سجل الانتقالات. حد غياب العمل 3 أو 7 أو 14 يومًا يرتب أولوية الفحص.",
        "Choose all members, a cohort, or one member. The 7/30/90-day period applies to recorded transitions. The 3/7/14-day inactivity threshold controls investigation priority.",
      ),
      limit: text(
        "المواضع الحالية والإكمال المحفوظ لا يختفيان عند تغيير فترة السجل. غياب العمل المسجل ليس إثباتًا أن الشخص انسحب.",
        "Current positions and saved completions remain visible when the history period changes. No recorded work does not establish abandonment.",
      ),
    },
    {
      id: "summary",
      title: text(
        "ملخص الحالات: من يحتاج المتابعة؟",
        "Summary: who needs follow-up?",
      ),
      purpose: text(
        "يفصل العمل غير المكتمل عن الانتظار الذي تفرضه مواعيد الرحلة.",
        "Separates unfinished work from a wait imposed by the journey schedule.",
      ),
      use: text(
        "باحث في النطاق هو حجم الجمهور الحالي. أولوية الفحص تعني غياب عمل مرصود لحد المدة المختارة. انتظار الموعد يعني أن العمل اكتمل والموعد التالي لم يحن. تحديث السيرة يبين من يحتاج تنفيذ شرط الإرشاد للاستمرار.",
        "Members in scope is the selected population. Investigation priority means the configured threshold without recorded work. Scheduled waiting means work is complete but the next date has not arrived. CV guidance identifies the prerequisite for continuing.",
      ),
      limit: text(
        "راجع السبب في قائمة الفحص قبل التواصل أو تغيير التصميم. لا تعامل كل من بقي في محطة كحالة تعثّر.",
        "Inspect the prerequisite before contacting a member or changing a design. Remaining at a station does not automatically indicate friction.",
      ),
    },
    {
      id: "map",
      title: text(
        "المخطط الأسبوعي: كيف بُنيت الرحلة؟",
        "Weekly blueprint: how the journey is structured",
      ),
      purpose: text(
        "يربط متطلبات العمل بالمحطة والإرشاد والتقييم، حتى تراجع التجربة في سياقها.",
        "Connects required work, stations, guidance and reviews so the experience can be examined in context.",
      ),
      use: text(
        "ابدأ بالمهمة صفر، ثم أربعة أسابيع؛ بكل أسبوع خمس مهام ومراجعة، وينتهي الرابع بالتقرير النهائي. الصفوف المنفصلة تعرض المخصص والمحتوى والتواصل، وتفرعات الإرشادات تظهر عند نقاط إتاحتها. الأرقام داخل بطاقات العمل هي المتطلبات، وشارة الأشخاص هي الموجودون الآن.",
        "Start at task zero, followed by four weeks with five tasks and a review; week four ends with the final report. Separate rows show tailored applications, publishing and outreach. Guidance branches sit at their unlock stations. Work-card numbers are requirements; people badges are current occupants.",
      ),
      limit: text(
        "الأخضر يوضح المواضع المأهولة، والأزرق للمخصص، والنحاسي للمحتوى، والأصفر يميز الإرشاد داخل المخطط. اختيار طبقة الوصول والإكمال أو أولوية الفحص يغير طريقة قراءة المحطات.",
        "Green marks occupied stations, blue tailored work, copper publishing, and gold guidance within the blueprint. Reach/completion and investigation overlays provide different readings of the same stations.",
      ),
    },
    {
      id: "navigation",
      title: text(
        "التنقل والتكبير وفحص المحطة",
        "Navigate, zoom and inspect a station",
      ),
      purpose: text(
        "يسمح برؤية المسار العام ثم فحص التفاصيل دون تحويل الرحلة إلى بطاقات صغيرة غير مقروءة.",
        "Supports an overview and detailed inspection without shrinking the entire journey into unreadable tiles.",
      ),
      use: text(
        "العجلة وحدها تمرّر الصفحة. اضغط الزر الأيمن مطولًا مع العجلة للتكبير؛ اسحب المساحة الخالية للتنقل. يمكنك استخدام الخريطة المصغرة، أو الأزرار، أو أسهم الكيبورد و + و − و 0. عرض الأسابيع يعطي ملخصًا مقروءًا، وافتح أسبوعًا لعرض طبقاته. اضغط محطة لفتح نافذة بمتطلباتها وأعضائها والأدلة.",
        "Wheel alone scrolls the page. Hold the right button and wheel to zoom; drag blank canvas to pan. Use the minimap, buttons, arrow keys, +, − or 0 as alternatives. Week Overview stays readable; open a week for its layers. Select a station for a central dialog with requirements, members and evidence.",
      ),
      limit: text(
        "تتبع المسار يركز على باحث واحد. فتح ملفه أو إعداد توجيه لا يغيّر تقدمه بمجرد العرض.",
        "Tracing focuses the map on one member. Viewing their profile or preparing guidance does not itself advance their journey.",
      ),
    },
    {
      id: "stations",
      title: text(
        "جدول المحطات: أين تبدأ الفحص؟",
        "Station table: where to investigate first",
      ),
      purpose: text(
        "يحول توزيع الأشخاص إلى قائمة يمكن ترتيبها والتحقق منها.",
        "Turns the distribution of members into an inspectable investigation order.",
      ),
      use: text(
        "قارن الموجودين الآن، وأولوية الفحص، وانتظار الموعد، وشرط السيرة أو الجولة. افتح المحطة لرؤية الحالات التي أنتجت الرقم. الوصول والإكمال حالتان محفوظتان، بينما وسيط زمن العبور مبني على الانتقالات المؤرخة فقط.",
        "Compare current occupants, investigation priority, scheduled waiting, and CV or guide prerequisites. Open a station to inspect the cases behind its total. Reach/completion use saved state; median dwell uses dated transitions.",
      ),
      limit: text(
        "قيمة زمن بلا عينة كافية تظهر —. الوقت يتضمن الانتظار ولا يعني وقت عمل نشط داخل الموقع.",
        "Unavailable timing appears as a dash. Dwell includes scheduled waiting and is not active time spent working in the product.",
      ),
    },
    {
      id: "transitions",
      title: text(
        "سجل الانتقالات: هل الرحلة تتحرك؟",
        "Transition history: is the journey moving?",
      ),
      purpose: text(
        "يوضح الحركة بين المحطات خلال الفترة، بدل الاكتفاء بصورة ثابتة للمواضع.",
        "Shows movement between stations during the chosen period rather than only a static distribution.",
      ),
      use: text(
        "اقرأ عدد الانتقالات اليومي وعدد الباحثين الذين تحركوا. قد يسجل شخص واحد أكثر من انتقال. بيانات الرسم متاحة كجدول؛ غيّر الفترة لرؤية الاتجاه، ثم افحص المحطات أو الباحثين لفهم ما حدث.",
        "Read daily transitions and distinct members who moved. One person can produce multiple transitions. Open the chart table for exact values; change the period, then inspect stations or members for context.",
      ),
      limit: text(
        "لا نعيد بناء تواريخ للحسابات القديمة من التخمين؛ قد توجد إكمالات محفوظة دون سجل زمني، وهذا يختلف عن عدم حدوث تقدم.",
        "Legacy completion dates are not reconstructed by guesswork. Saved completions can exist without dated history; missing history is different from no progress.",
      ),
    },
    {
      id: "guidance",
      title: text(
        "متابعة الإرشادات: الإتاحة، القراءة، والعمل اللاحق",
        "Guidance: access, reading and subsequent work",
      ),
      purpose: text(
        "يساعدك تحدد هل تحتاج فحص وصول الإرشاد، أو وضوحه، أو تطبيقه في العمل.",
        "Helps distinguish an access problem, a reading problem, and a question about subsequent work.",
      ),
      use: text(
        "أتيح لهم: من وصلوا لشرط فتح الإرشاد. قرأوا: من لديهم تأكيد قراءة محفوظ. نسبة القراءة = القراء ÷ المتاح لهم. العمل اللاحق يُقاس للسيرة والمنشورات والتواصل حين توجد قراءة مؤرخة وفعل بعدها. زر عرض من لم يقرأ ينقلك لقائمة الحالات لتفحصها.",
        "Have access counts members who reached the unlock condition. Read counts saved reading confirmations. Reading rate is readers divided by members with access. Later CV uploads, posts and outreach require a dated read followed by work. View unread members opens the relevant investigation queue.",
      ),
      limit: text(
        "القراءة ليست دليل فهم أو تطبيق. الرمز — يعني غياب القياس؛ صفر يعني أن الفعل لم يُرصد في العينة المؤرخة المتاحة. الإرشادات الأخرى تحتاج مراجعة العمل أو مقابلة مع الباحث، وليس استنتاج تطبيقها من ضغطة زر.",
        "Reading does not prove understanding or application. A dash means measurement is unavailable; zero means no action was observed in the available dated sample. Other guides require work review or a member conversation rather than inferring application from a click.",
      ),
    },
    {
      id: "queue",
      title: text(
        "قائمة الفحص: من الرقم إلى الحالة",
        "Investigation queue: from a number to a case",
      ),
      purpose: text(
        "تساعدك تراجع الدليل قبل اتخاذ إجراء يخص شخصًا أو تغييرًا في المنتج.",
        "Makes it possible to inspect evidence before taking a member or product action.",
      ),
      use: text(
        "ابحث باسم الباحث أو استخدم مرشحات الانتظار والسيرة والجولة والجاهزين أو غير المقروء. اقرأ المتطلب الناقص وآخر عمل مرصود. تتبع المسار يعرض حالة فردية؛ ملف العضو يجمع التفاصيل، وإعداد توجيه يفتح نموذجًا للمراجعة قبل الإرسال.",
        "Search by name or filter scheduled waiting, CV, guides, readiness or unread guidance. Inspect the missing prerequisite and last recorded work. Trace opens an individual view; Member Profile collects details; Draft Guidance opens a form for review before sending.",
      ),
      limit: text(
        "التصنيف يرتب الأسئلة التي تحتاج فحصًا؛ لا يشخص الدافع أو السبب النفسي. إعداد توجيه لا يرسله تلقائيًا.",
        "Classification prioritizes questions to investigate; it does not diagnose motivation or psychological causes. Preparing guidance does not send it automatically.",
      ),
    },
    {
      id: "notebook",
      title: text(
        "دفتر الأبحاث: ملاحظة لها دليل ومسؤول",
        "Research notebook: evidence and ownership",
      ),
      purpose: text(
        "يحفظ ما لاحظته، ومن سيتحقق منه، والخطوة التالية حتى لا ينتهي البحث عند مشاهدة الرسم.",
        "Retains the finding, owner and next validation step so research does not end at looking at a chart.",
      ),
      use: text(
        "حدد محطة وسجّل سؤالًا أو احتكاكًا محتملًا أو فرصة. افصل المعلومة عن تفسيرك، وحدد مسؤولًا وخطوة تحقق. تُحفظ لقطة المقاييس وقت التدوين. انتقل من مفتوحة إلى قيد التحقق ثم محلولة بعد المراجعة، ويمكن فتح الدليل المحفوظ للمقارنة.",
        "Choose a station and record a question, possible friction or opportunity. Separate observation from interpretation, assign an owner and define validation. A metric snapshot is saved at creation. Move from Open to Validating to Resolved after review, and inspect the retained evidence for comparison.",
      ),
      limit: text(
        "الدليل المحفوظ لا يتغير مع الأرقام الحالية. تغيير حالة الملاحظة لا يثبت نجاح التحسين، ولا يرسل إشعارًا للباحث أو يغير رحلته.",
        "Captured evidence does not change with current metrics. Changing a finding's status does not establish improvement, send a member notification or alter their journey.",
      ),
    },
    {
      id: "individual",
      title: text(
        "المسار الفردي وجودة البيانات",
        "Individual history and data quality",
      ),
      purpose: text(
        "يعيد الأرقام إلى تسلسل مفهوم ويكشف ما لا يمكن قياسه بعد.",
        "Adds sequence and context to the totals while making gaps in measurement visible.",
      ),
      use: text(
        "اختَر باحثًا لعرض المحطة الحالية والإكمال المحفوظ، والانتقالات والقراءات والعمل المؤرخ في الفترة. يعرض سجل السيرة توقيت آخر نسختين دون محتوى الملف. راجع عدد عينات الزمن والحالات ذات المحطات غير المعروفة قبل تعميم استنتاج.",
        "Choose a member to see current state, saved completions and dated transitions, reads and work in the period. CV history shows the latest two upload timestamps without file contents. Check timing sample sizes and unknown station states before generalizing.",
      ),
      limit: text(
        "هذه أدوات للرصد وتكوين فرضيات. تفسير الصعوبة أو الدافع يحتاج اختبار استخدام أو مقابلة ومراجعة العمل.",
        "These tools support observation and hypotheses. Understanding difficulty or motivation needs usability testing, interviews and work review.",
      ),
    },
    {
      id: "other-tabs",
      title: text(
        "باقي التبويبات: التفعيل، التجارب، وسلوك الاستخدام",
        "Other tabs: activation, experiments and behavior",
      ),
      purpose: text(
        "كل تبويب يجيب سؤالًا مختلفًا؛ اختر الأداة بناءً على القرار الذي تريد اتخاذه.",
        "Each tab answers a different question; choose the tool around the decision you need to make.",
      ),
      use: text(
        "التفعيل والعوائق: راجع معالم البداية والمتطلبات غير المكتملة. معمل التجارب: حدد قسمًا وفرضية وجمهورًا ونتيجة أساسية، ثم قارن A وB المنفذتين فعليًا؛ لا تنشر بديلًا لمجرد ارتفاع رقم واحد. سلوك الاستخدام: راقب المشاهدات والأفعال الناجحة والأخطاء وزمن النتيجة، ثم ارجع للحالات والسياق.",
        "Activation & prerequisites examines early milestones and unfinished requirements. Experiment Lab defines a section, hypothesis, audience and primary outcome, then compares actually implemented A/B designs. Usage Behavior examines views, successful actions, errors and outcome timing, followed by case-level investigation.",
      ),
      limit: text(
        "حجم العينة وجودة القياس مهمان؛ النشاط الأكثر لا يعني دائمًا تجربة أفضل، ولا يعلن المعمل فائزًا إحصائيًا تلقائيًا.",
        "Sample size and measurement quality matter. More activity is not always a better experience, and the lab does not automatically declare a statistically proven winner.",
      ),
    },
  ];
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={text(
        "دليل استخدام تحليلات التجربة والسلوك",
        "Experience research user guide",
      )}
      subtitle={text(
        "ما فائدة كل جزء، وكيف تقرأه وتستخدمه؟",
        "What each area is for, and how to use and interpret it",
      )}
      size="2xl"
    >
      <article className="ux-research-guide" dir={ar ? "rtl" : "ltr"}>
        <div className="ux-guide-lead">
          <BookOpen size={23} />
          <div>
            <h3>
              {text(
                "ابدأ بسؤال، ثم افحص الدليل، ثم اختبر التحسين",
                "Start with a question, inspect evidence, then test an improvement",
              )}
            </h3>
            <p>
              {text(
                "الهدف تنظيم قرار البحث: أين توجد إشارة؟ ما الذي حدث فعلًا؟ وما الذي يحتاج تحققًا مع المستخدم؟",
                "The goal is a better research decision: where is the signal, what happened, and what needs validation with a user?",
              )}
            </p>
          </div>
        </div>
        <ol className="ux-guide-start">
          {[
            [Compass, text("حدد النطاق والسؤال", "Set a scope and question")],
            [
              Search,
              text("افحص المحطة والحالات", "Inspect stations and cases"),
            ],
            [
              NotebookPen,
              text(
                "سجل فرضية وخطوة تحقق",
                "Record a hypothesis and validation",
              ),
            ],
          ].map(([Icon, label], i) => {
            const Glyph = Icon as typeof Compass;
            return (
              <li key={i}>
                <Glyph size={18} />
                <span>
                  {i + 1}. {label as string}
                </span>
              </li>
            );
          })}
        </ol>
        <nav
          aria-label={text("محتويات الدليل", "Guide contents")}
          className="ux-guide-contents"
        >
          {parts.map((p, i) => (
            <button
              key={p.id}
              onClick={() =>
                document
                  .getElementById(prefix + p.id)
                  ?.scrollIntoView({ block: "start" })
              }
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {p.title}
            </button>
          ))}
        </nav>
        {parts.map((p, i) => (
          <section id={prefix + p.id} key={p.id}>
            <h3>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {p.title}
            </h3>
            <p className="ux-guide-purpose">
              <strong>{text("الفائدة: ", "Purpose: ")}</strong>
              {p.purpose}
            </p>
            <p>{p.use}</p>
            {p.limit && (
              <p className="ux-guide-reading">
                <strong>{text("للقراءة الصحيحة: ", "Interpretation: ")}</strong>
                {p.limit}
              </p>
            )}
          </section>
        ))}
        <section className="ux-guide-example">
          <h3>
            {text(
              "مثال توضيحي: القراءة مرتفعة والعمل غير واضح",
              "Worked example: high reading, unclear application",
            )}
          </h3>
          <p>
            {text(
              "لو أتيح الإرشاد لـ10 باحثين وقرأه 6، فنسبة القراءة 60%. ولو 4 فقط لهم قراءة مؤرخة ورصدنا فعلًا لاحقًا لدى 2، فهذا 2 من 4 حالات قابلة للقياس؛ لا يعني أن باقي القراء لم يعملوا. سجّل سؤالًا عن وضوح المطلوب، وراجع العمل مع الباحثين قبل تغيير الإرشاد.",
              "If 10 members have access and 6 read, reading rate is 60%. If only 4 have dated reads and 2 show subsequent work, that is 2 of 4 measurable cases; it does not mean the other readers did no work. Record a question about clarity and review members' work before rewriting the guide.",
            )}
          </p>
        </section>
        <footer>
          <h3>{text("لماذا هذه الأدوات؟", "Why these tools?")}</h3>
          <p>
            {text(
              "يربط إطار HEART الهدف بإشارة ومقياس يمكن استخدامهما لاتخاذ قرار. وتوضح أبحاث خرائط الرحلة أهمية ربط الفرص بالمقاييس والمسؤولية والمتابعة. هذه المبادئ وجهت تنظيم الأدوات؛ الأرقام وحدها لا تحل محل البحث النوعي.",
              "HEART connects goals to measurable signals. Journey-mapping research emphasizes opportunities, metrics, ownership and follow-up. These principles informed the workspace; counts do not replace qualitative research.",
            )}
          </p>
          <div>
            <a
              href="https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/"
              target="_blank"
              rel="noreferrer"
            >
              Google HEART <ArrowUpRight size={14} />
            </a>
            <a
              href="https://www.nngroup.com/articles/journey-mapping-ux-practitioners/"
              target="_blank"
              rel="noreferrer"
            >
              NN/g · Journey mapping <ArrowUpRight size={14} />
            </a>
          </div>
        </footer>
      </article>
    </Modal>
  );
}
