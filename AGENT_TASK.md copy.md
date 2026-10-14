# AGENT_TASK.md — المخطط الشامل لتطوير الـ UI والـ UX والتوافق مع الباك إند (Nawah Frontend)

## 0. قواعد صارمة للإيجنت (يجب الالتزام بها)
1. **عدم الخروج عن السياق**: نفّذ فقط المهام المذكورة في هذا الملف دون تغيير مكتبة التوجيه (`react-router`) أو طريقة عمل المصادقة.
2. **ثبات الوضع اللوني (Light Mode Consistency)**: المنصة تعتمد الثيم الفاتح (`color-scheme: light` في `src/app/app.css`). تأكد من تناسق كافة الألوان والتباين في الوضع الفاتح وإزالة أي تضارب لوني ناتج عن كلاسات `dark:` غير المكتملة.
3. **الدعم الكامل للغتين العربية والإنجليزية (i18n & RTL)**:
   - يمنع كتابة أي نصوص ثابتة باللغة الإنجليزية أو العربية داخل المكونات؛ يجب استخدام `useI18n()` وإضافة كافة المفاتيح في `src/app/i18n/locales/ar/` و `src/app/i18n/locales/en/`.
   - استخدم دائماً خصائص الاتجاه المنطقية (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`).
4. **عدم تثبيت مكتبات UI خارجية**: اعتمد بالكامل على Tailwind CSS ومكونات المشروع الداخلية.

---

## المرحلة 1: توحيد نظام التصميم، الخطوط، الألوان، والنوافذ (`UI Foundation`)

### 1.1 تحديث ملف `src/app/app.css`
1. **إضافة خط عربي احترافي**:
   - استورد خط `IBM Plex Sans Arabic` من Google Fonts في أعلى `src/app/app.css`:
     `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');`
   - حدّث المتغير `--font-sans` ليكون:
     `"IBM Plex Sans Arabic", "Inter", ui-sans-serif, system-ui, sans-serif`
2. **إصلاح محاذاة الجداول في اللغة العربية (RTL)**:
   - في الكلاس `.data-table`، غيّر `text-left` إلى `text-start`.
3. **توحيد تصميم حقول الإدخال (`.field-control`)**:
   - اعتمد `.field-control` ككلاس موحد لكافة الحقول (`input`, `select`, `textarea`) وأضف كلاس `.field-control-error` لحالة الخطأ (`border-danger-strong focus:border-danger-strong focus:ring-danger-border`).

### 1.2 إنشاء مكون النوافذ الموحد `src/app/components/ui/Modal.tsx`
- أنشئ مكون `Modal.tsx` يعتمد على عنصر `<dialog>` الأصلي مع إدارة الـ Focus وإغلاق بزر `Escape` أو النقر على الخلفية، ويدعم `title`, `subtitle`, `onClose`, `size` (`sm | md | lg | xl`), و `footer`.
- استبدل النوافذ العشوائية والمختلفة في الملفات التالية لاستخدام `Modal.tsx` الموحد مع توحيد كلاسات الحقول بداخلها إلى `.field-control`:
  1. `src/app/components/AddApplicationModal.tsx`
  2. `src/app/components/EditApplicationModal.tsx`
  3. `src/app/components/DeleteConfirmModal.tsx`
  4. `src/app/routes/application-details.tsx` (نافذة اختيار نتيجة إغلاق الوظيفة `isPromptingClosedOutcome`)
  5. `src/app/components/KanbanView.tsx` (نافذة اختيار نتيجة الإغلاق عند السحب `pendingClosedApp`)
  6. `src/app/features/admin/AdminMembersPage.tsx` (نوافذ حذف العضو من المجموعة `removing` وتعيين المجموعة `assigning`)
  7. `src/app/features/admin/components/AdminMemberTasks.tsx` (استبدال `window.confirm` عند حذف مهمة أو عنصر قائمة بنافذة تأكيد موحدة)

### 1.3 إنشاء نظام الإشعارات الفورية `src/app/components/ui/ToastProvider.tsx`
- أنشئ سياق وخطاف `useToast()` يعرض إشعارات عائمة أنيقة (`success`, `error`, `info`) في أسفل/أعلى الشاشة لمدة 4 ثوانٍ مع إمكانية الإغلاق اليدوي.
- غلّف التطبيق بـ `<ToastProvider>` داخل `src/app/routes/layout.tsx`.
- أظهر إشعار نجاح (`toast.success`) أو خطأ (`toast.error`) في العمليات التالية (لحل مشكلة عدم وضوح ما إذا كان التفاعل قد تم أم لا):
  - إضافة طلب توظيف جديد (`layout.tsx` / `AddApplicationModal.tsx`).
  - تعديل طلب توظيف أو تغيير مرحلته أو حذفه (`application-details.tsx` و `applications.tsx`).
  - حفظ الملف المهني ورفع السيرة الذاتية (`ProfileForm.tsx`).
  - إضافة أو تحديث مهمة أو إرسال ملاحظة (`TasksPage.tsx` و `TaskDetailDrawer.tsx`).

### 1.4 تنظيف المكونات غير المستخدمة
- احذف الملف القديم غير المستخدم `src/app/components/Navbar.tsx`.

---

## المرحلة 2: إصلاح الحالات الأربع (Loading, Empty, Error, Success)، الألوان، والتوافق مع الباك إند

### 2.1 التوافق مع الباك إند في صفحة الطلبات (`src/app/services/api.ts` & `src/app/routes/applications.tsx`)
1. **في `src/app/services/api.ts`**:
   - أضف دالة جديدة أو حدّث `getApplications` بحيث تُرسل `stage=ACTIVE` مباشرة للباك إند (بعد أن أصبح الباك إند يدعمها) وتُرجع الكائن الكامل `{ items: Application[]; total: number; unfilteredTotal: number }` من استجابة الباك إند.
   - في `getDashboardStats()`: اقرأ الحقلين الجديدين القادمين من الباك إند `expiringSoonCount: Number(data.expiringSoonCount) || 0` و `recentNoResponseCount: Number(data.recentNoResponseCount) || 0` وأضفهما إلى النوع `DashboardStats` في `src/app/types.ts`.
2. **في `src/app/routes/applications.tsx`**:
   - في `loadData()`: أرسل طلباً **واحداً فقط** بدلاً من طلبين، واستخدم `unfilteredTotal` لتحديث `totalCount`.
   - أضف حالة `isRefreshing` عند تغيير الفلتر أو البحث بحيث تظهر شفافية ناعمة (`opacity-60 transition-opacity`) مع `SpinnerIcon` صغير بجانب عدد النتائج دون إخفاء الجدول بالكامل.

### 2.2 التوافق مع الباك إند في صفحة التطوير المهني للأدمن (`src/app/features/admin/AdminProfessionalDevelopmentPage.tsx`)
1. **في `src/app/features/admin/api/adminApi.ts`**:
   - أضف الحقل الاختياري `development?: { active: number; inProgress: number; overdue: number; lastTaskAt: string | null }` إلى النوع `AdminMember`.
2. **في `src/app/features/admin/AdminProfessionalDevelopmentPage.tsx`**:
   - في دالة `load()`: اعتمد مباشرة على `member.development` القادم من `adminApi.users({ page, limit: 20 })` وتخلَّص من حلقة `Promise.all` التي كانت ترسل 40 طلباً إضافياً للسيرفر وتسبب بطء التحميل أو خطأ `429 Too Many Requests`.

### 2.3 توحيد حالات التحميل والفراغ والخطأ
1. **حالة التحميل (`Loading State`)**:
   - في `src/app/features/admin/components/AdminUI.tsx` (`LoadingState`)، و `ProfileCompletionGate.tsx`، و `ProtectedRoute.tsx`، و `CvViewer.tsx`: أضف `<SpinnerIcon className="h-5 w-5 text-neutral-500" />` بجانب نص التحميل بدلاً من النص الصامت.
2. **حالة الفراغ (`Empty State`)**:
   - حدّث `src/app/components/EmptyState.tsx` ليقبل `icon`, `title`, `description`, `actionLabel`, `onAction`.
   - استخدمه في جميع القوائم الفارغة (`RecentActivityList.tsx`, `MembersProgressPage.tsx`, `AdminUI.tsx`, وبطاقة آخر الطلبات في `dashboard.tsx`) بدلاً من النصوص العادية.
3. **حالة الخطأ (`Error State`)**:
   - في `src/app/routes/application-details.tsx`: استبدل `alert(t("common.unexpectedError"))` بـ `toast.error(t("common.unexpectedError"))`.
   - في `src/app/features/admin/components/AdminUI.tsx`: حسّن تصميم `ErrorState` ليظهر بإطار وخلفية حمراء هادئة (`border-danger-border bg-danger-soft/30 text-danger-strong`) مع أيقونة تنبيه وزر إعادة المحاولة.

### 2.4 إصلاح ألوان الكانبان والأيقونات والـ RTL
1. **في `src/app/components/KanbanView.tsx`**:
   - عدّل `getApplicationCardColor(app)` لتكون خلفية البطاقة بيضاء مريحة للعين (`bg-surface border-border hover:border-border-hover`) مع تمييز المرحلة عبر شريط جانبي ملون (`border-s-4`):
     - `INTERVIEW`: `border-s-4 border-s-info-strong`
     - `DECISION`: `border-s-4 border-s-warning-strong`
     - `CLOSED (ACCEPTED)`: `border-s-4 border-s-success-strong`
     - `CLOSED (REJECTED)`: `border-s-4 border-s-danger-strong`
     - `CLOSED (NO_RESPONSE)`: `border-s-4 border-s-warning-strong`
     - `APPLIED / DEFAULT`: `border-s-4 border-s-neutral-400`
   - استبدل الـ `conic-gradient` المشوش في نقطة عمود `CLOSED` بلون واضح `bg-neutral-600`.
2. **إزالة علامة `+` المكررة**:
   - في `src/app/routes/dashboard.tsx` و `src/app/routes/applications.tsx`: احذف علامة `+` النصية المكتوبة داخل `<span>+ {t("common.addApplication")}</span>` لأن زر الإضافة يحتوي بالفعل على `<PlusIcon />`.
3. **إصلاح اتجاه الأسهم والرموز النصية**:
   - في `src/app/components/TableView.tsx` و `src/app/features/admin/components/AdminActivityList.tsx`: اجعل السهم ينعكس في العربية (`{locale === "ar" ? "←" : "→"}`).
   - في `src/app/components/PipelineTimeline.tsx` و `src/app/features/profile/ProfileForm.tsx` و `src/app/features/admin/components/AdminMemberTasks.tsx`: استبدل الرموز النصية البدائية (`✓`, `●`, `○`, `▤`, `↑`, `↓`) بأيقونات SVG نظيفة في `Icons.tsx`.

---

## المرحلة 3: تطوير تجربة المستخدم (UX)، صفحة الدخول، الـ Onboarding، والشخصية التفاعلية

### 3.1 إعادة تصميم صفحة الدخول والتسجيل (`src/app/features/auth/components/AuthForm.tsx`)
1. **تخطيط Split-Screen**:
   - حوّل الصفحة إلى تخطيط من عمودين على الشاشات الكبيرة (`grid min-h-screen lg:grid-cols-2`):
     - **العمود الأول**: نموذج تسجيل الدخول أو إنشاء الحساب.
     - **العمود الثاني**: لوحة ترحيبية بصرية تعرض هوية "مشروع نواة"، وعنوان *"ابدأ رحلتك المهنية بخطوات واضحة مع مجموعتك وموجهك"*، و3 بطاقات مختصرة توضح قيمة المنصة (تنظيم التقديمات، التفاعل الجماعي مع المجموعة، وتوجيه المينتور)، بالإضافة إلى بطاقة تفاعلية لمشاهدة **الفيديو التعريفي المختصر للمنصة**.
2. **إصلاح إشعار إنشاء الحساب ورسائل خطأ الباك إند**:
   - اقرأ `(location.state as { notice?: string } | null)?.notice` واعرضه في شريط نجاح أخضر أعلى الفورم.
   - في دالة `submit`: تعامل بدقة مع أخطاء الباك إند (`RegisterDto` و `AuthService`):
     - إذا كان الخطأ `status === 409` أو يحتوي على `"already exists"`: اعرض `t("auth.emailAlreadyExists")`.
     - إذا كان الخطأ `status === 400` أثناء التسجيل (بسبب شروط `@IsStrongPassword` في الباك إند): اعرض `t("auth.passwordRequirementsError")` وحدّث تلميح كلمة المرور `auth.passwordHint` ليوضح الشروط المطلوبة (8 أحرف على الأقل تشمل حرفاً كبيراً، حرفاً صغيراً، رقماً، ورمزاً خاصاً مثل `@#$`).

### 3.2 تحويل بوابة البروفايل إلى معالج تهيئة من 3 خطوات (`src/app/features/profile/ProfileCompletionGate.tsx`)
- حوّل نافذة استكمال البيانات الإجبارية إلى **Onboarding Wizard** واضح من 3 خطوات مع شريط تقدم علوي:
  - **الخطوة 1 (مرحباً بك في نواة - افهم رحلتك)**: شرح مبسط للمطلوب من العضو أسبوعياً + مشغل فيديو تعريفي مختصر يوضح كيف تعمل المجموعات والمهام ومتابعة الوظائف، مع زر "فهمت، لنبدأ إعداد ملفي".
  - **الخطوة 2 (إعداد الملف المهني)**: عرض `<ProfileForm onboarding ... />` مع توضيح أن رابط معرض الأعمال (Portfolio) والسيرة الذاتية (PDF) يساعدان المينتور وزملاء المجموعة على تقديم توجيه دقيق لك.
  - **الخطوة 3 (خطوتك الأولى)**: بعد حفظ البروفايل، اعرض شاشة تهنئة سريعة تقترح عليه إضافة أول وظيفة قدم عليها أو استعراض مهامه للانطلاق في المنصة.

### 3.3 إنشاء الشخصية التفاعلية ومركز الإشعارات (`CompanionBanner.tsx` & `NotificationBell.tsx`)
1. **إنشاء `src/app/components/CompanionBanner.tsx` (مرشد نواة الذكي)**:
   - بطاقة بتصميم مريح وألوان متناسقة مع أيقونة الشخصية المساعدة، تستقبل بيانات `DashboardStats` وملخص التطوير المهني، وتعرض للعضو **أهم خطوة مطلوبة منه الآن (Next Best Action)**:
     - إذا كان `stats.expiringSoonCount > 0`: تنبيهه بوجود وظائف مر عليها 5-6 أيام وتقترب من التحول التلقائي إلى `عدم الرد (NO_RESPONSE)` مع زر لتحديث حالتها.
     - إذا كان `stats.recentNoResponseCount > 0`: إعلامه بالوظائف التي تم نقلها تلقائياً لخانة `عدم الرد` بعد مرور 7 أيام لتشجيعه على المتابعة أو التقديم في فرص جديدة.
     - إذا كان لديه فيدباك غير مقروء من المينتور أو مهام متأخرة (`overdueCount > 0`): توجيهه مباشرة لقراءتها أو تحديثها.
     - إذا كان حسابه جديداً (`active.total === 0`): تشجيعه على إضافة أول طلب توظيف.
2. **إنشاء `src/app/components/NotificationBell.tsx` وإضافته في `AppSidebar.tsx`**:
   - أيقونة جرس إشعارات في `AppSidebar.tsx` تعرض شارة بعدد التنبيهات غير المقروءة (ملاحظات المينتور + الفيدباك غير المقروء + تنبيهات الوظائف التي أُغلقت تلقائياً بـ `NO_RESPONSE`).
   - عند النقر عليها تفتح قائمة منسدلة منظمة تنقل العضو مباشرة إلى العنصر المعني.

### 3.4 إعادة هيكلة الصفحة الرئيسية (`src/app/routes/dashboard.tsx`)
- ضع `<CompanionBanner />` في مقدمة الصفحة الرئيسية ليعرف العضو فور دخوله ما المطلوب منه.
- نظّم إحصائيات المراحل (`Pipeline`) تحت قسم واضح بعنوان **"التقييم والقياس (Evaluation & Metrics)"** مع شرح مختصر يساعد المستخدم على فهم دلالة الأرقام.

---

## المرحلة 4: ربط قياس بيانات الـ UX واختبارات A/B بالباك إند (`src/app/utils/uxAnalytics.ts`)

### 4.1 إنشاء خدمة `src/app/utils/uxAnalytics.ts`
- أنشئ دالة `trackUxEvent(name, metadata)` ترسل الحدث إلى مسار الباك إند `POST /ux-analytics/events` (مع حفظ احتياطي في `localStorage` لضمان عدم ضياع أي بيانات).
- أنشئ خطاف `useUxExperiment(experimentKey)` يخصص للمستخدم النسخة `'A'` أو `'B'` بشكل ثابت ويرسلها مع الأحداث.
- سجّل الأحداث التالية في أماكنها:
  - `onboarding_started`, `onboarding_video_watched`, `onboarding_completed` في `ProfileCompletionGate.tsx`.
  - `application_created`, `application_stage_updated` في `layout.tsx`, `applications.tsx`, و `application-details.tsx`.
  - `task_status_changed`, `feedback_read` في `TasksPage.tsx` و `FeedbackDetailDrawer.tsx`.

### 4.2 عرض لوحة بيانات الـ UX ونتائج A/B في لوحة الأدمن (`src/app/features/admin/AdminOverviewPage.tsx`)
- أضف دالة `uxAnalytics()` في `src/app/features/admin/api/adminApi.ts` تستدعي `GET /admin/monitoring/ux-analytics`.
- اعرض قسماً جديداً في `AdminOverviewPage.tsx` بعنوان **"مؤشرات تجربة المستخدم واختبارات A/B (UX Funnel & A/B Metrics)"** يوضح للأدمن:
  - تقدم الهدف الأول: شريط تقدم نحو **50 عضواً (5 مجموعات)**.
  - معدلات إكمال الـ Onboarding ومشاهدة الفيديو التعريفي.
  - مقارنة معدلات التفاعل بين النسخة **A** والنسخة **B**.

---

## المرحلة 5: التحقق النهائي
1. تأكد من إضافة جميع مفاتيح الترجمة الجديدة في `src/app/i18n/locales/ar/` و `src/app/i18n/locales/en/`.
2. شغّل أمر البناء وفحص الأنواع (`npm run build` أو `npx react-router typegen && npm run build`) وتأكد من عدم وجود أي أخطاء.