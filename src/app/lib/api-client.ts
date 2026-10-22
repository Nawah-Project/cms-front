import { notifyAuthSessionExpired } from "../utils/authSession";

export const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export type RequestOptions<TBody = unknown> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: TBody;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = new URL(`${API_BASE_URL}${normalizedPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        fullUrl.searchParams.set(key, String(value));
      }
    }
  }
  return fullUrl.toString();
}

export async function fetchApi<T, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    params,
    skipAuthRefresh = false,
  } = options;

  const url = buildUrl(path, params);
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const serializedBody =
    body === undefined
      ? undefined
      : isFormData || typeof body === "string"
        ? (body as BodyInit)
        : JSON.stringify(body);

  const executeFetch = async (): Promise<Response> => {
    return fetch(url, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(serializedBody && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      ...(serializedBody !== undefined ? { body: serializedBody } : {}),
    });
  };

  let response = await executeFetch();

  const isAuthEndpoint =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout");

  if (!response.ok && response.status === 401 && !isAuthEndpoint && !skipAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await executeFetch();
    } else {
      notifyAuthSessionExpired();
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let details: unknown;
    try {
      const errorJson = await response.json();
      details = errorJson;
      if (Array.isArray(errorJson?.message)) {
        errorMessage = errorJson.message.join(", ");
      } else if (typeof errorJson?.message === "string") {
        errorMessage = errorJson.message;
      } else if (typeof errorJson?.error === "string") {
        errorMessage = errorJson.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // ignore
      }
    }

    const code =
      response.status === 401 || response.status === 403
        ? "PERMISSION_DENIED"
        : "REQUEST_FAILED";
    throw new ApiError(errorMessage, response.status, details, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  request: fetchApi,
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return fetchApi<T>(path, { ...options, method: "GET" });
  },
  post<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ): Promise<T> {
    return fetchApi<T, TBody>(path, { ...options, method: "POST", body });
  },
  put<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ): Promise<T> {
    return fetchApi<T, TBody>(path, { ...options, method: "PUT", body });
  },
  patch<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ): Promise<T> {
    return fetchApi<T, TBody>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(
    path: string,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return fetchApi<T>(path, { ...options, method: "DELETE" });
  },
};

