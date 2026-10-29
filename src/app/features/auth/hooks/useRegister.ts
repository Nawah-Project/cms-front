import { authApi } from "../api/authApi";
import { useAuth } from "../store/authStore";
import type { RegistrationInput } from "../types/user";
import { trackMarketingConversion } from "../../../utils/marketingAnalytics";
export function useRegister() {
  const { setUser } = useAuth();
  return async (input: RegistrationInput) => {
    const user = await authApi.register(input);
    trackMarketingConversion("SIGNUP_COMPLETED");
    setUser(user);
    return user;
  };
}
