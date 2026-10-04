import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useLogin } from "../hooks/useLogin";
import { useRegister } from "../hooks/useRegister";
import { SocialSignInButtons } from "./SocialSignInButtons";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const login = useLogin();
  const register = useRegister();
  const { loading, authenticated } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";
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
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      setError(message.includes("invalid email or password")
        ? t("auth.invalidCredentials")
        : message.includes("failed to fetch") || message.includes("network")
          ? t("common.connectionError")
          : t("auth.authFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-5 py-12 dark:bg-neutral-950">
      <section className="w-full max-w-md rounded-2xl border border-border-strong bg-surface px-7 py-8 shadow-sm sm:px-9 sm:py-10 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900 dark:text-white"
          >
            <img
              src="/nawah-logo.svg"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-md border border-neutral-200 object-cover dark:border-neutral-700"
            />
            {t("common.brand")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-9 text-3xl font-semibold leading-tight tracking-tight text-neutral-950 dark:text-neutral-100">
          {registering ? t("auth.registerTitle") : t("auth.loginTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          {registering
            ? t("auth.registerSubtitle")
            : t("auth.loginSubtitle")}
        </p>
        {(error || socialError) && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error || socialError}
          </p>
        )}
        <form className="mt-7 space-y-5" onSubmit={submit}>
          {registering && (
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {t("auth.name")}
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>
          )}
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {t("auth.email")}
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {t("auth.password")}
            <div className="relative mt-2">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={8}
                autoComplete={registering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-control block w-full pe-10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <span className="mt-1.5 block text-xs font-normal text-neutral-500">
              {t("auth.passwordHint")}
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="button-primary w-full mt-2 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {submitting
              ? t("auth.wait")
              : registering
                ? t("auth.createAccount")
                : t("auth.signIn")}
          </button>

          <div className="space-y-4 pt-3">
            <div className="flex items-center gap-3 text-xs text-neutral-500" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span>{t("auth.continueWith")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <SocialSignInButtons disabled={submitting} />
          </div>
        </form>
        <p className="mt-7 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {registering ? t("auth.alreadyHaveAccount") + " " : t("auth.newToApp") + " "}
          <Link
            className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white"
            to={registering ? "/auth/login" : "/auth/register"}
          >
            {registering ? t("auth.signInLink") : t("auth.createAccountLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}

const inputClass =
  "field-control mt-2 block w-full dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-800";

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
