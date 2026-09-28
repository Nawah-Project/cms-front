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
              className="h-10 w-10 shrink-0 rounded-xl border border-neutral-200 object-cover dark:border-neutral-700"
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
            <input
              required
              type="password"
              minLength={8}
              autoComplete={registering ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-neutral-500">
              {t("auth.passwordHint")}
            </span>
          </label>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 text-xs text-neutral-500" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span>{t("auth.continueWith")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <SocialSignInButtons disabled={submitting} />
          </div>
          <button
            disabled={submitting}
            className="button-primary w-full dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {submitting
              ? t("auth.wait")
              : registering
                ? t("auth.createAccount")
                : t("auth.signIn")}
          </button>
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
