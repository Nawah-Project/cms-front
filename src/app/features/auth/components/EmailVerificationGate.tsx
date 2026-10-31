import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { useToast } from "../../../components/ui/ToastProvider";
import { SparklesIcon, SpinnerIcon } from "../../../components/Icons";

const OTP_LENGTH = 6;
const INITIAL_COOLDOWN_SECONDS = 60;

export function EmailVerificationGate({ children }: { children: ReactNode }) {
  const { authenticated, user, setUser, signOut } = useAuth();
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill(""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(INITIAL_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!authenticated || !user || user.emailVerified !== false) return;
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authenticated, user, cooldown]);

  if (!authenticated || !user || user.emailVerified !== false) {
    return children;
  }

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH && /^\d{6}$/.test(code);

  const handleDigitChange = (index: number, rawValue: string) => {
    setError("");
    const cleaned = rawValue.replace(/\D/g, "");
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    // If multiple digits were entered/autofilled into one input
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH).split("");
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < chars.length && index + i < OTP_LENGTH; i += 1) {
          next[index + i] = chars[i];
        }
        return next;
      });
      const focusIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
      }
      event.preventDefault();
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      event.preventDefault();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      event.preventDefault();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setError("");
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const nextDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const verifiedUser = await authApi.verifyEmail(code);
      setUser(verifiedUser);
      showToast({
        message: t("auth.emailVerifiedSuccess"),
        variant: "success",
      });
    } catch (caught: unknown) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("expired")) {
        setError(t("auth.expiredVerificationCode"));
      } else if (message.includes("too many")) {
        setError(t("auth.tooManyVerificationAttempts"));
      } else {
        setError(t("auth.invalidVerificationCode"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      const res = await authApi.resendVerification();
      if (res.emailVerified) {
        const refreshed = await authApi.me();
        setUser(refreshed);
        return;
      }
      if(user && res.sent) setUser({...user, verificationDelivery: "SENT"});
      setDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(res.cooldownSeconds || INITIAL_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
      showToast({
        message: t("auth.codeResentSuccess"),
        variant: "success",
      });
    } catch (caught: unknown) {
      const message =
        caught instanceof Error ? caught.message : t("auth.authFailed");
      const match = /(\d+)\s*seconds/i.exec(message);
      if (match) {
        setCooldown(Number(match[1]));
      } else {
        setError(message);
      }
    } finally {
      setResending(false);
    }
  };

  const handleUseDifferentEmail = async () => {
    await signOut();
    navigate("/auth/register", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
      <section
        aria-labelledby="verify-email-title"
        className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900">
            <img
              src="/nawah-logo.svg?v=project-20261031"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-md border border-neutral-200 object-cover"
            />
            <span>{t("common.brand")}</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-strong">
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>{t("auth.verifyEmailBadge")}</span>
        </div>

        {user?.verificationDelivery === "FAILED" && <p role="alert" className="mt-3 text-danger-strong">{locale === "ar" ? "حسابك اتعمل، لكن إرسال الكود فشل. استخدم إعادة الإرسال لما الخدمة ترجع؛ مش محتاج تسجل من جديد." : "Your account was created, but email delivery failed. Retry sending when service is available; you do not need to register again."}</p>}
        <h1
          id="verify-email-title"
          className="mt-3 text-2xl font-bold tracking-tight text-neutral-950"
        >
          {t("auth.verifyEmailTitle")}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {t("auth.verifyEmailSubtitle")}
        </p>
        <p
          dir="ltr"
          className="mt-1.5 inline-block rounded-lg bg-neutral-100 px-3 py-1 font-mono text-sm font-semibold text-neutral-900"
        >
          {user.email}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-danger-border bg-danger-soft px-3.5 py-3 text-sm text-danger-strong"
          >
            {error}
          </p>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="field-label text-center block mb-3">
              {t("auth.verifyEmailCodeLabel")}
            </label>
            <div
              dir="ltr"
              className="flex items-center justify-center gap-2 sm:gap-2.5"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={6}
                  aria-label={`${t("auth.verifyEmailCodeLabel")} ${index + 1}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-border-strong bg-surface text-center font-mono text-xl font-bold text-neutral-950 outline-none transition-all focus:border-info-strong focus:ring-2 focus:ring-info-soft"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isComplete || submitting}
            className="button-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting && <SpinnerIcon className="h-4 w-4" />}
            <span>
              {submitting
                ? t("auth.verifyingEmail")
                : t("auth.verifyEmailButton")}
            </span>
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500">
          {t("auth.checkSpamFolderHint")}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 border-t border-border pt-5">
          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            className="button-secondary w-full py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {cooldown > 0
              ? t("auth.resendInSeconds", { seconds: cooldown })
              : t("auth.resendCode")}
          </button>

          <button
            type="button"
            onClick={handleUseDifferentEmail}
            className="w-full py-2 text-center text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline"
          >
            {t("auth.useDifferentEmail")}
          </button>
        </div>
      </section>
    </main>
  );
}

