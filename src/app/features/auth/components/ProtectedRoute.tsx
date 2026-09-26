import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { useI18n } from "../../../i18n";
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, authenticated } = useMe(); const navigate = useNavigate(); const location = useLocation();
  const { t } = useI18n();
  useEffect(() => { if (!loading && !authenticated) navigate("/auth/login", { replace: true, state: { from: location.pathname } }); }, [loading, authenticated, navigate, location.pathname]);
  if (loading || !authenticated) return <main className="min-h-screen flex items-center justify-center text-sm text-neutral-500" role="status">{t("auth.sessionLoading")}</main>;
  return children;
}
