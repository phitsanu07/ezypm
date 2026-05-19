import { supabase } from "@/frontend/lib/supabaseClient";
import { ApiClientError } from "@/frontend/lib/http-errors";
import type { ApiErrorCode } from "@/types";

// Dev (Vite): API runs on a separate port → http://localhost:3001
// Prod (Vercel): API + frontend share origin → relative path (empty base)
// Override via VITE_API_BASE_URL if needed.
const explicit = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
const API_BASE_URL =
  explicit !== undefined
    ? explicit
    : import.meta.env.PROD
      ? ""
      : "http://localhost:3001";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError({
      code: "NETWORK_ERROR",
      message: "Network request failed",
      status: 0,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; details?: unknown } };

  if (!json.ok) {
    const code = (json.error.code ?? "INTERNAL_ERROR") as ApiErrorCode;
    throw new ApiClientError({
      code,
      message: json.error.message,
      status: response.status,
    });
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};
