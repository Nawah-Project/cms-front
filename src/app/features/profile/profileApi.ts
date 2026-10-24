import { AUTH_API_BASE_URL } from "../auth/api/authApi";
import { apiClient } from "../../lib/api-client";
import { notifyAuthSessionExpired } from "../../utils/authSession";

export type CvMetadata = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type ProfessionalProfile = {
  id: string;
  name: string;
  portfolioUrl: string | null;
  targetJobTitle?: string | null;
  cv: CvMetadata | null;
  hasCv: boolean;
  profileComplete: boolean;
};

async function readError(response: Response): Promise<never> {
  if (response.status === 401) notifyAuthSessionExpired();
  let message = "Profile request failed";
  try {
    const payload = await response.json();
    message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message || message;
  } catch {
    /* use generic message */
  }
  const error = new Error(message) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

export const profileApi = {
  get: () => apiClient.get<ProfessionalProfile>("/profile"),
  update: (
    name: string,
    portfolioUrl: string | null,
    targetJobTitle?: string | null,
  ) =>
    apiClient.patch<ProfessionalProfile>("/profile", {
      name,
      portfolioUrl,
      targetJobTitle,
    }),
  uploadCv: async (file: File): Promise<CvMetadata> => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<CvMetadata>("/profile/cv", form);
  },
  getCv: async (userId: string): Promise<Blob> => {
    const response = await fetch(
      `${AUTH_API_BASE_URL}/users/${encodeURIComponent(userId)}/cv`,
      { credentials: "include", headers: { Accept: "application/pdf" } },
    );
    if (!response.ok) return readError(response);
    return response.blob();
  },
};

export function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

const defaultCvLimit = 5 * 1024 * 1024;
const configuredCvLimit = Number(import.meta.env.VITE_CV_MAX_FILE_SIZE_BYTES);
export const MAX_CV_BYTES = Math.min(
  Number.isFinite(configuredCvLimit) && configuredCvLimit > 0
    ? configuredCvLimit
    : defaultCvLimit,
  25 * 1024 * 1024,
);
export const MAX_CV_SIZE_MB = MAX_CV_BYTES / (1024 * 1024);
