import { useEffect, useMemo, useState } from "react";
import { KeyRound, Save, ShieldCheck, UserCog } from "lucide-react";
import { useAuth } from "../../auth/store/authStore";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import {
  adminApi,
  type AdminAccessAccount,
} from "../api/adminApi";
import {
  ADMIN_SECTIONS,
  type AdminAccessLevel,
  type AdminPermissionMap,
  type AdminSection,
} from "../adminAccess";
import { ErrorState, LoadingState } from "./AdminUI";

const labels: Record<AdminSection, [string, string]> = {
  OVERVIEW: ["النظرة العامة", "Overview"],
  COMMUNITY: ["إدارة المنصة والأعضاء", "Community & members"],
  MENTORING: ["التوجيه والإرشاد", "Mentoring & guidance"],
  JOURNEY: ["هندسة الرحلة والحبكة", "Journey & plot engine"],
  REPORTS: ["معاينة تقارير الرحلة", "Journey report preview"],
  UX_LAB: ["تحليلات التجربة والسلوك", "UX & behavior lab"],
  MARKETING: ["المركتنج ونمو الزيارات", "Marketing & acquisition"],
  OPERATIONS: ["العمليات والموارد التشغيلية", "Operations & resources"],
};

type Choice = "NONE" | AdminAccessLevel;

function AccessEditor({
  admin,
  onSaved,
}: {
  admin: AdminAccessAccount;
  onSaved: (value: AdminAccessAccount) => void;
}) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const toast = useToast();
  const [draft, setDraft] = useState<AdminPermissionMap>(
    admin.access.permissions,
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(admin.access.permissions), [admin]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(admin.access.permissions),
    [draft, admin.access.permissions],
  );
  const save = async () => {
    if (!Object.keys(draft).length) {
      toast.error(
        ar
          ? "اختر قسمًا واحدًا على الأقل للأدمن المتخصص."
          : "Choose at least one section for the specialized admin.",
      );
      return;
    }
    setSaving(true);
    try {
      const next = await adminApi.updateAdminAccess(admin.id, draft);
      onSaved(next);
      toast.success(ar ? "تم حفظ صلاحيات الأدمن" : "Administrator access saved");
    } catch {
      toast.error(ar ? "تعذر حفظ الصلاحيات" : "Could not save access");
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            {admin.access.isRoot ? <KeyRound size={20} /> : <UserCog size={20} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-neutral-950 dark:text-white">
                {admin.name}
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${admin.access.isRoot ? "bg-emerald-100 text-emerald-900" : "bg-sky-50 text-sky-800"}`}>
                {admin.access.isRoot
                  ? ar
                    ? "Root Admin"
                    : "Root Admin"
                  : ar
                    ? "أدمن متخصص"
                    : "Specialized admin"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-neutral-500" dir="ltr">
              {admin.email}
            </p>
          </div>
        </div>
        {!admin.access.isRoot && admin.id !== user?.id && (
          <button
            type="button"
            className="button-primary inline-flex items-center gap-2"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            <Save size={15} />
            {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "حفظ الصلاحيات" : "Save access"}
          </button>
        )}
      </header>
      {admin.access.isRoot ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <p>
            {ar
              ? "حساب الجذر يمتلك القراءة والتعديل في كل الأقسام، وهو وحده القادر على إدارة تخصصات الأدمنز. لا يمكن تعديل صلاحياته من اللوحة."
              : "The root account has read and write access everywhere and is the only account that can manage administrator specializations. Its access cannot be edited here."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.map((section) => {
            const value: Choice = draft[section] ?? "NONE";
            return (
              <label key={section} className="rounded-xl border border-border bg-canvas/50 p-3 text-sm">
                <span className="mb-2 block font-semibold text-neutral-800 dark:text-neutral-100">
                  {labels[section][ar ? 0 : 1]}
                </span>
                <select
                  className="field-control w-full text-xs"
                  value={value}
                  onChange={(event) => {
                    const level = event.target.value as Choice;
                    setDraft((current) => {
                      const next = { ...current };
                      if (level === "NONE") delete next[section];
                      else next[section] = level;
                      return next;
                    });
                  }}
                >
                  <option value="NONE">{ar ? "غير متاح" : "No access"}</option>
                  <option value="READ">{ar ? "قراءة فقط" : "Read only"}</option>
                  <option value="WRITE">{ar ? "قراءة وتعديل" : "Read & write"}</option>
                </select>
              </label>
            );
          })}
        </div>
      )}
    </article>
  );
}

export function AdminAccessPanel() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [items, setItems] = useState<AdminAccessAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setLoading(true);
    setFailed(false);
    void adminApi
      .admins()
      .then((result) => setItems(result.items))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  if (loading)
    return <LoadingState label={ar ? "تحميل حسابات الأدمنز…" : "Loading administrators…"} />;
  if (failed) return <ErrorState onRetry={load} />;
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          {ar ? "Root + Specialized Admins" : "Root + specialized admins"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-neutral-950 dark:text-white">
          {ar ? "صلاحيات الأدمنز حسب القسم" : "Administrator access by section"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          {ar
            ? "اختَر لكل أدمن متخصص الأقسام التي تظهر له، وحدد هل يقرأ بياناتها فقط أم يقدر يعدّلها. المنع مطبق على الواجهة والـAPI معًا."
            : "Choose which sections each specialized administrator can see and whether they can only read or also modify them. Enforcement applies to both the interface and API."}
        </p>
      </div>
      {items.map((admin) => (
        <AccessEditor
          key={admin.id}
          admin={admin}
          onSaved={(value) =>
            setItems((current) =>
              current.map((item) => (item.id === value.id ? value : item)),
            )
          }
        />
      ))}
    </section>
  );
}
