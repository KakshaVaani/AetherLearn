import { LessonPack } from "@/types";

export type LessonReviewMode = "generated" | "view";
export type LessonReviewReturn = "source" | "teacher" | "student" | "trust";
export type LessonReviewRoute = "/source-understanding" | "/teacher-pack" | "/student-pack" | "/trust-pack";
export type LessonRouteOrigin = "classroom" | "library";

export function resolveLessonReviewMode(
  mode: string | string[] | undefined,
  lessonId?: string | string[]
): LessonReviewMode {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "generated" || value === "view") return value;
  return lessonId ? "view" : "generated";
}

export function lessonStateLabel(lesson: LessonPack) {
  if (lesson.status === "Needs Review") return "Needs review";
  if (lesson.status === "Draft") return "Draft note";
  return "Published lesson";
}

export function lessonStateTone(lesson: LessonPack): "success" | "warning" | "primary" {
  if (lesson.status === "Needs Review") return "warning";
  if (lesson.status === "Draft") return "primary";
  return "success";
}

export function routeForPack(pack: LessonReviewReturn): LessonReviewRoute {
  if (pack === "teacher") return "/teacher-pack";
  if (pack === "student") return "/student-pack";
  if (pack === "trust") return "/trust-pack";
  return "/source-understanding";
}

export function resolveLessonOrigin(
  origin: string | string[] | undefined,
  classroomId?: string | string[]
): LessonRouteOrigin {
  const value = Array.isArray(origin) ? origin[0] : origin;
  if (value === "classroom" || value === "library") return value;
  return classroomId ? "classroom" : "library";
}

export function lessonOriginRoute(origin: LessonRouteOrigin, classroomId?: string | null) {
  if (origin === "classroom" && classroomId) {
    return {
      pathname: "/(teacher)/classrooms/[id]" as const,
      params: { id: classroomId }
    };
  }
  return "/(teacher)/lessons" as const;
}
