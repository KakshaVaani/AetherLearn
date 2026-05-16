import { authHeader, clearSession, getSession, saveSession } from "@/api/session";

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

type RefreshData = {
  user: {
    id: string;
    name: string;
    role: "teacher" | "student";
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSessionToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const session = getSession();
  if (!session?.refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken: session.refreshToken })
      });
      const payload = (await response.json().catch(() => null)) as ApiSuccess<RefreshData> | ApiError | null;
      if (!response.ok || !payload?.ok) {
        return false;
      }
      saveSession({
        accessToken: payload.data.tokens.accessToken,
        refreshToken: payload.data.tokens.refreshToken,
        role: payload.data.user.role,
        userId: payload.data.user.id,
        name: payload.data.user.name
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {},
  allowRefresh = true
) {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.authenticated !== false) {
    Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiClientError(
      `Cannot reach backend at ${API_BASE_URL}. Check the backend is running and the mobile app is not using localhost.`,
      "NETWORK_ERROR",
      0
    );
  }

  let payload: ApiSuccess<T> | ApiError;
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiError;
  } catch {
    throw new ApiClientError("Backend returned an unreadable response.", "INVALID_RESPONSE", response.status);
  }

  if ((!response.ok || !payload.ok) && response.status === 401 && options.authenticated !== false && allowRefresh) {
    const refreshed = await refreshSessionToken();
    if (refreshed) {
      return apiRequest<T>(path, options, false);
    }
    clearSession();
    throw new ApiClientError("Session expired. Please log in again.", "UNAUTHORIZED", 401);
  }

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
