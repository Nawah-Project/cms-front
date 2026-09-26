import { authApi } from "../api/authApi";
import { useAuth } from "../store/authStore";
import type { Credentials } from "../types/user";
export function useLogin() {
  const { setUser } = useAuth();
  return async (input: Credentials) => { await authApi.login(input); const user = await authApi.me(); setUser(user); return user; };
}
