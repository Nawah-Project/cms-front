import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useLogin } from "../hooks/useLogin";
import { useRegister } from "../hooks/useRegister";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
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

  useEffect(() => {
    if (!loading && authenticated) navigate(from, { replace: true });
  }, [loading, authenticated, navigate, from]);

  if (loading || authenticated) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-app text-sm text-neutral-500"
        role="status"
      >
        Loading your session…
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
            state: { notice: "Account created. Please sign in." },
          });
      } else {
        await login({ email: email.trim(), password });
        navigate(from, { replace: true });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to authenticate. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-5 py-12 dark:bg-neutral-950">
      <section className="w-full max-w-md rounded-2xl border border-border-strong bg-surface px-7 py-8 shadow-sm sm:px-9 sm:py-10 dark:border-neutral-800 dark:bg-neutral-900">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900 dark:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-900 bg-neutral-100 text-xs font-bold">
            J
          </span>
          Job Tracker
        </Link>
        <h1 className="mt-9 text-3xl font-semibold leading-tight tracking-tight text-neutral-950 dark:text-neutral-100">
          {registering ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          {registering
            ? "Start organizing your job search."
            : "Sign in to continue to your applications."}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}
        <form className="mt-7 space-y-5" onSubmit={submit}>
          {registering && (
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Name
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
            Email
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
            Password
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
              Use at least 8 characters.
            </span>
          </label>
          <button
            disabled={submitting}
            className="button-primary w-full dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {submitting
              ? "Please wait…"
              : registering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {registering ? "Already have an account? " : "New to Job Tracker? "}
          <Link
            className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white"
            to={registering ? "/auth/login" : "/auth/register"}
          >
            {registering ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}

const inputClass =
  "field-control mt-2 block w-full dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-800";
