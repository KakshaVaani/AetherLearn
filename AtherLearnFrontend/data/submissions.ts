import demoSubmissions from "@/data/demoSubmissions.json";
import { Submission } from "@/types";

export type DemoSubmission = Submission & {
  assignmentId: string;
  classroomId: string;
  studentId: string;
};

export const submissions = demoSubmissions as DemoSubmission[];
