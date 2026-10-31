import { authApi } from "../api/authApi";
import { useAuth } from "../store/authStore";
import type { RegistrationInput } from "../types/user";
export function useRegister() {
  const { setUser } = useAuth();
  return async (input: RegistrationInput) => {
    const user = await authApi.register(input);
    setUser(user);
    return user;
  };
}
