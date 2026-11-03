import { useAuth } from '../auth/store/authStore';
import { useI18n } from '../../i18n';
import { ProtectedRoute } from '../auth/components/ProtectedRoute';
import { canAdminAccess } from '../../platform/access/adminAccess';
import { Link } from 'react-router';

export default function FounderWorkspacePage() {
  const { user, loading } = useAuth();
  const { locale } = useI18n();
  return <ProtectedRoute>{loading ? <p role="status">{locale === 'ar' ? 'جارٍ التحقق من الصلاحية…' : 'Checking access…'}</p> : canAdminAccess(user, 'FOUNDER_WORKSPACE') ?
    <iframe title={locale === 'ar' ? 'مساحة المؤسس' : 'Founder workspace'} src={`/founder-workspace/index.html?lang=${locale}`} className="fixed inset-0 h-dvh w-full border-0" referrerPolicy="no-referrer" /> :
    <main className="mx-auto max-w-xl p-10"><h1>{locale === 'ar' ? 'هذه المساحة تحتاج صلاحية خاصة' : 'This workspace requires separate permission'}</h1><Link to="/">{locale === 'ar' ? 'العودة' : 'Go back'}</Link></main>}
  </ProtectedRoute>;
}
