import type { User, Credentials, RegistrationInput } from "../types/user";

const BASE_URL = ((typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:3000").replace(/\/$/, "");

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method, credentials: "include",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try { const data = await response.json(); message = Array.isArray(data.message) ? data.message.join(", ") : data.message || data.error || message; } catch { /* use status message */ }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function normalizeUser(payload: any): User {
  const user = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload;
  if (!user || user.id == null || typeof user.name !== "string" || typeof user.email !== "string") {
    throw new Error("The server returned an invalid user profile.");
  }
  return { id: String(user.id), name: user.name, email: user.email };
}

export const authApi = {
  async login(input: Credentials): Promise<void> { await request("/auth/login", "POST", input); },
  async register(input: RegistrationInput): Promise<void> { await request("/auth/register", "POST", input); },
  async logout(): Promise<void> { await request("/auth/logout", "POST"); },
  async me(): Promise<User> { return normalizeUser(await request("/auth/me", "GET")); },
};
