import { authHeader } from "@/api/session";

type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {}
) {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.authenticated !== false) {
    Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || !payload.ok) {
    const message = payload.ok ? "Request failed" : payload.error.message;
    const code = payload.ok ? "REQUEST_FAILED" : payload.error.code;
    throw new ApiClientError(message, code, response.status);
  }

  return payload.data;
}

export function apiJson<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  authenticated = true
) {
  return apiRequest<T>(path, {
    method,
    authenticated,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
