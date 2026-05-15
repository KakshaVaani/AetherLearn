import { Role } from "@/types";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  userId: string;
  name: string;
};

const STORAGE_KEY = "aetherlearn.auth.session.v1";

let memorySession: AuthSession | null = null;

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };
  return maybeWindow.localStorage ?? null;
}

export function saveSession(session: AuthSession) {
  memorySession = session;
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage is optional on native/demo builds; in-memory auth is enough for the session.
  }
}

export function getSession() {
  if (memorySession) return memorySession;

  try {
    const raw = webStorage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    memorySession = JSON.parse(raw) as AuthSession;
    return memorySession;
  } catch {
    return null;
  }
}

export function clearSession() {
  memorySession = null;
  try {
    webStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures; logout should still clear the in-memory session.
  }
}

export function authHeader() {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}
