# خطة العمل الشاملة لتطوير واجهة وتجربة المستخدم (UI/UX Refactoring & Enhancement Plan)
**المشروع:** Nawah Project (`cms-front`)
**البيئة المستهدفة:** Antigravity IDE Autonomous Agent

---

## 0. قواعد صارمة وحدود السياق (CRITICAL GUARDRAILS - READ FIRST)

قبل تنفيذ أي خطوة، يجب عليك الالتزام التام بالقواعد التالية وعدم الخروج عنها تحت أي ظرف:

1. **عدم المساس بعقود الـ API أو الـ Backend:**
   - لا تقم بتغيير عناوين الـ Endpoints أو هيكل البيانات المرسلة/المستقبلة في:
     - `src/app/services/api.ts`
     - `src/app/features/auth/api/authApi.ts`
     - `src/app/features/profile/profileApi.ts`
     - `src/app/features/admin/api/adminApi.ts`
     - `src/app/features/members-progress/api/membersProgressApi.ts`
2. **الحفاظ على مسارات التوجيه (Routing):**
   - لا تقم بحذف أو تغيير المسارات المعرفة في `src/app/routes.ts`.
3. **عدم تثبيت مكتبات خارجية جديدة (No New NPM Packages):**
   - اعتمد حصرياً على التقنيات الموجودة في المشروع: **React 19**، **React Router v7**، و **Tailwind CSS v4** (`@import "tailwindcss";` في `src/app/app.css`).
   - جميع الأيقونات الجديدة تُضاف كمكونات SVG نظيفة داخل `src/app/components/Icons.tsx`.
4. **الحفاظ على نظام الترجمة الثنائي (Bilingual i18n - AR/EN):**
   - لا تكتب أي نص ثابت (Hardcoded String) داخل مكونات React.
   - كل نص جديد يُضاف في ملفات اللغتين `src/app/i18n/locales/ar/*.ts` و `src/app/i18n/locales/en/*.ts` ويُستدعى عبر `useI18n()`.
5. **دعم اتجاه اللغة (RTL / LTR Logical Properties):**
   - استخدم دائماً الخصائص المنطقية في Tailwind (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `rounded-s-*`) ولا تستخدم `left` أو `right` أبداً.
6. **التنفيذ المرحلي المنظم:**
   - نفّذ المراحل بالترتيب: **المرحلة 1** $\rightarrow$ **المرحلة 2** $\rightarrow$ **المرحلة 3**، وتأكد من عدم وجود أي أخطاء TypeScript (`tsc --noEmit`) بعد كل مرحلة.

---

## المرحلة 1: توحيد نظام التصميم، الفورم، النوافذ المنبثقة، والألوان (UI Design System & Standardization)

### المهمة 1.1: تحديث الخطوط، الألوان، وتنسيقات الجداول والفورم في `src/app/root.tsx` و `src/app/app.css`

1. **إضافة خط عربي احترافي في `src/app/root.tsx`:**
   - في مصفوفة `links` داخل `src/app/root.tsx`، قم بتحديث رابط Google Fonts ليشمل خط **`IBM Plex Sans Arabic`** (الأوزان `400;500;600;700`) بجانب خط `Inter`:
     ```tsx
     {
       rel: "stylesheet",
       href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
     }
     ```
2. **تحديث `src/app/app.css`:**
   - في `@theme`، حدّث `--font-sans` ليصبح:
     ```css
     --font-sans: "IBM Plex Sans Arabic", "Inter", ui-sans-serif, system-ui, sans-serif;
     ```
   - **إصلاح محاذاة الجداول في العربية:** في كلاس `.data-table` داخل `@layer components`، استبدل `text-left` بـ `text-start`:
     ```css
     .data-table {
       @apply w-full border-collapse text-start text-sm;
     }
     ```
   - **توحيد كلاسات حقول الإدخال (`.field-control`):**
     - حدّث `.field-control` وأضف كلاس حالة الخطأ `.field-control-error` وكلاس الملصقات `.field-label`:
     ```css
     .field-label {
       @apply mb-1.5 block text-xs font-semibold text-neutral-800;
     }
     .field-control {
       min-height: var(--control-height);
       @apply w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-150 focus:border-info-strong focus:ring-2 focus:ring-info-soft;
     }
     .field-control-error {
       @apply border-danger-strong bg-danger-soft/20 focus:border-danger-strong focus:ring-2 focus:ring-danger-border;
     }
     ```
   - **إصلاح تضارب الألوان (Light Workspace Theme Consistency):**
     - التطبيق مصمم ليعمل بثيم فاتح موحد ومريح للعين (`color-scheme: light`). قم بتنظيف العناصر التي تستخدم كلاسات `dark:bg-neutral-950` أو `dark:text-white` بشكل متضارب مع خلفيات `bg-surface` الفاتحة، واعتمد على متغيرات النظام (`bg-surface`, `bg-app`, `text-text-primary`, `text-text-secondary`, `border-border`).

---

### المهمة 1.2: إنشاء مكون النوافذ المنبثقة الموحد (`src/app/components/ui/Modal.tsx`) ومكون التأكيد (`src/app/components/ui/ConfirmDialog.tsx`)

يوجد حالياً 4 طرق مختلفة لإنشاء الـ Modals في المشروع. قم بإنشاء مكون قياسي واحد:

1. **أنشئ ملف `src/app/components/ui/Modal.tsx`:**
   - يعتمد على عنصر `<dialog>` الأصلي مع `showModal()` و `close()`.
   - يدعم الخصائص التالية:
     - `isOpen: boolean`
     - `onClose: () => void`
     - `title: string`
     - `subtitle?: string`
     - `size?: "sm" | "md" | "lg" | "xl"` (`max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-2xl`)
     - `disableClose?: boolean` (لمنع الإغلاق أثناء التحميل `isSubmitting`)
     - `children: React.ReactNode`
     - `footer?: React.ReactNode`
   - يحتوي على Header موحد (العنوان + الوصف الفرعي + زر إغلاق `CloseIcon` مع `aria-label={t("common.close")}`)، ومنطقة محتوى قابلة للتمرير `overflow-y-auto p-6`، و Footer اختياري `border-t border-border px-6 py-4 bg-neutral-50/60 flex items-center justify-end gap-3`.
   - يعيد الـ Focus للعنصر السابق عند الإغلاق، ويغلق عند الضغط على الـ Backdrop أو زر `Escape`.

2. **أنشئ ملف `src/app/components/ui/ConfirmDialog.tsx`:**
   - يستخدم `Modal.tsx` بحجم `sm`.
   - يعرض أيقونة تنبيه أو حذف، عنوان التأكيد، رسالة التوضيح، وزرين (إلغاء `.button-secondary` وتأكيد `.button-danger` أو `.button-primary` مع `SpinnerIcon` أثناء التنفيذ).

3. **استبدل النوافذ العشوائية في المشروع بـ `Modal` و `ConfirmDialog`:**
   - `src/app/components/AddApplicationModal.tsx`: استخدم `<Modal>` ووحد جميع الحقول لتستخدم `.field-label` و `.field-control` و `.field-control-error`.
   - `src/app/components/EditApplicationModal.tsx`: استخدم `<Modal>` ووحد جميع الحقول لتستخدم `.field-label` و `.field-control`.
   - `src/app/components/DeleteConfirmModal.tsx`: استخدم `<ConfirmDialog>`.
   - `src/app/routes/application-details.tsx`: استبدل الـ `<div className="fixed inset-0...">` الخاص بـ `isPromptingClosedOutcome` بمكون `<Modal>`.
   - `src/app/components/KanbanView.tsx`: استبدل الـ `<div>` الخاص بـ `pendingClosedApp` بمكون `<Modal>`.
   - `src/app/features/admin/AdminMembersPage.tsx`: استبدل نوافذ `removing` و `assigning` بمكون `<Modal>` / `<ConfirmDialog>`.
   - `src/app/features/admin/components/AdminMemberTasks.tsx` و `src/app/features/professional-development/components/TaskDetailDrawer.tsx`: استبدل جميع استدعاءات `window.confirm(...)` بمكون `<ConfirmDialog>`.

4. **توحيد باقي حقول الإدخال في المشروع:**
   - في `src/app/features/profile/ProfileForm.tsx`: استبدل كلاسات الـ `<input>` اليدوية بـ `field-control` و `field-control-error`.
   - في `src/app/routes/applications.tsx`: حدّث حقل البحث ليستخدم `field-control ps-9 py-2`.
   - احذف الملف غير المستخدم `src/app/components/Navbar.tsx`.

---

### المهمة 1.3: إنشاء نظام إشعارات التفاعل الفوري (`src/app/components/ui/ToastProvider.tsx`)

لحل مشكلة غياب التغذية الراجعة بعد تنفيذ الأفعال (حيث لا يعرف المستخدم هل تم الحفظ أو النقل أم لا):

1. **أنشئ `src/app/components/ui/ToastProvider.tsx`:**
   - يوفر `ToastContext` و Hook باسم `useToast()` يحتوي على دالة `showToast({ message: string, variant?: "success" | "error" | "info" })`.
   - يعرض الإشعارات في زاوية الشاشة (`fixed bottom-5 end-5 z-[120] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none`) مع تصميم بطاقة أنيقة:
     - `success`: خلفية `bg-surface` مع حد جانبي `border-s-4 border-s-success-strong` وأيقونة `CheckIcon` خضراء.
     - `error`: خلفية `bg-surface` مع حد جانبي `border-s-4 border-s-danger-strong` وأيقونة تنبيه حمراء.
     - `info`: خلفية `bg-surface` مع حد جانبي `border-s-4 border-s-info-strong`.
   - يختفي الإشعار تلقائياً بعد `4000ms` مع زر إغلاق يدوي `×`.
2. **قم بتغليف التطبيق بـ `<ToastProvider>` داخل `src/app/root.tsx`** (بداخل `<I18nProvider>`).

---

## المرحلة 2: إصلاح الحالات الأربع (Loading, Empty, Error, Success)، التباين اللوني، وتفاصيل الـ UI

### المهمة 2.1: إعادة تصميم بطاقات الكانبان (`KanbanView.tsx`) وألوان المراحل (`ProgressCount.tsx`)

بطاقات الكانبان الحالية تستخدم خلفيات ملونة ثقيلة تضعف قراءة النصوص. سنحولها إلى تصميم البطاقات النظيفة ذات الأيقونات والشارات الناعمة (Soft Pastel Accents on Clean White Surface):

1. **في `src/app/components/KanbanView.tsx`:**
   - عدّل دالة `getApplicationCardColor(app: Application)` لتجعل البطاقة دائماً ذات خلفية بيضاء نظيفة (`bg-surface`) مع شريط جانبي ملون (`border-s-4`) يوضح المرحلة أو النتيجة:
     - `INTERVIEW`: `"bg-surface border-border border-s-4 border-s-info-strong hover:border-border-hover"`
     - `DECISION`: `"bg-surface border-border border-s-4 border-s-warning-strong hover:border-border-hover"`
     - `CLOSED` + `ACCEPTED`: `"bg-surface border-border border-s-4 border-s-success-strong hover:border-border-hover"`
     - `CLOSED` + `REJECTED`: `"bg-surface border-border border-s-4 border-s-danger-strong hover:border-border-hover"`
     - `CLOSED` + `NO_RESPONSE`: `"bg-surface border-border border-s-4 border-s-warning-strong hover:border-border-hover"`
     - `APPLIED` أو غيرها: `"bg-surface border-border border-s-4 border-s-neutral-400 hover:border-border-hover"`
   - استبدل الـ `conic-gradient` المشوش في رأس عمود `CLOSED` بلون نقطة واضح (`bg-neutral-600`) مع أيقونة مرحلة صغيرة بجانب عنوان العمود.
2. **في `src/app/features/members-progress/components/ProgressCount.tsx`:**
   - استبدل أكواد الـ Hex اليدوية في `STAGE_STYLES` بكلاسات تعتمد على متغيرات `app.css`:
     - `applied`: `"border-border bg-neutral-soft text-neutral-strong"`
     - `interview`: `"border-info-border bg-info-soft text-info-strong"`
     - `decision`: `"border-warning-border bg-warning-soft text-warning-strong"`
     - `closed`: `"border-border-strong bg-neutral-100 text-neutral-800"`

---

### المهمة 2.2: إصلاح الأيقونات، الأسهم في الـ RTL، والأخطاء البصرية الدقيقة

1. **إزالة علامة `+` المكررة في الأزرار:**
   - في `src/app/routes/dashboard.tsx` (السطر ~138) وفي `src/app/routes/applications.tsx` (السطر ~211):
     - غيّر `<span>+ {t("common.addApplication")}</span>` إلى `<span>{t("common.addApplication")}</span>` لأن `<PlusIcon />` موجودة بالفعل بجانب النص.
2. **إضافة أيقونات SVG نظيفة في `src/app/components/Icons.tsx`:**
   - أضف الأيقونات التالية: `DocumentPdfIcon`, `ArrowUpIcon`, `ArrowDownIcon`, `BellIcon`, `PlayCircleIcon`, `SparklesIcon`, `AlertCircleIcon`, `ClockIcon`.
3. **استبدال الرموز النصية البدائية بالأيقونات:**
   - في `src/app/components/PipelineTimeline.tsx`: استبدل `✓` بـ `<CheckIcon className="w-4 h-4" />`، واستبدل `●` و `○` بدوائر CSS نظيفة (`w-2.5 h-2.5 rounded-full bg-current`).
   - في `src/app/features/profile/ProfileForm.tsx`: استبدل الرمز النصي `▤` بـ `<DocumentPdfIcon className="w-5 h-5" />`.
   - في `src/app/features/admin/components/AdminMemberTasks.tsx`: استبدل `↑` و `↓` بـ `<ArrowUpIcon className="w-3.5 h-3.5" />` و `<ArrowDownIcon className="w-3.5 h-3.5" />`.
4. **إصلاح اتجاه الأسهم في اللغة العربية (RTL):**
   - في `src/app/components/TableView.tsx`: استبدل `{t("applications.view")} →` بـ:
     ```tsx
     <span className="inline-flex items-center gap-1">
       <span>{t("applications.view")}</span>
       <ArrowLeftIcon className="w-3.5 h-3.5 rotate-180 rtl:rotate-0" />
     </span>
     ```
   - في `src/app/features/admin/components/AdminActivityList.tsx`: استبدل السهم الثابت `→` بـ `{locale === "ar" ? "←" : "→"}` كما هو مطبق في `RecentActivityList.tsx`.

---

### المهمة 2.3: توحيد الحالات الأربع (Loading, Empty, Error, Success)

1. **حالة التحميل (Loading State):**
   - في `src/app/features/admin/components/AdminUI.tsx`: حدّث `LoadingState` ليعرض `<SpinnerIcon className="h-5 w-5 text-neutral-500" />` بجانب نص التحميل بدلاً من النص الصامت.
   - في `src/app/features/profile/ProfileCompletionGate.tsx`، `src/app/features/auth/components/ProtectedRoute.tsx`، و `src/app/features/profile/CvViewer.tsx`: أضف `<SpinnerIcon className="h-5 w-5 text-neutral-500 me-2" />` بجانب نصوص التحميل.
   - في `src/app/routes/applications.tsx`:
     - أصلح دالة `loadData()` بحيث لا تستدعي `api.getApplications()` مرتين متتاليتين إذا كانت الفلاتر في وضع `ALL`، وأضف حالة `isRefreshing` تضيف `opacity-60 transition-opacity` على الجدول/الكانبان أثناء تغيير الفلتر أو البحث.
2. **حالة الفراغ (Empty State):**
   - في `src/app/components/EmptyState.tsx`: اجعل المكون يدعم تمرير `icon?: React.ReactNode`, `actionLabel?: string`, `onActionClick?: () => void`, `compact?: boolean` بحيث يمكن استخدامه في أي قسم.
   - استخدم `<EmptyState compact ... />` في:
     - `src/app/routes/dashboard.tsx` (عندما تكون `recentApplications` فارغة، اعرض زر إضافة أول طلب وظيفة يفتح `openAddModal`).
     - `src/app/features/members-progress/components/RecentActivityList.tsx` (عند عدم وجود نشاط حديث).
     - `src/app/features/admin/components/AdminUI.tsx` (`EmptyState`).
3. **حالة الخطأ (Error State):**
   - في `src/app/routes/application-details.tsx`: استبدل `alert(t("common.unexpectedError"))` باستدعاء `showToast({ message: t("common.unexpectedError"), variant: "error" })`.
   - في `src/app/features/admin/components/AdminUI.tsx`: حدّث `ErrorState` ليظهر بتنسيق خطأ دلالي واضح (`rounded-xl border border-danger-border bg-danger-soft/30 px-5 py-8 text-center`) مع `<AlertCircleIcon className="mx-auto mb-2 h-6 w-6 text-danger-strong" />`.
   - في `src/app/features/admin/api/adminApi.ts`: أضف `error.code = response.status === 401 || response.status === 403 ? "PERMISSION_DENIED" : "REQUEST_FAILED"` واستخدم مفاتيح الترجمة `t("admin.permissionError")` و `t("admin.actionFailed")` في واجهات الـ Admin.
4. **حالة النجاح والاكتمال (Success State):**
   - اربط `useToast()` لإظهار رسالة نجاح خضراء في الحالات التالية:
     - بعد إضافة طلب جديد في `layout.tsx` (`t("applications.applicationCreated")`).
     - بعد تعديل طلب أو تغيير مرحلته في `application-details.tsx` و `KanbanView.tsx` (`t("applications.applicationUpdated")`).
     - بعد حذف طلب في `application-details.tsx` (`t("applications.applicationDeleted")`).
     - بعد حفظ الملف المهني في `ProfilePage.tsx` و `ProfileCompletionGate.tsx` (`t("profile.savedSuccess")`).
     - بعد إنشاء أو تحديث أو حذف مهمة في `TasksPage.tsx` و `TaskDetailDrawer.tsx`.
   - **إصلاح إشعار إنشاء الحساب في `src/app/features/auth/components/AuthForm.tsx`:**
     - اقرأ `const notice = (location.state as { notice?: string } | null)?.notice;` واعرضه في صندوق تنبيه أخضر (`border-success-border bg-success-soft text-success-strong`) أعلى نموذج تسجيل الدخول.

---

## المرحلة 3: تطوير تجربة المستخدم (UX Transformation, Onboarding, Companion Persona & Analytics)

### المهمة 3.1: إعادة تصميم صفحة تسجيل الدخول والتسجيل (`src/app/features/auth/components/AuthForm.tsx`)

لزيادة معدل الاستحواذ وتوضيح قيمة المنصة منذ اللحظة الأولى، حوّل `AuthForm.tsx` من صندوق معزول إلى تصميم **Split-Screen Layout**:

1. **الهيكل العام (`grid min-h-screen lg:grid-cols-2 bg-app`):**
   - **الجانب الأول (نموذج الدخول/التسجيل):**
     - بطاقة نظيفة متمركزة تحتوي على الشعار، مبدل اللغة `LanguageSwitcher`، العنوان الترحيبي، رسائل التنبيه (`notice` أو `error`)، حقول الإدخال الموحدة، وزر Google.
   - **الجانب الثاني (لوحة القيمة الترحيبية - Value Proposition & Video Preview Panel):**
     - يظهر في الشاشات المتوسطة والكبيرة (`hidden lg:flex flex-col justify-between bg-neutral-900 text-white p-12 relative overflow-hidden`) وكموجز مدمج أعلى الفورم في الموبايل.
     - يعرض:
       1. شارة علوية: `t("auth.heroBadge")` ("مجتمع التطوير المهني والبحث عن عمل").
       2. عنوان رئيسي ملهم: `t("auth.heroTitle")` ("ابدأ رحلتك المهنية في بيئة تفاعلية مع مجموعتك وموجهك").
       3. وصف مختصر: `t("auth.heroDescription")` يشرح كيف تساعد المنصة العضو على تنظيم تقديماته، إنجاز مهام التطوير المهني، والتفاعل مع مجموعته.
       4. **بطاقة الفيديو التعريفي المختصر (`Onboarding Video Card`):**
          - زر تفاعلي بتصميم بطاقة زجاجية (`bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/15 transition`) يحتوي على `<PlayCircleIcon className="w-10 h-10 text-info-soft shrink-0" />` وعنوان `t("auth.watchIntroTitle")` ("شاهد كيف تعمل المنصة في 90 ثانية") ووصف `t("auth.watchIntroSubtitle")`، يفتح نافذة `<Modal>` تعرض الفيديو التوضيحي أو جولة مصورة سريعة للمنصة.
       5. **3 بطاقات مصغرة للمميزات (Feature Pills):**
          - متابعة منظمة لطلبات التوظيف (`Kanban & Table`).
          - مهام وتوجيه مباشر من المينتور (`Mentor Feedback`).
          - تفاعل وتحفيز مشترك مع مجموعتك (`Group Progress`).

---

### المهمة 3.2: تحويل `ProfileCompletionGate.tsx` إلى معالج تهيئة تدريجي من 3 خطوات (3-Step Onboarding Wizard)

لحل مشكلة **"عدم فهم العضو لما هو مطلوب منه بعد التسجيل"**، قم بتحويل `src/app/features/profile/ProfileCompletionGate.tsx` إلى رحلة تهيئة واضحة من 3 خطوات:

1. **مؤشر تقدم الخطوات (Stepper Header):**
   - يعرض 3 خطوات في أعلى النافذة:
     - **الخطوة 1:** `t("profile.onboardingStep1Title")` ("كيف تعمل المنصة؟")
     - **الخطوة 2:** `t("profile.onboardingStep2Title")` ("إعداد ملفك المهني")
     - **الخطوة 3:** `t("profile.onboardingStep3Title")` ("خطة انطلاقك")
2. **محتوى الخطوة 1 (الفهم والتوقعات + الفيديو المختصر):**
   - ترحيب باسم المستخدم (`user?.name`).
   - مشغل/بطاقة الفيديو التعريفي المختصر الذي يشرح رحلة العضو داخل "نواة".
   - **3 بطاقات واضحة بعنوان "ما المطلوب منك أسبوعياً في مجموعتك؟":**
     1. **تسجيل وتحديث طلبات التوظيف:** إضافة الوظائف التي تقدم عليها وتحديث مرحلتها أولاً بأول.
     2. **تنفيذ مهام التطوير المهني:** مراجعة المهام المسندة لك من المينتور وتحديث قائمة الخطوات (`Checklist`).
     3. **التفاعل مع مجموعتك:** متابعة تقدم زملائك ومشاركة الفرص في الشركات المشتركة.
   - زر "فهمت، لنبدأ إعداد الملف المهني $\leftarrow$" ينقل للخطوة 2.
3. **محتوى الخطوة 2 (إعداد الملف المهني):**
   - يعرض مكون `<ProfileForm onboarding ... />` لرفع الـ CV وإضافة رابط البورتفوليو مع توضيح أن هذه البيانات تساعد المينتور وأعضاء مجموعتك على مراجعة ملفك وتقديم نصائح دقيقة.
   - عند الحفظ، ينتقل للخطوة 3 (أو يحفظ حالة إكمال الخطوة).
4. **محتوى الخطوة 3 (أول خطوة عملية - First Action):**
   - رسالة تهنئة باكتمال الملف المهني، مع زرين واضحين:
     - زر رئيسي: "إضافة أول طلب توظيف الآن" (يفتح الصفحة الرئيسية مع فتح نافذة إضافة طلب).
     - زر ثانوي: "استكشاف مهام التطوير المهني" (يوجه إلى `/professional-development`).

---

### المهمة 3.3: بناء الشخصية التفاعلية المساعدة ومركز الإشعارات والتذكيرات (`CompanionCard.tsx` & `NotificationCenter.tsx`)

تطبيقاً لرؤية وجود **شخصية مرتبطة بالإشعارات والمهام** وتذكير المستخدم بالوظائف التي لم يتم الرد عليها (`NO_RESPONSE`):

1. **أنشئ مكون `src/app/components/CompanionCard.tsx` (مرشد نواة الذكي - Nawah Companion):**
   - يستقبل بيانات المستخدم (`stats`, `applications`, `unreadFeedbackCount`, `overdueTasksCount`, `activeTasksCount`).
   - يولد رسالة توجيهية ذكية وأولوية عمل واحدة (Single Clear Call-To-Action) بناءً على حالة العضو:
     - **الحالة أ (طلبات تقديم مر عليها أكثر من 10 أيام في مرحلة `APPLIED` أو انتقلت إلى `NO_RESPONSE`):**
       - ينبه المستخدم: *"لديك {count} طلبات توظيف مر عليها فترة دون تحديث أو انتقلت لعدم الرد. راجعها الآن لتحديث حالتها أو المتابعة مع الشركات."* مع زر ينقله للطلبات المعلقة.
     - **الحالة ب (ملاحظات غير مقروءة من المينتور أو مهام متأخرة):**
       - ينبه المستخدم بوجود ملاحظة جديدة من المينتور أو مهمة تحتاج اهتمامه مع زر مباشر لفتحها.
     - **الحالة ج (مستخدم جديد ليس لديه أي طلبات توظيف):**
       - يشجعه على إضافة أول طلب توظيف له لكسر حاجز البداية.
     - **الحالة د (كل شيء محدث):**
       - رسالة تحفيزية تعرض معدل تقدمه وتقترح عليه الاطلاع على نشاط مجموعته.
   - يصمم بتصميم مريح بصرياً (خلفية `bg-surface`، أيقونة شخصية/مساعد داخل مربع بخلفية ناعمة `bg-info-soft text-info-strong rounded-2xl p-3`، نص واضح، وزر إجراء مباشر).

2. **أنشئ مكون `src/app/components/NotificationCenter.tsx` وادمجه في `src/app/components/AppSidebar.tsx`:**
   - أضف زر جرس إشعارات (`BellIcon`) بجانب مبدل اللغة في `AppSidebar.tsx` (على الديسكتوب والموبايل) مع شارة عدد التنبيهات غير المقروءة.
   - عند الضغط عليه، يفتح قائمة منسدلة تعرض:
     - تنبيهات ملاحظات المينتور غير المقروءة.
     - تنبيهات الوظائف التي تحتاج متابعة أو تحولت إلى `NO_RESPONSE`.
     - **خيار تفعيل تذكيرات البريد الإلكتروني (`Email Reminder Toggle`):** مفتاح تبديل (Switch) يحفظ رغبة المستخدم في تلقي تذكير عبر البريد الإلكتروني عند انتقال وظائفه إلى خانة "عدم الرد" أو وجود ملاحظات جديدة من المينتور.

---

### المهمة 3.4: إعادة هيكلة الداشبورد (`src/app/routes/dashboard.tsx`)

لحل مشكلة عدم فهم المستخدم للداشبورد عند دخوله لأول مرة:

1. **القسم الأول (في الأعلى): مركز الانطلاق والتوجيه (`CompanionCard`):**
   - يظهر في مقدمة الصفحة ليجيب فوراً على سؤال المستخدم: *"ماذا يجب أن أفعل اليوم؟"*.
2. **القسم الثاني: مهام التطوير المهني والملاحظات (`ProfessionalDevelopmentSummary`):**
   - يظهر مباشرة بعد بطاقة التوجيه لأن المهام والفيدباك هي المحرك الرئيسي للتفاعل اليومي.
3. **القسم الثالث: التقييم والقياس (`Evaluation & Pipeline Metrics`):**
   - اعرض بطاقات مراحل التوظيف الأربع (`STAGE_PRESENTATION`) تحت عنوان واضح: `t("dashboard.evaluationSectionTitle")` ("التقييم وقياس التقدم") مع وصف توضيحي يشرح للمستخدم فائدة هذه الأرقام وكيف تساعده في معرفة مرحلة الاختناق في رحلة بحثه عن عمل.
   - صمم البطاقات الأربع بأسلوب البطاقات النظيفة مع أيقونة ملونة بخلفية ناعمة (`ProgressStageIcon` داخل مربع `rounded-xl p-2.5 bg-info-soft/70`) ليتماشى مع الهوية البصرية المريحة.
4. **القسم الرابع: تفاعل المجموعة وآخر الطلبات (`Group Activity & Recent Applications`).**

---

### المهمة 3.5: إضافة طبقة قياس بيانات الـ UX واختبارات الـ A/B (`src/app/utils/uxAnalytics.ts`)

لضمان قياس أثر التعديلات على هدفي المنصة (الوصول لـ 50 عضواً في 5 مجموعات، وزيادة التفاعل بنسبة 70%):

1. **أنشئ ملف `src/app/utils/uxAnalytics.ts`:**
   - يوفر دالة `trackUxEvent(eventName: UxEventName, metadata?: Record<string, string | number | boolean>)` تحفظ سجل الأحداث محلياً في `localStorage` تحت مفتاح `nawah_ux_telemetry` (مع إمكانية إرسالها للـ Backend مستقبلاً)، وتشمل الأحداث التالية:
     - `onboarding_step_viewed`
     - `onboarding_video_opened`
     - `onboarding_completed`
     - `companion_cta_clicked`
     - `application_created`
     - `application_stage_changed`
     - `task_status_updated`
     - `feedback_opened`
   - يوفر Hook باسم `useUxExperiment(experimentId: "dashboard_layout_v2")`:
     - يدعم التبديل بين النسخة `A` (الترتيب الكلاسيكي: الإحصائيات أولاً) والنسخة `B` (الترتيب الموجه بالفعل: مركز التوجيه والمهام أولاً ثم قسم التقييم والقياس)، مع إمكانية تغيير النسخة من لوحة تحكم الـ Admin لاختبار أي النسختين تحقق تفاعلاً أعلى.
2. **عرض مؤشرات الـ UX في لوحة الإدارة (`src/app/features/admin/AdminOverviewPage.tsx`):**
   - أضف قسم **"مؤشرات الأهداف وتجربة المستخدم (UX & Growth Targets)"** في `AdminOverviewPage.tsx` يعرض:
     - **شريط تقدم هدف الاستحواذ:** عدد المستخدمين الحاليين من أصل **50 عضواً مستهدفاً (5 مجموعات)** مع نسبة مئوية واضحة.
     - **معدل التفاعل النشط على مستوى المجموعات:** نسبة الأعضاء النشطين (`activeUsersCount / usersCount`) مقارنة بهدف الـ **70% تفاعل**.
     - **مفتاح معاينة تجربة الـ A/B (`A/B Variant Switcher`):** يسمح للمشرف/مصمم الـ UX بمعاينة وتبديل تخطيط الصفحة الرئيسية (`Variant A` مقابل `Variant B`) ومشاهدة إحصائيات التفاعل المسجلة.

---

## مرجع مفاتيح الترجمة المطلوب إضافتها (Translation Keys Reference)

تأكد من إضافة المفاتيح التالية في ملفات اللغة العربية (`src/app/i18n/locales/ar/`) والإنجليزية (`src/app/i18n/locales/en/`):

### 1. في `auth.ts`:
- `heroBadge`:
  - **AR:** `"منصة نواة للتوجيه والتطوير المهني"`
  - **EN:** `"Nawah Mentoring & Career Platform"`
- `heroTitle`:
  - **AR:** `"ابدأ رحلتك المهنية بخطوات واضحة مع مجموعتك وموجهك"`
  - **EN:** `"Start your career journey with clear steps alongside your group and mentor"`
- `heroDescription`:
  - **AR:** `"نظّم طلبات التوظيف، أنجز مهامك التدريبية، واحصل على ملاحظات مباشرة تساعدك على الوصول لهدفك الوظيفي."`
  - **EN:** `"Organize job applications, complete training tasks, and receive direct mentor feedback to reach your career goal."`
- `watchIntroTitle`:
  - **AR:** `"شاهد كيف تعمل المنصة في 90 ثانية"`
  - **EN:** `"Watch how the platform works in 90 seconds"`
- `watchIntroSubtitle`:
  - **AR:** `"شرح سريع لرحلتك داخل المجموعة وكيفية الاستفادة القصوى من المنصة"`
  - **EN:** `"A quick walkthrough of your group journey and how to get the most out of Nawah"`
- `featureTrackTitle`:
  - **AR:** `"متابعة منظمة للتقديمات"`
  - **EN:** `"Structured application tracking"`
- `featureMentorTitle`:
  - **AR:** `"توجيه ومهام من المينتور"`
  - **EN:** `"Mentor tasks & guidance"`
- `featureGroupTitle`:
  - **AR:** `"تفاعل وتحفيز جماعي"`
  - **EN:** `"Group progress & peer motivation"`

### 2. في `profile.ts`:
- `savedSuccess`:
  - **AR:** `"تم حفظ ملفك المهني بنجاح."`
  - **EN:** `"Your professional profile has been saved."`
- `onboardingStep1Title`:
  - **AR:** `"١. كيف تعمل المنصة؟"`
  - **EN:** `"1. How it works"`
- `onboardingStep2Title`:
  - **AR:** `"٢. ملفك المهني"`
  - **EN:** `"2. Professional profile"`
- `onboardingStep3Title`:
  - **AR:** `"٣. خطوة الانطلاق"`
  - **EN:** `"3. First step"`
- `onboardingWelcomeTitle`:
  - **AR:** `"أهلاً بك في مشروع نواة"`
  - **EN:** `"Welcome to Nawah Project"`
- `onboardingWelcomeSubtitle`:
  - **AR:** `"لكي تحقق أقصى استفادة مع مجموعتك، إليك المطلوب منك ببساطة كل أسبوع:"`
  - **EN:** `"To get the most out of your group, here is what is expected of you each week:"`
- `expectation1Title`:
  - **AR:** `"سجّل وحدّث طلبات التوظيف"`
  - **EN:** `"Log and update job applications"`
- `expectation1Desc`:
  - **AR:** `"أضف كل وظيفة تتقدم إليها وحدّث مرحلتها عند إجراء مقابلة أو تلقي رد."`
  - **EN:** `"Add every job you apply for and update its stage as you interview or hear back."`
- `expectation2Title`:
  - **AR:** `"أنجز مهام التطوير المهني"`
  - **EN:** `"Complete professional development tasks"`
- `expectation2Desc`:
  - **AR:** `"تابع المهام التي يسندها لك المينتور وطبّق الملاحظات الموجهة لك."`
  - **EN:** `"Follow tasks assigned by your mentor and apply their feedback."`
- `expectation3Title`:
  - **AR:** `"تفاعل مع مجموعتك"`
  - **EN:** `"Engage with your group"`
- `expectation3Desc`:
  - **AR:** `"اطّلع على تقدم زملائك في المجموعة وتعاونوا في الشركات المشتركة."`
  - **EN:** `"Check your peers' progress and collaborate on shared target companies."`
- `nextToProfileSetup`:
  - **AR:** `"واضح، لنكمل إعداد الملف المهني"`
  - **EN:** `"Got it, let's set up my profile"`
- `onboardingReadyTitle`:
  - **AR:** `"اكتمل إعداد حسابك بنجاح!"`
  - **EN:** `"Your account setup is complete!"`
- `onboardingReadyDesc`:
  - **AR:** `"ابدأ الآن بإضافة أول طلب توظيف لك أو استعرض مهامك التدريبية."`
  - **EN:** `"Start now by adding your first job application or reviewing your tasks."`

### 3. في `dashboard.ts`:
- `companionTitle`:
  - **AR:** `"مرشد نواة — خطوتك التالية"`
  - **EN:** `"Nawah Companion — Your next step"`
- `companionStaleApps`:
  - **AR:** `"لديك {count} طلبات توظيف لم يتم تحديثها منذ فترة أو انتقلت لعدم الرد. راجعها الآن لتحديث حالتها."`
  - **EN:** `"You have {count} applications with no recent updates or marked as no response. Review them now."`
- `companionUnreadFeedback`:
  - **AR:** `"أرسل لك المينتور {count} ملاحظات جديدة. اطّلع عليها لتطوير خطواتك القادمة."`
  - **EN:** `"Your mentor sent {count} new feedback items. Review them to guide your next steps."`
- `companionFirstApp`:
  - **AR:** `"لم تضف أي طلب توظيف بعد. ابدأ بإضافة أول وظيفة تقدمت إليها لننظم رحلتك معاً."`
  - **EN:** `"You haven't added any applications yet. Add your first job application to start tracking."`
- `companionAllGood`:
  - **AR:** `"أداؤك ممتاز! استمر في تحديث تقديماتك ومراجعة تقدم زملائك في المجموعة."`
  - **EN:** `"Great momentum! Keep updating your applications and checking your group's progress."`
- `evaluationSectionTitle`:
  - **AR:** `"التقييم وقياس التقدم"`
  - **EN:** `"Evaluation & Pipeline Measurement"`
- `evaluationSectionDesc`:
  - **AR:** `"توزيع طلباتك عبر مراحل التوظيف لمساعدتك على قياس معدل التحول للوصول للمقابلات."`
  - **EN:** `"Your application distribution across stages to help measure interview conversion."`
- `notificationsTitle`:
  - **AR:** `"التنبيهات والتذكيرات"`
  - **EN:** `"Notifications & Reminders"`
- `emailRemindersLabel`:
  - **AR:** `"تذكير عبر البريد عند عدم الرد أو الملاحظات الجديدة"`
  - **EN:** `"Email reminders for no-response jobs & new feedback"`
- `noNotifications`:
  - **AR:** `"لا توجد تنبيهات جديدة حالياً."`
  - **EN:** `"No new notifications right now."`

---

## قائمة التحقق النهائية (Verification Checklist for Antigravity Agent)

بعد الانتهاء من تنفيذ جميع المهام أعلاه، تحقق من النقاط التالية:
- [ ] تشغيل فحص الأنواع (`npx react-router typegen && npx tsc --noEmit`) والتأكد من عدم وجود أي خطأ برمجي.
- [ ] التأكد من أن جميع النوافذ المنبثقة (`Modals`) والفورم تستخدم المكونات والكلاسات الموحدة (`.field-control`, `<Modal>`, `<ConfirmDialog>`).
- [ ] التأكد من عدم وجود أي استدعاء لـ `window.alert` أو `window.confirm` في الكود.
- [ ] التأكد من ظهور إشعار `Toast` عند الإضافة، التعديل، الحذف، وتغيير الحالة.
- [ ] التأكد من أن بطاقات `KanbanView` ذات خلفية بيضاء مريحة وتباين نصوص واضح.
- [ ] التأكد من عمل التصميم المقسم (`Split-Screen`) في صفحة الدخول، ومعالج الـ 3 خطوات في `ProfileCompletionGate`، وبطاقة الشخصية المساعدة `CompanionCard` في الداشبورد باللغتين العربية والإنجليزية.