import { ProfessionalImage } from "../../../components/ProfessionalImage";
import { JourneyScenery } from "../../../components/JourneyScenery";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useLogin } from "../hooks/useLogin";
import { useRegister } from "../hooks/useRegister";
import { SocialSignInButtons } from "./SocialSignInButtons";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { Modal } from "../../../components/ui/Modal";
import { IntroVideoPlayer } from "../../../components/IntroVideoPlayer";
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
        className="entry-loading"
        role="status"
      >
        <ProfessionalImage className="entry-loading-image" /><div><img src="/nawah-logo.svg" alt=""/><p>{t("auth.sessionLoading")}</p></div>
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
      } else if (
        message.includes("disposable") ||
        message.includes("temporary email")
      ) {
        setError(t("auth.disposableEmailError"));
      } else if (
        message.includes("domain does not exist") ||
        message.includes("cannot receive mail") ||
        message.includes("invalid email address format")
      ) {
        setError(t("auth.invalidEmailDomainError"));
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

  const isEmailError =
    error === t("auth.emailAlreadyExists") ||
    error === t("auth.disposableEmailError") ||
    error === t("auth.invalidEmailDomainError");
  const isPasswordError = error === t("auth.passwordRequirementsError");
  const generalAlert =
    socialError ||
    (error && !isEmailError && !isPasswordError ? error : "");

  return (
    <main className="entry-layout">
      {/* Side 1: Form Card */}
      <div className="entry-form-panel">
        <div className="w-full max-w-md">
          <div className="entry-form-card">
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

            {/* Error Banner (General / Network / Social Only) */}
            {generalAlert && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-danger-border bg-danger-soft px-3.5 py-3 text-sm text-danger-strong"
              >
                {generalAlert}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isEmailError) setError("");
                  }}
                  className={`field-control ${isEmailError ? "border-danger-strong ring-1 ring-danger-strong/30" : ""}`}
                />
                {isEmailError && (
                  <span role="alert" className="mt-1.5 block text-xs font-medium text-danger-strong">
                    {error}
                  </span>
                )}
              </div>
              <div>
                <label className="field-label">{t("auth.password")}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={registering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (isPasswordError) setError("");
                  }}
                  className={`field-control ${isPasswordError ? "border-danger-strong ring-1 ring-danger-strong/30" : ""}`}
                />
                {isPasswordError ? (
                  <span role="alert" className="mt-1.5 block text-xs font-medium text-danger-strong">
                    {error}
                  </span>
                ) : registering ? (
                  <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                    {t("auth.passwordHint")}
                  </span>
                ) : null}
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

      <JourneyScenery onExplore={() => setVideoModalOpen(true)} />

      {/* Intro Video / Walkthrough Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title={t("auth.watchIntroTitle")}
        subtitle={t("auth.watchIntroSubtitle")}
        size="lg"
      >
        <div className="space-y-4">
          <IntroVideoPlayer />
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

