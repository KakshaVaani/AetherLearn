import { Classroom } from "@/types";

export const classrooms: Classroom[] = [
  {
    id: "class-7a",
    title: "Class 7A",
    grade: "Grade 7",
    section: "A",
    schoolId: "school-gms",
    classCode: "CLASS7A",
    students: 3,
    subjects: ["Science"],
    classSubjects: [{ id: "subject-7a-science", subject: "Science", teacherId: "teacher-demo" }],
    accessibilityProfiles: 2,
    accessibilityBreakdown: {
      "Blind / Low Vision": 1,
      "Dyslexia Friendly": 0,
      Multilingual: 0,
      "Slow Learner": 1,
      Standard: 1
    }
  },
  {
    id: "class-7b",
    title: "Class 7B",
    grade: "Grade 7",
    section: "B",
    schoolId: "school-gms",
    classCode: "CLASS7B",
    students: 2,
    subjects: ["Science"],
    classSubjects: [{ id: "subject-7b-science", subject: "Science", teacherId: "teacher-demo" }],
    accessibilityProfiles: 2,
    accessibilityBreakdown: {
      "Blind / Low Vision": 0,
      "Dyslexia Friendly": 1,
      Multilingual: 1,
      "Slow Learner": 0,
      Standard: 0
    }
  },
  {
    id: "class-8a",
    title: "Class 8A",
    grade: "Grade 8",
    section: "A",
    schoolId: "school-gms",
    classCode: "CLASS8A",
    students: 3,
    subjects: ["Math"],
    classSubjects: [{ id: "subject-8a-math", subject: "Math", teacherId: "teacher-demo" }],
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
    id: "class-8b",
    title: "Class 8B",
    grade: "Grade 8",
    section: "B",
    schoolId: "school-gms",
    classCode: "CLASS8B",
    students: 2,
    subjects: ["Math"],
    classSubjects: [{ id: "subject-8b-math", subject: "Math", teacherId: "teacher-demo" }],
    accessibilityProfiles: 1,
    accessibilityBreakdown: {
      "Blind / Low Vision": 0,
      "Dyslexia Friendly": 0,
      Multilingual: 0,
      "Slow Learner": 1,
      Standard: 1
    }
  }
];
