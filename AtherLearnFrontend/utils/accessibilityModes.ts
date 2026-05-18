import { AccessibilityMode } from "@/types";

export const accessibilityModes: AccessibilityMode[] = [
  "Standard",
  "Blind / Low Vision",
  "Dyslexia Friendly",
  "Multilingual",
  "Slow Learner"
];

export const defaultAssignmentVersions: AccessibilityMode[] = [
  "Standard",
  "Dyslexia Friendly",
  "Blind / Low Vision"
];

const modeSet = new Set<AccessibilityMode>(accessibilityModes);

function modeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeAccessibilityMode(value: unknown): AccessibilityMode | null {
  if (modeSet.has(value as AccessibilityMode)) {
    return value as AccessibilityMode;
  }

  const key = modeKey(value);
  if (!key) return null;

  if (key.includes("blind") || key.includes("lowvision") || key.includes("screenreader") || key.includes("audiofirst")) {
    return "Blind / Low Vision";
  }
  if (key.includes("dyslexia") || key.includes("dyslexic")) {
    return "Dyslexia Friendly";
  }
  if (key.includes("multilingual") || key.includes("locallanguage") || key.includes("translation") || key.includes("language")) {
    return "Multilingual";
  }
  if (key.includes("slowlearner") || key.includes("slowpaced") || key.includes("paced") || key.includes("simplelanguage")) {
    return "Slow Learner";
  }
  if (key.includes("standard") || key.includes("default") || key.includes("regular")) {
    return "Standard";
  }

  return null;
}

export function normalizeAccessibilityModes(
  values: unknown,
  fallback: AccessibilityMode[] = ["Standard"]
): AccessibilityMode[] {
  const candidates = Array.isArray(values) ? values : [values];
  const normalized: AccessibilityMode[] = [];
  const seen = new Set<AccessibilityMode>();

  for (const value of candidates) {
    const mode = normalizeAccessibilityMode(value);
    if (mode && !seen.has(mode)) {
      normalized.push(mode);
      seen.add(mode);
    }
  }

  return normalized.length ? normalized : fallback;
}
