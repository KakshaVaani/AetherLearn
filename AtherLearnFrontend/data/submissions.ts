import { Submission } from "@/types";

export type DemoSubmission = Submission & {
  assignmentId: string;
  classroomId: string;
  studentId: string;
};

export const submissions: DemoSubmission[] = [
  {
    id: "sub-ravi-photo",
    assignmentId: "photosynthesis-quiz",
    classroomId: "grade-7-inclusive",
    studentId: "student-demo",
    studentName: "Ravi Kumar",
    accessibilityProfile: "Blind / Low Vision",
    score: 88,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-meera-photo",
    assignmentId: "photosynthesis-quiz",
    classroomId: "grade-7-inclusive",
    studentId: "student-meera",
    studentName: "Meera Nair",
    accessibilityProfile: "Blind / Low Vision",
    score: 94,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-zoya-civics",
    assignmentId: "constitution-basics-exit-ticket",
    classroomId: "grade-7-inclusive",
    studentId: "student-zoya",
    studentName: "Zoya Khan",
    accessibilityProfile: "Multilingual",
    score: 81,
    aiFeedbackStatus: "Needs review",
    status: "Graded"
  },
  {
    id: "sub-aarav-fractions",
    assignmentId: "fractions-practice",
    classroomId: "grade-8-a",
    studentId: "student-aarav",
    studentName: "Aarav Singh",
    accessibilityProfile: "Dyslexia Friendly",
    score: 82,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-rafiq-linear",
    assignmentId: "linear-equations-practice",
    classroomId: "grade-8-a",
    studentId: "student-rafiq",
    studentName: "Rafiq Ansari",
    accessibilityProfile: "Multilingual",
    score: null,
    aiFeedbackStatus: "Generating",
    status: "Pending"
  },
  {
    id: "sub-kiran-fractions",
    assignmentId: "fractions-practice",
    classroomId: "grade-8-a",
    studentId: "student-kiran",
    studentName: "Kiran Patel",
    accessibilityProfile: "Standard",
    score: 96,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-ishita-digestive",
    assignmentId: "digestive-system-revision",
    classroomId: "grade-9-science",
    studentId: "student-ishita",
    studentName: "Ishita Rao",
    accessibilityProfile: "Dyslexia Friendly",
    score: 90,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-dev-digestive",
    assignmentId: "digestive-system-revision",
    classroomId: "grade-9-science",
    studentId: "student-dev",
    studentName: "Dev Malhotra",
    accessibilityProfile: "Slow Learner",
    score: 74,
    aiFeedbackStatus: "Needs review",
    status: "Graded"
  },
  {
    id: "sub-tara-digestive",
    assignmentId: "digestive-system-revision",
    classroomId: "grade-9-science",
    studentId: "student-tara",
    studentName: "Tara Iyer",
    accessibilityProfile: "Standard",
    score: null,
    aiFeedbackStatus: "Generating",
    status: "Pending"
  }
];
