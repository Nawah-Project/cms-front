import type { User, Credentials, RegistrationInput } from "../types/user";
import { API_BASE_URL, apiClient } from "../../../lib/api-client";

export const AUTH_API_BASE_URL = API_BASE_URL;

function normalizeUser(payload: any): User {
  const user = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload;
  if (
    !user ||
    user.id == null ||
    typeof user.name !== "string" ||
    typeof user.email !== "string"
  ) {
    throw new Error("The server returned an invalid user profile.");
  }
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  };
}

export const authApi = {
  async login(input: Credentials): Promise<void> {
    await apiClient.post("/auth/login", input, { skipAuthRefresh: true });
  },
  async register(input: RegistrationInput): Promise<void> {
    await apiClient.post("/auth/register", input, { skipAuthRefresh: true });
  },
  async logout(): Promise<void> {
    await apiClient.post("/auth/logout", undefined, { skipAuthRefresh: true });
  },
  async me(): Promise<User> {
    return normalizeUser(await apiClient.get("/auth/me"));
  },
};

/** Start the backend OAuth redirect flow; credentials remain in HttpOnly cookies. */
export function getSocialAuthUrl(provider: "google"): string {
  return `${AUTH_API_BASE_URL}/auth/${provider}`;
}
