import { useAuth } from "../store/authStore";
import { useI18n } from "../../../i18n";
import { useCallback, useEffect, useState } from "react";
import { profileApi, type ProfessionalProfile } from "../../profile/profileApi";
import { ProfileForm } from "../../profile/ProfileForm";
import { CvViewer } from "../../profile/CvViewer";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState(false);
  const [viewCv, setViewCv] = useState(false);
  const load = useCallback(() => {
    setError(false);
    void profileApi.get().then(setProfile).catch(() => setError(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (viewCv && user) return <CvViewer userId={user.id} onClose={() => setViewCv(false)} />;

  return (
    <section className="max-w-2xl space-y-7">
      <header className="border-b border-border pb-6 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          {t("profile.accountDetails")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
          {t("profile.title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {t("profile.accountDetails")}
        </p>
      </header>
      <dl className="divide-y divide-border rounded-xl border border-border-strong bg-surface px-5 shadow-xs dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 sm:px-7">
        <div className="py-5">
          <dt className="text-xs font-medium text-neutral-500">{t("profile.name")}</dt>
          <dd className="mt-1.5 text-base font-medium text-neutral-900 dark:text-neutral-100">
            {user?.name}
          </dd>
        </div>
        <div className="py-5">
          <dt className="text-xs font-medium text-neutral-500">{t("profile.email")}</dt>
          <dd className="mt-1.5 text-base text-neutral-800 dark:text-neutral-200">{user?.email}</dd>
        </div>
      </dl>
      <section className="space-y-4 rounded-xl border border-border-strong bg-surface p-5 shadow-xs dark:border-neutral-700 dark:bg-neutral-900 sm:p-7">
        <header>
          <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">{t("profile.professionalProfile")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("profile.completeDescription")}</p>
        </header>
        {error ? <div role="alert" className="text-sm text-danger-strong">{t("profile.loadError")} <button type="button" onClick={load} className="ms-2 underline">{t("common.retry")}</button></div> : !profile ? <p role="status" className="text-sm text-neutral-500">{t("profile.loadingProfile")}</p> : <>
          <ProfileForm key={profile.cv?.id ?? "no-cv"} initial={profile} onSaved={setProfile} />
          <div className="flex flex-wrap gap-3">
            {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">{t("profile.viewPortfolio")} ↗</a>}
            {profile.hasCv && <button type="button" onClick={() => setViewCv(true)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">{t("profile.viewCv")}</button>}
          </div>
        </>}
      </section>
    </section>
  );
}
