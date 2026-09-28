import { useEffect, useState } from "react";
import { useAuth } from "../auth/store/authStore";
import { useI18n } from "../../i18n";
import { profileApi, type ProfessionalProfile } from "./profileApi";
import { ProfileForm } from "./ProfileForm";

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { authenticated, user, setUser } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    setProfile(null);
    void profileApi.get()
      .then((result) => { if (active) setProfile(result); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authenticated, user?.id, attempt]);

  if (!authenticated) return children;
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-app text-sm text-neutral-500" role="status">{t("profile.loadingProfile")}</main>;
  if (failed || !profile) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app p-6 text-center">
      <p role="alert" className="text-sm text-danger-strong">{t("profile.loadError")}</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">{t("common.retry")}</button>
    </main>
  );
  if (profile.profileComplete) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-[2px]">
      <section aria-labelledby="profile-completion-title" className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t("profile.accountDetails")}</p>
        <h1 id="profile-completion-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">{t("profile.completeTitle")}</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{t("profile.completeDescription")}</p>
        <ProfileForm
          initial={profile}
          onboarding
          onSaved={(saved) => {
            setProfile(saved);
            if (user) setUser({ ...user, name: saved.name });
          }}
        />
      </section>
    </main>
  );
}
