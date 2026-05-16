import { apiJson } from "@/api/client";
import { getSession, saveSession } from "@/api/session";
import {
  backendAssignmentToAssignment,
  backendClassroomToClassroom,
  backendLessonToLessonPack,
  backendLessonToLecture
} from "@/api/adapters";
import {
  AccessibilityMode,
  Assignment,
  AssignmentAnswerMode,
  AssignmentQuestion,
  Classroom,
  LessonPack,
  Lecture,
  Role
} from "@/types";
import { normalizeAssignmentAnswerMode } from "@/utils/assignmentModes";

type LoginResponse = {
  user: {
    id: string;
    name: string;
    role: Role;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

type TeacherDashboardResponse = {
  classes: unknown[];
  lessons: unknown[];
  assignments: unknown[];
};

type StudentDashboardResponse = {
  classes: unknown[];
  assignments: unknown[];
};

type StudentLessonResponse = {
  lesson: unknown;
  access: {
    progress?: unknown;
  };
};

type AskLessonResponse = {
  answer: string;
  simpleAnswer?: string;
  simple_answer?: string;
  confidence?: number;
  followUpSuggestion?: string;
  follow_up_suggestion?: string;
  sourceLimited?: boolean;
  source_limited?: boolean;
};

type AssignmentDraftResponse = {
  title: string;
  instructions: string;
  answerMode?: string;
  versions?: string[];
  questions?: Array<{
    id: string;
    prompt: string;
    hint?: string;
    options?: string[];
  }>;
};

export async function demoLogin(role: Role) {
  const response = await apiJson<LoginResponse>("/api/auth/demo-login", "POST", { role }, false);
  saveSession({
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
    role: response.user.role,
    userId: response.user.id,
    name: response.user.name
  });
  return response.user;
}

export async function loginWithPassword(email: string, password: string) {
  const response = await apiJson<LoginResponse>("/api/auth/login", "POST", { email, password }, false);
  saveSession({
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
    role: response.user.role,
    userId: response.user.id,
    name: response.user.name
  });
  return response.user;
}

export async function loginWithGoogleIdToken(idToken: string, role: Role) {
  const response = await apiJson<LoginResponse>("/api/auth/google", "POST", { idToken, role }, false);
  saveSession({
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
    role: response.user.role,
    userId: response.user.id,
    name: response.user.name
  });
  return response.user;
}

export async function signupWithPassword(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const response = await apiJson<LoginResponse>(
    "/api/auth/signup",
    "POST",
    {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      preferredLanguage: "en"
    },
    false
  );
  saveSession({
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
    role: response.user.role,
    userId: response.user.id,
    name: response.user.name
  });
  return response.user;
}

export async function fetchTeacherDashboard() {
  const response = await apiJson<TeacherDashboardResponse>("/api/teacher/dashboard");
  return {
    classes: response.classes.map((item) => backendClassroomToClassroom(item as never)),
    lessons: response.lessons.map((item) => backendLessonToLessonPack(item as never)),
    assignments: response.assignments.map((item) => backendAssignmentToAssignment(item as never))
  };
}

export async function fetchTeacherClassrooms(): Promise<Classroom[]> {
  const response = await apiJson<unknown[]>("/api/teacher/classes");
  return response.map((item) => backendClassroomToClassroom(item as never));
}

export async function fetchTeacherLessons(): Promise<LessonPack[]> {
  const response = await apiJson<unknown[]>("/api/teacher/lessons");
  return response.map((item) => backendLessonToLessonPack(item as never));
}

export async function deleteTeacherLesson(lessonId: string) {
  return apiJson(`/api/teacher/lessons/${lessonId}`, "DELETE");
}

export async function generateLessonFromText(input: {
  title: string;
  text: string;
  classroomId: string;
  classSubjectId?: string;
  subject: string;
  gradeBand: string;
  language?: string;
}) {
  const session = getSession();
  const response = await apiJson<unknown>("/api/teacher/lessons/from-text", "POST", {
    text: input.text,
    teacherId: session?.userId ?? "teacher-demo",
    settings: {
      title: input.title,
      classroomId: input.classroomId,
      classSubjectId: input.classSubjectId,
      subject: input.subject,
      gradeBand: input.gradeBand,
      language: input.language ?? "en"
    }
  });
  return backendLessonToLessonPack(response as never);
}

export async function assignLessonToClass(input: {
  lessonId: string;
  classroomId: string;
  instructions?: string;
  dueAt?: string;
  title?: string;
  answerMode?: AssignmentAnswerMode;
  versions?: AccessibilityMode[];
  questions?: AssignmentQuestion[];
}) {
  const response = await apiJson<unknown[]>(`/api/teacher/lessons/${input.lessonId}/assign`, "POST", {
    lessonId: input.lessonId,
    classroomId: input.classroomId,
    instructions: input.instructions,
    dueAt: input.dueAt,
    title: input.title,
    answerMode: input.answerMode,
    versions: input.versions,
    questions: input.questions
  });
  return response.map((item) => backendAssignmentToAssignment(item as never));
}

export async function generateAssignmentDraftFromLesson(input: {
  lessonId: string;
  classroomId?: string;
  preferredVersions?: AccessibilityMode[];
  questionType?: AssignmentAnswerMode;
}) {
  const response = await apiJson<AssignmentDraftResponse>(
    `/api/teacher/lessons/${input.lessonId}/generate-assignment-draft`,
    "POST",
    {
      classroomId: input.classroomId,
      preferredVersions: input.preferredVersions,
      questionType: input.questionType
    }
  );
  return {
    title: response.title,
    instructions: response.instructions,
    answerMode: normalizeAssignmentAnswerMode(response.answerMode),
    versions: ((response.versions ?? []) as AccessibilityMode[]),
    questions: (response.questions ?? []).map((question, index) => ({
      id: question.id || `q${index + 1}`,
      prompt: question.prompt || "",
      hint: question.hint,
      options: question.options
    }))
  };
}

export async function generateDemoLessonFromText() {
  const session = getSession();
  const response = await apiJson<unknown>("/api/teacher/lessons/from-text", "POST", {
    text: "Photosynthesis in plants\nPlants use sunlight, water, and carbon dioxide to make food.",
    teacherId: session?.userId ?? "teacher-demo",
    settings: {
      title: "Photosynthesis in Plants",
      subject: "Science",
      gradeBand: "Grade 7",
      language: "en"
    }
  });
  return backendLessonToLessonPack(response as never);
}

export async function fetchStudentDashboard() {
  const response = await apiJson<StudentDashboardResponse>("/api/student/dashboard");
  return {
    classes: response.classes.map((item) => backendClassroomToClassroom(item as never)),
    assignments: response.assignments.map((item) => backendAssignmentToAssignment(item as never))
  };
}

export async function fetchStudentLessons(): Promise<Assignment[]> {
  const response = await apiJson<unknown[]>("/api/student/lessons");
  return response.map((item) => backendAssignmentToAssignment(item as never));
}

export async function fetchStudentLesson(lessonId: string): Promise<{ lesson: Lecture; progress?: unknown }> {
  const response = await apiJson<StudentLessonResponse>(`/api/student/lessons/${lessonId}`);
  return {
    lesson: backendLessonToLecture(response.lesson as never),
    progress: response.access.progress
  };
}

export async function generateStructuredStudentNotes(lessonId: string, input: {
  mode: string;
  language: string;
  textSize: string;
}) {
  const response = await apiJson<AskLessonResponse>(`/api/student/lessons/${lessonId}/ask`, "POST", {
    question: [
      "Generate good, decent, student-friendly structured notes for this topic.",
      "Use headings, bullet points, key definitions, step-by-step explanation, quick revision, and practice questions.",
      `Student accessibility mode: ${input.mode}.`,
      `Preferred language: ${input.language}.`,
      `Text size preference: ${input.textSize}.`,
      "Keep the notes accurate and limited to the uploaded lesson/source."
    ].join(" ")
  });
  return response;
}

export async function askStudentDoubt(input: {
  lecture: Lecture;
  question: string;
  studentProfile: {
    accessibilityMode: string;
    language: string;
    textSize: string;
    audioSupport: boolean;
  };
}) {
  return apiJson<AskLessonResponse>("/api/student/ask-doubt", "POST", {
    question: input.question,
    studentProfile: input.studentProfile,
    lessonPack: lectureToAskLessonPack(input.lecture, input.studentProfile.language)
  });
}

export async function saveStudentAcademicProfileRemote(input: {
  school: string;
  className: string;
  subjects: string[];
  completed: boolean;
}) {
  return apiJson("/api/student/profile", "PATCH", input);
}

export async function submitAssignment(assignmentId: string, answers: Record<string, string>) {
  const total = Object.keys(answers).length;
  return apiJson(`/api/student/assignments/${assignmentId}/submit`, "POST", {
    answers,
    score: total > 0 ? 100 : 0,
    correctCount: total,
    totalQuestions: total,
    weakTopics: [],
    submittedAt: new Date().toISOString()
  });
}

export type ConnectedTeacherData = {
  classes: Classroom[];
  lessons: LessonPack[];
  assignments: Assignment[];
};

function lectureToAskLessonPack(lecture: Lecture, language: string) {
  const now = new Date().toISOString();
  const textContext = [
    lecture.teacherNotes,
    lecture.diagramDescription,
    lecture.outputs.standard,
    lecture.outputs.blindLowVision,
    lecture.outputs.dyslexiaFriendly,
    lecture.outputs.multilingual,
    lecture.outputs.slowLearner,
    ...lecture.practiceQuestions
  ].filter(Boolean);

  return {
    id: lecture.id,
    createdAt: now,
    updatedAt: now,
    schemaVersion: "lesson-pack-v1",
    title: lecture.title,
    sourceUnderstanding: {
      title: lecture.title,
      observedText: textContext,
      observedObjects: lecture.diagramDescription ? [lecture.diagramDescription] : [],
      inferredTopic: lecture.title,
      unclearAreas: [],
      sourceLanguage: "en"
    },
    teacherPack: {
      lessonObjective: `Understand ${lecture.title}.`,
      teacherExplanation: lecture.teacherNotes,
      boardPlan: [
        "Introduce the topic.",
        "Explain the key idea.",
        "Connect it with an example.",
        "Check understanding with practice."
      ],
      lowResourceActivity: "Ask the student to explain the idea using one real-life example.",
      worksheet: lecture.practiceQuestions,
      quiz: lecture.practiceQuestions,
      answerKey: [],
      assessmentQuestions: lecture.practiceQuestions,
      homework: "Revise the notes and answer one practice question.",
      differentiatedExplanations: Object.values(lecture.outputs),
      localLanguageSupport: lecture.outputs.multilingual,
      teacherReviewChecklist: ["Check that the answer remains within the uploaded lesson context."]
    },
    studentAccessPack: {
      listenFirstAudioScript: lecture.outputs.slowLearner || lecture.outputs.standard,
      screenReaderSummary: lecture.outputs.standard,
      visualDescription: lecture.diagramDescription,
      simpleExplanation: lecture.outputs.dyslexiaFriendly || lecture.outputs.standard,
      localLanguageExplanation: lecture.outputs.multilingual,
      vocabulary: lecture.keyVocabulary,
      practiceQuestions: lecture.practiceQuestions,
      hintsAnswers: [],
      revisionChecklist: [
        "Read the main idea.",
        "Review the key vocabulary.",
        "Try one practice question."
      ],
      independenceTips: ["Ask a doubt when one step is unclear."],
      qnaContext: textContext.join("\n")
    },
    confidenceNotes: {
      overallConfidence: 0.86,
      notes: ["Built from teacher uploaded lesson notes and accessible student versions."],
      teacherReviewWarnings: []
    },
    trace: {
      runtime: "mock",
      model: "frontend-context",
      localOnly: false,
      hostedApiUsed: true,
      latencyMs: 0,
      schemaStatus: "passed",
      fallbackUsed: false,
      promptVersion: "ask-doubt-v1",
      toolCalls: [],
      imageMetadata: {
        sourceImageStored: false,
        qualityWarnings: []
      },
      warnings: [],
      confidenceNotes: [],
      unclearSourceAreas: [],
      teacherReviewRequired: false,
      generatedAt: now
    },
    accessibility: {
      audioFirstReady: true,
      screenReaderReady: true,
      simpleLanguageReady: true,
      localLanguageReady: Boolean(lecture.outputs.multilingual),
      estimatedListeningMinutes: 3
    },
    sharing: {
      license: "CC BY-NC-SA 4.0",
      verifiedEducator: false
    },
    visibility: "class",
    status: "generated",
    version: 1,
    sourceImageMetadata: {},
    createdBy: "teacher-demo",
    createdByRole: "teacher",
    language,
    subject: lecture.subject,
    gradeBand: "Grade 8",
    tags: [lecture.subject.toLowerCase(), lecture.title.toLowerCase()],
    searchText: `${lecture.title} ${lecture.subject} ${lecture.keyVocabulary.join(" ")}`
  };
}
