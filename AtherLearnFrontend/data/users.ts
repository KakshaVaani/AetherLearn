import { User } from "@/types";

export type DemoTeacher = User & {
  email: string;
  subjects: string[];
  classroomIds: string[];
};

export type DemoStudent = User & {
  email: string;
  classroomIds: string[];
  readingLevel: "Emerging" | "On Track" | "Advanced";
};

export const teachers: DemoTeacher[] = [
  {
    id: "teacher-demo",
    name: "Ananya Sharma",
    role: "teacher",
    avatarInitials: "AS",
    email: "teacher@aetherlearn.demo",
    subjects: ["Science", "Math"],
    classroomIds: ["class-7a", "class-7b", "class-8a", "class-8b"]
  },
  {
    id: "teacher-leela",
    name: "Leela Nair",
    role: "teacher",
    avatarInitials: "LN",
    email: "leela@aetherlearn.demo",
    subjects: ["Science"],
    classroomIds: ["class-7a", "class-7b"]
  },
  {
    id: "teacher-raj",
    name: "Raj Mehta",
    role: "teacher",
    avatarInitials: "RM",
    email: "raj@aetherlearn.demo",
    subjects: ["Math"],
    classroomIds: ["class-8a", "class-8b"]
  }
];

export const teacher: User = teachers[0];

export const students: DemoStudent[] = [
  {
    id: "student-demo",
    name: "Ravi Kumar",
    role: "student",
    avatarInitials: "RK",
    accessibilityMode: "Blind / Low Vision",
    preferredLanguage: "Hindi + English",
    email: "student@aetherlearn.demo",
    classroomIds: ["class-7a"],
    readingLevel: "On Track"
  },
  {
    id: "student-meera",
    name: "Meera Nair",
    role: "student",
    avatarInitials: "MN",
    accessibilityMode: "Standard",
    preferredLanguage: "English",
    email: "meera@aetherlearn.demo",
    classroomIds: ["class-7a"],
    readingLevel: "Advanced"
  },
  {
    id: "student-neha",
    name: "Neha Verma",
    role: "student",
    avatarInitials: "NV",
    accessibilityMode: "Slow Learner",
    preferredLanguage: "English",
    email: "neha@aetherlearn.demo",
    classroomIds: ["class-7a"],
    readingLevel: "Emerging"
  },
  {
    id: "student-zoya",
    name: "Zoya Khan",
    role: "student",
    avatarInitials: "ZK",
    accessibilityMode: "Multilingual",
    preferredLanguage: "Urdu + English",
    email: "zoya@aetherlearn.demo",
    classroomIds: ["class-7b"],
    readingLevel: "On Track"
  },
  {
    id: "student-ishita",
    name: "Ishita Rao",
    role: "student",
    avatarInitials: "IR",
    accessibilityMode: "Dyslexia Friendly",
    preferredLanguage: "English",
    email: "ishita@aetherlearn.demo",
    classroomIds: ["class-7b"],
    readingLevel: "On Track"
  },
  {
    id: "student-aarav",
    name: "Aarav Singh",
    role: "student",
    avatarInitials: "AS",
    accessibilityMode: "Dyslexia Friendly",
    preferredLanguage: "English",
    email: "aarav@aetherlearn.demo",
    classroomIds: ["class-8a"],
    readingLevel: "On Track"
  },
  {
    id: "student-rafiq",
    name: "Rafiq Ansari",
    role: "student",
    avatarInitials: "RA",
    accessibilityMode: "Multilingual",
    preferredLanguage: "Hindi + English",
    email: "rafiq@aetherlearn.demo",
    classroomIds: ["class-8a"],
    readingLevel: "On Track"
  },
  {
    id: "student-kiran",
    name: "Kiran Patel",
    role: "student",
    avatarInitials: "KP",
    accessibilityMode: "Standard",
    preferredLanguage: "English",
    email: "kiran@aetherlearn.demo",
    classroomIds: ["class-8a"],
    readingLevel: "Advanced"
  },
  {
    id: "student-dev",
    name: "Dev Malhotra",
    role: "student",
    avatarInitials: "DM",
    accessibilityMode: "Slow Learner",
    preferredLanguage: "Hindi + English",
    email: "dev@aetherlearn.demo",
    classroomIds: ["class-8b"],
    readingLevel: "Emerging"
  },
  {
    id: "student-tara",
    name: "Tara Iyer",
    role: "student",
    avatarInitials: "TI",
    accessibilityMode: "Standard",
    preferredLanguage: "English",
    email: "tara@aetherlearn.demo",
    classroomIds: ["class-8b"],
    readingLevel: "Advanced"
  }
];

export const classRosters: Record<string, string[]> = {
  "class-7a": ["student-demo", "student-meera", "student-neha"],
  "class-7b": ["student-zoya", "student-ishita"],
  "class-8a": ["student-aarav", "student-rafiq", "student-kiran"],
  "class-8b": ["student-dev", "student-tara"]
};

export const teacherClassrooms: Record<string, string[]> = teachers.reduce<Record<string, string[]>>((acc, item) => {
  acc[item.id] = item.classroomIds;
  return acc;
}, {});

export const currentStudent = students[0];
