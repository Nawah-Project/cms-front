// Pure domain: no DOM, storage, HTTP, Prisma, or imports from existing Nawah domains.
export const FORMAT_VERSION = 1;
export const STATUSES = ['planned', 'active', 'blocked', 'done'];
export const KINDS = ['execution', 'learning', 'testing', 'teaching', 'review'];
export const LEVELS = ['assisted', 'understand', 'manage', 'transfer', 'teach', 'train'];
const DAY = 86400000;
export class DomainError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
const fail = (code) => { throw new DomainError(code); };
export const copy = (value) => structuredClone(value);
export function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('DATE');
  const n = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== value) fail('DATE');
  return n;
}
export function addDays(date, days) { return new Date(dateNumber(date) + days * DAY).toISOString().slice(0, 10); }
export function daysBetween(a, b) { return Math.round((dateNumber(b) - dateNumber(a)) / DAY); }
export function localToday(now = new Date(), timeZone = 'Africa/Cairo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function uid(prefix = 'item') { return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`; }
export function safeLink(value) {
  if (!value) return '';
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}
function string(value, max = 1000, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('TEXT');
}
function list(value, max) { if (!Array.isArray(value) || value.length > max) fail('FORMAT'); }
function unique(items) {
  const ids = new Set();
  for (const x of items) { if (!x || typeof x !== 'object') fail('FORMAT'); string(x.id, 150, true); if (!/^[a-zA-Z0-9_-]+$/.test(x.id)) fail('FORMAT'); if (ids.has(x.id)) fail('DUPLICATE'); ids.add(x.id); }
  return ids;
}
export function validateDocument(d) {
  if (!d || typeof d !== 'object' || d.formatVersion !== FORMAT_VERSION) fail('FORMAT');
  if (!Number.isSafeInteger(d.revision) || d.revision < 0) fail('FORMAT');
  string(d.id, 150, true); string(d.title, 200, true);
  list(d.cycles, 100); list(d.tasks, 2500); list(d.lanes, 30); list(d.practices, 100);
  list(d.evidence, 2000); list(d.reviews, 200); list(d.history, 10000);
  const cycleIds = unique(d.cycles), laneIds = unique(d.lanes), practiceIds = unique(d.practices), taskIds = unique(d.tasks);
  unique(d.evidence); unique(d.reviews);
  if (!d.settings || !Array.isArray(d.settings.dayHours) || d.settings.dayHours.length !== 7) fail('CAPACITY');
  if (d.settings.dayHours.some(n => !Number.isFinite(n) || n < 0 || n > 16)) fail('CAPACITY');
  if (d.settings.timeZone !== 'Africa/Cairo') fail('FORMAT');
  if (!cycleIds.has(d.settings.currentCycleId)) fail('CYCLE');
  for (const lane of d.lanes) { string(lane.labelAr, 80, true); string(lane.labelEn, 80, true); if (!/^#[0-9a-f]{6}$/i.test(lane.color)) fail('FORMAT'); }
  for (const cycle of d.cycles) {
    string(cycle.titleAr, 220, true); string(cycle.titleEn, 220, true);
    if (daysBetween(cycle.start, cycle.end) !== 14) fail('CYCLE');
    string(cycle.goalAr, 3000); string(cycle.goalEn, 3000);
  }
  for (const t of d.tasks) {
    string(t.title, 220, true); if (t.titleEn != null) string(t.titleEn, 220);
    string(t.notes || '', 8000); string(t.deliverable || '', 3000); string(t.blocker || '', 1000);
    if (!cycleIds.has(t.cycleId) || !laneIds.has(t.laneId) || (t.practiceId && !practiceIds.has(t.practiceId))) fail('REFERENCE');
    if (!STATUSES.includes(t.status) || !KINDS.includes(t.kind)) fail('FORMAT');
    const duration = daysBetween(t.start, t.end); if (duration < 0 || duration > 366) fail('DATE_RANGE');
    if (!Number.isFinite(t.hours) || t.hours < 0 || t.hours > 1000 || !Number.isFinite(t.actualHours) || t.actualHours < 0 || t.actualHours > 10000) fail('HOURS');
    if (t.deadline) dateNumber(t.deadline);
    if (t.resourceUrl && !safeLink(t.resourceUrl)) fail('URL');
    if (t.dependsOn && (!taskIds.has(t.dependsOn) || t.dependsOn === t.id)) fail('DEPENDENCY');
    if (t.timeStart || t.timeEnd) {
      if (t.start !== t.end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.timeStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.timeEnd) || t.timeEnd <= t.timeStart) fail('TIME');
    }
    if (t.actualStart) dateNumber(t.actualStart); if (t.actualEnd) dateNumber(t.actualEnd);
  }
  const graph = new Map(d.tasks.map(t => [t.id, t.dependsOn]));
  for (const task of d.tasks) { const seen = new Set([task.id]); let id = task.dependsOn; while (id) { if (seen.has(id)) fail('DEPENDENCY_CYCLE'); seen.add(id); id = graph.get(id); } }
  for (const p of d.practices) {
    string(p.titleAr, 150, true); string(p.titleEn, 150, true);
    if (!LEVELS.includes(p.level)) fail('FORMAT');
    string(p.gap || '', 2000); if (p.reviewDate) dateNumber(p.reviewDate);
    list(p.evidenceIds, 100); if (p.evidenceIds.some(id => !d.evidence.some(e => e.id === id))) fail('REFERENCE');
    if (p.verified && !p.evidenceIds.length) fail('EVIDENCE_REQUIRED');
  }
  for (const e of d.evidence) {
    string(e.title, 200, true); string(e.content, 12000); string(e.limitations, 2000);
    if (e.url && !safeLink(e.url)) fail('URL');
    if (e.taskId && !taskIds.has(e.taskId)) fail('REFERENCE');
    if (e.practiceId && !practiceIds.has(e.practiceId)) fail('REFERENCE');
    dateNumber(e.date);
  }
  for (const r of d.reviews) {
    if (!cycleIds.has(r.cycleId)) fail('REFERENCE');
    if (!Array.isArray(r.answers) || r.answers.length !== 5 || r.answers.some(a => typeof a !== 'string' || a.length > 8000)) fail('FORMAT');
    string(r.decision || '', 3000); dateNumber(r.date);
  }
  for (const entry of d.history) {
    if (!entry || typeof entry !== 'object') fail('FORMAT');
    string(entry.label, 250, true);
    if (typeof entry.at !== 'string' || !Number.isFinite(Date.parse(entry.at))) fail('FORMAT');
  }
  return d;
}
export function parseImport(text) {
  if (typeof text !== 'string' || text.length > 4000000) fail('IMPORT_SIZE');
  let data;
  try { data = JSON.parse(text); } catch { fail('FORMAT'); }
  return validateDocument(data);
}
export function tasksInRange(d, start, end) { return d.tasks.filter(t => !t.archived && t.start <= end && t.end >= start); }
export function dayLoad(d, date) {
  const tasks = tasksInRange(d, date, date), weekday = new Date(dateNumber(date)).getUTCDay();
  const hours = tasks.reduce((n, t) => n + t.hours / (daysBetween(t.start, t.end) + 1), 0);
  return { hours, capacity: d.settings.dayHours[weekday], tasks };
}
export function rangeLoad(d, start, end) {
  let hours = 0, capacity = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) { const day = dayLoad(d, date); hours += day.hours; capacity += day.capacity; }
  return { hours, capacity };
}
export function warnings(d, taskId = '') {
  const messages = [];
  const active = d.tasks.filter(t => !t.archived && (!taskId || t.id === taskId));
  for (const t of active) {
    const parent = d.tasks.find(p => p.id === t.dependsOn);
    if (parent && t.start <= parent.end) messages.push({ code: 'DEPENDENCY_OVERLAP', taskId: t.id, relatedId: parent.id });
    if (parent?.archived) messages.push({ code: 'ARCHIVED_DEPENDENCY', taskId: t.id });
    if (t.deadline && t.end > t.deadline) messages.push({ code: 'DEADLINE', taskId: t.id });
    if (t.status === 'blocked' && !t.blocker) messages.push({ code: 'BLOCKER', taskId: t.id });
    if (t.status === 'done' && !d.evidence.some(e => e.taskId === t.id)) messages.push({ code: 'NO_EVIDENCE', taskId: t.id });
    if (t.timeStart) for (const other of d.tasks) {
      if (other.id <= t.id || other.archived || !other.timeStart || other.start !== t.start) continue;
      if (t.timeStart < other.timeEnd && t.timeEnd > other.timeStart) messages.push({ code: 'TIME_OVERLAP', taskId: t.id, relatedId: other.id });
    }
  }
  return messages;
}
export function scheduleProposal(d, changedId) {
  const draft = copy(d), changes = [];
  const queue = [changedId], visited = new Set();
  while (queue.length) {
    const parentId = queue.shift(); if (visited.has(parentId)) continue; visited.add(parentId);
    const parent = draft.tasks.find(t => t.id === parentId);
    for (const t of draft.tasks.filter(t => !t.archived && t.status !== 'done' && t.dependsOn === parentId)) {
      if (t.start <= parent.end) {
        const duration = daysBetween(t.start, t.end), oldStart = t.start, oldEnd = t.end;
        t.start = addDays(parent.end, 1); t.end = addDays(t.start, duration);
        changes.push({ id: t.id, title: t.title, oldStart, oldEnd, start: t.start, end: t.end });
      }
      queue.push(t.id);
    }
  }
  return changes;
}
export function applySchedule(d, changes) {
  const result = copy(d);
  for (const change of changes) { const t = result.tasks.find(t => t.id === change.id); if (!t || t.start !== change.oldStart || t.end !== change.oldEnd) fail('CONFLICT'); t.start = change.start; t.end = change.end; }
  return validateDocument(result);
}
export function shiftCycle(d, cycleId, newStart) {
  const result = copy(d), cycle = result.cycles.find(c => c.id === cycleId); if (!cycle) fail('CYCLE');
  const delta = daysBetween(cycle.start, newStart), changes = [];
  cycle.start = newStart; cycle.end = addDays(newStart, 14);
  for (const t of result.tasks.filter(t => t.cycleId === cycleId && !t.archived && t.status !== 'done')) {
    changes.push({ id: t.id, title: t.title, oldStart: t.start, oldEnd: t.end, start: addDays(t.start, delta), end: addDays(t.end, delta) });
    t.start = addDays(t.start, delta); t.end = addDays(t.end, delta);
  }
  return { document: validateDocument(result), changes, delta };
}
export function recurringTasks(task, frequency, until) {
  if (!['daily', 'weekly'].includes(frequency)) return [task];
  if (daysBetween(task.start, until) < 0 || daysBetween(task.start, until) > 180) fail('RECURRENCE');
  const step = frequency === 'daily' ? 1 : 7, seriesId = task.seriesId || uid('series'), result = [];
  for (let start = task.start; start <= until; start = addDays(start, step)) {
    if (result.length >= 100) fail('RECURRENCE');
    result.push({ ...task, id: result.length ? uid('task') : task.id, start, end: addDays(start, daysBetween(task.start, task.end)), seriesId, seriesFrequency: frequency });
  }
  return result;
}
export function splitTask(d, id, title, hours) {
  const result = copy(d), task = result.tasks.find(t => t.id === id);
  if (!task || task.archived || task.status === 'done' || !(hours > 0) || hours >= task.hours) fail('SPLIT');
  task.hours -= hours;
  const child = { ...copy(task), id: uid('task'), title, titleEn: '', hours, actualHours: 0, actualStart: '', actualEnd: '', status: 'planned', dependsOn: '', seriesId: '' };
  result.tasks.push(child);
  return validateDocument(result);
}
