import { localModelCatalog, preferredLocalModels } from "@/api/modelCatalog";
import {
  generateWithGemma,
  getDeviceCapabilities,
  getModelStatus
} from "@/api/gemmaRuntime";
import { queueLocalOperation, saveLocalEntity } from "@/api/localStore";
import {
  AccessibilityMode,
  AssignmentAnswerMode,
  AssignmentQuestion,
  LessonPack,
  Lecture,
  ModelPreference,
  RuntimeMode
} from "@/types";
import { normalizeAccessibilityModes } from "@/utils/accessibilityModes";

export type AskLessonResponse = {
  answer: string;
  simpleAnswer?: string;
  simple_answer?: string;
  confidence?: number;
  followUpSuggestion?: string;
  follow_up_suggestion?: string;
  sourceLimited?: boolean;
  source_limited?: boolean;
};

export type AssignmentDraftResponse = {
  title: string;
  instructions: string;
  answerMode: AssignmentAnswerMode;
  versions: AccessibilityMode[];
  questions: AssignmentQuestion[];
};

export class LocalModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalModelUnavailableError";
  }
}

const SYSTEM_INSTRUCTION = [
  "You are AetherLearn's local classroom assistant.",
  "Use only the provided lesson/source content.",
  "Return JSON only when asked for JSON.",
  "Keep accessibility and teacher review requirements explicit."
].join(" ");

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sourceFacts(text: string) {
  return text
    .split(/[.\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function extractJsonObject<T>(text: string): T | null {
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const repaired = candidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'");
    try {
      return JSON.parse(repaired) as T;
    } catch {
      return null;
    }
  }
}

async function selectLocalModel(preference: ModelPreference) {
  const capabilities = await getDeviceCapabilities();
  if (capabilities.runtimeKind === "unavailable") {
    const message =
      capabilities.platform === "web"
        ? "Browser Gemma needs WebGPU. Open this demo in a current Chrome or Edge browser with hardware acceleration enabled."
        : "On-device Gemma needs an Android development build with the native bridge.";
    throw new LocalModelUnavailableError(message);
  }
  if (capabilities.runtimeKind === "android-native" && capabilities.androidSdk < 31) {
    throw new LocalModelUnavailableError("On-device Gemma needs Android 12 or newer.");
  }

  for (const modelId of preferredLocalModels(preference)) {
    const model = localModelCatalog[modelId];
    const totalMemoryGb = capabilities.totalMemoryBytes / 1_000_000_000;
    if (totalMemoryGb > 0 && totalMemoryGb < model.minDeviceMemoryGb) continue;
    const status = await getModelStatus(model);
    if (capabilities.runtimeKind === "browser-webgpu" || status.downloaded) {
      return { model, capabilities, status };
    }
  }

  const detail =
    capabilities.runtimeKind === "browser-webgpu"
      ? "No eligible browser Gemma model fits this device. Try E2B or choose Remote Gemini."
      : "No eligible downloaded local Gemma model is ready. Download E2B or E4B in Settings, or choose Remote Gemini.";
  throw new LocalModelUnavailableError(detail);
}

async function runLocalPrompt(preference: ModelPreference, prompt: string, expectedJson = true) {
  const selected = await selectLocalModel(preference);
  const result = await generateWithGemma(selected.model, {
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    expectedJson
  });
  return { ...selected, result };
}

function fallbackLesson(input: {
  title: string;
  text: string;
  classroomId: string;
  classSubjectId?: string;
  subject: string;
  gradeBand: string;
  language?: string;
  modelLabel: string;
  latencyMs: number;
  runtimeMode: RuntimeMode;
  traceRuntime: string;
}): LessonPack {
  const facts = sourceFacts(input.text);
  const title = input.title || facts[0] || "Local Lesson";
  const vocabulary = facts.slice(0, 5).map((fact) => {
    const term = fact.split(/\s+/).slice(0, 3).join(" ");
    return { term: term || input.subject, meaning: fact };
  });
  const questions = [
    `What is the main idea of ${title}?`,
    `Name two important details from ${title}.`,
    `Explain ${title} in your own words.`,
    `How could you use this idea in class?`
  ];
  return {
    id: id("local-lesson"),
    title,
    classroomId: input.classroomId,
    classSubjectId: input.classSubjectId,
    grade: input.gradeBand,
    subject: input.subject,
    language: input.language ?? "en",
    learnerNeed: "Local-first accessible draft",
    outputType: "Teacher + Student + Trust Packs",
    status: "Needs Review",
    runtimeMode: input.runtimeMode,
    qualityChecks: [
      { label: "Focus", status: "Good" },
      { label: "Lighting", status: "Good" },
      { label: "Crop", status: "Good" }
    ],
    sourceCard: {
      topic: title,
      sourceType: "Text notes",
      confidence: 0.78,
      detectedText: facts,
      diagramElements: [],
      equations: [],
      unclearRegions: facts.length ? [] : ["Source text was very short."],
      confidenceNotes: ["Generated locally; teacher review is required."]
    },
    teacherPack: {
      objective: `Students will be able to explain ${title}.`,
      keyConcepts: facts.length ? facts : [title],
      teachingScript: facts.join(" ") || input.text,
      classroomActivity: "Ask learners to pair up, explain the concept, and share one example.",
      worksheet: questions,
      answerKey: questions.map((question) => `Answer using the local lesson notes: ${question}`),
      misconceptions: ["Learners may confuse examples with the main idea."],
      differentiatedSupport: "Support: read aloud. Core: answer independently. Challenge: create a new example."
    },
    studentAccessPack: {
      screenReaderSummary: facts.join(" ") || input.text,
      audioStudyScript: `Today we are learning ${title}. Listen for the main idea and key words.`,
      visualDescription: "No image was provided. The source was generated from text notes.",
      stepByStepExplanation: facts.map((fact, index) => `${index + 1}. ${fact}`).join("\n"),
      vocabulary,
      steps: facts,
      practiceQuestions: questions,
      selfCheckAnswers: questions.map(() => "Check your answer against the lesson notes.")
    },
    trustPack: {
      runtimeMode: input.runtimeMode,
      model: input.modelLabel,
      latency: `${input.latencyMs} ms`,
      schemaStatus: "Valid",
      teacherReviewStatus: "Review Required",
      confidence: 78,
      accessibilityWarnings: ["Teacher should review the generated draft before assigning."]
    },
    safetyFlags: {
      sourceUnclear: facts.length === 0,
      possibleOcrError: false,
      teacherReviewRequired: true
    },
    trace: {
      runtime: input.traceRuntime,
      model: input.modelLabel,
      localOnly: true,
      hostedApiUsed: false,
      latencyMs: input.latencyMs,
      generatedAt: now()
    }
  };
}

export async function generateLocalLessonFromText(
  input: {
    title: string;
    text: string;
    classroomId: string;
    classSubjectId?: string;
    subject: string;
    gradeBand: string;
    language?: string;
  },
  preference: ModelPreference
) {
  const prompt = [
    "Create a private accessible lesson draft from these teacher notes.",
    "Return JSON with optional fields: title, detectedText, keyConcepts, teachingScript, studentSummary, practiceQuestions.",
    `Title: ${input.title}`,
    `Subject: ${input.subject}`,
    `Grade: ${input.gradeBand}`,
    `Language: ${input.language ?? "en"}`,
    "Teacher notes:",
    input.text
  ].join("\n");
  const { model, result } = await runLocalPrompt(preference, prompt);
  const parsed = extractJsonObject<{
    title?: string;
    detectedText?: string[];
    keyConcepts?: string[];
    teachingScript?: string;
    studentSummary?: string;
    practiceQuestions?: string[];
  }>(result.text);
  const lesson = fallbackLesson({
    ...input,
    title: parsed?.title ?? input.title,
    modelLabel: result.modelLabel || model.label,
    latencyMs: result.latencyMs,
    runtimeMode: result.runtimeMode,
    traceRuntime: result.runtimeKind
  });
  if (parsed?.detectedText?.length) lesson.sourceCard.detectedText = parsed.detectedText.slice(0, 10);
  if (parsed?.keyConcepts?.length) lesson.teacherPack.keyConcepts = parsed.keyConcepts.slice(0, 8);
  if (parsed?.teachingScript) lesson.teacherPack.teachingScript = parsed.teachingScript;
  if (parsed?.studentSummary) lesson.studentAccessPack.screenReaderSummary = parsed.studentSummary;
  if (parsed?.practiceQuestions?.length) {
    lesson.studentAccessPack.practiceQuestions = parsed.practiceQuestions.slice(0, 6);
    lesson.teacherPack.worksheet = parsed.practiceQuestions.slice(0, 6);
  }
  await saveLocalEntity("lesson", lesson, { localId: lesson.id, syncStatus: "queued" });
  await queueLocalOperation("CREATE_LESSON_FROM_TEXT", { input, lesson }, { entityType: "lesson", entityId: lesson.id });
  return lesson;
}

export async function generateLocalStudentNotes(
  lecture: Lecture,
  preferences: {
    accessibilityMode: AccessibilityMode;
    language: string;
    textSize: string;
    audioSupport: boolean;
  },
  version: number,
  preference: ModelPreference
) {
  const prompt = [
    "Generate student-friendly structured notes from this lesson only.",
    "Return JSON with one string field: text.",
    `Accessibility mode: ${preferences.accessibilityMode}`,
    `Preferred language: ${preferences.language}`,
    `Text size: ${preferences.textSize}`,
    `Lesson: ${lecture.title}`,
    lecture.teacherNotes,
    lecture.outputs.standard
  ].join("\n");
  const { result } = await runLocalPrompt(preference, prompt);
  const parsed = extractJsonObject<{ text?: string }>(result.text);
  const text =
    parsed?.text?.trim() ||
    [
      `# ${lecture.title}`,
      "",
      "## Big Idea",
      lecture.outputs.standard,
      "",
      "## Key Terms",
      ...lecture.keyVocabulary.map((term) => `- ${term}`),
      "",
      "## Practice",
      ...lecture.practiceQuestions.map((question) => `- ${question}`)
    ].join("\n");
  await saveLocalEntity(
    "generated_note",
    { lessonId: lecture.id, text, preferences, version, generatedAt: now() },
    { localId: `note-${lecture.id}-${version}`, syncStatus: "queued" }
  );
  await queueLocalOperation("GENERATE_STUDENT_NOTE", { lectureId: lecture.id, text, preferences, version }, { entityType: "generated_note", entityId: `note-${lecture.id}-${version}` });
  return text;
}

export async function askLocalDoubt(
  input: {
    lecture: Lecture;
    question: string;
    studentProfile: {
      accessibilityMode: string;
      language: string;
      textSize: string;
      audioSupport: boolean;
    };
  },
  preference: ModelPreference
): Promise<AskLessonResponse> {
  const prompt = [
    "Answer the student's doubt using only this lesson.",
    "Return JSON with answer, simpleAnswer, confidence, followUpSuggestion, sourceLimited.",
    `Question: ${input.question}`,
    `Language: ${input.studentProfile.language}`,
    `Lesson: ${input.lecture.title}`,
    input.lecture.teacherNotes,
    input.lecture.outputs.standard
  ].join("\n");
  const { result } = await runLocalPrompt(preference, prompt);
  const parsed = extractJsonObject<AskLessonResponse>(result.text);
  const response = parsed?.answer
    ? parsed
    : {
        answer: `${input.lecture.title}: ${input.lecture.outputs.standard}`,
        simpleAnswer: input.lecture.outputs.slowLearner,
        confidence: 0.72,
        followUpSuggestion: "Review the key terms, then ask one more specific question.",
        sourceLimited: true
      };
  await queueLocalOperation("ASK_QUESTION", { input, response }, { entityType: "progress", entityId: id("question") });
  return response;
}

export async function generateLocalAssignmentDraft(
  input: {
    lessonPack: LessonPack;
    preferredVersions?: AccessibilityMode[];
    questionType?: AssignmentAnswerMode;
  },
  preference: ModelPreference
): Promise<AssignmentDraftResponse> {
  const prompt = [
    "Generate an assignment draft from this lesson.",
    "Return JSON with title, instructions, answerMode, versions, questions.",
    `Question type: ${input.questionType ?? "short_answer"}`,
    `Lesson: ${input.lessonPack.title}`,
    input.lessonPack.studentAccessPack.screenReaderSummary,
    input.lessonPack.teacherPack.teachingScript
  ].join("\n");
  const { result } = await runLocalPrompt(preference, prompt);
  const parsed = extractJsonObject<Partial<AssignmentDraftResponse>>(result.text);
  const questions =
    parsed?.questions?.filter((item) => item.prompt?.trim()) ??
    input.lessonPack.studentAccessPack.practiceQuestions.map((promptText, index) => ({
      id: `q${index + 1}`,
      prompt: promptText,
      hint: "Use the local lesson pack before answering.",
      options: input.questionType === "mcq" ? ["Answer from the lesson", "Not stated", "Review again"] : []
    }));
  return {
    title: parsed?.title ?? `${input.lessonPack.title} Assignment`,
    instructions: parsed?.instructions ?? "Complete the lesson pack and answer the questions.",
    answerMode: parsed?.answerMode ?? input.questionType ?? "short_answer",
    versions: normalizeAccessibilityModes(
      parsed?.versions,
      input.preferredVersions?.length ? input.preferredVersions : ["Standard"]
    ),
    questions
  };
}
