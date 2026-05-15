import { useEffect, useState } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { AccessibilityMode } from "@/types";

export type StudentTextSize = "Regular" | "Large" | "Extra Large";

export type StudentPreferences = {
  accessibilityMode: AccessibilityMode;
  language: string;
  textSize: StudentTextSize;
  audioSupport: boolean;
};

const STORAGE_KEY = "aetherlearn.student.preferences.v1";

export const defaultStudentPreferences: StudentPreferences = {
  accessibilityMode: "Standard",
  language: "English",
  textSize: "Large",
  audioSupport: true
};

const accessibilityModes = new Set<AccessibilityMode>([
  "Standard",
  "Blind / Low Vision",
  "Dyslexia Friendly",
  "Multilingual",
  "Slow Learner"
]);

const textSizes = new Set<StudentTextSize>(["Regular", "Large", "Extra Large"]);
const listeners = new Set<(preferences: StudentPreferences) => void>();
let memoryPreferences: StudentPreferences | null = null;

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };
  return maybeWindow.localStorage ?? null;
}

function normalizePreferences(value: unknown): StudentPreferences {
  const candidate = typeof value === "object" && value !== null ? value as Partial<StudentPreferences> : {};
  return {
    accessibilityMode: candidate.accessibilityMode && accessibilityModes.has(candidate.accessibilityMode)
      ? candidate.accessibilityMode
      : defaultStudentPreferences.accessibilityMode,
    language: typeof candidate.language === "string" && candidate.language.trim()
      ? candidate.language
      : defaultStudentPreferences.language,
    textSize: candidate.textSize && textSizes.has(candidate.textSize)
      ? candidate.textSize
      : defaultStudentPreferences.textSize,
    audioSupport: typeof candidate.audioSupport === "boolean"
      ? candidate.audioSupport
      : defaultStudentPreferences.audioSupport
  };
}

export function getStudentPreferences() {
  if (memoryPreferences) return memoryPreferences;

  try {
    const raw = webStorage()?.getItem(STORAGE_KEY);
    memoryPreferences = raw
      ? normalizePreferences(JSON.parse(raw))
      : defaultStudentPreferences;
  } catch {
    memoryPreferences = defaultStudentPreferences;
  }

  return memoryPreferences;
}

export function saveStudentPreferences(next: Partial<StudentPreferences>) {
  memoryPreferences = normalizePreferences({ ...getStudentPreferences(), ...next });
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(memoryPreferences));
  } catch {
    // Native/demo builds can continue with in-memory preferences.
  }
  listeners.forEach((listener) => listener(memoryPreferences as StudentPreferences));
}

export function useStudentPreferences() {
  const [preferences, setPreferences] = useState<StudentPreferences>(() => getStudentPreferences());

  useEffect(() => {
    listeners.add(setPreferences);
    return () => {
      listeners.delete(setPreferences);
    };
  }, []);

  return preferences;
}

export function studentTextMetrics(textSize: StudentTextSize) {
  switch (textSize) {
    case "Extra Large":
      return {
        bodyFontSize: 20,
        bodyLineHeight: 32,
        titleFontSize: 22,
        titleLineHeight: 30,
        metaFontSize: 16,
        metaLineHeight: 24
      };
    case "Regular":
      return {
        bodyFontSize: 15,
        bodyLineHeight: 23,
        titleFontSize: 17,
        titleLineHeight: 23,
        metaFontSize: 13,
        metaLineHeight: 19
      };
    case "Large":
    default:
      return {
        bodyFontSize: 17,
        bodyLineHeight: 27,
        titleFontSize: 19,
        titleLineHeight: 25,
        metaFontSize: 14,
        metaLineHeight: 20
      };
  }
}

export function studentAccessibilityVisuals(preferences: StudentPreferences): {
  screenStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  readingCardStyle: StyleProp<ViewStyle>;
  titleTextStyle: StyleProp<TextStyle>;
  bodyTextStyle: StyleProp<TextStyle>;
  metaTextStyle: StyleProp<TextStyle>;
  selectedOutlineStyle: StyleProp<ViewStyle>;
  modeSummary: string;
} {
  const metrics = studentTextMetrics(preferences.textSize);
  const baseTitle: TextStyle = {
    fontSize: metrics.titleFontSize,
    lineHeight: metrics.titleLineHeight
  };
  const baseBody: TextStyle = {
    fontSize: metrics.bodyFontSize,
    lineHeight: metrics.bodyLineHeight
  };
  const baseMeta: TextStyle = {
    fontSize: metrics.metaFontSize,
    lineHeight: metrics.metaLineHeight
  };

  switch (preferences.accessibilityMode) {
    case "Blind / Low Vision":
      return {
        screenStyle: { backgroundColor: "#EEF2FF" },
        cardStyle: { backgroundColor: "#0F172A", borderColor: "#FACC15", borderWidth: 2 },
        readingCardStyle: { backgroundColor: "#0F172A", borderColor: "#FACC15", borderWidth: 2 },
        titleTextStyle: { ...baseTitle, color: "#FFFFFF", fontWeight: "900" },
        bodyTextStyle: { ...baseBody, color: "#FFFFFF", fontWeight: "800" },
        metaTextStyle: { ...baseMeta, color: "#E2E8F0", fontWeight: "700" },
        selectedOutlineStyle: { borderColor: "#FACC15", borderWidth: 2 },
        modeSummary: "High contrast colors and larger reading targets are active."
      };
    case "Dyslexia Friendly":
      return {
        screenStyle: { backgroundColor: "#FFFBEB" },
        cardStyle: { backgroundColor: "#FFFEF7", borderColor: "#FBBF24", borderWidth: 1 },
        readingCardStyle: { backgroundColor: "#FFFEF7", borderColor: "#FBBF24", borderWidth: 1 },
        titleTextStyle: { ...baseTitle, color: "#111827", fontWeight: "900" },
        bodyTextStyle: { ...baseBody, color: "#1F2937", fontWeight: "700" },
        metaTextStyle: { ...baseMeta, color: "#475569", fontWeight: "700" },
        selectedOutlineStyle: { borderColor: "#D97706", borderWidth: 2 },
        modeSummary: "Warmer reading panels, heavier text, and wider line spacing are active."
      };
    case "Multilingual":
      return {
        screenStyle: { backgroundColor: "#F0F9FF" },
        cardStyle: { backgroundColor: "#FFFFFF", borderColor: "#7DD3FC", borderWidth: 1 },
        readingCardStyle: { backgroundColor: "#F8FBFF", borderColor: "#7DD3FC", borderWidth: 1 },
        titleTextStyle: { ...baseTitle, color: "#0F172A", fontWeight: "900" },
        bodyTextStyle: { ...baseBody, color: "#0F172A", fontWeight: "700" },
        metaTextStyle: { ...baseMeta, color: "#475569", fontWeight: "700" },
        selectedOutlineStyle: { borderColor: "#0284C7", borderWidth: 2 },
        modeSummary: `${preferences.language} language support is active where lesson versions exist.`
      };
    case "Slow Learner":
      return {
        screenStyle: { backgroundColor: "#F0FDFA" },
        cardStyle: { backgroundColor: "#FFFFFF", borderColor: "#99F6E4", borderWidth: 1 },
        readingCardStyle: { backgroundColor: "#F7FFFD", borderColor: "#5EEAD4", borderWidth: 1 },
        titleTextStyle: { ...baseTitle, color: "#0F172A", fontWeight: "900" },
        bodyTextStyle: { ...baseBody, color: "#0F172A", fontWeight: "700" },
        metaTextStyle: { ...baseMeta, color: "#475569", fontWeight: "700" },
        selectedOutlineStyle: { borderColor: "#0F766E", borderWidth: 2 },
        modeSummary: "Slower pacing, calmer panels, and simplified lesson versions are active."
      };
    case "Standard":
    default:
      return {
        screenStyle: { backgroundColor: "#F8FAFC" },
        cardStyle: undefined,
        readingCardStyle: undefined,
        titleTextStyle: baseTitle,
        bodyTextStyle: baseBody,
        metaTextStyle: baseMeta,
        selectedOutlineStyle: undefined,
        modeSummary: "Standard learning layout is active."
      };
  }
}
