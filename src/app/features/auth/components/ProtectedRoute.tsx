import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useI18n } from "../../../i18n";
import { SpinnerIcon } from "../../../components/Icons";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, authenticated } = useMe(); const navigate = useNavigate(); const location = useLocation();
  const { t } = useI18n();
  useEffect(() => { if (!loading && !authenticated) navigate("/auth/login", { replace: true, state: { from: location.pathname === "/" && new URLSearchParams(location.search).get("labPreview") === "home:B" ? location.pathname + location.search : location.pathname } }); }, [loading, authenticated, navigate, location.pathname, location.search]);
  if (loading || !authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-neutral-500" role="status">
        <SpinnerIcon className="h-5 w-5 text-neutral-500 me-2" />
        <span>{t("auth.sessionLoading")}</span>
      </main>
    );
  }
  return children;
}
