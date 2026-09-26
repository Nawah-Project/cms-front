import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import type { User } from "../types/user";
import { AUTH_SESSION_EXPIRED_EVENT } from "../../../utils/authSession";

type AuthState = { user: User | null; loading: boolean; authenticated: boolean };
type AuthContextValue = AuthState & { setUser: (user: User | null) => void; refresh: () => Promise<User | null>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const current = await authApi.me(); setUser(current); return current; }
    catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const clearExpiredSession = () => setUser(null);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, clearExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, clearExpiredSession);
  }, []);
  const signOut = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);
  const value = useMemo(() => ({ user, loading, authenticated: user !== null, setUser, refresh, signOut }), [user, loading, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
