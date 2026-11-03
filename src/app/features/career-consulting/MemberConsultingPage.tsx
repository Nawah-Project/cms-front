
import { WorkspaceLink as Link } from "../../platform/navigation/WorkspaceLink";
import { useI18n } from "../../i18n";
import { EmailVerificationGate } from "../auth/components/EmailVerificationGate";
import { ProtectedRoute } from "../auth/components/ProtectedRoute";
import { useAuth } from "../auth/store/authStore";
import ConsultingWorkspace from "./Workspace";
import "./consulting.css";
export default function MemberConsultingPage() {
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      <EmailVerificationGate>
        <div className="cc-member-shell">
          <header className="cc-member-head">
            <Link to="/" className="flex items-center gap-3">
              <img src="/nawah-logo.svg" alt="نواة" />
              نواة · NAWAH
            </Link>
            <div className="cc cc-actions">
              <span>{user?.name}</span>
              <button onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
                {locale === "ar" ? "English" : "العربية"}
              </button>
              <Link to="/">{locale === "ar" ? "البرنامج" : "Programme"}</Link>
            </div>
          </header>
          {user?.role === "USER" ? (
            <ConsultingWorkspace member />
          ) : (
            <div className="cc cc-card">
              <Link to="/admin/career-consulting">
                {locale === "ar"
                  ? "افتح مساحة المستشار"
                  : "Open consultant workspace"}
              </Link>
            </div>
          )}
        </div>
      </EmailVerificationGate>
    </ProtectedRoute>
  );
}
