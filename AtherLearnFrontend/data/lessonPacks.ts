import demoLessonSeeds from "@/data/demoLessonSeeds.json";
import { LessonPack } from "@/types";

type DemoLessonSeed = {
  id: string;
  title: string;
  classroomId: string;
  classSubjectId: string;
  chapterId: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  grade: string;
  subject: string;
  language: string;
  learnerNeed: string;
  status: LessonPack["status"];
  runtimeMode: LessonPack["runtimeMode"];
  sourceType: string;
  confidence: number;
  model: string;
  latency: string;
  detectedText: string[];
  diagramElements: string[];
  equations?: string[];
  unclearRegions?: string[];
  confidenceNotes: string[];
  objective: string;
  keyConcepts: string[];
  teachingScript: string;
  classroomActivity: string;
  worksheet: string[];
  answerKey: string[];
  misconceptions: string[];
  differentiatedSupport: string;
  screenReaderSummary: string;
  audioStudyScript: string;
  visualDescription: string;
  stepByStepExplanation: string;
  vocabulary: LessonPack["studentAccessPack"]["vocabulary"];
  steps: string[];
  practiceQuestions: string[];
  selfCheckAnswers: string[];
  accessibilityWarnings?: string[];
};

const lessonSeeds = demoLessonSeeds as DemoLessonSeed[];

export const lessonPacks: LessonPack[] = lessonSeeds.map((seed) => {
  const accessibilityWarnings = seed.accessibilityWarnings ?? [];
  const sourceUnclear = Boolean(seed.unclearRegions?.length);

  return {
    id: seed.id,
    title: seed.title,
    classroomId: seed.classroomId,
    classSubjectId: seed.classSubjectId,
    chapterId: seed.chapterId,
    chapterTitle: seed.chapterTitle,
    topicId: seed.topicId,
    topicTitle: seed.topicTitle,
    grade: seed.grade,
    subject: seed.subject,
    language: seed.language,
    learnerNeed: seed.learnerNeed,
    outputType: "Teacher + Student + Trust Packs",
    status: seed.status,
    runtimeMode: seed.runtimeMode,
    qualityChecks: [
      { label: "Focus", status: "Good" },
      {
        label: "Lighting",
        status: accessibilityWarnings.some((warning) => warning.toLowerCase().includes("light")) ? "Needs Review" : "Good"
      },
      { label: "Crop", status: sourceUnclear ? "Needs Review" : "Good" }
    ],
    sourceCard: {
      topic: seed.topicTitle,
      sourceType: seed.sourceType,
      confidence: seed.confidence,
      detectedText: seed.detectedText,
      diagramElements: seed.diagramElements,
      equations: seed.equations ?? [],
      unclearRegions: seed.unclearRegions ?? [],
      confidenceNotes: seed.confidenceNotes
    },
    teacherPack: {
      objective: seed.objective,
      keyConcepts: seed.keyConcepts,
      teachingScript: seed.teachingScript,
      classroomActivity: seed.classroomActivity,
      worksheet: seed.worksheet,
      answerKey: seed.answerKey,
      misconceptions: seed.misconceptions,
      differentiatedSupport: seed.differentiatedSupport
    },
    studentAccessPack: {
      screenReaderSummary: seed.screenReaderSummary,
      audioStudyScript: seed.audioStudyScript,
      visualDescription: seed.visualDescription,
      stepByStepExplanation: seed.stepByStepExplanation,
      vocabulary: seed.vocabulary,
      steps: seed.steps,
      practiceQuestions: seed.practiceQuestions,
      selfCheckAnswers: seed.selfCheckAnswers
    },
    trustPack: {
      runtimeMode: seed.runtimeMode,
      model: seed.model,
      latency: seed.latency,
      schemaStatus: "Valid",
      teacherReviewStatus: accessibilityWarnings.length > 0 || seed.status === "Needs Review" ? "Review Required" : "Approved",
      confidence: seed.confidence,
      accessibilityWarnings
    },
    safetyFlags: {
      sourceUnclear,
      possibleOcrError: accessibilityWarnings.some((warning) =>
        ["ocr", "label", "faint", "light"].some((term) => warning.toLowerCase().includes(term))
      ),
      teacherReviewRequired: accessibilityWarnings.length > 0 || seed.status === "Needs Review"
    },
    trace: {
      runtime: seed.runtimeMode,
      model: seed.model,
      hostedApiUsed: seed.runtimeMode === "Hosted Gemma",
      localOnly: seed.runtimeMode !== "Hosted Gemma",
      latencyMs: Number.parseInt(seed.latency, 10) || 0,
      generatedAt: "2026-05-17T10:00:00.000Z"
    }
  };
});

export const featuredLessonPack = lessonPacks[0];
