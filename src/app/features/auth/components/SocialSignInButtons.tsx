import { useState } from "react";
import { getSocialAuthUrl } from "../api/authApi";
import { useI18n } from "../../../i18n";

type Provider = "google";

export function SocialSignInButtons({ disabled = false }: { disabled?: boolean }) {
  const { t } = useI18n();
  const [redirectingTo, setRedirectingTo] = useState<Provider | null>(null);

  function start(provider: Provider) {
    if (disabled || redirectingTo) return;
    setRedirectingTo(provider);
    window.location.assign(getSocialAuthUrl(provider));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-label={t("auth.continueGoogle")}
        disabled={disabled || redirectingTo !== null}
        onClick={() => start("google")}
        className="social-auth-button"
      >
        <GoogleMark />
        <span>{redirectingTo === "google" ? t("auth.connecting") : t("auth.continueGoogle")}</span>
        {redirectingTo === "google" && <Spinner />}
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15l6.9 5.2c1.6-4.7 6-8.1 11.2-8.1Z" />
    </svg>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}
