import { useEffect, useState } from "react";
import { ModelPreference } from "@/types";

const MODEL_KEY = "aetherlearn.default.model.preference.v1";
const DEVICE_KEY = "aetherlearn.device.id.v1";

let memoryModelPreference: ModelPreference | null = null;
let memoryDeviceId: string | null = null;

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
    crypto?: { randomUUID?: () => string };
  };
  return maybeWindow.localStorage ?? null;
}

function isModelPreference(value: unknown): value is ModelPreference {
  return value === "local-auto" || value === "local-e4b" || value === "local-e2b" || value === "remote-gemini";
}

export function getDefaultModelPreference(): ModelPreference {
  if (memoryModelPreference) return memoryModelPreference;
  try {
    const raw = webStorage()?.getItem(MODEL_KEY);
    if (isModelPreference(raw)) {
      memoryModelPreference = raw;
      return raw;
    }
  } catch {
    // Local storage is optional in native shells.
  }
  return "local-auto";
}

export function saveDefaultModelPreference(preference: ModelPreference) {
  memoryModelPreference = preference;
  try {
    webStorage()?.setItem(MODEL_KEY, preference);
  } catch {
    // In-memory preference still keeps the current session usable.
  }
}

export function useDefaultModelPreference() {
  const [preference, setPreferenceState] = useState<ModelPreference>(() => getDefaultModelPreference());

  function setPreference(next: ModelPreference) {
    saveDefaultModelPreference(next);
    setPreferenceState(next);
  }

  useEffect(() => {
    setPreferenceState(getDefaultModelPreference());
  }, []);

  return [preference, setPreference] as const;
}

export function getDeviceId() {
  if (memoryDeviceId) return memoryDeviceId;
  try {
    const existing = webStorage()?.getItem(DEVICE_KEY);
    if (existing) {
      memoryDeviceId = existing;
      return existing;
    }
  } catch {
    // Fall through to in-memory id.
  }

  const maybeGlobal = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  const next =
    maybeGlobal.crypto?.randomUUID?.() ??
    `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  memoryDeviceId = next;
  try {
    webStorage()?.setItem(DEVICE_KEY, next);
  } catch {
    // In-memory device id is enough until durable storage is available.
  }
  return next;
}
