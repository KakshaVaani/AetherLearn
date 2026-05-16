import { apiJson } from "@/api/client";
import { getSession, saveSession } from "@/api/session";
import {
  backendAssignmentToAssignment,
  backendClassroomToClassroom,
  backendLessonToLessonPack,
  backendLessonToLecture
} from "@/api/adapters";
import { AccessibilityMode, Assignment, AssignmentQuestion, Classroom, LessonPack, Lecture, Role } from "@/types";

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
  confidence?: number;
  followUpSuggestion?: string;
  sourceLimited?: boolean;
};

type AssignmentDraftResponse = {
  title: string;
  instructions: string;
  answerMode?: "text" | "mcq";
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
  answerMode?: "mcq" | "text";
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
}) {
  const response = await apiJson<AssignmentDraftResponse>(
    `/api/teacher/lessons/${input.lessonId}/generate-assignment-draft`,
    "POST",
    {
      classroomId: input.classroomId,
      preferredVersions: input.preferredVersions
    }
  );
  return {
    title: response.title,
    instructions: response.instructions,
    answerMode: response.answerMode === "mcq" ? "mcq" : "text",
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
