import demoAssignments from "@/data/demoAssignments.json";
import { Assignment } from "@/types";

type DemoAssignmentSeed = {
  id: string;
  title: string;
  lessonId: string;
  linkedLecture?: string;
  classroomId: string;
  classroom?: string;
  subject: string;
  postedAt: string;
  dueAt: string;
  dueDate?: string;
  answerMode: Assignment["answerMode"];
  frontendStatus?: Assignment["status"];
  versions: Assignment["versions"];
  questions: Assignment["questions"];
};

const assignmentSeeds = demoAssignments as DemoAssignmentSeed[];

export const assignments: Assignment[] = assignmentSeeds.map((assignment) => ({
  id: assignment.id,
  title: assignment.title,
  classroom: assignment.classroom ?? assignment.classroomId,
  subject: assignment.subject,
  linkedLecture: assignment.linkedLecture ?? assignment.lessonId,
  postedAt: assignment.postedAt,
  dueDate: assignment.dueDate ?? assignment.dueAt,
  answerMode: assignment.answerMode,
  status: assignment.frontendStatus ?? "Published",
  versions: assignment.versions,
  questions: assignment.questions
}));
