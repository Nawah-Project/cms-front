import { authApi } from "../api/authApi";
import { useAuth } from "../store/authStore";
import type { Credentials } from "../types/user";
export function useLogin() {
  const { setUser } = useAuth();
  return async (input: Credentials) => {
    const user=await authApi.login(input);setUser(user);return user;
  };
}
