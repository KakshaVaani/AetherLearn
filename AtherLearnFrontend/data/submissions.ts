import { Submission } from "@/types";

export const submissions: Submission[] = [
  {
    id: "sub-1",
    studentName: "Aarav",
    accessibilityProfile: "Dyslexia Friendly",
    score: 82,
    aiFeedbackStatus: "Ready",
    status: "Graded"
  },
  {
    id: "sub-2",
    studentName: "Meera",
    accessibilityProfile: "Blind / Low Vision",
    score: null,
    aiFeedbackStatus: "Generating",
    status: "Pending"
  },
  {
    id: "sub-3",
    studentName: "Rafiq",
    accessibilityProfile: "Multilingual",
    score: 76,
    aiFeedbackStatus: "Needs review",
    status: "Graded"
  },
  {
    id: "sub-4",
    studentName: "Neha",
    accessibilityProfile: "Slow Learner",
    score: null,
    aiFeedbackStatus: "Generating",
    status: "Pending"
  }
];
