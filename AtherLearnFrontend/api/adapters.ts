import {
  AccessibilityMode,
  Assignment,
  AssignmentQuestion,
  ClassSubject,
  Classroom,
  LessonPack,
  Lecture,
  RuntimeMode,
  User
} from "@/types";
import { normalizeAssignmentAnswerMode } from "@/utils/assignmentModes";

type BackendLessonPack = {
  id: string;
  title: string;
  classroomId?: string | null;
  classSubjectId?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
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
  title?: string | null;
  answerMode?: string | null;
  versions?: string[] | null;
  questions?: Array<{
    id?: string;
    prompt?: string;
    hint?: string | null;
    options?: string[] | null;
  }> | null;
};

type BackendClassroom = {
  id: string;
  schoolId?: string;
  name?: string;
  grade?: string;
  section?: string | null;
  joinCode?: string | null;
  students?: number;
  studentCount?: number;
  accessibilityProfiles?: number;
  accessibilityBreakdown?: Partial<Record<AccessibilityMode, number>>;
  subjects?: Array<{
    id?: string;
    subject?: string;
    teacherId?: string;
  }>;
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

function gradeLabel(value?: string) {
  if (!value) return "Mixed";
  return value.trim().replace(/^class\s+/i, "Grade ");
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/\r?\n|[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toVocabulary(
  value: unknown
): LessonPack["studentAccessPack"]["vocabulary"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const term = "term" in item && typeof item.term === "string" ? item.term.trim() : "";
      const meaning = "meaning" in item && typeof item.meaning === "string" ? item.meaning.trim() : "";
      if (!term || !meaning) return null;
      return { term, meaning };
    })
    .filter((item): item is LessonPack["studentAccessPack"]["vocabulary"][number] => Boolean(item));
}

export function normalizeLessonPack(lesson: LessonPack): LessonPack {
  const sourceCard = lesson.sourceCard ?? ({} as LessonPack["sourceCard"]);
  const teacherPack = lesson.teacherPack ?? ({} as LessonPack["teacherPack"]);
  const studentAccessPack = lesson.studentAccessPack ?? ({} as LessonPack["studentAccessPack"]);
  const trustPack = lesson.trustPack ?? ({} as LessonPack["trustPack"]);

  return {
    ...lesson,
    classroomId: lesson.classroomId ?? null,
    classSubjectId: lesson.classSubjectId ?? null,
    sourceCard: {
      topic: typeof sourceCard.topic === "string" && sourceCard.topic.trim().length > 0 ? sourceCard.topic : lesson.title,
      sourceType:
        typeof sourceCard.sourceType === "string" && sourceCard.sourceType.trim().length > 0
          ? sourceCard.sourceType
          : "Lesson source",
      confidence: typeof sourceCard.confidence === "number" ? sourceCard.confidence : 0,
      detectedText: toStringList(sourceCard.detectedText),
      diagramElements: toStringList(sourceCard.diagramElements),
      equations: toStringList(sourceCard.equations),
      unclearRegions: toStringList(sourceCard.unclearRegions),
      confidenceNotes: toStringList(sourceCard.confidenceNotes)
    },
    teacherPack: {
      ...teacherPack,
      objective: typeof teacherPack.objective === "string" ? teacherPack.objective : "",
      keyConcepts: toStringList(teacherPack.keyConcepts),
      teachingScript: typeof teacherPack.teachingScript === "string" ? teacherPack.teachingScript : "",
      classroomActivity: typeof teacherPack.classroomActivity === "string" ? teacherPack.classroomActivity : "",
      worksheet: toStringList(teacherPack.worksheet),
      answerKey: toStringList(teacherPack.answerKey),
      misconceptions: toStringList(teacherPack.misconceptions),
      differentiatedSupport:
        typeof teacherPack.differentiatedSupport === "string" ? teacherPack.differentiatedSupport : ""
    },
    studentAccessPack: {
      ...studentAccessPack,
      screenReaderSummary:
        typeof studentAccessPack.screenReaderSummary === "string" ? studentAccessPack.screenReaderSummary : "",
      audioStudyScript:
        typeof studentAccessPack.audioStudyScript === "string" ? studentAccessPack.audioStudyScript : "",
      visualDescription:
        typeof studentAccessPack.visualDescription === "string" ? studentAccessPack.visualDescription : "",
      stepByStepExplanation:
        typeof studentAccessPack.stepByStepExplanation === "string" ? studentAccessPack.stepByStepExplanation : "",
      vocabulary: toVocabulary(studentAccessPack.vocabulary),
      steps: toStringList(studentAccessPack.steps),
      practiceQuestions: toStringList(studentAccessPack.practiceQuestions),
      selfCheckAnswers: toStringList(studentAccessPack.selfCheckAnswers)
    },
    trustPack: {
      ...trustPack,
      runtimeMode: trustPack.runtimeMode ?? lesson.runtimeMode,
      model: typeof trustPack.model === "string" ? trustPack.model : "",
      latency: typeof trustPack.latency === "string" ? trustPack.latency : "",
      schemaStatus: trustPack.schemaStatus ?? "Valid",
      teacherReviewStatus: trustPack.teacherReviewStatus ?? "Review Required",
      confidence: typeof trustPack.confidence === "number" ? trustPack.confidence : 0,
      accessibilityWarnings: toStringList(trustPack.accessibilityWarnings)
    }
  };
}

function classTitle(classroom: BackendClassroom) {
  const grade = classroom.grade?.trim();
  const section = classroom.section?.trim();
  const name = classroom.name?.trim();
  const parts: string[] = [];
  if (grade) parts.push(grade);
  if (section) parts.push(section);
  if (!section && name) parts.push(name);
  if (name && !parts.some((part) => part.toLowerCase() === name.toLowerCase())) {
    parts.push(name);
  }
  return parts.join(" ") || "Classroom";
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

  return normalizeLessonPack({
    id: pack.id,
    title: pack.title,
    classroomId: pack.classroomId ?? null,
    classSubjectId: pack.classSubjectId ?? null,
    chapterId: pack.chapterId ?? null,
    chapterTitle: pack.chapterTitle ?? null,
    topicId: pack.topicId ?? null,
    topicTitle: pack.topicTitle ?? null,
    grade: gradeLabel(pack.gradeBand),
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
      stepByStepExplanation: student?.simpleExplanation ?? student?.screenReaderSummary ?? "",
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
  });
}

export function backendLessonToLecture(pack: BackendLessonPack): Lecture {
  const lesson = backendLessonToLessonPack(pack);
  return {
    id: lesson.id,
    title: lesson.title,
    subject: lesson.subject,
    classroomId: lesson.classroomId,
    classSubjectId: lesson.classSubjectId,
    chapterId: lesson.chapterId,
    chapterTitle: lesson.chapterTitle,
    topicId: lesson.topicId,
    topicTitle: lesson.topicTitle,
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
      dyslexiaFriendly: lesson.studentAccessPack.stepByStepExplanation || lesson.studentAccessPack.screenReaderSummary,
      multilingual: lesson.studentAccessPack.audioStudyScript,
      slowLearner: lesson.studentAccessPack.stepByStepExplanation || lesson.studentAccessPack.screenReaderSummary
    },
    badge: "Cloud generated"
  };
}

export function backendAssignmentToAssignment(assignment: BackendAssignment): Assignment {
  const questions: AssignmentQuestion[] = (assignment.questions ?? [])
    .filter((question) => Boolean(question.prompt))
    .map((question, index) => ({
      id: question.id ?? `q${index + 1}`,
      prompt: question.prompt ?? "",
      hint: question.hint ?? undefined,
      options: question.options ?? undefined
    }));
  const versions = (assignment.versions?.filter(Boolean) ?? []) as AccessibilityMode[];

  return {
    id: assignment.id,
    title: assignment.title || assignment.instructions || `Lesson ${assignment.lessonId}`,
    classroom: assignment.classroomId ?? "Assigned classroom",
    subject: "Classwork",
    linkedLecture: assignment.lessonId,
    postedAt: "Synced from backend",
    dueDate: assignment.dueAt ?? "No due date",
    answerMode: normalizeAssignmentAnswerMode(assignment.answerMode),
    versions: versions.length ? versions : ["Standard", "Dyslexia Friendly", "Blind / Low Vision"],
    questions: questions.length
      ? questions
      : [
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
  const classSubjects: ClassSubject[] = (classroom.subjects ?? [])
    .filter((item) => Boolean(item.subject))
    .map((item) => ({
      id: item.id ?? item.subject ?? "subject",
      subject: item.subject ?? "Subject",
      teacherId: item.teacherId
    }));
  const subjectNames = classSubjects.length
    ? classSubjects.map((item) => item.subject)
    : ["Synced"];
  const fallbackBreakdown: Classroom["accessibilityBreakdown"] = {
    Standard: 0,
    "Blind / Low Vision": 0,
    "Dyslexia Friendly": 0,
    Multilingual: 0,
    "Slow Learner": 0
  };
  const accessibilityBreakdown: Classroom["accessibilityBreakdown"] = { ...fallbackBreakdown };
  for (const mode of Object.keys(accessibilityBreakdown) as AccessibilityMode[]) {
    const value = classroom.accessibilityBreakdown?.[mode];
    if (typeof value === "number") {
      accessibilityBreakdown[mode] = value;
    }
  }
  const studentCount =
    typeof classroom.students === "number"
      ? classroom.students
      : typeof classroom.studentCount === "number"
        ? classroom.studentCount
        : 0;

  return {
    id: classroom.id,
    title: classTitle(classroom),
    grade: classroom.grade,
    section: classroom.section,
    schoolId: classroom.schoolId,
    classCode: classroom.joinCode ?? "SYNCED",
    students: studentCount,
    subjects: subjectNames,
    classSubjects,
    accessibilityProfiles: classroom.accessibilityProfiles ?? studentCount,
    accessibilityBreakdown
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
