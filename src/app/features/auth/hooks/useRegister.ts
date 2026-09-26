import { authApi } from "../api/authApi";
import { useAuth } from "../store/authStore";
import type { RegistrationInput } from "../types/user";
export function useRegister() {
  const { setUser } = useAuth();
  return async (input: RegistrationInput) => { await authApi.register(input); try { const user = await authApi.me(); setUser(user); return user; } catch { return null; } };
}
