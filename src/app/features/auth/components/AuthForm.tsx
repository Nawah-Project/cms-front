import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useLogin } from "../hooks/useLogin";
import { useRegister } from "../hooks/useRegister";
import { SocialSignInButtons } from "./SocialSignInButtons";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { Modal } from "../../../components/ui/Modal";
import { CheckIcon, PlayCircleIcon, SparklesIcon } from "../../../components/Icons";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const login = useLogin();
  const register = useRegister();
  const { loading, authenticated } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";
  const notice = (location.state as { notice?: string } | null)?.notice;
  const socialError = getSocialError(new URLSearchParams(location.search).get("socialError"), t);

  useEffect(() => {
    if (!loading && authenticated) navigate(from, { replace: true });
  }, [loading, authenticated, navigate, from]);

  if (loading || authenticated) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-app text-sm text-neutral-500"
        role="status"
      >
        {t("auth.sessionLoading")}
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (registering) {
        const user = await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (user) navigate(from, { replace: true });
        else
          navigate("/auth/login", {
            replace: true,
            state: { notice: t("auth.accountCreated") },
          });
      } else {
        await login({ email: email.trim(), password });
        navigate(from, { replace: true });
      }
    } catch (caught: any) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      const status = caught?.status;
      if (
        status === 409 ||
        message.includes("already exists") ||
        message.includes("already registered") ||
        message.includes("conflict")
      ) {
        setError(t("auth.emailAlreadyExists"));
      } else if (status === 400 && registering) {
        setError(t("auth.passwordRequirementsError"));
      } else if (
        message.includes("invalid email or password") ||
        message.includes("unauthorized") ||
        status === 401
      ) {
        setError(t("auth.invalidCredentials"));
      } else if (message.includes("failed to fetch") || message.includes("network")) {
        setError(t("common.connectionError"));
      } else {
        setError(t("auth.authFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2 bg-app">
      {/* Side 1: Form Card */}
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile Value Banner */}
          <div className="lg:hidden mb-6 rounded-2xl bg-neutral-900 p-5 text-white shadow-sm">
            <span className="inline-block rounded-full bg-info-soft/20 text-info-soft px-3 py-1 text-xs font-semibold mb-2">
              {t("auth.heroBadge")}
            </span>
            <h2 className="text-base font-semibold leading-snug">{t("auth.heroTitle")}</h2>
          </div>

          <div className="rounded-2xl border border-border-strong bg-surface p-7 sm:p-9 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900"
              >
                <img
                  src="/nawah-logo.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 rounded-md border border-neutral-200 object-cover"
                />
                {t("common.brand")}
              </Link>
              <LanguageSwitcher />
            </div>

            <h1 className="mt-8 text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-neutral-950">
              {registering ? t("auth.registerTitle") : t("auth.loginTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {registering ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}
            </p>

            {/* Notice Banner */}
            {notice && !registering && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-success-border bg-success-soft px-3.5 py-3 text-sm text-success-strong flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* Error Banner */}
            {(error || socialError) && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-danger-border bg-danger-soft px-3.5 py-3 text-sm text-danger-strong"
              >
                {error || socialError}
              </p>
            )}

            {/* Form */}
            <form className="mt-6 space-y-4" onSubmit={submit}>
              {registering && (
                <div>
                  <label className="field-label">{t("auth.name")}</label>
                  <input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field-control"
                  />
                </div>
              )}
              <div>
                <label className="field-label">{t("auth.email")}</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-control"
                />
              </div>
              <div>
                <label className="field-label">{t("auth.password")}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={registering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-control"
                />
                {registering && (
                  <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                    {t("auth.passwordHint")}
                  </span>
                )}
              </div>

              <button
                disabled={submitting}
                className="button-primary w-full py-2.5 mt-2"
              >
                {submitting
                  ? t("auth.wait")
                  : registering
                    ? t("auth.createAccount")
                    : t("auth.signIn")}
              </button>

              <div className="space-y-4 pt-2">
                <div
                  className="flex items-center gap-3 text-xs text-neutral-500"
                  aria-hidden="true"
                >
                  <span className="h-px flex-1 bg-border" />
                  <span>{t("auth.continueWith")}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <SocialSignInButtons disabled={submitting} />
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600">
              {registering ? t("auth.alreadyHaveAccount") + " " : t("auth.newToApp") + " "}
              <Link
                className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                to={registering ? "/auth/login" : "/auth/register"}
              >
                {registering ? t("auth.signInLink") : t("auth.createAccountLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Side 2: Value Proposition & Video Preview Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-neutral-900 text-white p-12 xl:p-16 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-info-strong/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -start-32 w-96 h-96 rounded-full bg-warning-strong/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1 text-xs font-medium text-info-soft backdrop-blur-sm">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>{t("auth.heroBadge")}</span>
          </div>
          <h2 className="mt-6 text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
            {t("auth.heroTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-300 max-w-xl">
            {t("auth.heroDescription")}
          </p>

          {/* Onboarding Video Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setVideoModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setVideoModalOpen(true);
            }}
            className="mt-8 bg-white/10 border border-white/15 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition cursor-pointer backdrop-blur-md group"
          >
            <div className="w-12 h-12 rounded-xl bg-info-soft/20 text-info-soft flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PlayCircleIcon className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{t("auth.watchIntroTitle")}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-info-soft/20 text-info-soft">
                  90s
                </span>
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5 line-clamp-1">
                {t("auth.watchIntroSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="relative z-10 mx-auto w-full max-w-lg space-y-3 pt-12">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-info-soft shrink-0" />
            <span className="text-sm font-medium text-neutral-200">
              {t("auth.featureTrackTitle")}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-warning-soft shrink-0" />
            <span className="text-sm font-medium text-neutral-200">
              {t("auth.featureMentorTitle")}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-success-soft shrink-0" />
            <span className="text-sm font-medium text-neutral-200">
              {t("auth.featureGroupTitle")}
            </span>
          </div>
        </div>
      </div>

      {/* Intro Video / Walkthrough Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title={t("auth.watchIntroTitle")}
        subtitle={t("auth.watchIntroSubtitle")}
        size="lg"
      >
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-xl bg-neutral-900 border border-border flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
            <PlayCircleIcon className="w-16 h-16 text-info-soft mb-3 opacity-90" />
            <h4 className="text-base font-semibold text-white">{t("auth.heroTitle")}</h4>
            <p className="mt-1 text-xs text-neutral-400 max-w-md">{t("auth.heroDescription")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
              <p className="text-xs font-semibold text-text-primary">
                1. {t("auth.featureTrackTitle")}
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                {t("profile.expectation1Desc")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
              <p className="text-xs font-semibold text-text-primary">
                2. {t("auth.featureMentorTitle")}
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                {t("profile.expectation2Desc")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
              <p className="text-xs font-semibold text-text-primary">
                3. {t("auth.featureGroupTitle")}
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                {t("profile.expectation3Desc")}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function getSocialError(code: string | null, t: (key: string) => string): string {
  switch (code) {
    case "account_link_required":
      return t("auth.accountExists");
    case "google_unavailable":
      return t("auth.googleCancelled");
    default:
      return "";
  }
}

