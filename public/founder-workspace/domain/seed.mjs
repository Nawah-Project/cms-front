import { addDays, FORMAT_VERSION } from './model.mjs';

export const LEVEL_LABELS = {
  assisted: ['أنجز بمساعدة', 'Deliver with assistance'], understand: ['أفهم وأعدّل', 'Understand & adapt'],
  manage: ['أدير التنفيذ', 'Manage delivery'], transfer: ['أنقل الممارسة', 'Transfer the practice'],
  teach: ['أعلّم وأقيّم', 'Teach & assess'], train: ['أطوّر تدريبًا', 'Improve training'],
};
export const KIND_LABELS = {
  execution: ['تنفيذ', 'Execution'], learning: ['تعلّم', 'Learning'], testing: ['اختبار', 'Testing'],
  teaching: ['تعليم', 'Teaching'], review: ['مراجعة', 'Review'],
};
export const STATUS_LABELS = { planned: ['مخططة', 'Planned'], active: ['قيد العمل', 'In progress'], blocked: ['متوقفة', 'Blocked'], done: ['منتهية', 'Done'] };
export const REVIEW_QUESTIONS = [
  ['ما الذي تحسن للمستخدم أو العميل، وما الدليل؟', 'What improved for the user or client, and what supports this?'],
  ['ما الذي أصبحت تستطيع فهمه أو إدارته أنت؟', 'What can you now understand or manage?'],
  ['أين ما زلت تعتمد على Codex دون فهم كافٍ؟', 'Where do you still rely on Codex without enough understanding?'],
  ['ما الذي يمكن نقله أو تعليمه، وما الذي يحتاج ممارسة أخرى؟', 'What can you transfer or teach, and what needs more practice?'],
  ['ما الخطوة التالية التي تستحق الوقت أو التكلفة؟', 'What next step is worth the time or cost?'],
];
export const CYCLE_CONTENT = [
  ['UX · فهم المشكلة', 'UX · Understand the problem', 'هل يفهم المستخدم ما بعد المهمة صفر، ولماذا يحتاج الإرشاد وتعديل الـCV؟', 'Does a new member understand what comes after task zero and why the first guidance and CV revision matter?', 'ملاحظات فعلية، مشكلة محددة، وخط بداية.', 'Observed behaviour, a specific problem, and a baseline.', 'ux'],
  ['UX · اختيار الحل واختباره', 'UX · Choose & test', 'اختبر أهم سؤال خرج من الدورة الأولى، وقارن تحسينًا محدودًا ببديله.', 'Test the most important question from cycle one and compare a small improvement with an alternative.', 'قرار مبرر واختبار وحدود النتيجة.', 'A reasoned decision, test results, and limitations.', 'ux'],
  ['Frontend · إدارة التنفيذ', 'Frontend · Manage delivery', 'حوّل تحسين UX إلى حالات واجهة وتفاعل ومكونات متجاوبة.', 'Translate a UX improvement into interface states, interactions, and responsive components.', 'مواصفات وتنفيذ وفحوص للحالات الأساسية.', 'Specifications, implementation, and state checks.', 'frontend'],
  ['Frontend · جودة التجربة', 'Frontend · Experience quality', 'عالج مشكلة محددة في البيانات أو التحميل أو الأداء أو استمرارية العمل.', 'Address a specific data, loading, performance, or continuity problem.', 'قياس مناسب وشرح للتنازلات ومثال آخر.', 'Relevant measurement, trade-offs, and another example.', 'frontend'],
  ['Backend · حالة استخدام', 'Backend · A complete use case', 'تتبّع عملية من الطلب والتحقق والصلاحيات حتى المعاملة والنتيجة.', 'Trace a use case from request and authorization through transaction and outcome.', 'عقد API واختبارات النجاح والفشل.', 'An API contract and success/failure checks.', 'backend'],
  ['Backend · حدود المجالات', 'Backend · Domain boundaries', 'افهم اعتمادًا قائمًا وحسّن حدًا محددًا دون توسيع نطاق التغيير.', 'Understand an existing dependency and improve one boundary without expanding scope.', 'قرار معماري وتغيير يثبت الحد المقصود.', 'An architecture decision and a change that proves its boundary.', 'backend'],
  ['التشغيل · الاعتمادية', 'Operations · Reliability', 'افهم المؤشرات والنسخ الاحتياطي والاستعادة وحدود الموارد.', 'Understand signals, backups, recovery, and resource limits.', 'استعادة معزولة ودليل تشخيص عطل.', 'An isolated restore and an incident diagnosis guide.', 'operations'],
  ['CI/CD · الأمان والتكلفة', 'CI/CD · Security & cost', 'أدر إصدارًا من التغيير والبناء إلى النشر والفحص والرجوع.', 'Manage a release from change and build through deployment, checks, and rollback.', 'دليل إصدار ومخاطر وتكلفة بدائله.', 'A release runbook, risks, and alternative costs.', 'operations'],
  ['البزنس · القيمة والعرض', 'Business · Value & offer', 'اختر عميلًا ومشكلة ونتيجة تستطيع تقديمها بتكلفة مفهومة.', 'Choose a customer, problem, and outcome you can deliver at an understood cost.', 'عرض محدود وفرضيات اختُبرت.', 'A bounded offer and tested assumptions.', 'business'],
  ['التسويق · البيع', 'Marketing · Sales', 'اربط الرسالة والجمهور والقناة بمحادثة وعرض ونتيجة فعلية.', 'Connect message, audience, and channel to conversations, offers, and outcomes.', 'قرار عن القناة والرسالة والعرض.', 'A decision about the channel, message, and offer.', 'business'],
  ['التعليم · تطبيق متعلم', 'Teaching · Learner practice', 'حوّل ممارسة موثقة إلى شرح ومهمة ثم راجع تطبيق متعلم.', 'Turn a documented practice into instruction and an assignment, then review learner work.', 'تطبيق متعلم ومراجعة تكشف الفجوات.', 'Learner work and feedback that reveals gaps.', 'teaching'],
  ['التدريب · التحسين بالممارسة', 'Training · Improve by practice', 'جرّب مهمة بمعايير ومراجعة ومحاولة ثانية، ثم حسّن التدريب.', 'Try an assignment with criteria, feedback, and a second attempt, then improve it.', 'نسخة تدريب محسنة بأدلة الاستخدام.', 'A training iteration informed by use.', 'teaching'],
  ['نقل الممارسة · سياق آخر', 'Transfer · Another context', 'اختبر ممارسة أثبتت فائدتها خارج سياق نواة.', 'Test an established practice outside the Nawah context.', 'تمييز القابل للتعميم عن الخاص بنواة.', 'Distinguish transferable knowledge from context-specific decisions.', 'transfer'],
  ['نقل الممارسة · مراجعة الحدود', 'Transfer · Review the limits', 'راجع نتيجة التطبيق الآخر وعدّل فهمك لحدود الممارسة.', 'Review the other application and refine the limits of the practice.', 'مراجعة مقارنة بين سياقين.', 'A comparison between two contexts.', 'transfer'],
  ['منهج · أهداف مترابطة', 'Curriculum · Connected outcomes', 'صغ أهداف تعلم من الممارسات الموثقة.', 'Form learning outcomes from documented practices.', 'أهداف وأمثلة ومهام متسقة.', 'Aligned outcomes, examples, and assignments.', 'teaching'],
  ['منهج · وحدة قابلة للتجربة', 'Curriculum · A testable unit', 'اجمع المحتوى والمهمة والتقييم في وحدة محدودة.', 'Combine content, assignment, and assessment into a small unit.', 'وحدة جاهزة للاستخدام التجريبي.', 'A unit ready for a pilot.', 'teaching'],
  ['تدريب · مجموعة صغيرة', 'Training · A small cohort', 'جرّب التدريب مع مجموعة مناسبة وبنطاق محدود.', 'Pilot the training with a suitable small group.', 'عمل متعلمين وملاحظات التعثر.', 'Learner work and observed difficulties.', 'teaching'],
  ['تدريب · تحسين المحاولة', 'Training · Improve the attempt', 'راجع التحسن بعد الملاحظات والمحاولة الثانية.', 'Review improvement after feedback and a second attempt.', 'تعديل التدريب بدليل.', 'Evidence-based training changes.', 'teaching'],
  ['تفاعل · إثبات الاحتياج', 'Interactive · Prove the need', 'حدد ممارسة أو قرارًا يحتاج تفاعلًا أكثر من المحتوى الثابت.', 'Identify a practice or decision that benefits from interaction.', 'مشكلة واضحة للتفاعل المقترح.', 'A clear problem for the proposed interaction.', 'frontend'],
  ['تفاعل · تجربة محدودة', 'Interactive · A bounded pilot', 'ابنِ أصغر تفاعل مفيد واختبر فائدته.', 'Build the smallest useful interaction and test it.', 'نتيجة مقارنة مع بديل أبسط.', 'A comparison with a simpler alternative.', 'frontend'],
  ['تشغيل تجاري · التسليم', 'Commercial · Delivery', 'اربط التسويق والبيع بتسليم ودعم يمكن إدارتهما.', 'Connect marketing and sales to manageable delivery and support.', 'عملية تسليم وتكلفة وقت.', 'A delivery process and time cost.', 'business'],
  ['تشغيل تجاري · التحصيل', 'Commercial · Collection', 'راجع المصروفات والتحصيل وربحية العرض بناءً على بيانات فعلية.', 'Review expenses, collections, and offer economics using actual records.', 'قرار مالي وتجاري مبرر.', 'A reasoned financial and commercial decision.', 'business'],
  ['تفويض · استلام العمل', 'Delegation · Handover', 'دع شخصًا آخر يستلم جزءًا محددًا بمعايير واضحة.', 'Let another person take ownership of a bounded task with clear criteria.', 'تسليم وتطبيق ومراجعة.', 'Handover, implementation, and review.', 'transfer'],
  ['استمرارية · مراجعة الصورة', 'Continuity · Review the whole', 'اختبر استعادة العمل وراجع اتجاه المنتج والبزنس والتعلم.', 'Test continuity and review product, business, and learning direction.', 'خطة محدثة ودليل استمرارية.', 'An updated plan and a continuity runbook.', 'operations'],
];
const PHASES = [
  [0, 1, 'حدد المشكلة وخط البداية', 'Define the problem & baseline', 'execution', 5, 'من المتأثر؟ ما المعروف وما الافتراض؟ ما دليل التحسن؟', 'Who is affected? What is known, assumed, and evidence of improvement?'],
  [2, 4, 'استكشف وتعلّم وقارن البدائل', 'Explore, learn & compare', 'learning', 9, 'راجع الموجود وحاول ملاحظة ثلاثة مستخدمين مناسبين بإذنهم. لا تحوّل العينة الصغيرة إلى نسبة عامة.', 'Review the existing flow and try to observe three suitable users with permission. Do not generalize percentages from a small sample.'],
  [5, 8, 'جهّز تحسينًا محدودًا', 'Prepare a bounded improvement', 'execution', 14, 'تحسين رئيسي واحد ومعايير قبول، مع تفسير دورك ودور Codex.', 'One main improvement with acceptance criteria and explicit roles for you and Codex.'],
  [9, 10, 'اختبر الفهم والجودة والأثر', 'Test understanding, quality & impact', 'testing', 7, 'راجع الفهم والقدرة على إكمال المهمة. سجّل حدود الأدلة وما بقي مجهولًا.', 'Review understanding and task completion. Record limitations and remaining unknowns.'],
  [11, 12, 'انقل الممارسة واشرحها', 'Transfer the practice & explain it', 'teaching', 7, 'طبّق التفكير على سياق آخر واشرحه مع تمرين. غياب متعلم يعني أن التعليم لم يُختبر بعد.', 'Apply the reasoning in another context and explain it with an exercise. Without a learner, teaching remains untested.'],
  [13, 14, 'راجع الأدلة وحدد التالي', 'Review evidence & decide what is next', 'review', 5, 'راجع النتيجة والفهم والاعتماد على Codex وما يستحق الدورة التالية.', 'Review outcomes, understanding, reliance on Codex, and the next worthwhile question.'],
];
export function createSeed() {
  const start = '2026-11-03';
  const cycles = CYCLE_CONTENT.map((c, i) => ({ id: `cycle-${i + 1}`, number: i + 1, titleAr: c[0], titleEn: c[1], goalAr: c[2], goalEn: c[3], outcomeAr: c[4], outcomeEn: c[5], domain: c[6], start: addDays(start, i * 15), end: addDays(start, i * 15 + 14) }));
  const lanes = [
    { id: 'product', labelAr: 'تطوير نواة', labelEn: 'Nawah product', color: '#22624c', weeklyHours: 22 },
    { id: 'consulting', labelAr: 'الاستشارة المهنية', labelEn: 'Career consulting', color: '#657e99', weeklyHours: 6 },
    { id: 'campaign', labelAr: 'الحملة والبزنس', labelEn: 'Campaign & business', color: '#b18a46', weeklyHours: 6 },
    { id: 'learning', labelAr: 'التوثيق والتعليم', labelEn: 'Documentation & teaching', color: '#88759e', weeklyHours: 4 },
    { id: 'operations', labelAr: 'التشغيل والمراجعة', labelEn: 'Operations & review', color: '#608d8a', weeklyHours: 2 },
  ];
  const tasks = [];
  const base = { actualHours: 0, status: 'planned', archived: false, blocker: '', dependsOn: '', deadline: '', practiceId: 'practice-ux', resourceUrl: '', timeStart: '', timeEnd: '', actualStart: '', actualEnd: '', seriesId: '' };
  for (const cycle of cycles.slice(0, 2)) {
    PHASES.forEach((p, i) => tasks.push({ ...base, id: `${cycle.id}-phase-${i}`, cycleId: cycle.id, title: cycle.number === 2 && i === 0 ? 'اختر أهم سؤال خرج من الدورة الأولى' : p[2], titleEn: cycle.number === 2 && i === 0 ? 'Choose the main question from cycle one' : p[3], laneId: i === 4 ? 'learning' : i === 5 ? 'operations' : 'product', kind: p[4], start: addDays(cycle.start, p[0]), end: addDays(cycle.start, p[1]), hours: p[5], notes: p[6], notesEn: p[7], deliverable: cycle.number === 2 ? 'نتيجة مراجعة مرتبطة بأدلة الدورة السابقة؛ لا نفترض النتيجة مسبقًا.' : 'سجّل العمل والقرار وحدود النتيجة في الأدلة.', deliverableEn: 'Record the work, decision, and limitations; do not assume an outcome.', dependsOn: i ? `${cycle.id}-phase-${i - 1}` : '' }));
    const parallel = [
      ['consulting', 'تحضير الاستشارة وتعلّم ممارستها', 'Consulting preparation & practice', 'learning', 2, 3, 3, 'practice-consulting', 'جهّز أسئلة الاستقبال وسبب اختيارها. هذا وقت تحضير لك، وليس موعد جلسة أو إنشاء حالة للعميلة.', 'Prepare intake questions and their rationale. This is your preparation time, not a client booking or case creation.'],
      ['consulting', 'مراجعة أسلوب إدارة الاستشارة', 'Reflect on consulting delivery', 'review', 7, 8, 3, 'practice-consulting', 'ما الذي خدم عملك؟ ما الذي يحتاج استكشافًا؟ لا تضع ملاحظات العميل الخاصة هنا.', 'What helped your practice and what needs exploration? Keep private client notes in the consulting case.'],
      ['consulting', 'تعلّم وتخطيط المتابعة المهنية', 'Learn & plan professional follow-up', 'learning', 12, 13, 6, 'practice-consulting', 'راجع النشاط المناسب بحسب ما اتُفق عليه في الحالة. التوقيت قابل للتعديل بعد الاتفاق.', 'Review appropriate activities based on the service agreement. Adjust timing after agreement.'],
      ['campaign', 'راجع الرسالة والجمهور وخط البداية', 'Review message, audience & baseline', 'review', 0, 2, 4, 'practice-business', 'استخدم الحملة الحالية وافصل الزيارات والاهتمام عن المحادثات والشراء.', 'Use the existing campaign; distinguish visits and interest from conversations and purchases.'],
      ['campaign', 'نشر محدود ومحادثات عن الاحتياج', 'Focused publishing & customer conversations', 'execution', 4, 9, 6, 'practice-business', 'اختبر رسالة واحتياجًا، دون افتراض أن الجمهور يريد كورسًا كاملًا.', 'Test a message and a customer need, without assuming demand for a full course.'],
      ['campaign', 'راجع إشارة القيمة وفرصة عرض محدود', 'Review value signals & a bounded offer', 'review', 12, 13, 2, 'practice-business', 'ما النتيجة التي تستطيع تسليمها؟ وما دليل الاحتياج والاستعداد للدفع؟', 'What outcome can you deliver? What supports the need and willingness to pay?'],
      ['learning', 'وثّق قرارًا ودورك ودور Codex', 'Document a decision and your role', 'review', 6, 7, 1, 'practice-ux', 'اكتب لماذا اخترت الحل وما الذي ما زلت لا تفهمه.', 'Record why you chose the solution and what you still do not understand.'],
      ['operations', 'مراجعة سلامة التشغيل والتكلفة', 'Review operational health & cost', 'review', 0, 0, 1, 'practice-operations', 'مراجعة يدوية للمؤشرات المتاحة؛ لا ننفذ أي تغيير على السيرفر من هذه المعاينة.', 'Manually review available signals; this preview performs no server changes.'],
      ['operations', 'مراجعة التشغيل أثناء الدورة', 'Mid-cycle operational review', 'review', 7, 7, 1, 'practice-operations', 'الأعطال المؤثرة والتزامات العميل تسبق التعلم الاختياري.', 'Production incidents and client commitments take priority over optional learning.'],
    ];
    parallel.forEach((p, i) => tasks.push({ ...base, id: `${cycle.id}-parallel-${i}`, cycleId: cycle.id, title: p[1], titleEn: p[2], laneId: p[0], kind: p[3], start: addDays(cycle.start, p[4]), end: addDays(cycle.start, p[5]), hours: p[6], practiceId: p[7], notes: p[8], notesEn: p[9], deliverable: '', deliverableEn: '' }));
  }
  const practices = [
    ['ux', 'فهم مشكلة استخدام واختبار تحسين', 'Understand a usability problem & test a change'],
    ['frontend', 'إدارة تغيير واجهة واختبار حالاته', 'Manage a frontend change & test its states'],
    ['backend', 'تتبّع حالة استخدام وحدود بياناتها', 'Trace a use case & its data boundaries'],
    ['operations', 'إدارة إصدار وتشخيص عطل واستعادة', 'Manage a release, diagnose & restore'],
    ['consulting', 'فهم طلب واختيار مساعدة ومراجعة نفعها', 'Understand a request, choose help & review benefit'],
    ['business', 'ربط جمهور وعرض بنتيجة وتكلفة', 'Connect audience & offer to outcomes & cost'],
    ['teaching', 'تصميم مهمة ومراجعة تطبيق متعلم', 'Design practice & review learner work'],
  ].map(p => ({ id: `practice-${p[0]}`, titleAr: p[1], titleEn: p[2], level: 'assisted', verified: false, evidenceIds: [], gap: '', reviewDate: '' }));
  return { formatVersion: FORMAT_VERSION, id: 'nawah-founder-local-plan', title: 'خريطة نواة — الممارسة إلى البزنس', revision: 0, cycles, lanes, tasks, practices, evidence: [], reviews: [], history: [], settings: { currentCycleId: 'cycle-1', timeZone: 'Africa/Cairo', dayHours: [8, 8, 8, 8, 8, 0, 0] } };
}

export const CONSULTING_STAGES = [
  ['الاستقبال والاتفاق', 'Intake & agreement', 'ما المساعدة التي تريدها هي؟ افصل اتفاق الخدمة عن أي موافقة بحثية. لا تفترض أن الهدف هو تعديل CV.', 'What help does she want? Separate the service agreement from research consent. Do not assume a CV problem.', 'Dugger · Ch. 9 / Tang · Ch. 6'],
  ['فهم الطلب والتردد', 'Understand the request & ambivalence', 'هل التردد في طبيعة UX أم البحث عن عمل أم ظروف التجربة؟ ما الدليل وما التفسير البديل؟', 'Is the uncertainty about UX work, the job search, or working conditions? What evidence and alternatives exist?', 'Tang · Ch. 6 / Rochat · Introduction'],
  ['الخبرات والقيم والقيود', 'Experience, values & constraints', 'استكشف أمثلة العمل وما يعطيها طاقة وما يستنزفها. سجّل القيود كما تصفها دون افتراضات.', 'Explore work examples, energizing tasks, and draining tasks. Record constraints without assumptions.', 'Rochat · Ch. 5–7'],
  ['السوق والبحث السعودي', 'Saudi market & job-search evidence', 'افحص أدوارًا حديثة مناسبة وشروط الأهلية والأدلة المطلوبة. راجع تاريخ المصدر ولا تعمم من إعلان.', 'Review current suitable roles, eligibility requirements, and requested evidence. Date sources and avoid generalizing from one listing.', 'Dugger · Ch. 9 / current dated sources'],
  ['فهم مشترك وهدف', 'Shared understanding & goal', 'قدّم فهمك وأسبابه وما لم يُحسم. اتفقا على سؤال أو نتيجة قابلة للمراجعة.', 'Share your understanding, rationale, and unknowns. Agree on a question or outcome to review.', 'Tang · Ch. 6 / Capuzzi & Stauffer · Ch. 8'],
  ['اختبار تختاره هي', 'A client-chosen experiment', 'استمرار UX: مشروع محدود ودليل عمل. بديل آخر: معلومة أو تجربة صغيرة تختارها. UX Team of One مرجع للعمل بموارد محدودة، لا إلزام بمسار.', 'Continue UX: a bounded project and work evidence. Another path: a small chosen experiment. UX Team of One supports resource-constrained practice, not a prescribed career choice.', 'Rochat · intervention selection / UX Team of One'],
  ['مراجعة وتوصية وقرارها', 'Review, recommendation & her decision', 'راجع ما تغير، وقدّم توصية ببدائل وأدلة وحدود. القرار لها، ويمكن الرجوع للاستكشاف.', 'Review what changed. Offer a reasoned recommendation with alternatives and limitations. The decision remains hers.', 'Capuzzi & Stauffer · Ch. 8'],
  ['المتابعة والإنهاء', 'Follow-up & closure', 'اتفقا على خطوة تالية وموعد مراجعة ومعيار استفادة. المحتوى والعلاقات للسعودية يخدمان الهدف المتفق عليه.', 'Agree a next step, review date, and benefit criteria. Saudi-facing content and networking serve the agreed goal.', 'Tang · Ch. 6 / Dugger · Ch. 9'],
];
