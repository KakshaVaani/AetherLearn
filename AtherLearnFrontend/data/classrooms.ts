import { Classroom } from "@/types";

export const classrooms: Classroom[] = [
  {
    id: "grade-7-inclusive",
    title: "Grade 7 - Inclusive Learning",
    grade: "Grade 7",
    section: "Inclusive Learning",
    schoolId: "school-gms",
    classCode: "G7I-503",
    students: 4,
    subjects: ["Science", "English", "Social Studies"],
    classSubjects: [
      { id: "grade-7-inclusive-science", subject: "Science", teacherId: "teacher-demo" },
      { id: "grade-7-inclusive-english", subject: "English", teacherId: "teacher-farah" },
      { id: "grade-7-inclusive-social-studies", subject: "Social Studies", teacherId: "teacher-demo" }
    ],
    accessibilityProfiles: 4,
    accessibilityBreakdown: {
      "Blind / Low Vision": 2,
      "Dyslexia Friendly": 0,
      Multilingual: 1,
      "Slow Learner": 1,
      Standard: 0
    }
  },
  {
    id: "grade-8-a",
    title: "Grade 8 - Section A",
    grade: "Grade 8",
    section: "A",
    schoolId: "school-gms",
    classCode: "G8A-204",
    students: 3,
    subjects: ["Science", "Math", "English"],
    classSubjects: [
      { id: "grade-8-a-science", subject: "Science", teacherId: "teacher-demo" },
      { id: "grade-8-a-math", subject: "Math", teacherId: "teacher-raj" },
      { id: "grade-8-a-english", subject: "English", teacherId: "teacher-farah" }
    ],
    accessibilityProfiles: 2,
    accessibilityBreakdown: {
      "Blind / Low Vision": 0,
      "Dyslexia Friendly": 1,
      Multilingual: 1,
      "Slow Learner": 0,
      Standard: 1
    }
  },
  {
    id: "grade-9-science",
    title: "Grade 9 - Science",
    grade: "Grade 9",
    section: "Science",
    schoolId: "school-gms",
    classCode: "G9S-118",
    students: 3,
    subjects: ["Science"],
    classSubjects: [
      { id: "grade-9-science-science", subject: "Science", teacherId: "teacher-farah" }
    ],
    accessibilityProfiles: 2,
    accessibilityBreakdown: {
      "Blind / Low Vision": 0,
      "Dyslexia Friendly": 1,
      Multilingual: 0,
      "Slow Learner": 1,
      Standard: 1
    }
  }
];
