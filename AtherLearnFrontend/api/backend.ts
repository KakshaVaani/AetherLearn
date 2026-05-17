import { ApiClientError, apiJson } from "@/api/client";
import { getSession, saveSession } from "@/api/session";
import {
  backendAssignmentToAssignment,
  backendClassroomToClassroom,
  backendLessonToLessonPack,
  backendLessonToLecture,
  normalizeLessonPack
} from "@/api/adapters";
import { getDefaultModelPreference } from "@/api/localPreferences";
import {
  deleteLocalEntity,
  listLocalEntities,
  queueLocalOperation,
  replaceSyncedLocalEntities,
  saveLocalEntity
} from "@/api/localStore";
import {
  askLocalDoubt,
  generateLocalAssignmentDraft,
  generateLocalLessonFromText,
  LocalModelUnavailableError
} from "@/api/localAi";
import { assignments as demoAssignments } from "@/data/assignments";
import { classrooms as demoClassrooms } from "@/data/classrooms";
import { lectures as demoLectures } from "@/data/lectures";
import { lessonPacks as demoLessonPacks } from "@/data/lessonPacks";
import {
  AccessibilityMode,
  Assignment,
  AssignmentAnswerMode,
  AssignmentQuestion,
  Classroom,
  LessonPack,
  Lecture,
  ModelPreference,
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

type ClassroomSource = "backend" | "local" | "demo";
export type LessonDataSource = ClassroomSource;

export type LessonPackEditPatch = {
  title?: string;
  status?: "pending_review" | "published";
  visibility?: "class";
  topicTitle?: string | null;
  searchText?: string;
  sourceUnderstanding?: {
    title: string;
    observedText: string[];
    observedObjects: string[];
    inferredTopic: string;
    unclearAreas: string[];
    sourceLanguage: string;
  };
  teacherPack?: {
    lessonObjective: string;
    teacherExplanation: string;
    boardPlan: string[];
    lowResourceActivity: string;
    worksheet: string[];
    quiz: string[];
    answerKey: string[];
    assessmentQuestions: string[];
    homework: string;
    differentiatedExplanations: string[];
    teacherReviewChecklist: string[];
  };
  studentAccessPack?: {
    listenFirstAudioScript: string;
    screenReaderSummary: string;
    visualDescription: string;
    simpleExplanation: string;
    vocabulary: string[];
    practiceQuestions: string[];
    hintsAnswers: string[];
    revisionChecklist: string[];
    independenceTips: string[];
    qnaContext: string;
  };
  confidenceNotes?: {
    overallConfidence: number;
    notes: string[];
    teacherReviewWarnings: string[];
  };
};

export type TeacherDashboardData = {
  classes: Classroom[];
  lessons: LessonPack[];
  assignments: Assignment[];
  source: ClassroomSource;
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

export type SchoolSuggestion = {
  id: string;
  name: string;
  district?: string | null;
  state?: string | null;
  country?: string;
};

const DEMO_CLASS_IDS = ["class-7a", "class-7b", "class-8a", "class-8b"];

function dedupeClassrooms(classes: Classroom[]) {
  const byKey = new Map<string, Classroom>();
  for (const classroom of classes) {
    const key = [
      classroom.schoolId ?? "",
      classroom.grade ?? "",
      classroom.section ?? classroom.title,
      classroom.subjects.slice().sort().join("|")
    ]
      .join("::")
      .toLowerCase();
    const previous = byKey.get(key);
    if (!previous || classroom.classCode !== "SYNCED") {
      byKey.set(key, classroom);
    }
  }
  return Array.from(byKey.values());
}

function hasCanonicalDemoClasses(classes: Classroom[]) {
  const ids = new Set(classes.map((item) => item.id));
  return DEMO_CLASS_IDS.every((id) => ids.has(id));
}

function isTeacherDemoSession() {
  return getSession()?.userId === "teacher-demo";
}

async function hydrateTeacherCache(classes: Classroom[], lessons: LessonPack[], assignments: Assignment[]) {
  const ownerUserId = getSession()?.userId;
  const options = ownerUserId ? { ownerUserId } : {};
  await Promise.all([
    replaceSyncedLocalEntities(
      "classroom",
      classes.map((item) => ({ localId: item.id, serverId: item.id, payload: item })),
      options
    ),
    replaceSyncedLocalEntities(
      "lesson",
      lessons.map((item) => ({ localId: item.id, serverId: item.id, payload: item })),
      options
    ),
    replaceSyncedLocalEntities(
      "assignment",
      assignments.map((item) => ({ localId: item.id, serverId: item.id, payload: item })),
      options
    )
  ]);
}

async function hydrateTeacherDemoCacheFromBackend() {
  if (!isTeacherDemoSession()) return;
  const response = await apiJson<TeacherDashboardResponse>("/api/teacher/dashboard");
  const classes = dedupeClassrooms(response.classes.map((item) => backendClassroomToClassroom(item as never)));
  if (!hasCanonicalDemoClasses(classes)) return;
  const lessons = response.lessons.map((item) => backendLessonToLessonPack(item as never));
  const assignments = response.assignments.map((item) => backendAssignmentToAssignment(item as never));
  await hydrateTeacherCache(classes, lessons, assignments);
}

export async function demoLogin(role: Role) {
  try {
    const response = await apiJson<LoginResponse>("/api/auth/demo-login", "POST", { role }, false);
    saveSession({
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      role: response.user.role,
      userId: response.user.id,
      name: response.user.name
    });
    if (response.user.role === "teacher") {
      await hydrateTeacherDemoCacheFromBackend().catch(() => undefined);
    }
    return response.user;
  } catch {
    return saveLocalDemoSession(role);
  }
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

export async function fetchTeacherDashboard(): Promise<TeacherDashboardData> {
  const localClasses = await localClassrooms();
  const localLessons = await localLessonPacks();
  const localAssignments = await localAssignmentsList();
  try {
    const response = await apiJson<TeacherDashboardResponse>("/api/teacher/dashboard");
    const backendClasses = dedupeClassrooms(response.classes.map((item) => backendClassroomToClassroom(item as never)));
    const backendLessons = response.lessons.map((item) => backendLessonToLessonPack(item as never));
    const backendAssignments = response.assignments.map((item) => backendAssignmentToAssignment(item as never));
    if (isTeacherDemoSession() && !hasCanonicalDemoClasses(backendClasses)) {
      return {
        classes:
          localClasses.length && hasCanonicalDemoClasses(localClasses)
            ? dedupeClassrooms(localClasses)
            : dedupeClassrooms(demoClassrooms),
        lessons: localLessons.length
          ? dedupeById([...localLessons, ...demoLessonPacks])
          : dedupeById(demoLessonPacks),
        assignments: localAssignments.length
          ? dedupeById([...localAssignments, ...demoAssignments])
          : dedupeById(demoAssignments),
        source: localClasses.length || localLessons.length || localAssignments.length ? "local" : "demo"
      };
    }
    await hydrateTeacherCache(backendClasses, backendLessons, backendAssignments).catch(() => undefined);
    const queuedLocalLessons = await localLessonPacks({ includeSynced: false });
    const queuedLocalAssignments = await localAssignmentsList({ includeSynced: false });
    return {
      classes: backendClasses,
      lessons: dedupeById([
        ...backendLessons,
        ...queuedLocalLessons
      ]),
      assignments: dedupeById([
        ...backendAssignments,
        ...queuedLocalAssignments
      ]),
      source: "backend"
    };
  } catch {
    return {
      classes: localClasses.length ? dedupeClassrooms(localClasses) : dedupeClassrooms(demoClassrooms),
      lessons: dedupeById([...localLessons, ...demoLessonPacks]),
      assignments: dedupeById([...localAssignments, ...demoAssignments]),
      source: localClasses.length || localLessons.length || localAssignments.length ? "local" : "demo"
    };
  }
}

export async function fetchTeacherClassrooms(): Promise<Classroom[]> {
  return (await fetchTeacherClassroomsWithSource()).classes;
}

export async function fetchTeacherClassroomsWithSource(): Promise<{
  classes: Classroom[];
  source: ClassroomSource;
}> {
  try {
    const response = await apiJson<unknown[]>("/api/teacher/classes");
    const backendClasses = dedupeClassrooms(response.map((item) => backendClassroomToClassroom(item as never)));
    if (backendClasses.length > 0 && (!isTeacherDemoSession() || hasCanonicalDemoClasses(backendClasses))) {
      await replaceSyncedLocalEntities(
        "classroom",
        backendClasses.map((item) => ({ localId: item.id, serverId: item.id, payload: item }))
      ).catch(() => undefined);
      return { classes: backendClasses, source: "backend" };
    }
  } catch {
    // Fall through to local cache and final fixture fallback.
  }
  const local = dedupeClassrooms(await localClassrooms());
  if (local.length > 0 && (!isTeacherDemoSession() || hasCanonicalDemoClasses(local))) {
    return { classes: local, source: "local" };
  }
  return { classes: dedupeClassrooms(demoClassrooms), source: "demo" };
}

export async function setupTeacherWorkspace(input: {
  schoolName: string;
  district?: string;
  state?: string;
  classes: Array<{
    name: string;
    grade: string;
    section?: string;
    subjects: string[];
  }>;
}) {
  const response = await apiJson<{ school: unknown; classes: unknown[] }>("/api/teacher/setup", "POST", {
    schoolName: input.schoolName,
    district: input.district,
    state: input.state,
    classes: input.classes
  });
  return {
    school: response.school,
    classes: response.classes.map((item) => backendClassroomToClassroom(item as never))
  };
}

export async function fetchSchoolSuggestions(query: string): Promise<SchoolSuggestion[]> {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
  const response = await apiJson<SchoolSuggestion[]>(`/api/schools${suffix}`);
  return response;
}

export async function fetchTeacherLessons(): Promise<LessonPack[]> {
  const localLessons = await localLessonPacks();
  try {
    const response = await apiJson<unknown[]>("/api/teacher/lessons");
    const queuedLocalLessons = await localLessonPacks({ includeSynced: false });
    return dedupeById([
      ...response.map((item) => backendLessonToLessonPack(item as never)),
      ...queuedLocalLessons
    ]);
  } catch {
    return dedupeById([...localLessons, ...demoLessonPacks]);
  }
}

export async function fetchTeacherLesson(lessonId: string): Promise<{
  lesson: LessonPack;
  source: ClassroomSource;
}> {
  try {
    const response = await apiJson<unknown>(`/api/teacher/lessons/${lessonId}`);
    return {
      lesson: backendLessonToLessonPack(response as never),
      source: "backend"
    };
  } catch {
    const localMatch = (await localLessonPacks()).find((item) => item.id === lessonId);
    if (localMatch) {
      return { lesson: localMatch, source: "local" };
    }
    const demoMatch = demoLessonPacks.find((item) => item.id === lessonId);
    if (demoMatch) {
      return { lesson: normalizeLessonPack(demoMatch), source: "demo" };
    }
    throw new ApiClientError("Lesson not found.", "LESSON_NOT_FOUND", 404);
  }
}

function pendingReviewLesson(lesson: LessonPack): LessonPack {
  return normalizeLessonPack({
    ...lesson,
    status: "Needs Review",
    trustPack: {
      ...lesson.trustPack,
      teacherReviewStatus: "Review Required",
      accessibilityWarnings: Array.from(
        new Set([
          ...(lesson.trustPack.accessibilityWarnings ?? []),
          "Edited by teacher; review before sharing."
        ])
      )
    },
    safetyFlags: {
      ...lesson.safetyFlags,
      teacherReviewRequired: true
    }
  });
}

function publishedLesson(lesson: LessonPack): LessonPack {
  return normalizeLessonPack({
    ...lesson,
    status: "Approved",
    trustPack: {
      ...lesson.trustPack,
      teacherReviewStatus: "Approved",
      accessibilityWarnings: (lesson.trustPack.accessibilityWarnings ?? []).filter(
        (warning) => !warning.toLowerCase().includes("edited by teacher")
      )
    },
    safetyFlags: {
      ...lesson.safetyFlags,
      teacherReviewRequired: false
    }
  });
}

export function lessonPackToEditPatch(lesson: LessonPack): LessonPackEditPatch {
  const normalized = pendingReviewLesson(lesson);
  const sourceText = [
    normalized.title,
    normalized.subject,
    normalized.grade,
    normalized.topicTitle ?? normalized.sourceCard.topic,
    ...normalized.sourceCard.detectedText
  ].filter(Boolean).join(" ");

  return {
    title: normalized.title,
    status: "pending_review",
    topicTitle: normalized.topicTitle ?? normalized.sourceCard.topic,
    searchText: sourceText,
    sourceUnderstanding: {
      title: normalized.title,
      observedText: [
        ...normalized.sourceCard.detectedText,
        ...normalized.sourceCard.equations
      ],
      observedObjects: normalized.sourceCard.diagramElements,
      inferredTopic: normalized.topicTitle ?? normalized.sourceCard.topic,
      unclearAreas: normalized.sourceCard.unclearRegions,
      sourceLanguage: normalized.language
    },
    teacherPack: {
      lessonObjective: normalized.teacherPack.objective,
      teacherExplanation: normalized.teacherPack.teachingScript,
      boardPlan: normalized.teacherPack.keyConcepts,
      lowResourceActivity: normalized.teacherPack.classroomActivity,
      worksheet: normalized.teacherPack.worksheet,
      quiz: normalized.studentAccessPack.practiceQuestions,
      answerKey: normalized.teacherPack.answerKey,
      assessmentQuestions: normalized.teacherPack.worksheet,
      homework: "Review the lesson notes and answer the practice questions.",
      differentiatedExplanations: normalized.teacherPack.differentiatedSupport
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      teacherReviewChecklist: normalized.teacherPack.misconceptions
    },
    studentAccessPack: {
      listenFirstAudioScript: normalized.studentAccessPack.audioStudyScript,
      screenReaderSummary: normalized.studentAccessPack.screenReaderSummary,
      visualDescription: normalized.studentAccessPack.visualDescription,
      simpleExplanation: normalized.studentAccessPack.stepByStepExplanation,
      vocabulary: normalized.studentAccessPack.vocabulary.map((item) => item.term),
      practiceQuestions: normalized.studentAccessPack.practiceQuestions,
      hintsAnswers: normalized.studentAccessPack.selfCheckAnswers,
      revisionChecklist: normalized.studentAccessPack.steps,
      independenceTips: [
        "Read the summary before attempting questions.",
        "Use the vocabulary list while revising."
      ],
      qnaContext: [
        normalized.studentAccessPack.screenReaderSummary,
        normalized.studentAccessPack.stepByStepExplanation,
        ...normalized.studentAccessPack.practiceQuestions
      ].filter(Boolean).join(" ")
    },
    confidenceNotes: {
      overallConfidence: Math.max(0, Math.min(1, normalized.trustPack.confidence / 100)),
      notes: normalized.sourceCard.confidenceNotes,
      teacherReviewWarnings: normalized.trustPack.accessibilityWarnings
    }
  };
}

export async function updateTeacherLesson(
  lessonId: string,
  patch: LessonPackEditPatch,
  localLesson?: LessonPack
): Promise<LessonPack> {
  try {
    const response = await apiJson<unknown>(`/api/teacher/lessons/${lessonId}`, "PATCH", patch);
    const lesson = backendLessonToLessonPack(response as never);
    await saveLocalEntity("lesson", lesson, {
      localId: lesson.id,
      serverId: lesson.id,
      syncStatus: "synced"
    }).catch(() => undefined);
    return lesson;
  } catch (error) {
    if (!localLesson) throw error;
    const lesson = pendingReviewLesson(localLesson);
    await saveLocalEntity("lesson", lesson, {
      localId: lesson.id,
      serverId: lesson.id,
      syncStatus: "queued"
    }).catch(() => undefined);
    await queueLocalOperation(
      "UPDATE_LESSON",
      { lessonId, patch },
      { entityType: "lesson", entityId: lessonId }
    ).catch(() => undefined);
    return lesson;
  }
}

export async function publishTeacherLessonChanges(
  lessonId: string,
  localLesson?: LessonPack
): Promise<LessonPack> {
  const patch: LessonPackEditPatch = {
    status: "published",
    visibility: "class"
  };

  try {
    const response = await apiJson<unknown>(`/api/teacher/lessons/${lessonId}`, "PATCH", patch);
    const lesson = backendLessonToLessonPack(response as never);
    await saveLocalEntity("lesson", lesson, {
      localId: lesson.id,
      serverId: lesson.id,
      syncStatus: "synced"
    }).catch(() => undefined);
    return lesson;
  } catch (error) {
    if (!localLesson) throw error;
    const lesson = publishedLesson(localLesson);
    await saveLocalEntity("lesson", lesson, {
      localId: lesson.id,
      serverId: lesson.id,
      syncStatus: "queued"
    }).catch(() => undefined);
    await queueLocalOperation(
      "UPDATE_LESSON",
      { lessonId, patch },
      { entityType: "lesson", entityId: lessonId }
    ).catch(() => undefined);
    return lesson;
  }
}

export async function deleteTeacherLesson(lessonId: string, source: ClassroomSource = "backend") {
  if (source !== "demo") {
    try {
      const result = await apiJson(`/api/teacher/lessons/${lessonId}`, "DELETE");
      await deleteLocalEntity("lesson", lessonId).catch(() => undefined);
      return result;
    } catch (error) {
      if (source === "backend") throw error;
    }
  }
  await deleteLocalEntity("lesson", lessonId).catch(() => undefined);
  return { deleted: true };
}

export async function deleteTeacherAssignment(assignmentId: string, source: ClassroomSource = "backend") {
  if (source !== "demo") {
    try {
      const result = await apiJson(`/api/teacher/assignments/${assignmentId}`, "DELETE");
      await deleteLocalEntity("assignment", assignmentId).catch(() => undefined);
      return result;
    } catch (error) {
      if (source === "backend") throw error;
    }
  }
  await deleteLocalEntity("assignment", assignmentId).catch(() => undefined);
  return { deleted: true };
}

export async function generateLessonFromText(input: {
  title: string;
  text: string;
  classroomId: string;
  classSubjectId?: string;
  chapterId?: string;
  chapterTitle?: string;
  topicId?: string;
  topicTitle?: string;
  subject: string;
  gradeBand: string;
  language?: string;
  modelPreference?: ModelPreference;
}) {
  const preference = input.modelPreference ?? getDefaultModelPreference();
  if (preference !== "remote-gemini") {
    try {
      return await generateLocalLessonFromText(input, preference);
    } catch (error) {
      throw localGenerationError(error);
    }
  }

  const session = getSession();
  const response = await apiJson<unknown>("/api/teacher/lessons/from-text", "POST", {
    text: input.text,
    teacherId: session?.userId ?? "teacher-demo",
    settings: {
      title: input.title,
      classroomId: input.classroomId,
      classSubjectId: input.classSubjectId,
      chapterId: input.chapterId,
      chapterTitle: input.chapterTitle,
      topicId: input.topicId,
      topicTitle: input.topicTitle,
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
  try {
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
  } catch {
    const assignment = localAssignmentFromInput(input);
    await saveLocalEntity("assignment", assignment, { localId: assignment.id, syncStatus: "queued" });
    await queueLocalOperation(
      "ASSIGN_LESSON",
      { input, assignment },
      { entityType: "assignment", entityId: assignment.id }
    );
    return [assignment];
  }
}

export async function generateAssignmentDraftFromLesson(input: {
  lessonId: string;
  classroomId?: string;
  preferredVersions?: AccessibilityMode[];
  questionType?: AssignmentAnswerMode;
  lessonPack?: LessonPack;
  modelPreference?: ModelPreference;
}) {
  const preference = input.modelPreference ?? getDefaultModelPreference();
  if (preference !== "remote-gemini") {
    if (!input.lessonPack) {
      throw new ApiClientError(
        "Local assignment generation needs the selected lesson pack on this device.",
        "LOCAL_LESSON_REQUIRED",
        0
      );
    }
    try {
      return await generateLocalAssignmentDraft(
        {
          lessonPack: input.lessonPack,
          preferredVersions: input.preferredVersions,
          questionType: input.questionType
        },
        preference
      );
    } catch (error) {
      throw localGenerationError(error);
    }
  }

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
  const localAssignments = await localAssignmentsList();
  try {
    const response = await apiJson<StudentDashboardResponse>("/api/student/dashboard");
    return {
      classes: response.classes.map((item) => backendClassroomToClassroom(item as never)),
      assignments: dedupeById([
        ...localAssignments,
        ...response.assignments.map((item) => backendAssignmentToAssignment(item as never))
      ])
    };
  } catch {
    return {
      classes: demoClassrooms,
      assignments: dedupeById([...localAssignments, ...demoAssignments])
    };
  }
}

export async function joinStudentClassByCode(code: string) {
  const response = await apiJson<unknown>("/api/student/join-class", "POST", { code });
  return response;
}

export async function fetchStudentLessons(): Promise<Assignment[]> {
  const localAssignments = await localAssignmentsList();
  try {
    const response = await apiJson<unknown[]>("/api/student/lessons");
    return dedupeById([
      ...localAssignments,
      ...response.map((item) => backendAssignmentToAssignment(item as never))
    ]);
  } catch {
    return dedupeById([...localAssignments, ...demoAssignments]);
  }
}

export async function fetchStudentLesson(lessonId: string): Promise<{ lesson: Lecture; progress?: unknown }> {
  try {
    const response = await apiJson<StudentLessonResponse>(`/api/student/lessons/${lessonId}`);
    return {
      lesson: backendLessonToLecture(response.lesson as never),
      progress: response.access.progress
    };
  } catch {
    const normalized = lessonId.trim().toLowerCase();
    const lesson =
      demoLectures.find((item) => item.id === lessonId || item.title.trim().toLowerCase() === normalized) ??
      demoLectures[0];
    return { lesson };
  }
}

export async function fetchStudentAssignedLectures(): Promise<Lecture[]> {
  const assignments = await fetchStudentLessons();
  const lessonIds = Array.from(new Set(assignments.map((assignment) => assignment.linkedLecture).filter(Boolean)));
  const settled = await Promise.allSettled(lessonIds.map((lessonId) => fetchStudentLesson(lessonId)));
  return settled
    .filter((item): item is PromiseFulfilledResult<{ lesson: Lecture; progress?: unknown }> => item.status === "fulfilled")
    .map((item) => item.value.lesson);
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
  modelPreference?: ModelPreference;
}) {
  const preference = input.modelPreference ?? getDefaultModelPreference();
  if (preference !== "remote-gemini") {
    try {
      return await askLocalDoubt(input, preference);
    } catch (error) {
      throw localGenerationError(error);
    }
  }

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
  classCode?: string;
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

function saveLocalDemoSession(role: Role) {
  const user = {
    id: `local-${role}-demo`,
    name: role === "teacher" ? "Teacher Demo" : "Student Demo",
    role
  };
  saveSession({
    accessToken: `local-demo-token-${role}`,
    refreshToken: "",
    role,
    userId: user.id,
    name: user.name
  });
  return user;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function localLessonPacks(options: { includeSynced?: boolean } = {}) {
  const entities = await listLocalEntities<LessonPack>("lesson");
  return entities
    .filter((entity) => options.includeSynced !== false || entity.syncStatus !== "synced")
    .map((entity) => normalizeLessonPack(entity.payload));
}

async function localAssignmentsList(options: { includeSynced?: boolean } = {}) {
  const entities = await listLocalEntities<Assignment>("assignment");
  return entities
    .filter((entity) => options.includeSynced !== false || entity.syncStatus !== "synced")
    .map((entity) => entity.payload);
}

async function localClassrooms() {
  const entities = await listLocalEntities<Classroom>("classroom");
  return entities.map((entity) => entity.payload);
}

function localGenerationError(error: unknown) {
  const details = error instanceof Error ? error.message : "Local Gemma generation failed.";
  const message =
    error instanceof LocalModelUnavailableError
      ? `${details} Choose Remote Gemini to use backend AI, or keep exploring the seeded demo content.`
      : `Local Gemma failed: ${details} Choose Remote Gemini to use backend AI, or keep exploring the seeded demo content.`;
  return new ApiClientError(message, "LOCAL_MODEL_UNAVAILABLE", 0);
}

function localAssignmentFromInput(input: {
  lessonId: string;
  classroomId: string;
  instructions?: string;
  dueAt?: string;
  title?: string;
  answerMode?: AssignmentAnswerMode;
  versions?: AccessibilityMode[];
  questions?: AssignmentQuestion[];
}): Assignment {
  const now = new Date().toISOString();
  return {
    id: `local-assignment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title || "Local assignment",
    classroom: input.classroomId,
    subject: "Classwork",
    linkedLecture: input.lessonId,
    postedAt: now,
    dueDate: input.dueAt || "No due date",
    answerMode: input.answerMode ?? "short_answer",
    versions: input.versions?.length ? input.versions : ["Standard"],
    questions: input.questions?.length
      ? input.questions
      : [
          {
            id: "q1",
            prompt: "Write what you understood from this lesson."
          }
        ],
    status: "Published"
  };
}

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
    classroomId: lecture.classroomId,
    classSubjectId: lecture.classSubjectId,
    chapterId: lecture.chapterId,
    chapterTitle: lecture.chapterTitle,
    topicId: lecture.topicId,
    topicTitle: lecture.topicTitle,
    language,
    subject: lecture.subject,
    gradeBand: "Grade 8",
    tags: [lecture.subject.toLowerCase(), lecture.title.toLowerCase()],
    searchText: `${lecture.title} ${lecture.subject} ${lecture.keyVocabulary.join(" ")}`
  };
}
