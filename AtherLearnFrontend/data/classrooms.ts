import { Classroom } from "@/types";

export const classrooms: Classroom[] = [
  {
    id: "grade-8-a",
    title: "Grade 8 - Section A",
    classCode: "G8A-204",
    students: 32,
    subjects: ["Science", "Math", "English"],
    accessibilityProfiles: 14,
    accessibilityBreakdown: {
      "Blind / Low Vision": 3,
      "Dyslexia Friendly": 5,
      Multilingual: 2,
      "Slow Learner": 4,
      Standard: 18
    }
  },
  {
    id: "grade-9-science",
    title: "Grade 9 - Science",
    classCode: "G9S-118",
    students: 28,
    subjects: ["Biology", "Chemistry", "Physics"],
    accessibilityProfiles: 10,
    accessibilityBreakdown: {
      "Blind / Low Vision": 2,
      "Dyslexia Friendly": 4,
      Multilingual: 1,
      "Slow Learner": 3,
      Standard: 18
    }
  },
  {
    id: "grade-7-inclusive",
    title: "Grade 7 - Inclusive Learning",
    classCode: "G7I-503",
    students: 24,
    subjects: ["Science", "English", "Social Studies"],
    accessibilityProfiles: 16,
    accessibilityBreakdown: {
      "Blind / Low Vision": 4,
      "Dyslexia Friendly": 5,
      Multilingual: 3,
      "Slow Learner": 4,
      Standard: 8
    }
  }
];
