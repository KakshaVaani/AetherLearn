import { StudentPreferences } from "@/api/studentPreferences";
import { AccessibilityMode, Lecture } from "@/types";

export type GeneratedStudentNote = {
  lessonId: string;
  mode: AccessibilityMode;
  language: string;
  textSize: string;
  version: number;
  text: string;
  generatedAt: string;
};

const STORAGE_KEY = "aetherlearn.generated.student.notes.v1";

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };
  return maybeWindow.localStorage ?? null;
}

function noteKey(lessonId: string, preferences: StudentPreferences) {
  return [
    lessonId,
    preferences.accessibilityMode,
    preferences.language,
    preferences.textSize
  ].join("::");
}

function readStore(): Record<string, GeneratedStudentNote> {
  try {
    const raw = webStorage()?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, GeneratedStudentNote> : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, GeneratedStudentNote>) {
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // In native/demo builds the generated note can still live in component state.
  }
}

export function getGeneratedStudentNote(lessonId: string, preferences: StudentPreferences) {
  return readStore()[noteKey(lessonId, preferences)] ?? null;
}

export async function generateStudentNote(
  lecture: Lecture,
  preferences: StudentPreferences
): Promise<GeneratedStudentNote> {
  const store = readStore();
  const key = noteKey(lecture.id, preferences);
  const previous = store[key];
  const version = (previous?.version ?? 0) + 1;
  const note: GeneratedStudentNote = {
    lessonId: lecture.id,
    mode: preferences.accessibilityMode,
    language: preferences.language,
    textSize: preferences.textSize,
    version,
    text: buildNoteText(lecture, preferences, version),
    generatedAt: new Date().toISOString()
  };

  store[key] = note;
  writeStore(store);
  return note;
}

function baseOutput(lecture: Lecture, mode: AccessibilityMode) {
  switch (mode) {
    case "Blind / Low Vision":
      return lecture.outputs.blindLowVision;
    case "Dyslexia Friendly":
      return lecture.outputs.dyslexiaFriendly;
    case "Multilingual":
      return lecture.outputs.multilingual;
    case "Slow Learner":
      return lecture.outputs.slowLearner;
    case "Standard":
    default:
      return lecture.outputs.standard;
  }
}

function buildNoteText(lecture: Lecture, preferences: StudentPreferences, version: number) {
  const output = baseOutput(lecture, preferences.accessibilityMode);
  const focusPrompts = [
    "Focus first on the main idea, then read the examples.",
    "After reading, say the key idea once in your own words.",
    "Use the practice questions to check what you remember."
  ];
  const modeLine =
    preferences.accessibilityMode === "Multilingual"
      ? `Language support: ${preferences.language}.`
      : `Learning mode: ${preferences.accessibilityMode}.`;
  const audioLine = preferences.audioSupport
    ? "Audio is available for this lesson."
    : "Audio is currently off in settings.";

  return [
    output,
    "",
    modeLine,
    `Reading size: ${preferences.textSize}.`,
    audioLine,
    focusPrompts[(version - 1) % focusPrompts.length]
  ].join("\n");
}
