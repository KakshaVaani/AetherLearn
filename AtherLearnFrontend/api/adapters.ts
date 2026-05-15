import { Assignment, Classroom, LessonPack, Lecture, RuntimeMode, User } from "@/types";

type BackendLessonPack = {
  id: string;
  title: string;
  subject?: string;
  gradeBand?: string;
  language?: string;
  status?: string;
  trace?: {
    runtime?: string;
    model?: string;
    latencyMs?: number;
    schemaStatus?: string;
    warnings?: Array<{ message?: string }>;
  };
  sourceUnderstanding?: {
    title?: string;
    inferredTopic?: string;
    observedText?: string[];
    observedObjects?: string[];
    unclearAreas?: string[];
  };
  teacherPack?: {
    lessonObjective?: string;
    teacherExplanation?: string;
    boardPlan?: string[];
    lowResourceActivity?: string;
    worksheet?: string[];
    answerKey?: string[];
    differentiatedExplanations?: string[];
    teacherReviewChecklist?: string[];
  };
  studentAccessPack?: {
    listenFirstAudioScript?: string;
    screenReaderSummary?: string;
    visualDescription?: string;
    simpleExplanation?: string;
    vocabulary?: string[];
    practiceQuestions?: string[];
    hintsAnswers?: string[];
    revisionChecklist?: string[];
  };
  confidenceNotes?: {
    overallConfidence?: number;
    notes?: string[];
    teacherReviewWarnings?: string[];
  };
  accessibility?: {
    screenReaderReady?: boolean;
    audioFirstReady?: boolean;
    simpleLanguageReady?: boolean;
    localLanguageReady?: boolean;
  };
};

type BackendAssignment = {
  id: string;
  lessonId: string;
  classroomId?: string | null;
  status?: string;
  dueAt?: string | null;
  instructions?: string | null;
};

type BackendClassroom = {
  id: string;
  name?: string;
  grade?: string;
  section?: string | null;
  joinCode?: string | null;
};

function runtimeMode(runtime?: string): RuntimeMode {
  if (runtime === "gemini") return "Hosted Gemma";
  if (runtime === "ollama" || runtime === "local-hub") return "Local Ollama";
  return "Demo Fixture";
}

function lessonStatus(status?: string): LessonPack["status"] {
  if (status === "published" || status === "assigned") return "Approved";
  if (status === "pending_review" || status === "generation_failed") return "Needs Review";
  if (status === "generated") return "Approved";
  return "Draft";
}

export function backendLessonToLessonPack(pack: BackendLessonPack): LessonPack {
  const source = pack.sourceUnderstanding;
  const teacher = pack.teacherPack;
  const student = pack.studentAccessPack;
  const confidence = Math.round((pack.confidenceNotes?.overallConfidence ?? 0.78) * 100);
  const warnings = [
    ...(pack.confidenceNotes?.teacherReviewWarnings ?? []),
    ...(pack.trace?.warnings?.map((warning) => warning.message ?? "").filter(Boolean) ?? [])
  ];

  return {
    id: pack.id,
    title: pack.title,
    grade: pack.gradeBand ?? "Mixed",
    subject: pack.subject ?? "General",
    language: pack.language ?? "en",
    learnerNeed: pack.accessibility?.screenReaderReady ? "Accessible" : "Teacher Review",
    outputType: "Teacher + Student + Trust Packs",
    status: lessonStatus(pack.status),
    runtimeMode: runtimeMode(pack.trace?.runtime),
    qualityChecks: [
      { label: "Focus", status: "Good" },
      { label: "Lighting", status: warnings.length > 0 ? "Needs Review" : "Good" },
      { label: "Crop", status: source?.unclearAreas?.length ? "Needs Review" : "Good" }
    ],
    sourceCard: {
      topic: source?.inferredTopic ?? source?.title ?? pack.title,
      sourceType: "Backend lesson pack",
      confidence,
      detectedText: source?.observedText ?? [],
      diagramElements: source?.observedObjects ?? [],
      equations: (source?.observedText ?? []).filter((item) => item.includes("=")),
      unclearRegions: source?.unclearAreas ?? [],
      confidenceNotes: pack.confidenceNotes?.notes ?? []
    },
    teacherPack: {
      objective: teacher?.lessonObjective ?? "Teacher objective pending review.",
      keyConcepts: teacher?.boardPlan ?? [],
      teachingScript: teacher?.teacherExplanation ?? "",
      classroomActivity: teacher?.lowResourceActivity ?? "",
      worksheet: teacher?.worksheet ?? [],
      answerKey: teacher?.answerKey ?? [],
      misconceptions: teacher?.teacherReviewChecklist ?? [],
      differentiatedSupport: teacher?.differentiatedExplanations?.join("\n") ?? ""
    },
    studentAccessPack: {
      screenReaderSummary: student?.screenReaderSummary ?? "",
      audioStudyScript: student?.listenFirstAudioScript ?? student?.simpleExplanation ?? "",
      visualDescription: student?.visualDescription ?? "",
      vocabulary: (student?.vocabulary ?? []).map((term) => ({ term, meaning: "Review in lesson context." })),
      steps: student?.revisionChecklist ?? [],
      practiceQuestions: student?.practiceQuestions ?? [],
      selfCheckAnswers: student?.hintsAnswers ?? []
    },
    trustPack: {
      runtimeMode: runtimeMode(pack.trace?.runtime),
      model: pack.trace?.model ?? "Backend runtime",
      latency: `${pack.trace?.latencyMs ?? 0}ms`,
      schemaStatus: pack.trace?.schemaStatus === "needs_repair" ? "Needs Repair" : "Valid",
      teacherReviewStatus: warnings.length > 0 ? "Review Required" : "Approved",
      confidence,
      accessibilityWarnings: warnings
    },
    safetyFlags: {
      sourceUnclear: Boolean(source?.unclearAreas?.length),
      possibleOcrError: warnings.length > 0,
      teacherReviewRequired: warnings.length > 0
    }
  };
}

export function backendLessonToLecture(pack: BackendLessonPack): Lecture {
  const lesson = backendLessonToLessonPack(pack);
  return {
    id: lesson.id,
    title: lesson.title,
    subject: lesson.subject,
    source: "Backend generated lesson",
    sourceType: lesson.sourceCard.sourceType,
    postedAt: "Synced now",
    teacherPdf: {
      fileName: `${lesson.id}.pdf`,
      pageCount: 1,
      uploadedAt: "Backend"
    },
    teacherNotes: lesson.teacherPack.teachingScript,
    status: `${lesson.runtimeMode} analysis complete`,
    diagramDescription: lesson.studentAccessPack.visualDescription,
    keyVocabulary: lesson.studentAccessPack.vocabulary.map((item) => item.term),
    practiceQuestions: lesson.studentAccessPack.practiceQuestions,
    outputs: {
      standard: lesson.studentAccessPack.screenReaderSummary,
      blindLowVision: lesson.studentAccessPack.visualDescription || lesson.studentAccessPack.audioStudyScript,
      dyslexiaFriendly: lesson.studentAccessPack.steps.join("\n") || lesson.studentAccessPack.screenReaderSummary,
      multilingual: lesson.studentAccessPack.audioStudyScript,
      slowLearner: lesson.studentAccessPack.steps.join("\n")
    },
    badge: "Cloud generated"
  };
}

export function backendAssignmentToAssignment(assignment: BackendAssignment): Assignment {
  return {
    id: assignment.id,
    title: assignment.instructions || `Lesson ${assignment.lessonId}`,
    classroom: assignment.classroomId ?? "Assigned classroom",
    subject: "Classwork",
    linkedLecture: assignment.lessonId,
    postedAt: "Synced from backend",
    dueDate: assignment.dueAt ?? "No due date",
    answerMode: "mcq",
    versions: ["Standard", "Dyslexia Friendly", "Blind / Low Vision"],
    questions: [
      {
        id: "q1",
        prompt: "Mark this lesson as completed after studying the accessible pack.",
        options: ["Completed", "Need help", "Ask teacher"]
      }
    ],
    status: assignment.status === "assigned" ? "Published" : "Draft"
  };
}

export function backendClassroomToClassroom(classroom: BackendClassroom): Classroom {
  const title = [classroom.name, classroom.grade, classroom.section].filter(Boolean).join(" ");
  return {
    id: classroom.id,
    title: title || "Classroom",
    classCode: classroom.joinCode ?? "SYNCED",
    students: 0,
    subjects: ["Synced"],
    accessibilityProfiles: 0,
    accessibilityBreakdown: {
      Standard: 0,
      "Blind / Low Vision": 0,
      "Dyslexia Friendly": 0,
      Multilingual: 0,
      "Slow Learner": 0
    }
  };
}

export function backendUserToUser(user: { id: string; name: string; role: "teacher" | "student"; preferredLanguage?: string }): User {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarInitials: user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    preferredLanguage: user.preferredLanguage
  };
}
