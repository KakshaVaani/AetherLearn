import { StudentPreferences } from "@/api/studentPreferences";
import { generateStructuredStudentNotes } from "@/api/backend";
import { getDefaultModelPreference } from "@/api/localPreferences";
import { generateLocalStudentNotes, LocalModelUnavailableError } from "@/api/localAi";
import { AccessibilityMode, Lecture, ModelPreference } from "@/types";

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
  preferences: StudentPreferences,
  options: { modelPreference?: ModelPreference } = {}
): Promise<GeneratedStudentNote> {
  const store = readStore();
  const key = noteKey(lecture.id, preferences);
  const previous = store[key];
  const version = (previous?.version ?? 0) + 1;
  const text = await generateNoteText(
    lecture,
    preferences,
    version,
    options.modelPreference ?? getDefaultModelPreference()
  );
  const note: GeneratedStudentNote = {
    lessonId: lecture.id,
    mode: preferences.accessibilityMode,
    language: preferences.language,
    textSize: preferences.textSize,
    version,
    text,
    generatedAt: new Date().toISOString()
  };

  store[key] = note;
  writeStore(store);
  return note;
}

async function generateNoteText(
  lecture: Lecture,
  preferences: StudentPreferences,
  version: number,
  modelPreference: ModelPreference
) {
  if (modelPreference !== "remote-gemini") {
    try {
      return await generateLocalStudentNotes(lecture, preferences, version, modelPreference);
    } catch (error) {
      if (error instanceof LocalModelUnavailableError) throw error;
      throw new Error(error instanceof Error ? error.message : "Local Gemma note generation failed.");
    }
  }

  try {
    const response = await generateStructuredStudentNotes(lecture.id, {
      mode: preferences.accessibilityMode,
      language: preferences.language,
      textSize: preferences.textSize
    });
    if (response.answer.trim()) {
      return response.answer;
    }
  } catch {
    // Demo/local lesson ids may not exist in backend. Use a structured offline fallback.
  }
  return buildNoteText(lecture, preferences, version);
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
    `# ${lecture.title}`,
    "",
    "## 1. Big Idea",
    output,
    "",
    "## 2. Key Terms",
    ...lecture.keyVocabulary.map((term) => `- ${term}`),
    "",
    "## 3. Step-by-Step Explanation",
    lecture.diagramDescription,
    "",
    "## 4. Personalized Support",
    `- ${modeLine}`,
    `- Reading size: ${preferences.textSize}.`,
    `- ${audioLine}`,
    "",
    "## 5. Practice Questions",
    ...lecture.practiceQuestions.map((question) => `- ${question}`),
    "",
    "## 6. Quick Revision",
    `- ${focusPrompts[(version - 1) % focusPrompts.length]}`,
    "- Review the key terms once.",
    "- Try answering one practice question without looking."
  ].join("\n");
}
