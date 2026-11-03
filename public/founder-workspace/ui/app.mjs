import { createSeed, LEVEL_LABELS, KIND_LABELS, STATUS_LABELS, REVIEW_QUESTIONS } from '../domain/seed.mjs';
import { copy, validateDocument, parseImport, uid, localToday, addDays, daysBetween, safeLink, scheduleProposal, applySchedule, shiftCycle, recurringTasks, splitTask, warnings, LEVELS } from '../domain/model.mjs';
import { ApiRepository } from '../infrastructure/api-repository.mjs';
import { Workspace } from '../application/workspace.mjs';
import { shell, h, tr, label, dateLabel, icon, button, option, cycleOf, consultingContent, architectureContent, warningText, timelineRange } from './render.mjs';

const app = document.getElementById('app'), dialog = document.getElementById('editor'), notifications = document.getElementById('notifications');
const config = await fetch(new URL('../config.json', import.meta.url), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Workspace configuration unavailable'); return r.json(); });
const repository = new ApiRepository(config.apiUrl), workspace = new Workspace(repository, () => copy(repository.template || createSeed()));
const viewNames = ['overview', 'loop', 'timeline', 'today', 'review'];
const initialView = location.hash.slice(1);
const state = { language: new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar', view: viewNames.includes(initialView) ? initialView : 'overview', cycleId: 'cycle-1', horizon: 6, today: localToday(), selectedDay: localToday(), span: 15, timelineAnchor: '', kindFilter: '', taskScope: 'day', collapsed: new Set(), loopStep: 0, readOnly: false, conflict: false, storageProblem: '' };
let editorState = null, pendingImport = null;
try { await workspace.load(); state.cycleId = workspace.document.settings.currentCycleId; state.readOnly = !repository.canWrite; workspace.readOnly = state.readOnly; }
catch (error) {
  app.innerHTML = `<main style="max-width:720px;margin:15vh auto;padding:30px"><h1>مساحة المؤسس</h1><p>تعذر فتح مساحة العمل. تأكد من تسجيل الدخول وصلاحية الوصول، ثم أعد المحاولة. لم تُعرض بيانات محفوظة من حساب آخر.</p><p>Unable to open the workspace. Check your session and permissions, then retry.</p><a class="button" href="/admin" target="_top">العودة إلى الإدارة / Back to admin</a> <button class="button primary" type="button" id="retry-load">إعادة المحاولة / Retry</button></main>`;
  document.getElementById('retry-load').addEventListener('click', () => location.reload());
  throw error;
}

function doc() { return workspace.document; }
function render(focusMain = false) {
  document.documentElement.lang = state.language; document.documentElement.dir = state.language === 'en' ? 'ltr' : 'rtl';
  document.title = tr(state, 'نواة — مساحة المؤسس', 'Nawah — Founder workspace');
  app.innerHTML = shell(doc(), state);
  drawMapConnections();
  if (focusMain) document.getElementById('main').focus({ preventScroll: true });
}
function notify(message) { notifications.textContent = message; notifications.classList.add('visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => notifications.classList.remove('visible'), 5500); }
const errorMessages = {
  BUSY: ['جارٍ حفظ تعديلك الحالي.', 'A save is already in progress.'],
  AUTH: ['انتهت الجلسة أو لم تعد الصلاحية متاحة. مسودتك باقية في هذه النافذة؛ صدّرها قبل تسجيل الدخول من جديد.', 'Your session or permission expired. Your draft remains here; export it before signing in again.'],
  NETWORK: ['تعذر الاتصال بالسيرفر. مسودتك باقية؛ حاول الحفظ مرة أخرى أو صدّرها.', 'The server is unreachable. Your draft is preserved; retry or export it.'],
  PLAN_TOO_LARGE: ['الخطة تجاوزت الحد الحالي 750 كيلوبايت. صدّر نسخة وقلّل المحتوى قبل الحفظ.', 'The plan exceeds the 750 KB limit. Export a copy and reduce its content.'],
  DATE: ['التاريخ غير صالح.', 'Invalid date.'], DATE_RANGE: ['نهاية المهمة يجب ألا تسبق بدايتها، والمدة بحد أقصى 367 يومًا.', 'The end must not precede the start; maximum duration is 367 days.'],
  TEXT: ['راجع النص المطلوب وطوله.', 'Check required text and length.'], FORMAT: ['صيغة البيانات غير صالحة أو غير مدعومة.', 'Invalid or unsupported data format.'],
  DUPLICATE: ['توجد معرفات مكررة في الملف.', 'The file contains duplicate identifiers.'], REFERENCE: ['بعض الروابط الداخلية تشير لسجلات غير موجودة.', 'Some references point to missing records.'],
  HOURS: ['راجع ساعات الجهد؛ يجب أن تكون أرقامًا موجبة أو صفرًا.', 'Effort hours must be valid non-negative numbers.'], URL: ['استخدم رابط http أو https صالحًا دون بيانات دخول.', 'Use a valid http or https URL without credentials.'],
  TIME: ['الموعد المحدد يحتاج يومًا واحدًا ووقت نهاية بعد البداية.', 'A timed appointment needs one date and an end time after its start.'],
  CYCLE: ['الدورة يجب أن تكون 15 يومًا ولها معرف صالح.', 'A cycle must span 15 days and have a valid identifier.'], CAPACITY: ['السعة اليومية بين صفر و16 ساعة.', 'Daily capacity must be between 0 and 16 hours.'],
  DEPENDENCY: ['اختر مهمة موجودة مختلفة كشرط سابق.', 'Choose a different existing task as the prerequisite.'], DEPENDENCY_CYCLE: ['هذا الاعتماد يصنع حلقة بين المهام. لم يتم الحفظ.', 'This dependency creates a cycle. Nothing was saved.'],
  EVIDENCE_REQUIRED: ['اربط دليلًا قبل اعتبار المستوى مدعومًا بأدلة.', 'Link evidence before marking the level as supported.'],
  RECURRENCE: ['التكرار بحد أقصى 180 يومًا و100 مرة، وتاريخ النهاية بعد البداية.', 'Recurrence is limited to 180 days and 100 occurrences; its end must follow its start.'],
  SPLIT: ['اختر جهدًا للجزء الجديد أكبر من صفر وأقل من جهد المهمة.', 'New-part effort must be positive and less than the original task effort.'],
  READ_ONLY: ['الكتابة غير متاحة بهذه الصلاحية أو أثناء محاكاة القراءة.', 'Read-only simulation is enabled. Disable it in settings to edit.'],
  CONFLICT: ['هناك نسخة أحدث. مسودتك لم تُفقد. صدّر مسودة النموذج ثم أغلقه وحمّل آخر نسخة.', 'A newer version exists. Your draft is preserved. Export this form draft, then close and load the latest copy.'],
  STORAGE_READ: ['تعذر تحميل بيانات السيرفر. لم نكتب فوقها.', 'Local storage could not be read; it was not overwritten.'],
  STORAGE_WRITE: ['تعذر تأكيد الحفظ على السيرفر. مسودتك ما زالت مفتوحة؛ حاول مرة أخرى أو صدّرها قبل الإغلاق.', 'Server save could not be confirmed. Your draft remains open; retry or export it before closing.'],
  IMPORT_SIZE: ['الملف أكبر من حد الاستيراد: 4 ميجابايت.', 'Import file exceeds the 4 MB limit.'],
};
function describe(error) { return (errorMessages[error.code] || [error.message || 'تعذر إتمام العملية.', error.message || 'Operation failed.'])[state.language === 'en' ? 1 : 0]; }
function showError(error) {
  if (error.code === 'CONFLICT') { state.conflict = true; render(); }
  const message = describe(error), target = dialog.open && dialog.querySelector('.form-error');
  if (target) { target.hidden = false; target.innerHTML = `${h(message)} ${button('export-draft', tr(state, 'تصدير مسودة النموذج', 'Export form draft'), 'download', 'small')}`; target.focus(); }
  else notify(message);
}
async function transact(name, change) { try { await workspace.transact(name, change); state.storageProblem = ''; render(); return true; } catch (error) { showError(error); return false; } }
function changeView(view) { state.view = view; history.replaceState(null, '', `#${view}`); render(true); window.scrollTo({ top: 0, behavior: 'instant' }); }
function canEdit() { if (state.readOnly) { showError({ code: 'READ_ONLY' }); return false; } return true; }
function download(text, name, type = 'application/json') {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function dialogOpen(title, content, kind = 'info', data = {}) {
  editorState = { kind, ...data, initial: '' };
  dialog.innerHTML = `<div class="dialog-top"><div><span class="eyebrow">${tr(state, 'مساحة المؤسس', 'FOUNDER WORKSPACE')}</span><h2 id="dialog-title">${h(title)}</h2></div>${button('close-dialog', '', 'close', 'square', `aria-label="${tr(state, 'إغلاق', 'Close')}"`)}</div><div class="dialog-body">${content}</div>`;
  if (!dialog.open) dialog.showModal();
  const form = dialog.querySelector('form'); if (form) editorState.initial = JSON.stringify([...new FormData(form)]);
  dialog.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus();
}
function dirty() { const form = dialog.querySelector('form'); return form && editorState && JSON.stringify([...new FormData(form)]) !== editorState.initial; }
function closeDialog(force = false) {
  if (!force && dirty()) {
    const error = dialog.querySelector('.form-error'); if (error) { error.hidden = false; error.innerHTML = `${tr(state, 'هناك تعديل لم يُحفظ. يمكنك حفظه، أو تصدير مسودته، أو إغلاقه دون حفظ.', 'There are unsaved changes. Save them, export the draft, or close without saving.')} ${button('export-draft', tr(state, 'تصدير المسودة', 'Export draft'), 'download', 'small')}${button('discard-dialog', tr(state, 'إغلاق دون حفظ', 'Discard & close'), '', 'small')}`; error.focus(); return; }
  }
  dialog.close(); editorState = null;
}
const field = (text, input, cls = '') => `<label class="field ${cls}"><span>${h(text)}</span>${input}</label>`;
const input = (name, value = '', type = 'text', attrs = '') => `<input name="${name}" type="${type}" value="${h(value)}" ${attrs}>`;
const textarea = (name, value = '', attrs = '') => `<textarea name="${name}" rows="3" ${attrs}>${h(value)}</textarea>`;
const select = (name, options, attrs = '') => `<select name="${name}" ${attrs}>${options}</select>`;
const formError = '<div class="form-error" role="alert" tabindex="-1" hidden></div>';
const actions = () => `<div class="form-actions">${button('close-dialog', tr(state, 'إلغاء', 'Cancel'), '', '')}<button type="submit" class="button primary" ${state.readOnly ? 'disabled' : ''}>${icon('check')}${tr(state, 'حفظ التعديل', 'Save changes')}</button></div>`;
function taskEditor(id = '') {
  const d = doc(), cycle = cycleOf(d, state), existing = d.tasks.find(t => t.id === id), selectedDate = state.view === 'today' ? state.selectedDay : cycle.start;
  const t = existing || { id: uid('task'), title: '', titleEn: '', start: selectedDate, end: selectedDate, hours: 1, actualHours: 0, laneId: 'product', cycleId: cycle.id, kind: 'execution', status: 'planned', notes: '', deliverable: '', blocker: '', dependsOn: '', deadline: '', practiceId: '', resourceUrl: '', timeStart: '', timeEnd: '', actualStart: '', actualEnd: '', archived: false };
  const ws = existing ? warnings(d, id) : [];
  dialogOpen(existing ? tr(state, 'تفاصيل المهمة وتعديلها', 'Task details & edit') : tr(state, 'مهمة جديدة', 'New task'), `<form data-form="task">${formError}<div class="editor-context">${tr(state, 'سجل واحد في اليوم والجدول والخريطة. الحفظ هنا لا يغيّر أي مجال آخر في نواة.', 'One record across today, timeline, and map. Saving here changes no other Nawah domain.')}</div>
    ${field(tr(state, 'عنوان المهمة', 'Task title'), input('title', t.title, 'text', 'required maxlength="220"'))}
    <div class="form-grid">${field(tr(state, 'عنوان بالإنجليزية — اختياري', 'English title — optional'), input('titleEn', t.titleEn, 'text', 'maxlength="220"'))}${field(tr(state, 'الدورة', 'Cycle'), select('cycleId', d.cycles.map(c => option(c.id, `${c.number} · ${label(state, c)}`, c.id === t.cycleId)).join('')))}
    ${field(tr(state, 'مسار العمل', 'Work track'), select('laneId', d.lanes.map(l => option(l.id, label(state, l, 'label'), l.id === t.laneId)).join('')))}${field(tr(state, 'نوع الممارسة', 'Practice type'), select('kind', Object.entries(KIND_LABELS).map(([k, v]) => option(k, v[state.language === 'en' ? 1 : 0], k === t.kind)).join('')))}
    ${field(tr(state, 'البداية المخططة', 'Planned start'), input('start', t.start, 'date', 'required'))}${field(tr(state, 'النهاية المخططة', 'Planned end'), input('end', t.end, 'date', 'required'))}
    ${field(tr(state, 'الجهد المتوقع بالساعات', 'Estimated effort hours'), input('hours', t.hours, 'number', 'required min="0" max="1000" step="0.25"'))}${field(tr(state, 'موعد نهائي — اختياري', 'Deadline — optional'), input('deadline', t.deadline, 'date'))}
    ${field(tr(state, 'الحالة', 'Status'), select('status', Object.entries(STATUS_LABELS).map(([k, v]) => option(k, v[state.language === 'en' ? 1 : 0], k === t.status)).join('')))}${field(tr(state, 'ساعات فعلية — اختياري', 'Actual hours — optional'), input('actualHours', t.actualHours, 'number', 'min="0" max="10000" step="0.25"'))}</div>
    ${field(tr(state, 'المخرج ومعيار القبول', 'Deliverable & acceptance criteria'), textarea('deliverable', label(state, t, 'deliverable'), 'maxlength="3000"'))}
    ${field(tr(state, 'الملاحظات ودورك ودور Codex', 'Notes: your role & Codex’s role'), textarea('notes', label(state, t, 'notes'), 'maxlength="8000"'))}
    ${field(tr(state, 'العائق أو سبب التأجيل', 'Blocker or reason for delay'), input('blocker', t.blocker, 'text', 'maxlength="1000"'))}
    <details class="editor-details" ${t.dependsOn || t.timeStart || t.seriesId ? 'open' : ''}><summary>${tr(state, 'الروابط والاعتماديات والمواعيد والتكرار', 'Links, prerequisites, appointments & recurrence')}</summary><div class="form-grid">
    ${field(tr(state, 'تبدأ بعد انتهاء', 'Starts after completion of'), select('dependsOn', option('', tr(state, 'بدون اعتماد', 'No prerequisite'), !t.dependsOn) + d.tasks.filter(x => x.id !== t.id && !x.archived).map(x => option(x.id, x.title, x.id === t.dependsOn)).join('')))}
    ${field(tr(state, 'الممارسة المرتبطة', 'Related practice'), select('practiceId', option('', tr(state, 'غير مرتبطة', 'Not linked'), !t.practiceId) + d.practices.map(p => option(p.id, label(state, p), p.id === t.practiceId)).join('')))}
    ${field(tr(state, 'بداية موعد محدد — يوم واحد', 'Appointment start — single date'), input('timeStart', t.timeStart, 'time'))}${field(tr(state, 'نهاية الموعد', 'Appointment end'), input('timeEnd', t.timeEnd, 'time'))}
    ${!existing ? `${field(tr(state, 'التكرار', 'Repeat'), select('frequency', option('', tr(state, 'لا يتكرر', 'Does not repeat'), true) + option('daily', tr(state, 'يومي', 'Daily')) + option('weekly', tr(state, 'أسبوعي', 'Weekly'))))}${field(tr(state, 'آخر تاريخ للتكرار', 'Repeat through'), input('until', cycle.end, 'date'))}` : t.seriesId ? field(tr(state, 'نطاق تعديل السلسلة', 'Series edit scope'), select('seriesScope', option('one', tr(state, 'هذه المرة فقط', 'This occurrence only'), true) + option('future', tr(state, 'هذه والمخطط القادم منها', 'This and future planned occurrences')))) : ''}
    </div>${field(tr(state, 'رابط مورد أو دليل خارجي', 'Resource link'), input('resourceUrl', t.resourceUrl, 'url', 'placeholder="https://"'))}<p class="form-hint">${tr(state, 'التواريخ الفعلية لا تتغير بإعادة الجدولة. التكرار ينشئ مهام منفصلة يمكن مراجعتها.', 'Actual dates do not change when rescheduling. Repetition creates individual reviewable tasks.')}</p></details>
    ${existing && (t.actualStart || t.actualEnd) ? `<div class="small-note">${tr(state, 'السجل الفعلي', 'Actual record')}: ${h(t.actualStart || '—')} → ${h(t.actualEnd || '—')}</div>` : ''}
    ${ws.length ? `<div class="task-warnings">${ws.map(w => `<p>${h(warningText(state, w.code))}</p>`).join('')}${scheduleProposal(d, t.id).length ? button('schedule-proposal', tr(state, 'عاين اقتراح تعديل التابعين', 'Preview dependent rescheduling'), 'calendar', 'small', `data-id="${t.id}"`) : ''}</div>` : ''}
    ${existing ? `<div class="inline-actions editor-secondary">${button('new-evidence-for-task', tr(state, 'أضف دليلًا للمهمة', 'Add task evidence'), 'book', 'small', `data-id="${t.id}" ${state.readOnly ? 'disabled' : ''}`)}${button('split-task', tr(state, 'قسّم المهمة', 'Split task'), 'layers', 'small', `data-id="${t.id}" ${state.readOnly ? 'disabled' : ''}`)}${button('move-task', tr(state, 'انقل المتبقي لدورة', 'Move remaining work'), 'calendar', 'small', `data-id="${t.id}" ${state.readOnly ? 'disabled' : ''}`)}${button('archive-task', t.archived ? tr(state, 'استعادة المهمة', 'Restore task') : tr(state, 'أرشفة المهمة', 'Archive task'), '', 'small', `data-id="${t.id}" ${state.readOnly ? 'disabled' : ''}`)}</div>` : ''}${actions()}</form>`, 'task', { task: copy(t), existing: !!existing });
}
function evidenceEditor(id = '', taskId = '') {
  const d = doc(), e = d.evidence.find(e => e.id === id) || { id: uid('evidence'), title: '', content: '', limitations: '', date: state.today, taskId, practiceId: d.tasks.find(t => t.id === taskId)?.practiceId || '', url: '' };
  dialogOpen(id ? tr(state, 'تعديل الدليل', 'Edit evidence') : tr(state, 'دليل من الممارسة', 'Evidence from practice'), `<form data-form="evidence">${formError}<p class="dialog-intro">${tr(state, 'وثّق ملاحظة أو نتيجة أو قرارًا من عملك. لا تسجّل بيانات العميل الخاصة هنا.', 'Record an observation, result, or decision from your own work. Do not store private client data here.')}</p>${field(tr(state, 'عنوان الدليل', 'Evidence title'), input('title', e.title, 'text', 'required maxlength="200"'))}${field(tr(state, 'ماذا حدث؟ وما الذي يدعم النتيجة؟', 'What happened and what supports the result?'), textarea('content', e.content, 'required maxlength="12000"'))}${field(tr(state, 'حدود الدليل وما لم يُحسم', 'Limitations and unresolved questions'), textarea('limitations', e.limitations, 'maxlength="2000"'))}<div class="form-grid">${field(tr(state, 'التاريخ', 'Date'), input('date', e.date, 'date', 'required'))}${field(tr(state, 'المهمة', 'Task'), select('taskId', option('', tr(state, 'دليل عام', 'General evidence'), !e.taskId) + d.tasks.map(t => option(t.id, label(state, t), t.id === e.taskId)).join('')))}${field(tr(state, 'الممارسة', 'Practice'), select('practiceId', option('', tr(state, 'بدون ربط', 'Not linked'), !e.practiceId) + d.practices.map(p => option(p.id, label(state, p), p.id === e.practiceId)).join('')))}</div>${field(tr(state, 'المصدر أو رابط العمل — اختياري', 'Source or work URL — optional'), input('url', e.url, 'url', 'placeholder="https://"'))}${actions()}</form>`, 'evidence', { evidence: copy(e) });
}
function practiceEditor(id) {
  const p = doc().practices.find(p => p.id === id);
  dialogOpen(label(state, p), `<form data-form="practice">${formError}<p class="dialog-intro">${tr(state, 'المستوى وصف لممارسة محددة. لا يتغير تلقائيًا بإنهاء المهام.', 'The level describes a specific practice. Finishing tasks does not change it automatically.')}</p>${field(tr(state, 'حالة الممارسة', 'Practice level'), select('level', LEVELS.map(l => option(l, LEVEL_LABELS[l][state.language === 'en' ? 1 : 0], p.level === l)).join('')))}<label class="checkbox-label"><input type="checkbox" name="verified" ${p.verified ? 'checked' : ''}>${tr(state, 'راجعت هذا المستوى وأدعمه بدليل مرتبط', 'I reviewed this level and support it with linked evidence')}</label><fieldset class="evidence-choices"><legend>${tr(state, 'الأدلة المرتبطة', 'Linked evidence')}</legend>${doc().evidence.length ? doc().evidence.map(e => `<label class="checkbox-label"><input name="evidenceIds" type="checkbox" value="${e.id}" ${p.evidenceIds.includes(e.id) ? 'checked' : ''}>${h(e.title)}</label>`).join('') : `<p>${tr(state, 'أضف دليلًا أولًا. يمكنك حفظ المستوى «قيد التحقق» بدون دليل.', 'Add evidence first. You can keep an unverified level without evidence.')}</p>`}</fieldset>${field(tr(state, 'الفجوة أو الممارسة التالية', 'Gap or next practice'), textarea('gap', p.gap, 'maxlength="2000"'))}${field(tr(state, 'موعد المراجعة', 'Review date'), input('reviewDate', p.reviewDate, 'date'))}${actions()}</form>`, 'practice', { id });
}
function reviewEditor(id = '') {
  const c = cycleOf(doc(), state), r = doc().reviews.find(r => r.id === id) || { id: uid('review'), cycleId: c.id, date: state.today, answers: ['', '', '', '', ''], decision: '' };
  dialogOpen(`${tr(state, 'مراجعة الدورة', 'Cycle review')} ${doc().cycles.find(c => c.id === r.cycleId).number}`, `<form data-form="review">${formError}${REVIEW_QUESTIONS.map((q, i) => field(q[state.language === 'en' ? 1 : 0], textarea(`answer-${i}`, r.answers[i], 'maxlength="8000"'))).join('')}${field(tr(state, 'قرارك: استمر، عدّل، استكشف، أو توقف — ولماذا؟', 'Your decision: continue, adapt, explore, or stop — and why?'), textarea('decision', r.decision, 'maxlength="3000"'))}${actions()}</form>`, 'review', { review: copy(r) });
}
function settingsEditor() {
  const days = state.language === 'en' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  dialogOpen(tr(state, 'السعة والإعدادات', 'Capacity & settings'), `<form data-form="settings">${formError}<p class="dialog-intro">${tr(state, 'المرجع 35–45 ساعة أسبوعيًا. عدّل السعة حسب واقعك، ويظل التزامن في التواريخ مسموحًا.', 'Reference capacity is 35–45 hours weekly. Adjust to your circumstances; overlapping date windows remain allowed.')}</p>${button('manage-lanes', tr(state, 'تنظيم أسماء وألوان المسارات', 'Manage track names & colors'), 'layers', 'small')}<div class="capacity-settings">${days.map((day, i) => field(day, input(`day-${i}`, doc().settings.dayHours[i], 'number', 'required min="0" max="16" step="0.5"'))).join('')}</div><div class="small-note">${tr(state, 'كل المواعيد المعروضة بتوقيت القاهرة. هذه السعة محفوظة مع خطتك في حسابك.', 'All displayed appointments use Cairo time. Capacity is saved with the plan in your account.')}</div><label class="checkbox-label"><input name="readOnly" type="checkbox" ${state.readOnly ? 'checked' : ''}>${tr(state, 'محاكاة القراءة فقط داخل المعاينة', 'Simulate read-only preview')}</label><p class="form-hint">${tr(state, 'الصلاحية الفعلية يفحصها السيرفر عند كل طلب. المحاكاة لا تمنح صلاحية كتابة.', 'The server checks actual permission on every request. Simulation cannot grant write access.')}</p><div class="form-actions">${button('close-dialog', tr(state, 'إلغاء', 'Cancel'))}<button type="submit" class="button primary">${tr(state, 'تطبيق الإعدادات', 'Apply settings')}</button></div></form>`, 'settings');
}
function cycleEditor() {
  const c = cycleOf(doc(), state);
  dialogOpen(tr(state, 'تحرير الدورة ومعاينة أثر المواعيد', 'Edit cycle & preview date impact'), `<form data-form="cycle">${formError}${field(tr(state, 'عنوان الدورة', 'Cycle title'), input('titleAr', c.titleAr, 'text', 'required maxlength="220"'))}${field(tr(state, 'العنوان بالإنجليزية', 'English title'), input('titleEn', c.titleEn, 'text', 'required maxlength="220"'))}${field(tr(state, 'السؤال أو الهدف', 'Question or goal'), textarea('goalAr', c.goalAr, 'maxlength="3000"'))}${field(tr(state, 'الهدف بالإنجليزية', 'English goal'), textarea('goalEn', c.goalEn, 'maxlength="3000"'))}${field(tr(state, 'بداية الدورة — مدتها 15 يومًا', 'Cycle start — 15-day duration'), input('start', c.start, 'date', 'required'))}<p class="form-hint">${tr(state, 'لو غيّرت البداية، ستعاين أثر نقل المهام غير المنتهية قبل التطبيق. المهام المنتهية والتواريخ الفعلية والمواعيد النهائية لا تتحرك.', 'Changing the start previews unfinished task shifts before applying. Finished tasks, actual dates, and deadlines stay unchanged.')}</p>${actions()}</form>`, 'cycle', { id: c.id });
}
function scheduleDialog(changes, payload = null) {
  dialogOpen(tr(state, 'معاينة أثر إعادة الجدولة', 'Preview rescheduling impact'), `<div class="form-error" role="alert" tabindex="-1" hidden></div><p class="dialog-intro">${tr(state, 'لم تُطبق التغييرات بعد. راجع المهام المتأثرة؛ المواعيد النهائية والسجل الفعلي يظلان كما هما.', 'Changes have not been applied. Review affected tasks; deadlines and actual records remain unchanged.')}</p><div class="impact-list">${changes.map(x => `<article><strong>${h(x.title)}</strong><span><del>${h(x.oldStart)} → ${h(x.oldEnd)}</del><b>${h(x.start)} → ${h(x.end)}</b></span></article>`).join('') || `<p>${tr(state, 'لا مهام تحتاج نقلًا.', 'No tasks need moving.')}</p>`}</div><div class="form-actions">${button('close-dialog', tr(state, 'رجوع دون تطبيق', 'Back without applying'))}${button('apply-schedule', tr(state, 'تطبيق المقترح', 'Apply proposal'), 'check', 'primary', state.readOnly ? 'disabled' : '')}</div>`, 'schedule', { changes, payload, expectedRevision: doc().revision });
}
function laneEditor(id = '') {
  const lane = doc().lanes.find(l => l.id === id) || { id: uid('lane'), labelAr: '', labelEn: '', color: '#657e99', weeklyHours: 0 };
  dialogOpen(tr(state, id ? 'تعديل مسار العمل' : 'إضافة مسار عمل', id ? 'Edit work track' : 'Add work track'), `<form data-form="lane">${formError}${field(tr(state, 'اسم المسار', 'Track name'), input('labelAr', lane.labelAr, 'text', 'required maxlength="80"'))}${field(tr(state, 'الاسم بالإنجليزية', 'English name'), input('labelEn', lane.labelEn, 'text', 'required maxlength="80"'))}${field(tr(state, 'لون مساعد', 'Accent color'), input('color', lane.color, 'color'))}${actions()}</form>`, 'lane', { lane });
}
function manageLanes() {
  dialogOpen(tr(state, 'تنظيم مسارات العمل', 'Manage work tracks'), `<p class="dialog-intro">${tr(state, 'تغيير الاسم أو اللون ينعكس في المهام والجدول؛ لا تنشأ نسخة ثانية من المسار.', 'Names and colors update throughout tasks and the timeline; no duplicate track is created.')}</p>${doc().lanes.map(l => `<div class="archive-row"><strong>${h(label(state, l, 'label'))}</strong>${button('edit-lane', tr(state, 'تعديل', 'Edit'), '', 'small', `data-id="${l.id}" ${state.readOnly ? 'disabled' : ''}`)}</div>`).join('')}${button('new-lane', tr(state, 'أضف مسارًا', 'Add track'), 'plus', 'primary', state.readOnly ? 'disabled' : '')}`);
}
function drawMapConnections() {
  const grid = document.querySelector('.roadmap-grid'); if (!grid) return;
  grid.querySelector('.map-connections')?.remove();
  const cards = [...grid.querySelectorAll('.cycle-node')], bounds = grid.getBoundingClientRect();
  const paths = cards.slice(0, -1).map((card, i) => {
    const a = card.getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
    let path;
    if (Math.abs(a.top - b.top) < 2) {
      const rtl = document.documentElement.dir === 'rtl';
      path = `M${(rtl ? a.left : a.right) - bounds.left} ${a.top + a.height / 2 - bounds.top}H${(rtl ? b.right : b.left) - bounds.left}`;
    } else {
      const x1 = a.left + a.width / 2 - bounds.left, x2 = b.left + b.width / 2 - bounds.left, y1 = a.bottom - bounds.top, y2 = b.top - bounds.top, mid = (y1 + y2) / 2;
      path = `M${x1} ${y1}V${mid}H${x2}V${y2}`;
    }
    return `<path d="${path}"/>`;
  }).join('');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'map-connections'); svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`); svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = paths; grid.prepend(svg);
}
function moveDialog(id) {
  const t = doc().tasks.find(t => t.id === id);
  dialogOpen(tr(state, 'نقل المتبقي إلى دورة أخرى', 'Move remaining work to another cycle'), `<form data-form="move">${formError}<p>${h(t.title)}</p>${field(tr(state, 'الدورة الجديدة', 'Destination cycle'), select('cycleId', doc().cycles.filter(c => c.id !== t.cycleId).map(c => option(c.id, `${c.number} · ${label(state, c)}`)).join('')))}${field(tr(state, 'الساعات المتبقية تقديريًا', 'Estimated remaining effort'), input('hours', Math.max(0, t.hours - t.actualHours), 'number', 'required min="0" max="1000" step="0.25"'))}<p class="form-hint">${tr(state, 'ستظل المهمة الأصلية في سجلها وتُؤرشف، ويُنشأ عمل مخطط مرتبط بها. لا يتم إعلان إنجازها تلقائيًا.', 'The original remains in the record and is archived. Linked planned work is created; completion is never inferred.')}</p>${actions()}</form>`, 'move', { id });
}
function splitDialog(id) {
  const t = doc().tasks.find(t => t.id === id);
  dialogOpen(tr(state, 'تقسيم المهمة', 'Split task'), `<form data-form="split">${formError}<p>${h(t.title)} · ${t.hours} ${tr(state, 'ساعة مقدرة', 'estimated hours')}</p>${field(tr(state, 'اسم الجزء الجديد', 'New part title'), input('title', '', 'text', 'required maxlength="220"'))}${field(tr(state, 'جهد الجزء الجديد', 'New part effort'), input('hours', '', 'number', 'required min="0.25" step="0.25"'))}<p class="form-hint">${tr(state, 'يُخصم جهد الجزء الجديد من المهمة الأصلية. السجل الفعلي يبقى في الأصل.', 'New-part effort is subtracted from the original task. Actual work stays with the original.')}</p>${actions()}</form>`, 'split', { id });
}
function importDialog(data) {
  pendingImport = data;
  dialogOpen(tr(state, 'مراجعة استيراد الخطة', 'Review plan import'), `<div class="form-error" role="alert" tabindex="-1" hidden></div><p>${tr(state, 'تم التحقق من بنية الملف وروابطه الداخلية. الاستيراد يستبدل بيانات هذه المعاينة المحلية فقط.', 'The file structure and internal references were validated. Import replaces only this local preview data.')}</p><div class="import-summary"><strong>${h(data.title)}</strong><span>${data.cycles.length} ${tr(state, 'دورة', 'cycles')} · ${data.tasks.length} ${tr(state, 'مهمة', 'tasks')} · ${data.evidence.length} ${tr(state, 'دليل', 'evidence items')}</span></div><p class="small-note">${tr(state, 'صدّر الخطة الحالية أولًا إذا كنت تريد الاحتفاظ بنسخة منها.', 'Export the current plan first if you want to keep a copy.')}</p><div class="form-actions">${button('export', tr(state, 'تصدير الحالية', 'Export current'), 'download')}${button('apply-import', tr(state, 'استيراد هذه النسخة', 'Import this version'), 'upload', 'primary', state.readOnly ? 'disabled' : '')}</div>`, 'import');
}

async function handleAction(event) {
  const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action, id = el.dataset.id;
  if (action === 'view') return changeView(el.dataset.view);
  if (action === 'language') { state.language = state.language === 'en' ? 'ar' : 'en'; render(); return; }
  if (action === 'horizon') { state.horizon = Number(el.dataset.value); render(); return; }
  if (action === 'select-cycle') { state.cycleId = id; state.timelineAnchor = ''; render(); return; }
  if (action === 'go-loop') return changeView('loop');
  if (action === 'current-today' || action === 'current-timeline') { state.cycleId = doc().settings.currentCycleId; state.timelineAnchor = ''; changeView(action.endsWith('today') ? 'today' : 'timeline'); return; }
  if (action === 'open-cycle-timeline') { state.timelineAnchor = ''; return changeView('timeline'); }
  if (action === 'new-task') { if (canEdit()) taskEditor(); return; }
  if (action === 'edit-task') return taskEditor(id);
  if (action === 'new-lane') { if (canEdit()) laneEditor(); return; }
  if (action === 'edit-lane') { if (canEdit()) laneEditor(id); return; }
  if (action === 'manage-lanes') { if (dialog.open && dirty()) return notify(tr(state, 'احفظ الإعدادات أولًا.', 'Save settings first.')); return manageLanes(); }
  if (action === 'new-evidence' || action === 'new-evidence-for-task') { if (!canEdit() || (dialog.open && dirty())) { if (dialog.open && dirty()) notify(tr(state, 'احفظ تعديل المهمة أو أغلقه قبل فتح الدليل.', 'Save or discard the task edit before opening evidence.')); return; } evidenceEditor('', action === 'new-evidence-for-task' ? id : ''); return; }
  if (action === 'edit-evidence') return evidenceEditor(id);
  if (action === 'edit-practice') return practiceEditor(id);
  if (action === 'new-review') return reviewEditor();
  if (action === 'edit-review') return reviewEditor(id);
  if (action === 'edit-cycle') { if (canEdit()) cycleEditor(); return; }
  if (action === 'set-current') { if (await transact('Set current cycle', d => { d.settings.currentCycleId = state.cycleId; })) notify(tr(state, 'تغيّرت دورة العمل. لم يتغير أي مستوى أو تقدم تلقائيًا.', 'Current cycle updated. No capability or progress was changed.')); return; }
  if (action === 'settings') return settingsEditor();
  if (action === 'architecture') return dialogOpen(tr(state, 'حدود واضحة، وتجربة مترابطة', 'Clear boundaries, connected experience'), architectureContent(state));
  if (action === 'consulting') return dialogOpen(tr(state, 'مسار ممارسة الاستشارة', 'Consulting practice path'), consultingContent(state));
  if (action === 'close-dialog') return closeDialog();
  if (action === 'discard-dialog') return closeDialog(true);
  if (action === 'loop-step') { state.loopStep = Number(el.dataset.value); render(); return; }
  if (action === 'toggle-lane') { state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id); render(); return; }
  if (action === 'span') { state.span = Number(el.dataset.value); state.timelineAnchor = cycleOf(doc(), state).start; render(); return; }
  if (action === 'range-prev' || action === 'range-next') { const r = timelineRange(doc(), state); state.timelineAnchor = addDays(r.start, (action === 'range-prev' ? -1 : 1) * r.count); render(); return; }
  if (action === 'range-today') { state.timelineAnchor = state.today; render(); return; }
  if (action === 'day') { state.selectedDay = el.dataset.date; state.taskScope = 'day'; return changeView('today'); }
  if (action === 'task-scope') { state.taskScope = el.dataset.value; render(); return; }
  if (action === 'task-status') {
    if (!canEdit()) return;
    const task = doc().tasks.find(t => t.id === id);
    if (task.status === 'blocked') return taskEditor(id);
    await transact('Change task status', d => { const t = d.tasks.find(t => t.id === id); t.status = t.status === 'planned' ? 'active' : t.status === 'active' ? 'done' : 'planned'; if (t.status === 'active' && !t.actualStart) t.actualStart = state.today; if (t.status === 'done' && !t.actualEnd) t.actualEnd = state.today; }); return;
  }
  if (action === 'schedule-proposal') { if (!canEdit()) return; if (dirty()) return notify(tr(state, 'احفظ تعديل المهمة أولًا لمعاينة المواعيد الجديدة.', 'Save the task first to preview updated dependencies.')); return scheduleDialog(scheduleProposal(doc(), id)); }
  if (action === 'apply-schedule') {
    const snapshot = editorState;
    if (doc().revision !== snapshot.expectedRevision) return showError({ code: 'CONFLICT' });
    if (await transact('Apply scheduling proposal', d => {
      if (snapshot.payload) { const { id, values } = snapshot.payload; const shifted = shiftCycle(d, id, values.start).document; Object.assign(shifted.cycles.find(c => c.id === id), values, { end: addDays(values.start, 14) }); return shifted; }
      return applySchedule(d, snapshot.changes);
    })) { closeDialog(true); notify(tr(state, 'تم تطبيق المقترح. السجل الفعلي لم يتغير.', 'Proposal applied. Actual records stayed unchanged.')); } return;
  }
  if (['split-task', 'move-task', 'archive-task'].includes(action)) {
    if (!canEdit()) return; if (dirty()) return notify(tr(state, 'احفظ التعديل أو أغلقه أولًا.', 'Save or discard the current edit first.'));
    const task = doc().tasks.find(t => t.id === id);
    if (action !== 'archive-task' && task.status === 'done') return notify(tr(state, 'المهمة منتهية. أضف عملًا جديدًا بدل تعديل سجلها.', 'This task is finished. Add new work instead of altering its record.'));
    if (action === 'split-task') return splitDialog(id);
    if (action === 'move-task') return moveDialog(id);
    if (await transact(task.archived ? 'Restore task' : 'Archive task', d => { const t = d.tasks.find(t => t.id === id); t.archived = !t.archived; })) closeDialog(true); return;
  }
  if (action === 'show-archive') return dialogOpen(tr(state, 'المهام المؤرشفة', 'Archived tasks'), `<p>${tr(state, 'الأرشفة لا تحذف السجل أو الأدلة.', 'Archiving does not delete records or evidence.')}</p>${doc().tasks.filter(t => t.archived).map(t => `<div class="archive-row"><strong>${h(t.title)}</strong>${button('edit-task', tr(state, 'افتح واستعد', 'Open & restore'), '', 'small', `data-id="${t.id}"`)}</div>`).join('') || `<p>${tr(state, 'لا مهام مؤرشفة.', 'No archived tasks.')}</p>`}`);
  if (action === 'export') { download(repository.export(doc()), `nawah-founder-plan-${state.today}.json`); notify(tr(state, 'تم تجهيز ملف الخطة. احتفظ به كنسخة مستقلة.', 'Plan export is ready. Keep it as a separate backup.')); return; }
  if (action === 'export-draft') {
    const form = dialog.querySelector('form'); download(JSON.stringify({ type: 'nawah-unsaved-form-draft', kind: editorState?.kind, fields: form ? [...new FormData(form)] : [], at: new Date().toISOString() }, null, 2), `nawah-unsaved-draft-${state.today}.json`); return;
  }
  if (action === 'import') {
    if (!canEdit()) return;
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json';
    file.onchange = async () => { const selected = file.files?.[0]; if (!selected) return; try { if (selected.size > 4000000) throw { code: 'IMPORT_SIZE' }; const data = parseImport(await selected.text()); importDialog(data); } catch (error) { showError(error); } }; file.click(); return;
  }
  if (action === 'apply-import') { try { await workspace.import(pendingImport); state.cycleId = doc().settings.currentCycleId; state.timelineAnchor = ''; closeDialog(true); render(); notify(tr(state, 'تم استيراد الخطة وحفظها في حسابك.', 'Plan imported into your account.')); } catch (error) { showError(error); } return; }
  if (action === 'reload-data') { try { await workspace.load(); state.conflict = false; state.storageProblem = ''; render(); notify(tr(state, 'تم تحميل آخر نسخة محفوظة.', 'Latest saved version loaded.')); } catch (error) { showError(error); } }
}
document.addEventListener('click', event => { handleAction(event).catch(showError); });
document.addEventListener('change', event => {
  const el = event.target;
  if (el.dataset.control === 'cycle') { state.cycleId = el.value; state.timelineAnchor = ''; state.selectedDay = cycleOf(doc(), state).start; render(); }
  if (el.dataset.control === 'kind') { state.kindFilter = el.value; render(); }
  if (el.dataset.control === 'selected-day') { if (el.value) { state.selectedDay = el.value; render(); } }
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, type = form.dataset.form, data = new FormData(form), v = name => String(data.get(name) || '');
  const snapshot = editorState;
  if (type === 'settings') {
    const readOnly = data.has('readOnly');
    if (!state.readOnly && !await transact('Update weekly capacity', d => { d.settings.dayHours = Array.from({ length: 7 }, (_, i) => Number(v(`day-${i}`))); })) return;
    state.readOnly = readOnly || !repository.canWrite; workspace.readOnly = state.readOnly; closeDialog(true); render(); notify(tr(state, readOnly ? 'تم تشغيل محاكاة القراءة فقط.' : 'تم تطبيق الإعدادات.', readOnly ? 'Read-only simulation enabled.' : 'Settings applied.')); return;
  }
  if (!canEdit()) return;
  let changedId = '';
  try {
    if (type === 'task') {
      const t = { ...copy(snapshot.task) };
      for (const key of ['title', 'titleEn', 'cycleId', 'laneId', 'kind', 'start', 'end', 'deadline', 'status', 'deliverable', 'notes', 'blocker', 'dependsOn', 'practiceId', 'resourceUrl', 'timeStart', 'timeEnd']) t[key] = v(key).trim();
      t.notesEn = ''; t.deliverableEn = ''; t.hours = Number(v('hours')); t.actualHours = Number(v('actualHours'));
      if (t.status === 'active' && !t.actualStart) t.actualStart = state.today;
      if (t.status === 'done' && !t.actualEnd) t.actualEnd = state.today;
      changedId = t.id;
      if (!await transact(snapshot.existing ? 'Edit task' : 'Create task', d => {
        if (snapshot.existing) {
          const index = d.tasks.findIndex(x => x.id === t.id); d.tasks[index] = t;
          if (v('seriesScope') === 'future' && t.seriesId) {
            const delta = daysBetween(snapshot.task.start, t.start), duration = daysBetween(t.start, t.end);
            for (const next of d.tasks.filter(x => x.id !== t.id && x.seriesId === t.seriesId && x.start > snapshot.task.start && x.status === 'planned' && !x.archived)) {
              const movedStart = addDays(next.start, delta), actual = { id: next.id, start: movedStart, end: addDays(movedStart, duration), actualStart: next.actualStart, actualEnd: next.actualEnd, actualHours: next.actualHours, status: next.status };
              Object.assign(next, t, actual);
            }
          }
        } else d.tasks.push(...recurringTasks(t, v('frequency'), v('until')));
      })) return;
    }
    if (type === 'evidence') {
      const e = { ...copy(snapshot.evidence) }; for (const k of ['title', 'content', 'limitations', 'date', 'taskId', 'practiceId', 'url']) e[k] = v(k).trim();
      if (!await transact('Save practice evidence', d => { const i = d.evidence.findIndex(x => x.id === e.id); i < 0 ? d.evidence.push(e) : d.evidence.splice(i, 1, e); })) return;
    }
    if (type === 'practice') {
      if (!await transact('Review practice level', d => { const p = d.practices.find(x => x.id === snapshot.id); Object.assign(p, { level: v('level'), verified: data.has('verified'), evidenceIds: data.getAll('evidenceIds'), gap: v('gap'), reviewDate: v('reviewDate') }); })) return;
    }
    if (type === 'review') {
      const r = { ...copy(snapshot.review), answers: Array.from({ length: 5 }, (_, i) => v(`answer-${i}`)), decision: v('decision') };
      if (!await transact('Save cycle review', d => { const i = d.reviews.findIndex(x => x.id === r.id); i < 0 ? d.reviews.push(r) : d.reviews.splice(i, 1, r); })) return;
    }
    if (type === 'cycle') {
      const c = doc().cycles.find(c => c.id === snapshot.id), values = { titleAr: v('titleAr'), titleEn: v('titleEn'), goalAr: v('goalAr'), goalEn: v('goalEn'), start: v('start') };
      if (c.start !== values.start) { const proposal = shiftCycle(doc(), c.id, values.start); return scheduleDialog(proposal.changes, { id: c.id, values }); }
      if (!await transact('Edit cycle', d => { Object.assign(d.cycles.find(c => c.id === snapshot.id), values); })) return;
    }
    if (type === 'lane') { if (!await transact('Save work track', d => { const values = { ...snapshot.lane, labelAr: v('labelAr'), labelEn: v('labelEn'), color: v('color') }; const index = d.lanes.findIndex(l => l.id === values.id); if (index < 0) d.lanes.push(values); else d.lanes[index] = values; })) return; }
    if (type === 'split') { if (!await transact('Split task', d => splitTask(d, snapshot.id, v('title'), Number(v('hours'))))) return; }
    if (type === 'move') {
      if (!await transact('Carry remaining work to a cycle', d => {
        const original = d.tasks.find(t => t.id === snapshot.id), destination = d.cycles.find(c => c.id === v('cycleId'));
        const next = { ...copy(original), id: uid('task'), cycleId: destination.id, start: destination.start, end: addDays(destination.start, daysBetween(original.start, original.end)), hours: Number(v('hours')), actualHours: 0, status: 'planned', archived: false, actualStart: '', actualEnd: '', dependsOn: '', seriesId: '', carriedFrom: original.id };
        original.archived = true; d.tasks.push(next);
      })) return;
    }
    closeDialog(true); notify(tr(state, 'تم الحفظ في حسابك على السيرفر.', 'Saved to your account on the server.'));
    if (changedId) { const proposal = scheduleProposal(doc(), changedId); if (proposal.length) scheduleDialog(proposal); }
  } catch (error) { showError(error); }
});
repository.subscribe((revision) => {
  if (revision <= doc().revision) return;
  state.conflict = true; render();
  if (dialog.open) { const target = dialog.querySelector('.form-error'); if (target) { target.hidden = false; target.textContent = describe({ code: 'CONFLICT' }); } }
});
window.addEventListener('resize', drawMapConnections);
document.fonts.ready.then(drawMapConnections);
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (viewNames.includes(next)) { state.view = next; render(); } });
render();
