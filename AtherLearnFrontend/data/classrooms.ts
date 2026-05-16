import { Classroom } from "@/types";

export const classrooms: Classroom[] = [
  {
    id: "grade-8-a",
    title: "Grade 8 - Section A",
    grade: "Grade 8",
    section: "A",
    schoolId: "demo-school",
    classCode: "G8A-204",
    students: 32,
    subjects: ["Science", "Math", "English"],
    classSubjects: [
      { id: "grade-8-a-science", subject: "Science" },
      { id: "grade-8-a-math", subject: "Math" },
      { id: "grade-8-a-english", subject: "English" }
    ],
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
    grade: "Grade 9",
    section: "Science",
    schoolId: "demo-school",
    classCode: "G9S-118",
    students: 28,
    subjects: ["Biology", "Chemistry", "Physics"],
    classSubjects: [
      { id: "grade-9-science-biology", subject: "Biology" },
      { id: "grade-9-science-chemistry", subject: "Chemistry" },
      { id: "grade-9-science-physics", subject: "Physics" }
    ],
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
    grade: "Grade 7",
    section: "Inclusive Learning",
    schoolId: "demo-school",
    classCode: "G7I-503",
    students: 24,
    subjects: ["Science", "English", "Social Studies"],
    classSubjects: [
      { id: "grade-7-inclusive-science", subject: "Science" },
      { id: "grade-7-inclusive-english", subject: "English" },
      { id: "grade-7-inclusive-social-studies", subject: "Social Studies" }
    ],
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
