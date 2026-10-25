import {
  Fragment,
  createContext,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "../../../i18n";
import { clearPrivateAccountCache } from "../../../lib/account-cache";
import { queryClient } from "../../../lib/react-query";
import { authApi } from "../api/authApi";
import type { User } from "../types/user";
import { AUTH_SESSION_EXPIRED_EVENT } from "../../../utils/authSession";

type AuthState = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
};
type AuthContextValue = AuthState & {
  setUser: (user: User | null) => void;
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {locale}=useI18n();
  const [logoutError,setLogoutError]=useState(false);
  const [user, updateUser] = useState<User | null>(null);
  const epoch = useRef(0);
  const identity = useRef<string | null>(null);
  const setUser = useCallback((next: User | null) => {
    if (identity.current !== (next?.id ?? null)) {
      // Cancellation prevents old in-flight requests repopulating the shared cache.
      clearPrivateAccountCache(queryClient);
      identity.current = next?.id ?? null;
    }
    epoch.current++;
    if(next)setLogoutError(false);
    updateUser(next);
  }, []);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const started = epoch.current;
    try {
      const current = await authApi.me();
      if (started === epoch.current) setUser(current);
      return current;
    } catch {
      if (started === epoch.current) setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUser]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const clearExpiredSession = () => setUser(null);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, clearExpiredSession);
    return () =>
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        clearExpiredSession,
      );
  }, [setUser]);
  const signOut = useCallback(async () => {
    epoch.current++;
    try {
      await authApi.logout();
      setLogoutError(false);
    } catch(error) {
      setLogoutError(true);
      throw error;
    } finally {
      setUser(null);
    }
  }, [setUser]);
  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: user !== null,
      setUser,
      refresh,
      signOut,
    }),
    [user, loading, refresh, signOut],
  );
  return (
    <AuthContext.Provider value={value}>
      {logoutError && <div role="alert" className="border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"><p>{locale==='ar'?'مسحنا بيانات الحساب من الشاشة، لكن إنهاء الجلسة على السيرفر ما اتأكدش بسبب مشكلة الاتصال. حاول تسجيل الخروج تاني قبل ترك الجهاز المشترك.':'Account data was cleared locally, but server logout could not be confirmed. Retry signing out before leaving a shared device.'}</p><button className="button-secondary mt-2" onClick={()=>void signOut().catch(()=>undefined)}>{locale==='ar'?'حاول تسجيل الخروج تاني':'Retry sign out'}</button></div>}

      <Fragment key={user?.id ?? "anonymous"}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
